const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TOKEN = 'test_admin_token';
const CLIENT_TOKEN = 'test_client_token';

const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true // Resolve all statuses so we can check them
});

async function runSecurityChecks() {
  console.log('--- BASIC SECURITY CHECKS ---\n');
  let allPassed = true;

  const report = (name, passed, details) => {
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}`);
    if (details) console.log(`       ${details}`);
    if (!passed) allPassed = false;
  };

  // 1. SQL/NoSQL injection
  try {
    const res = await api.get(`/crm/leads?search='; DROP TABLE--`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    // Should be 200 with empty array (or just normal results), NOT 500
    report('SQL Injection Prevention', res.status === 200, `Status: ${res.status}`);
  } catch(e) {
    report('SQL Injection Prevention', false, e.message);
  }

  // 2. JWT Tampering
  try {
    // Fake tampered JWT (invalid signature)
    const header = Buffer.from(JSON.stringify({alg: "HS256", typ: "JWT"})).toString('base64');
    const payload = Buffer.from(JSON.stringify({sub: "123", roles: ["admin"], orgId: "org_2"})).toString('base64');
    const signature = 'fake_signature';
    const tamperedToken = `${header}.${payload}.${signature}`;
    
    const res = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    report('JWT Tampering', res.status === 401, `Status: ${res.status} (Expected 401)`);
  } catch(e) {
    report('JWT Tampering', false, e.message);
  }

  // 3. IDOR
  try {
    const res = await api.get('/portal/invoices/foreign_invoice_id', {
      headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
    });
    report('IDOR Prevention (Client Portal)', res.status === 404 || res.status === 403, `Status: ${res.status} (Expected 403/404)`);
  } catch(e) {
    report('IDOR Prevention (Client Portal)', false, e.message);
  }

  // 4. Rate Limit Bypass
  try {
    // Make 101 requests quickly to trigger the rate limiter (default 100/min)
    let rateLimited = false;
    for (let i = 0; i < 105; i++) {
      const res = await api.get('/cms/leads');
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }
    report('Rate Limit Check', rateLimited, rateLimited ? '429 Too Many Requests observed' : 'Did not hit rate limit after 105 requests');
  } catch(e) {
    report('Rate Limit Check', false, e.message);
  }

  // 5. Sensitive Data Exposure
  try {
    const res = await api.get('/hr/employees', {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const responseDataStr = JSON.stringify(res.data || {});
    // Should NOT contain password hashes or bank details in the list view
    const isExposed = responseDataStr.includes('password') || responseDataStr.includes('bankAccountNumber');
    report('Sensitive Data Exposure', !isExposed, isExposed ? 'Found sensitive fields in list response!' : 'No sensitive fields found');
  } catch(e) {
    report('Sensitive Data Exposure', false, e.message);
  }

  // 6. CORS Check
  try {
    const res = await api.options('/auth/login', {
      headers: { 
        'Origin': 'http://evil-cors-origin.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    // Should either reject or return strict CORS headers NOT matching the evil origin
    const acao = res.headers['access-control-allow-origin'];
    const passed = acao !== 'http://evil-cors-origin.com' && acao !== '*';
    report('CORS Verification', passed, `Allowed Origin: ${acao || 'none'}`);
  } catch(e) {
    report('CORS Verification', false, e.message);
  }

  console.log(`\nOverall Result: ${allPassed ? 'ALL PASS' : 'SOME FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

runSecurityChecks();
