export type Anomaly = {
    type: string;
    detail: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};

// Helper for Median Absolute Deviation (Robust Z-Score)
function calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateMAD(values: number[], median: number): number {
    const deviations = values.map(v => Math.abs(v - median));
    return calculateMedian(deviations);
}

export function detectAnomalies(rows: any[]): Record<number, Anomaly[]> {
    const anomalies: Record<number, Anomaly[]> = {};
    const amounts: number[] = [];
    const providers: string[] = [];
    const diagnoses: string[] = [];

    // For duplicate detection
    const claimSignatures = new Map<string, number[]>(); // key -> [indices]

    // 1. Collect valid data for stats
    rows.forEach((r, idx) => {
        // Only consider valid amounts for stats
        const amount = parseFloat(String(r.amount || '0').replace(/[^0-9.-]+/g, ''));
        if (!isNaN(amount)) {
            amounts.push(amount);
        }

        providers.push(r.provider || 'UNKNOWN');
        diagnoses.push(r.diagnosisCode || 'UNKNOWN');

        // Signature for duplicate check: Patient + Date + Diagnosis
        const signature = `${r.patientName}|${r.date}|${r.diagnosisCode}`;
        if (!claimSignatures.has(signature)) {
            claimSignatures.set(signature, []);
        }
        claimSignatures.get(signature)?.push(idx);
    });

    // 2. Statistics for Amount (Robust Z-Score using MAD)
    // Standard Z-score is sensitive to outliers, MAD is robust.
    const medianAmount = calculateMedian(amounts);
    const madAmount = calculateMAD(amounts, medianAmount);
    // Consistency constant for normal distribution
    const sigma = madAmount * 1.4826;

    // 3. Frequency Analysis
    const providerFreq: Record<string, number> = {};
    const diagnosisFreq: Record<string, number> = {};
    const providerAmounts: Record<string, number[]> = {};

    providers.forEach((p, i) => {
        providerFreq[p] = (providerFreq[p] || 0) + 1;
        if (amounts[i] !== undefined) {
            if (!providerAmounts[p]) providerAmounts[p] = [];
            providerAmounts[p].push(amounts[i]);
        }
    });
    diagnoses.forEach(d => diagnosisFreq[d] = (diagnosisFreq[d] || 0) + 1);

    const totalRows = rows.length;
    const globalAvgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // 4. Detect
    rows.forEach((r, idx) => {
        const rowAnomalies: Anomaly[] = [];
        const amountVal = parseFloat(String(r.amount || '0').replace(/[^0-9.-]+/g, ''));
        const provider = r.provider || 'UNKNOWN';
        const diagnosis = r.diagnosisCode || 'UNKNOWN';
        const dateStr = r.date ? new Date(r.date) : null;

        // --- Business Rules ---

        // Future Date
        if (dateStr && dateStr > new Date()) {
            rowAnomalies.push({
                type: 'Future Date',
                detail: `Service date ${r.date} is in the future`,
                severity: 'HIGH'
            });
        }

        // Weekend Service
        if (dateStr) {
            const day = dateStr.getDay();
            if (day === 0 || day === 6) {
                rowAnomalies.push({
                    type: 'Weekend Service',
                    detail: `Service date ${r.date} is on a weekend`,
                    severity: 'LOW'
                });
            }
        }

        // Potential Duplicate Claim (Business Rule)
        const signature = `${r.patientName}|${r.date}|${r.diagnosisCode}`;
        const others = claimSignatures.get(signature) || [];
        if (others.length > 1) {
            rowAnomalies.push({
                type: 'Potential Duplicate',
                detail: `Same Patient, Date, and Diagnosis as ${others.length - 1} other claim(s)`,
                severity: 'MEDIUM'
            });
        }

        // --- Statistical Anomalies ---

        // Robust Amount Outlier
        if (!isNaN(amountVal) && sigma > 0) {
            const robustZ = (amountVal - medianAmount) / sigma;
            if (Math.abs(robustZ) > 3.5) { // Slightly higher threshold for robust
                rowAnomalies.push({
                    type: 'Amount Outlier (Robust)',
                    detail: `Amount ${amountVal} is an outlier (Robust Z: ${robustZ.toFixed(2)})`,
                    severity: 'HIGH'
                });
            }
        }

        // Rare Provider (< 1%)
        if (providerFreq[provider] / totalRows < 0.01) {
            rowAnomalies.push({
                type: 'Rare Provider',
                detail: `Provider '${provider}' appears rarely (<1%)`,
                severity: 'MEDIUM'
            });
        }

        // Rare Diagnosis (< 1%)
        if (diagnosisFreq[diagnosis] / totalRows < 0.01) {
            rowAnomalies.push({
                type: 'Rare Diagnosis',
                detail: `Diagnosis '${diagnosis}' appears rarely (<1%)`,
                severity: 'MEDIUM'
            });
        }

        // High Average Provider
        const pAmounts = providerAmounts[provider] || [];
        if (pAmounts.length > 5) { // Only if enough data
            const pAvg = pAmounts.reduce((a, b) => a + b, 0) / pAmounts.length;
            if (pAvg > globalAvgAmount * 1.5) {
                rowAnomalies.push({
                    type: 'High Cost Provider',
                    detail: `Provider avg ($${pAvg.toFixed(0)}) is >1.5x global avg`,
                    severity: 'MEDIUM'
                });
            }
        }

        if (rowAnomalies.length > 0) {
            anomalies[idx] = rowAnomalies;
        }
    });

    return anomalies;
}
