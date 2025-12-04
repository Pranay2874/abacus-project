const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'claims_1000_final.csv');

// Valid ICD-10 codes
const validICDCodes = ['E11.9', 'I10', 'J45.909', 'Z23', 'M79.3', 'K21.9', 'F32.9', 'G43.909', 'N39.0', 'R50.9', 'E78.5', 'J44.9', 'M25.511', 'R10.9'];

// Provider names
const providers = [
    'Metropolitan General Hospital',
    'Sunrise Medical Center',
    'Lakeside Family Clinic',
    'Valley Health Associates',
    'Eastside Urgent Care',
    'Westwood Specialists',
    'Central City Hospital',
    'Northgate Medical Group',
    'Riverside Wellness Center',
    'Summit Healthcare'
];

// Patient first and last names
const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael', 'Emily', 'Daniel', 'Elizabeth'];
const lastNames = ['Anderson', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell'];

// Function to generate valid weekday date in 2024-2025
function generateValidDate() {
    let validDate = false;
    let dateStr = '';

    while (!validDate) {
        const year = Math.random() > 0.3 ? 2024 : 2025;
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;

        dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay();

        // Check if it's a weekday (Mon-Fri) and not in the future
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && dateObj <= new Date()) {
            validDate = true;
        }
    }

    return dateStr;
}

let lines = ['claimId,patientName,diagnosisCode,amount,provider,date'];

for (let i = 1; i <= 1000; i++) {
    let claimId = `CLM-2025-${String(i).padStart(5, '0')}`;
    const r = Math.floor(Math.random() * 100) + 1;

    let patientName, diagnosisCode, amount, provider, date;

    // Select random provider
    provider = providers[Math.floor(Math.random() * providers.length)];

    // Generate valid weekday date (no weekends, no future, valid format)
    date = generateValidDate();

    if (r <= 55) {
        // 55% completely valid records
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4800 + 200).toFixed(2);
    } else if (r <= 64) {
        // 9% missing patientName (Schema Error)
        patientName = '';
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4800 + 200).toFixed(2);
    } else if (r <= 72) {
        // 8% invalid diagnosis code
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = `INVALID${Math.floor(Math.random() * 900 + 100)}`;
        amount = (Math.random() * 4800 + 200).toFixed(2);
    } else if (r <= 78) {
        // 6% negative/zero amount (Business Rule Error)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 400 - 200).toFixed(2);
    } else if (r <= 83) {
        // 5% non-numeric amount (Schema Error)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = ['N/A', 'PENDING', 'TBD', 'NULL'][Math.floor(Math.random() * 4)];
    } else if (r <= 88) {
        // 5% missing diagnosisCode (Schema Error)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = '';
        amount = (Math.random() * 4800 + 200).toFixed(2);
    } else if (r <= 91) {
        // 3% extremely high amounts (Statistical Anomaly - Outliers)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 60000 + 30000).toFixed(2);
    } else if (r <= 94) {
        // 3% extremely low amounts (Statistical Anomaly - Outliers)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 20 + 1).toFixed(2);
    } else if (r <= 97) {
        // 3% missing provider (Schema Error)
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4800 + 200).toFixed(2);
        provider = '';
    } else if (r <= 99) {
        // 2% missing claimId (Schema Error)
        claimId = '';
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4800 + 200).toFixed(2);
    } else {
        // 1% potential duplicates (reuse previous claim ID)
        if (i > 100) {
            const prevIndex = i - Math.floor(Math.random() * 50 + 20);
            claimId = `CLM-2025-${String(prevIndex).padStart(5, '0')}`;
        }
        patientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        diagnosisCode = validICDCodes[Math.floor(Math.random() * validICDCodes.length)];
        amount = (Math.random() * 4800 + 200).toFixed(2);
    }

    lines.push(`${claimId},${patientName},${diagnosisCode},${amount},${provider},${date}`);
}

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
const sizeKB = fs.statSync(outputPath).size / 1024;
console.log(`✓ Created ${outputPath}`);
console.log(`Total rows: 1000`);
console.log(`File size: ${sizeKB.toFixed(2)} KB`);
console.log('\n📊 Data Distribution:');
console.log('✅ 55% - Completely valid records');
console.log('❌ Schema Errors:');
console.log('   - 9% missing patient names');
console.log('   - 5% non-numeric amounts (N/A, PENDING, etc.)');
console.log('   - 5% missing diagnosis codes');
console.log('   - 3% missing providers');
console.log('   - 2% missing claim IDs');
console.log('⚠️  Business Rule Violations:');
console.log('   - 8% invalid diagnosis codes');
console.log('   - 6% negative/zero amounts');
console.log('   - 1% duplicate claim IDs');
console.log('📈 Statistical Anomalies:');
console.log('   - 3% extremely high amounts ($30k-$90k)');
console.log('   - 3% extremely low amounts ($1-$20)');
console.log('\n✓ All dates are valid weekdays in 2024-2025 (no weekends, no future dates)');
