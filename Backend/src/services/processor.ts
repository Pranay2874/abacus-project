import fs from 'fs';
import { parse } from 'csv-parse';
import ClaimRecord from '../models/ClaimRecord';
import QualityResult from '../models/QualityResult';

const icdFile = require('../icd10.json');
const VALID_ICD = new Set(icdFile.codes);

type Issue = { type: string; detail?: string };

function severityFromScore(score: number) {
  if (score >= 90) return 'LOW';
  if (score >= 75) return 'MEDIUM';
  if (score >= 35) return 'HIGH';
  return 'CRITICAL';
}

export async function processFile(filePath: string, originalName: string, io:any) {
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

  // within-file duplicates
  const seenIds = new Map<string, number>();
  rows.forEach((r, idx)=>{
    const id = (r.claimId||'').toString();
    if (!id) return;
    seenIds.set(id, (seenIds.get(id) || 0) + 1);
  });

  // process each row
  for (const r of rows) {
    const rowIssues: Issue[] = [];
    const claimId = r.claimId ? String(r.claimId).trim() : '';
    const patientName = r.patientName || '';
    const diagnosisCode = r.diagnosisCode || '';
    const amountRaw = r.amount || '0';
    const amount = parseFloat(String(amountRaw).replace(/[^0-9.-]+/g, '')) || 0;

    if (!claimId) { rowIssues.push({ type: 'Missing claimId' }); }
    if (!patientName) { rowIssues.push({ type: 'Missing patientName' }); }
    if (!diagnosisCode) { rowIssues.push({ type: 'Missing diagnosisCode' }); }
    if (!r.amount) { rowIssues.push({ type: 'Missing amount' }); }

    if (diagnosisCode && !VALID_ICD.has(diagnosisCode)) {
      rowIssues.push({ type: 'Invalid ICD-10 code', detail: diagnosisCode });
    }

    if (amount <= 0) {
      rowIssues.push({ type: 'Invalid amount', detail: String(amount) });
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

  const issuesArray = Object.entries(issuesCounts).map(([k,v])=>`${k}: ${v}`);
  const issuesDetailed = Object.keys(issuesCounts).map(k => ({ name: k, count: issuesCounts[k] || 0, affectedAmount: issuesAffectedAmount[k] || 0 }));
  const result = new QualityResult({
    fileName: originalName,
    totalRecords,
    totalIssues,
    qualityScore,
    severity,
    totalAffectedAmount,
    issues: issuesArray,
    issuesDetailed
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
    for (let i=0;i<rows.length;i++){
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
