const axios = require('axios');

const API_BASE = 'http://localhost:8000/api';

const testAccounts = [
  { name: 'Super Admin', email: 'trifusiondynamics@gmail.com', password: 'trifusiondynamicsA3web', expectedTarget: '/super-admin' },
  { name: 'Admin', email: 'admin@trifusiondynamics.com', password: 'ChangeThisPassword123!', expectedTarget: '/dashboard' },
  { name: 'Sales Agent', email: 'sales.trifusion@gmail.com', password: 'Welcome@123', expectedTarget: '/crm' },
  { name: 'Support Agent', email: 'support.trifusion@gmail.com', password: 'Welcome@123', expectedTarget: '/tickets' },
  { name: 'HR Agent', email: 'hr.trifusion@gmail.com', password: 'Welcome@123', expectedTarget: '/hr' },
  { name: 'Agent', email: 'agent@trifusiondynamics.com', password: 'Agent@123', expectedTarget: '/agent/dashboard' },
  { name: 'Employee', email: 'bob.dev@trifusiondynamics.com', password: 'Welcome@123', expectedTarget: '/attendance' },
  { name: 'Client', email: 'client@apexretail.com', password: 'Client@123', expectedTarget: '/client/dashboard' },
];

async function verifyAllLogins() {
  console.log('Testing live API login endpoints on http://localhost:8000/api/auth/login...\n');
  let passCount = 0;

  for (const acc of testAccounts) {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: acc.email,
        password: acc.password,
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
