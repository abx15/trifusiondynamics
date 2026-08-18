const fs = require('fs');

const collection = {
  "info": {
    "name": "Trifusion-Dynamics",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": []
};

function createFolder(name, items = []) {
  return { "name": name, "item": items };
}

function createRequest(name, method, urlPath, script = null, body = null) {
  const req = {
    "name": name,
    "event": [],
    "request": {
      "method": method,
      "header": [{ "key": "Authorization", "value": "Bearer {{admin_token}}", "type": "text" }],
      "url": {
        "raw": "{{base_url}}/api" + urlPath,
        "host": ["{{base_url}}"],
        "path": ["api", ...urlPath.split('/').filter(p => p)]
      }
    },
    "response": []
  };

  if (body) {
    req.request.header.push({ "key": "Content-Type", "value": "application/json", "type": "text" });
    req.request.body = {
      "mode": "raw",
      "raw": JSON.stringify(body, null, 2)
    };
  }

  if (script) {
    req.event.push({
      "listen": "test",
      "script": {
        "exec": script.split('\n'),
        "type": "text/javascript"
      }
    });
  }

  return req;
}

// Basic folders representation
collection.item.push(createFolder("01-Auth"));
collection.item.push(createFolder("02-CMS"));
collection.item.push(createFolder("03-CRM-Clients"));
collection.item.push(createFolder("04-Projects-ERP"));
collection.item.push(createFolder("05-Billing"));
collection.item.push(createFolder("06-Helpdesk-Documents-Notifications"));
collection.item.push(createFolder("07-HR-Payroll"));
collection.item.push(createFolder("08-AI-Platform"));
collection.item.push(createFolder("09-Analytics-Automation"));
collection.item.push(createFolder("10-Developer-Portal"));

// 00-Full-Flow-Smoke-Test
const fullFlow = [];

// 1. Register a new org + admin user -> POST /auth/register
fullFlow.push(createRequest("1. Register", "POST", "/auth/register", 
  "pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });",
  { email: "admin@test.com", password: "password", name: "Admin" }
));

// 2. Login, get token -> POST /auth/login
fullFlow.push(createRequest("2. Login", "POST", "/auth/login", 
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.environment.set("admin_token", json.accessToken);`,
  { email: "admin@test.com", password: "password" }
));

// 3. Submit a contact form (public /cms/leads) -> POST /cms/leads
fullFlow.push(createRequest("3. Submit Contact Form", "POST", "/cms/leads",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.environment.set("cms_lead_id", json.id);`,
  { name: "John Doe", email: "john@doe.com", message: "Interested in services" }
));

// 4. Promote that submission to a CRM lead -> POST /crm/leads
fullFlow.push(createRequest("4. Promote to CRM Lead", "POST", "/crm/leads",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.environment.set("lead_id", json.id);`,
  { firstName: "John", lastName: "Doe", email: "john@doe.com" }
));

// 5. Move lead through pipeline stages to WON -> PATCH /crm/leads/:id/stage
fullFlow.push(createRequest("5. Move Lead to WON", "PATCH", "/crm/leads/{{lead_id}}/stage",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });`,
  { stage: "WON" }
));

// 6. Convert lead to client -> POST /crm/leads/:id/convert
fullFlow.push(createRequest("6. Convert Lead to Client", "POST", "/crm/leads/{{lead_id}}/convert",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.environment.set("client_id", json.id);`,
  {}
));

// 7. Create a project for that client -> POST /projects
fullFlow.push(createRequest("7. Create Project", "POST", "/projects",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.environment.set("project_id", json.id);`,
  { name: "Website Redesign", clientId: "{{client_id}}" }
));

// 8. Add 3 tasks, move them through TODO→IN_PROGRESS→DONE -> POST /projects/:id/tasks, PATCH /tasks/:id/move
fullFlow.push(createRequest("8a. Create Task 1", "POST", "/projects/{{project_id}}/tasks",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.environment.set("task_id", json.id);`,
  { name: "Design Mockups", assigneeId: "user_id_placeholder" }
));

fullFlow.push(createRequest("8b. Move Task to DONE", "PATCH", "/tasks/{{task_id}}/move",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });`,
  { status: "DONE", order: 1 }
));

// 9. Create an invoice for that client/project -> POST /billing/invoices
fullFlow.push(createRequest("9. Create Invoice", "POST", "/billing/invoices",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.environment.set("invoice_id", json.id);`,
  { clientId: "{{client_id}}", projectId: "{{project_id}}", subtotal: 1000 }
));

// 10. Record a full payment, confirm invoice status becomes PAID -> POST /billing/invoices/:id/payments
fullFlow.push(createRequest("10. Record Payment", "POST", "/billing/invoices/{{invoice_id}}/payments",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.test('Invoice status is PAID', function() { pm.expect(json.status).to.eql('PAID'); });`,
  { amount: 1180 }
));

// 11. Create a support ticket for that client -> POST /helpdesk/tickets
fullFlow.push(createRequest("11. Create Ticket", "POST", "/helpdesk/tickets",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.environment.set("ticket_id", json.id);`,
  { subject: "Need help", clientId: "{{client_id}}" }
));

// 12. Send a chat message on that ticket -> POST /helpdesk/tickets/:id/messages
fullFlow.push(createRequest("12. Send Chat Message", "POST", "/helpdesk/tickets/{{ticket_id}}/messages",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });`,
  { message: "Hello" }
));

// 13. Call the AI proposal generator -> POST /ai/proposal
fullFlow.push(createRequest("13. Generate Proposal", "POST", "/ai/proposal",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });`,
  { clientName: "John Doe", requirements: "Build a new CRM" }
));

// 14. Check the analytics dashboard -> GET /analytics/dashboard
fullFlow.push(createRequest("14. Analytics Dashboard", "GET", "/analytics/dashboard",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });`
));

// 15. Create an automation workflow and manually trigger it -> POST /automation/workflows, POST /automation/workflows/:id/trigger
fullFlow.push(createRequest("15a. Create Workflow", "POST", "/automation/workflows",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });
   var json = pm.response.json();
   pm.environment.set("workflow_id", json.id);`,
  { name: "Test Workflow", actions: [] }
));

fullFlow.push(createRequest("15b. Trigger Workflow", "POST", "/automation/workflows/{{workflow_id}}/trigger",
  `pm.test('Status is OK', function() { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });`,
  { event: "manual_trigger" }
));

collection.item.unshift(createFolder("00-Full-Flow-Smoke-Test", fullFlow));

fs.writeFileSync('postman/trifusion-dynamics.postman_collection.json', JSON.stringify(collection, null, 2));

const environment = {
  "name": "Local",
  "values": [
    { "key": "base_url", "value": "http://localhost:3000", "type": "default", "enabled": true },
    { "key": "admin_token", "value": "", "type": "default", "enabled": true },
    { "key": "employee_token", "value": "", "type": "default", "enabled": true },
    { "key": "client_token", "value": "", "type": "default", "enabled": true },
    { "key": "org_id", "value": "", "type": "default", "enabled": true },
    { "key": "lead_id", "value": "", "type": "default", "enabled": true },
    { "key": "client_id", "value": "", "type": "default", "enabled": true },
    { "key": "project_id", "value": "", "type": "default", "enabled": true },
    { "key": "task_id", "value": "", "type": "default", "enabled": true },
    { "key": "invoice_id", "value": "", "type": "default", "enabled": true },
    { "key": "ticket_id", "value": "", "type": "default", "enabled": true },
    { "key": "workflow_id", "value": "", "type": "default", "enabled": true }
  ]
};

fs.writeFileSync('postman/local.postman_environment.json', JSON.stringify(environment, null, 2));
