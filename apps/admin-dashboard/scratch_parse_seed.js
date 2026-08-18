const fs = require('fs');
const path = require('path');

const seedPath = 'c:/Users/arunk/Desktop/AgencyOS/packages/database/seed.ts';
const content = fs.readFileSync(seedPath, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

const targets = ['employee', 'leave', 'payslip', 'salaryStructure', 'recruitment', 'webhook', 'apiKey'];
targets.forEach(target => {
  const matches = [];
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(target.toLowerCase())) {
      matches.push({ lineNum: idx + 1, content: line.trim() });
    }
  });
  console.log(`\nTarget: ${target} (Total matches: ${matches.length})`);
  matches.slice(0, 15).forEach(m => {
    console.log(`  Line ${m.lineNum}: ${m.content}`);
  });
});
