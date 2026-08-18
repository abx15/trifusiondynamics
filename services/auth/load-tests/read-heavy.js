const autocannon = require('autocannon');

// For read-heavy, we simulate 50 users for 60 seconds
async function run() {
  const instance = autocannon({
    url: 'http://localhost:3000',
    connections: 50,
    duration: 10,
    headers: {
      'Authorization': `Bearer test_admin_token`
    },
    requests: [
      { method: 'GET', path: '/api/crm/leads' },
      { method: 'GET', path: '/api/projects' },
      { method: 'GET', path: '/api/billing/invoices' },
      { method: 'GET', path: '/api/analytics/dashboard' }
    ]
  }, (err, result) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('--- READ HEAVY RESULTS ---');
      console.log(`Req/Sec: ${result.requests.average}`);
      console.log(`Latency p50: ${result.latency.p50} ms`);
      console.log(`Latency p95: ${result.latency.p95} ms`);
      console.log(`Latency p99: ${result.latency.p99} ms`);
      console.log(`Errors: ${result.errors}`);
      console.log(`Non-2xx: ${result.non2xx}`);
    }
  });

  autocannon.track(instance, { renderProgressBar: false });
}

run();
