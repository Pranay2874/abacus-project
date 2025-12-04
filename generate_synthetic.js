const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'sample-data', 'sample_synthetic_3000.csv');
const validICDCodes = ['E11', 'I10', 'J45', 'Z99', 'A00', 'M54', 'K21', 'F32', 'G40', 'Z00', 'A01', 'B00'];
const providers = ['Provider A', 'Provider B', 'Provider C', 'Hospital Alpha', 'Clinic North', 'Specialist Center'];

let lines = ['claimId,patientName,diagnosisCode,amount,provider,date'];

for (let i = 1; i <= 3000; i++) {
  const claimId = `CLM${(10000 + i).toString()}`;
  const r = Math.floor(Math.random() * 100) + 1;
  
  let patientName, diagnosisCode, amount, provider, date;
  provider = providers[Math.floor(Math.random() * providers.length)];
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  date = `2025-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  if (r <= 70) {
    // 70% valid
    patientName = `Patient${i}`;
    diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
    amount = Math.floor(Math.random() * 5900) + 100;
  } else if (r <= 80) {
    // 10% missing patientName
    patientName = '';
    diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
    amount = Math.floor(Math.random() * 5900) + 100;
  } else if (r <= 88) {
    // 8% invalid ICD
    patientName = `Patient${i}`;
    diagnosisCode = `INVALID${Math.floor(Math.random() * 900) + 100}`;
    amount = Math.floor(Math.random() * 5900) + 100;
  } else if (r <= 95) {
    // 7% invalid/zero amount
    patientName = `Patient${i}`;
    diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
    amount = Math.floor(Math.random() * 500) - 250;
  } else {
    // 5% missing diagnosisCode
    patientName = `Patient${i}`;
    diagnosisCode = '';
    amount = Math.floor(Math.random() * 5900) + 100;
  }

  lines.push(`${claimId},${patientName},${diagnosisCode},${amount},${provider},${date}`);
  
  if (i % 500 === 0) {
    console.log(`Generated ${i} rows...`);
  }
}

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
const sizeKB = fs.statSync(outputPath).size / 1024;
console.log(`✓ Created ${outputPath}`);
console.log(`Total rows: 3000`);
console.log(`File size: ${sizeKB.toFixed(2)} KB`);
