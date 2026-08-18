const fs = require('fs');
const schemaPath = 'packages/database/prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

const invalidModels = ['FollowUp', 'Milestone', 'Task', 'Sprint', 'TimeLog', 'Payment'];

invalidModels.forEach(model => {
  const regex = new RegExp(`(model\\s+${model}\\s+\\{[\\s\\S]*?)@@index\\(\\[organizationId\\]\\)\\s*([\\s\\S]*?\\})`, 'g');
  content = content.replace(regex, '$1$2');
});

fs.writeFileSync(schemaPath, content);
console.log('Fixed schema');
