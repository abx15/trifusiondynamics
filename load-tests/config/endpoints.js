export const endpoints = [
  // Auth
  { method: 'POST', path: '/auth/login', authRole: 'none', payload: { email: 'admin@agencyos.com', password: 'password123' }, module: 'auth' },
  { method: 'GET', path: '/auth/me', authRole: 'admin', module: 'auth' },
  { method: 'POST', path: '/auth/refresh', authRole: 'admin', payload: { refreshToken: 'dummy' }, module: 'auth' },
  
  // CMS
  { method: 'GET', path: '/cms/blog', authRole: 'none', module: 'general' },
  { method: 'GET', path: '/cms/portfolio', authRole: 'none', module: 'general' },
  { method: 'GET', path: '/cms/services', authRole: 'none', module: 'general' },
  { method: 'GET', path: '/cms/testimonials', authRole: 'none', module: 'general' },
  { method: 'POST', path: '/cms/leads', authRole: 'none', payload: { name: 'Test Lead', email: 'test@example.com' }, module: 'general' },
  
  // CRM
  { method: 'POST', path: '/crm/leads', authRole: 'admin', payload: { name: 'CRM Lead', email: 'crm@example.com' }, module: 'general' },
  { method: 'GET', path: '/crm/leads', authRole: 'admin', module: 'general' },
  { method: 'PATCH', path: '/crm/leads/:id/stage', authRole: 'admin', payload: { stage: 'Contacted' }, module: 'general', requiresId: 'lead' },
  { method: 'GET', path: '/crm/quotes', authRole: 'admin', module: 'general' },
  
  // Clients
  { method: 'GET', path: '/clients', authRole: 'admin', module: 'general' },
  { method: 'GET', path: '/clients/:id', authRole: 'admin', module: 'general', requiresId: 'client' },
  
  // Projects
  { method: 'GET', path: '/projects', authRole: 'admin', module: 'general' },
  { method: 'POST', path: '/projects/:id/tasks', authRole: 'admin', payload: { title: 'New Task' }, module: 'general', requiresId: 'project' },
  { method: 'PATCH', path: '/tasks/:id/move', authRole: 'admin', payload: { status: 'In Progress' }, module: 'general', requiresId: 'task' },
  
  // Billing
  { method: 'POST', path: '/billing/invoices', authRole: 'admin', payload: { amount: 1000 }, module: 'general' },
  { method: 'GET', path: '/billing/invoices', authRole: 'admin', module: 'general' },
  { method: 'POST', path: '/billing/invoices/:id/payments', authRole: 'admin', payload: { amountPaid: 1000 }, module: 'general', requiresId: 'invoice' },
  { method: 'GET', path: '/billing/finance/summary', authRole: 'admin', module: 'general' },
  
  // Helpdesk
  { method: 'POST', path: '/helpdesk/tickets', authRole: 'client', payload: { issue: 'Need help' }, module: 'general' },
  { method: 'GET', path: '/helpdesk/tickets', authRole: 'admin', module: 'general' },
  { method: 'GET', path: '/helpdesk/faq', authRole: 'none', module: 'general' },
  
  // Documents
  { method: 'GET', path: '/documents', authRole: 'admin', module: 'general' },
  { method: 'POST', path: '/documents/upload-url', authRole: 'admin', payload: { filename: 'test.pdf' }, module: 'general' },
  
  // HR
  { method: 'GET', path: '/hr/employees', authRole: 'admin', module: 'general' },
  { method: 'POST', path: '/hr/attendance/check-in', authRole: 'employee', payload: { timestamp: '2026-07-12' }, module: 'general' },
  { method: 'POST', path: '/hr/attendance/check-out', authRole: 'employee', payload: { timestamp: '2026-07-12' }, module: 'general' },
  
  // Payroll
  { method: 'GET', path: '/payroll/payslips', authRole: 'employee', module: 'general' },
  
  // AI
  { method: 'POST', path: '/ai/email-writer', authRole: 'admin', payload: { prompt: 'Write an email to a client' }, module: 'ai' },
  { method: 'POST', path: '/ai/chat', authRole: 'admin', payload: { message: 'Hello AI' }, module: 'ai' },
  
  // Analytics
  { method: 'GET', path: '/analytics/dashboard', authRole: 'admin', module: 'general' },
  { method: 'GET', path: '/analytics/revenue', authRole: 'admin', module: 'general' },
  
  // Automation
  { method: 'GET', path: '/automation/workflows', authRole: 'admin', module: 'general' },
  { method: 'POST', path: '/automation/workflows/:id/trigger', authRole: 'admin', payload: { input: 'test' }, module: 'general', requiresId: 'workflow' },
  
  // Developer
  { method: 'GET', path: '/developer/api-keys', authRole: 'admin', module: 'general' },
  { method: 'GET', path: '/developer/request-logs', authRole: 'admin', module: 'general' },
  
  // Client Portal
  { method: 'GET', path: '/portal/projects', authRole: 'client', module: 'general' },
  { method: 'GET', path: '/portal/invoices', authRole: 'client', module: 'general' },
  { method: 'GET', path: '/portal/tickets', authRole: 'client', module: 'general' }
];
