const fs = require('fs');

const schemaPath = 'packages/database/prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// List of models and the indexes to add
const indexesToAdd = {
  Organization: [],
  User: ['@@index([organizationId])'],
  Role: [],
  Lead: ['@@index([organizationId])', '@@index([stage])', '@@index([assignedToId])'],
  Portfolio: ['@@index([organizationId])'],
  Service: ['@@index([organizationId])'],
  Testimonial: ['@@index([organizationId])'],
  Page: ['@@index([organizationId])'],
  Contact: ['@@index([organizationId])'],
  Client: ['@@index([organizationId])'],
  Quote: ['@@index([organizationId])'],
  FollowUp: ['@@index([organizationId])'],
  Project: ['@@index([organizationId])'],
  Sprint: ['@@index([organizationId])'],
  Task: ['@@index([organizationId])', '@@index([status])', '@@index([projectId])', '@@index([assignedToId])', '@@index([sprintId])'],
  TimeLog: ['@@index([organizationId])'],
  Milestone: ['@@index([organizationId])'],
  Invoice: ['@@index([organizationId])', '@@index([status])', '@@index([clientId])', '@@index([dueDate])'],
  Payment: ['@@index([organizationId])'],
  Subscription: ['@@index([organizationId])'],
  Expense: ['@@index([organizationId])'],
  Ticket: ['@@index([organizationId])', '@@index([status])', '@@index([assignedToId])', '@@index([clientId])'],
  Document: ['@@index([organizationId])'],
  DocumentFolder: ['@@index([organizationId])'],
  Faq: ['@@index([organizationId])'],
  Notification: ['@@index([organizationId])'],
  Employee: ['@@index([organizationId])', '@@index([status])', '@@index([department])'],
  Attendance: ['@@index([organizationId])'],
  LeaveRequest: ['@@index([organizationId])'],
  EmployeeDocument: [],
  Recruitment: ['@@index([organizationId])'],
  SalaryStructure: [],
  Payslip: [],
  BankDetail: [],
  AiProposalRequest: ['@@index([organizationId])'],
  AiSeoAudit: ['@@index([organizationId])'],
  AiEmailDraft: ['@@index([organizationId])'],
  AiMeetingSummary: ['@@index([organizationId])'],
  AiKnowledgeEmbedding: ['@@index([organizationId])'],
  RevenueRollup: ['@@index([organizationId])'],
  ClientRollup: ['@@index([organizationId])'],
  TeamPerformanceRollup: ['@@index([organizationId])'],
  Workflow: ['@@index([organizationId])'],
  WorkflowRun: ['@@index([workflowId, startedAt])'],
  ApiKey: ['@@index([organizationId])'],
  ApiRequestLog: ['@@index([organizationId, createdAt])'],
  Webhook: ['@@index([organizationId])'],
  WebhookDelivery: []
};

const lines = content.split('\n');
let modifiedLines = [];
let currentModel = null;
let modelLines = [];
let modelHasOrganizationId = false;

function processModel(modelName, linesArray) {
  let toAdd = indexesToAdd[modelName] || [];
  
  // if not explicitly defined, check if it has organizationId
  let hasOrgId = linesArray.some(l => l.trim().startsWith('organizationId '));
  if (hasOrgId && !toAdd.includes('@@index([organizationId])') && !indexesToAdd.hasOwnProperty(modelName)) {
    toAdd.push('@@index([organizationId])');
  }

  // Find where to insert indexes (before the @@schema tag or at the end)
  let schemaIndex = linesArray.findIndex(l => l.trim().startsWith('@@schema'));
  
  let result = [...linesArray];
  if (schemaIndex === -1) schemaIndex = result.length - 1; // before closing brace
  
  let existingIndexes = result.filter(l => l.trim().startsWith('@@index')).map(l => l.trim());
  
  // insert missing indexes
  let inserts = [];
  for (const idx of toAdd) {
    if (!existingIndexes.includes(idx)) {
      inserts.push(`  ${idx}`);
    }
  }
  
  if (inserts.length > 0) {
    result.splice(schemaIndex, 0, ...inserts);
  }
  
  return result;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('model ')) {
    currentModel = line.split(' ')[1];
    modelLines = [line];
  } else if (currentModel) {
    modelLines.push(line);
    if (line.startsWith('}')) {
      // process model
      modifiedLines.push(...processModel(currentModel, modelLines));
      currentModel = null;
      modelLines = [];
    }
  } else {
    modifiedLines.push(line);
  }
}

fs.writeFileSync(schemaPath, modifiedLines.join('\n'));
console.log('Indexes added successfully!');
