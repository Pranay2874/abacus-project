# Healthcare Claims Data Quality & Anomaly Dashboard

A full-stack web application that analyzes **healthcare insurance claim CSV files** and gives a **one-click snapshot** of:

- Data quality issues (schema + business rules)
- Anomalies (statistical, frequency-based, behavioural)
- Overall **Quality Score & Severity**
- **Financial risk** (total “Amount at Risk”)

It is designed for **payer / healthcare data** but the engine can be adapted to any structured claims dataset.

---

## 1. What This App Does (Simple Explanation)

1. You upload a **claims CSV** with columns:

   `claimId, patientName, diagnosisCode, amount, provider, date`

2. The backend:

   - Parses the CSV.
   - Runs **schema validation** (missing fields, invalid dates, invalid amount).
   - Validates **ICD-10 diagnosis codes** from a reference JSON file.
   - Detects:
     - Duplicates *inside* the file.
     - Duplicates *across* previously uploaded files (stored in MongoDB).
     - **Weird amounts** (statistical outliers using median + MAD).
     - Rare providers and diagnosis codes.
     - Behavioural patterns (same patient + same date + same diagnosis).
     - Future dates and weekend services.

3. It then computes:

   - `totalRecords`
   - `totalIssues`
   - `recordsWithIssues`
   - **Quality Score** = (Clean Records / Total Records) × 100  
   - **Severity** = LOW / MEDIUM / HIGH / CRITICAL  
   - **totalAffectedAmount** = sum of amounts from rows with ≥ 1 issue  
   - Breakdown: **Issue → Count → Amount at Risk**

4. The frontend shows:

   - Summary cards: Total Records, Records with Issues, Quality Score, Severity.
   - A table of all claims with attached issue list per row.
   - Charts showing issue distribution.
   - A financial impact table per issue type.

---

## 2. Tech Stack

**Frontend**

- React
- TypeScript
- Tailwind CSS

**Backend**

- Node.js
- Express
- TypeScript
- `csv-parse` for CSV streaming
- MongoDB + Mongoose

**Database**

- MongoDB (local or Atlas)

---

