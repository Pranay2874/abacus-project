import fs from 'fs';
import { parse } from 'csv-parse';
import ClaimRecord from '../models/ClaimRecord';
import QualityResult from '../models/QualityResult';
import { detectAnomalies } from './anomaly';

const icdFile = require('../icd10.json');
const VALID_ICD = new Set(icdFile.codes);

type Issue = { type: string; detail?: string };

// Schema validation function
function validateRow(r: any, idx: number): Issue[] {
  const schemaIssues: Issue[] = [];

  // Check for missing required fields
  if (!r.claimId || String(r.claimId).trim() === '') {
    schemaIssues.push({ type: 'Schema Error: Missing claimId' });
  }
  if (!r.patientName || String(r.patientName).trim() === '') {
    schemaIssues.push({ type: 'Schema Error: Missing patientName' });
  }
  if (!r.diagnosisCode || String(r.diagnosisCode).trim() === '') {
    schemaIssues.push({ type: 'Schema Error: Missing diagnosisCode' });
  }
  if (!r.provider || String(r.provider).trim() === '') {
    schemaIssues.push({ type: 'Schema Error: Missing provider' });
  }
  if (!r.date || String(r.date).trim() === '') {
    schemaIssues.push({ type: 'Schema Error: Missing date' });
  }

  // Validate amount is numeric
  const amountStr = String(r.amount || '').replace(/[^0-9.-]+/g, '');
  const amount = parseFloat(amountStr);
  if (r.amount && (isNaN(amount) || amountStr === '')) {
    schemaIssues.push({ type: 'Schema Error: Invalid amount', detail: `'${r.amount}' is not numeric` });
  } else if (!r.amount) {
    schemaIssues.push({ type: 'Schema Error: Missing amount' });
  }

  // Validate date format (basic check)
  if (r.date) {
    const dateObj = new Date(r.date);
    if (isNaN(dateObj.getTime())) {
      schemaIssues.push({ type: 'Schema Error: Invalid date format', detail: r.date });
    }
  }

  return schemaIssues;
}

function severityFromScore(score: number) {
  if (score >= 90) return 'LOW';
  if (score >= 75) return 'MEDIUM';
  if (score >= 35) return 'HIGH';
  return 'CRITICAL';
}

export async function processFile(filePath: string, originalName: string, io: any) {
  const rows: any[] = [];
  const parser = fs.createReadStream(filePath).pipe(parse({ columns: true, trim: true }));

  for await (const record of parser) {
    rows.push(record);
  }

  const totalRecords = rows.length;
  let totalIssues = 0;
  let totalAffectedAmount = 0;

  const issuesCounts: Record<string, number> = {};
  const issuesAffectedAmount: Record<string, number> = {};
  const perRowIssues: Issue[][] = [];

  // Step 1: Schema Validation
  const validRows: any[] = [];
  const validRowIndices: number[] = [];

  rows.forEach((r, idx) => {
    const schemaIssues = validateRow(r, idx);
    if (schemaIssues.length === 0) {
      validRows.push(r);
      validRowIndices.push(idx);
    }
  });

  // Step 2: Anomaly Detection (only on valid rows)
  const anomaliesMap = detectAnomalies(validRows);
  const allAnomalies: any[] = [];

  // Map anomalies back to original row indices
  const originalAnomaliesMap: Record<number, any[]> = {};
  Object.keys(anomaliesMap).forEach(validIdx => {
    const originalIdx = validRowIndices[parseInt(validIdx)];
    originalAnomaliesMap[originalIdx] = anomaliesMap[parseInt(validIdx)];
  });

  // within-file duplicates
  const seenIds = new Map<string, number>();
  rows.forEach((r, idx) => {
    const id = (r.claimId || '').toString();
    if (!id) return;
    seenIds.set(id, (seenIds.get(id) || 0) + 1);
  });

  // process each row
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowIssues: Issue[] = [];

    // Add schema validation issues first
    const schemaIssues = validateRow(r, idx);
    rowIssues.push(...schemaIssues);
    const claimId = r.claimId ? String(r.claimId).trim() : '';
    const patientName = r.patientName || '';
    const diagnosisCode = r.diagnosisCode || '';
    const amountRaw = r.amount || '0';
    const amount = parseFloat(String(amountRaw).replace(/[^0-9.-]+/g, '')) || 0;

    // Only check business rules if schema is valid
    if (schemaIssues.length === 0) {
      if (diagnosisCode && !VALID_ICD.has(diagnosisCode)) {
        rowIssues.push({ type: 'Invalid ICD-10 code', detail: diagnosisCode });
      }

      if (amount <= 0) {
        rowIssues.push({ type: 'Invalid amount', detail: String(amount) });
      }
    }

    if (claimId && (seenIds.get(claimId) || 0) > 1) {
      rowIssues.push({ type: 'Duplicate within file', detail: claimId });
    }

    // cross-file duplicate detection
    if (claimId) {
      const existing = await ClaimRecord.findOne({ claimId }).lean();
      if (existing) {
        rowIssues.push({ type: 'Cross-file duplicate claim', detail: `${existing.fileName} @ ${existing.uploadTimestamp}` });
      }
    }

    // Add anomalies (from mapped indices)
    if (originalAnomaliesMap[idx]) {
      originalAnomaliesMap[idx].forEach(a => {
        rowIssues.push({ type: a.type, detail: a.detail });
        allAnomalies.push(a);
      });
    }

    if (rowIssues.length > 0) {
      totalAffectedAmount += amount;
      // add this record's amount to each issue that affects it
      for (const it of rowIssues) {
        issuesAffectedAmount[it.type] = (issuesAffectedAmount[it.type] || 0) + amount;
      }
    }

    // count issues
    for (const it of rowIssues) {
      totalIssues += 1;
      issuesCounts[it.type] = (issuesCounts[it.type] || 0) + 1;
    }

    perRowIssues.push(rowIssues);
  }

  const issueRatio = totalRecords === 0 ? 0 : (totalIssues / totalRecords);
  const qualityScore = Math.max(0, 100 - (issueRatio * 100));
  const severity = severityFromScore(qualityScore);

  // Save ClaimRecords and QualityResult
  const uploadTimestamp = new Date();

  const claimDocs = [] as any[];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const claimDoc = new ClaimRecord({
      claimId: r.claimId || '',
      patientName: r.patientName || '',
      diagnosisCode: r.diagnosisCode || '',
      amount: parseFloat(String(r.amount || '0')) || 0,
      provider: r.provider || '',
      date: r.date ? new Date(r.date) : undefined,
      fileName: originalName,
      uploadTimestamp
    });
    claimDocs.push(claimDoc);
  }

  if (claimDocs.length) await ClaimRecord.insertMany(claimDocs);

  const issuesArray = Object.entries(issuesCounts).map(([k, v]) => `${k}: ${v}`);
  const issuesDetailed = Object.keys(issuesCounts).map(k => ({ name: k, count: issuesCounts[k] || 0, affectedAmount: issuesAffectedAmount[k] || 0 }));
  const result = new QualityResult({
    fileName: originalName,
    totalRecords,
    totalIssues,
    qualityScore,
    severity,
    totalAffectedAmount,
    issues: issuesArray,
    issuesDetailed,
    anomalies: allAnomalies
  });
  await result.save();

  // Emit socket events
  try {
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      io.emit('severity_alert', { severity, qualityScore, fileName: originalName });
    }
    if (totalAffectedAmount > (parseFloat(process.env.TOTAL_AFFECTED_AMOUNT_THRESHOLD || '10000'))) {
      io.emit('financial_alert', { totalAffectedAmount, fileName: originalName });
    }
    if (qualityScore < 50) {
      io.emit('quality_alert', { qualityScore, fileName: originalName });
    }
    // cross-file duplicates: send a summary if any
    const crossDupEvents = [] as any[];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const claimId = r.claimId || '';
      if (!claimId) continue;
      const existing = await ClaimRecord.findOne({ claimId, fileName: { $ne: originalName } }).lean();
      if (existing) crossDupEvents.push({ claimId, previousFile: existing.fileName, previousUpload: existing.uploadTimestamp });
    }
    if (crossDupEvents.length) {
      io.emit('cross_file_duplicates', { duplicates: crossDupEvents });
    }
  } catch (e) {
    console.warn('Socket emit failed', e);
  }

  // attach per-row issues to parsed rows for frontend consumption
  const parsedWithIssues = rows.map((r, idx) => ({ ...r, issues: perRowIssues[idx] || [] }));

  return {
    fileName: originalName,
    totalRecords,
    totalIssues,
    qualityScore,
    severity,
    totalAffectedAmount,
    issues: issuesArray,
    issuesBreakdown: issuesDetailed,
    parsed: parsedWithIssues
  };
}
