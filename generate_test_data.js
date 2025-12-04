const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'test_claims_1000.csv');

// Valid ICD-10 codes
const validICDCodes = ['E11.9', 'I10', 'J45.909', 'Z23', 'M79.3', 'K21.9', 'F32.9', 'G43.909', 'N39.0', 'R50.9'];

// Provider names
const providers = [
    'City General Hospital',
    'Memorial Medical Center',
    'St. Mary\'s Clinic',
    'Riverside Health',
    'Northside Medical Group',
    'Downtown Urgent Care',
    'Wellness Family Practice',
    'Advanced Specialists'
];

// Patient first and last names for realistic data
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

let lines = ['claimId,patientName,diagnosisCode,amount,provider,date'];

for (let i = 1; i <= 1000; i++) {
    let claimId = `CLM-2025-${String(i).padStart(5, '0')}`;
    const r = Math.floor(Math.random() * 100) + 1;

    let patientName, diagnosisCode, amount, provider, date;

    // Select random provider
    provider = providers[Math.floor(Math.random() * providers.length)];

    // Generate random date in 2024-2025
    const year = Math.random() > 0.1 ? 2024 : 2025;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (r <= 60) {
        // 60% valid records
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4500 + 150).toFixed(2);
    } else if (r <= 68) {
        // 8% missing patientName (Schema Error)
        patientName = '';
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4500 + 150).toFixed(2);
    } else if (r <= 75) {
        // 7% invalid diagnosis code
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = `INV${Math.floor(Math.random() * 900 + 100)}`;
        amount = (Math.random() * 4500 + 150).toFixed(2);
    } else if (r <= 80) {
        // 5% negative/zero amount (Business Rule Error)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 300 - 150).toFixed(2);
    } else if (r <= 84) {
        // 4% future dates (Business Rule Anomaly)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4500 + 150).toFixed(2);
        date = '2026-03-15'; // Future date
    } else if (r <= 87) {
        // 3% non-numeric amount (Schema Error)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = 'N/A';
    } else if (r <= 90) {
        // 3% weekend dates (Business Rule Anomaly)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4500 + 150).toFixed(2);
        date = '2025-01-04'; // Saturday
    } else if (r <= 93) {
        // 3% missing diagnosisCode (Schema Error)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = '';
        amount = (Math.random() * 4500 + 150).toFixed(2);
    } else if (r <= 95) {
        // 2% extremely high amounts (Statistical Anomaly)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 50000 + 25000).toFixed(2);
    } else if (r <= 97) {
        // 2% missing provider (Schema Error)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4500 + 150).toFixed(2);
        provider = '';
    } else if (r <= 98) {
        // 1% invalid date format (Schema Error)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4500 + 150).toFixed(2);
        date = '13/45/2025'; // Invalid format
    } else {
        // 2% potential duplicates (reuse previous claim ID)
        if (i > 50) {
            const prevIndex = i - Math.floor(Math.random() * 30 + 10);
            claimId = `CLM-2025-${String(prevIndex).padStart(5, '0')}`;
        }
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4500 + 150).toFixed(2);
    }

    lines.push(`${claimId},${patientName},${diagnosisCode},${amount},${provider},${date}`);
}

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
const sizeKB = fs.statSync(outputPath).size / 1024;
console.log(`✓ Created ${outputPath}`);
console.log(`Total rows: 1000`);
console.log(`File size: ${sizeKB.toFixed(2)} KB`);
console.log('\nData includes:');
console.log('- 60% valid records');
console.log('- 8% missing patient names');
console.log('- 7% invalid diagnosis codes');
console.log('- 5% negative/zero amounts');
console.log('- 4% future dates');
console.log('- 3% non-numeric amounts');
console.log('- 3% weekend dates');
console.log('- 3% missing diagnosis codes');
console.log('- 2% extremely high amounts (outliers)');
console.log('- 2% missing providers');
console.log('- 1% invalid date formats');
console.log('- 2% duplicate claim IDs');
