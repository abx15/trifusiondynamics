const autocannon = require('autocannon');

// For write-heavy, we simulate 20 users for 60 seconds
async function run() {
  const instance = autocannon({
    url: 'http://localhost:3000',
    connections: 20,
    duration: 10,
    headers: {
      'Authorization': `Bearer test_admin_token`,
      'Content-Type': 'application/json'
    },
    requests: [
      { 
        method: 'POST', 
        path: '/api/crm/leads',
        body: JSON.stringify({ 
          firstName: 'Load', 
          lastName: 'Tester',
          email: 'loadtest@example.com',
          status: 'NEW'
        })
      },
      { 
        method: 'POST', 
        path: '/api/tasks/task_123/time-logs',
        body: JSON.stringify({
          hours: 1,
          description: 'Load test time log'
        })
      }
    ]
  }, (err, result) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('--- WRITE HEAVY RESULTS ---');
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
