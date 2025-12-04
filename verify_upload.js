const fs = require('fs');
const { Blob } = require('buffer');

async function run() {
    const fileContent = fs.readFileSync('sample-data/sample_synthetic_3000.csv');
    const blob = new Blob([fileContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'sample_synthetic_3000.csv');

    try {
        const res = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        console.log('Status:', res.status);
        if (data.anomalies) {
            console.log('Anomalies found:', data.anomalies.length);
            console.log('Sample anomalies:', JSON.stringify(data.anomalies.slice(0, 3), null, 2));
        } else {
            console.log('No anomalies field in response');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}
run();
