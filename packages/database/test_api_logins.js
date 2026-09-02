const axios = require('axios');

const API_BASE = 'http://localhost:8000/api';

const DEFAULT_PASSWORD = 'trifusiondynamicsA3web';

const testAccounts = [
  { name: 'Super Admin', email: 'trifusiondynamics@gmail.com', expectedTarget: '/super-admin' },
  { name: 'Admin', email: 'admin@trifusiondynamics.com', expectedTarget: '/dashboard' },
  { name: 'Sales Agent', email: 'sales.trifusion@gmail.com', expectedTarget: '/crm' },
  { name: 'Support Agent', email: 'support.trifusion@gmail.com', expectedTarget: '/tickets' },
  { name: 'HR Agent', email: 'hr.trifusion@gmail.com', expectedTarget: '/hr' },
  { name: 'Agent', email: 'agent@trifusiondynamics.com', expectedTarget: '/agent/dashboard' },
  { name: 'Employee', email: 'bob.dev@trifusiondynamics.com', expectedTarget: '/attendance' },
  { name: 'Client', email: 'client@apexretail.com', expectedTarget: '/client/dashboard' },
];

async function verifyAllLogins() {
  console.log('Testing live API login endpoints on http://localhost:8000/api/auth/login...\n');
  console.log(`Using default password: ${DEFAULT_PASSWORD}\n`);
  let passCount = 0;

  for (const acc of testAccounts) {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: acc.email,
        password: DEFAULT_PASSWORD,
      });

      if (res.status === 200 || res.status === 201) {
        const { user, accessToken } = res.data;
        console.log(`✅ [${acc.name}] SUCCESS`);
        console.log(`   User: ${user.name} (${user.email})`);
        console.log(`   Roles: [${user.roles.join(', ')}]`);
        console.log(`   AccessToken received: ${accessToken.substring(0, 20)}...`);
        console.log(`   Target: ${acc.expectedTarget}\n`);
        passCount++;
      } else {
        console.log(`❌ [${acc.name}] Unexpected Status: ${res.status}\n`);
      }
    } catch (err) {
      console.log(`❌ [${acc.name}] FAILED: ${err?.response?.data?.message || err.message}\n`);
    }
  }

  console.log(`\n================================`);
  console.log(`Results: ${passCount}/${testAccounts.length} Logins Succeeded!`);
  console.log(`================================`);
}

verifyAllLogins();
