Healthcare Claims Data Quality & Anomaly Dashboard

One-click data quality and risk snapshot for healthcare insurance claims.
Upload a CSV → get schema checks, ICD-10 validation, duplicate detection (within & cross-file), explainable anomalies (robust statistics + frequency + behavior), a Quality Score & Severity, and Financial Impact (“Amount at Risk”) — all in a clear dashboard.

Live: https://abacus-project-six.vercel.app/

Repo: https://github.com/Pranay2874/abacus-project

 Key Features

Automatic validation: required fields, date/amount checks, ICD-10 code validation.

Duplicate checks: within the same file (repeat claimId) and across past uploads (MongoDB).

Explainable anomaly engine (No ML):

Statistical outliers via Median + MAD (robust Z-score).

Frequency anomalies (rare provider/diagnosis, high-cost provider).

Behavioral patterns (same patient+date+diagnosis signature → potential duplicate).

Quality Score & Severity (LOW/MEDIUM/HIGH/CRITICAL) based on records with at least one issue.

Financial impact: “Amount at Risk” per issue type and total.

Real-time alerts via Socket events for critical files / high financial risk.

Dashboard: KPIs, issue breakdown, per-row issues, impact tables.

 Why No ML?

Structured data: clear columns (claimId, patientName, diagnosisCode, amount, provider, date) suit rules + statistics better.

No labeled data: realistic for payers; rule+stats needs zero labels.

Auditability: exact reasons like “Invalid ICD-10” or “Robust Z=5.3” → easy to explain to auditors.

Fast to ship: reliable in a 24-hour hackathon; easy to maintain.

 CSV Schema

Columns (header row required):

claimId, patientName, diagnosisCode, amount, provider, date


amount numeric (₹ ok; we strip symbols)

date ideally YYYY-MM-DD (ISO)

 Architecture

Frontend: React + TypeScript + Tailwind

Backend: Node.js + Express + TypeScript, csv-parse for streaming

DB: MongoDB (local or Atlas) via Mongoose

Data: icd10.json reference loaded in memory (Set) for fast validation

Events: Socket.IO (or simple io.emit event bus in the server)

CSV Upload → Parser → Validation + Rules → Anomaly Engine → Duplicates
        ↘ Persist claims/results ↙ → Compute Quality + Severity + Impact → Emit Alerts → Return JSON → UI

 Quality Score (final, fixed)

Let Records with Issues = number of rows with ≥ 1 issue

Clean Records = Total Records − Records with Issues

Quality Score = (Clean Records / Total Records) × 100

Severity:

90–100 → LOW

75–89 → MEDIUM

35–74 → HIGH

0–34 → CRITICAL

This counts records, not issue totals — a row with 5 anomalies counts as 1 problematic record.

 Validation & Anomaly Rules

Schema / Rule Checks

Missing: claimId, patientName, diagnosisCode, provider, date, amount

amount non-numeric or ≤ 0

date invalid or in the future

ICD-10 not in reference (icd10.json)

Duplicate within upload (repeat claimId)

Cross-file duplicate (same claimId found in MongoDB from previous uploads)

Anomaly Engine (Explainable, No ML)

Statistical (Amounts)

Median + MAD → sigma = MAD × 1.4826

Robust Z = (amount − median) / sigma

|Z| > 3.5 ⇒ Amount Outlier (Robust) (HIGH)

Frequency

Rare Provider / Diagnosis: appears in < 1% of rows (MEDIUM)

High-Cost Provider: provider avg > 1.5 × global avg (MEDIUM), only if sample size > 5

Behavioral

Signature: patientName|date|diagnosisCode

If signature repeats within file ⇒ Potential Duplicate (MEDIUM)

Weekend Service (LOW)

Financial Impact

Amount at Risk = sum of amount for rows with ≥ 1 issue

Breakdown per issue: Issue → Count → Affected Amount

 Data Models (Mongoose)

ClaimRecord: each uploaded row (plus file metadata)
QualityResult: per‐file metrics (totals, score, severity, impact, issues)

(Keep your existing schema files; this README focuses on running & logic.)

Setup
1) Backend
cd backend
npm install


Create .env:

MONGODB_URI=mongodb://localhost:27017/claims-db   # or Atlas URI
PORT=4000
TOTAL_AFFECTED_AMOUNT_THRESHOLD=10000
CORS_ORIGIN=http://localhost:3000


Run:

npm run dev   # or npm start

2) Frontend
cd frontend
npm install


Create .env (CRA/Vite style):

REACT_APP_API_BASE_URL=http://localhost:3000
# or
VITE_API_BASE_URL=http://localhost:3000


Run:

npm run dev   # or npm start


Open http://localhost:3000
