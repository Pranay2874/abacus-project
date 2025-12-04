const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'test_claims_1000.csv');
const outputPath = path.join(__dirname, 'test_claims_1000_cleaned.csv');

// Read the CSV
const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

const cleanedLines = [header];
let removedCount = 0;

dataLines.forEach((line, idx) => {
    if (!line.trim()) return; // Skip empty lines

    const parts = line.split(',');
    if (parts.length < 6) return; // Skip malformed lines

    const date = parts[5]; // Date is the last column

    // Check for bad dates
    let isBadDate = false;

    // Check for future dates
    if (date.startsWith('2026') || date.startsWith('2027')) {
        isBadDate = true;
    }

    // Check for invalid date format
    if (date.includes('/') || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        isBadDate = true;
    }

    // Check for weekend dates (Saturday 2025-01-04 or Sunday)
    if (date === '2025-01-04' || date === '2025-01-05') {
        isBadDate = true;
    }

    // Try to parse the date to check if it's valid
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
        isBadDate = true;
    } else {
        // Check if it's a weekend
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            isBadDate = true;
        }
    }

    if (!isBadDate) {
        cleanedLines.push(line);
    } else {
        removedCount++;
    }
});

fs.writeFileSync(outputPath, cleanedLines.join('\n'), 'utf8');
const sizeKB = fs.statSync(outputPath).size / 1024;

console.log(`✓ Created ${outputPath}`);
console.log(`Original rows: ${dataLines.length}`);
console.log(`Cleaned rows: ${cleanedLines.length - 1}`);
console.log(`Removed rows with bad dates: ${removedCount}`);
console.log(`File size: ${sizeKB.toFixed(2)} KB`);
