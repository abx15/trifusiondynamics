const autocannon = require('autocannon');

// For auth-stress, simulate 100 users for 30 seconds hitting login
async function run() {
  const instance = autocannon({
    url: 'http://localhost:3000',
    connections: 100,
    duration: 10,
    headers: {
      'Content-Type': 'application/json'
    },
    requests: [
      { 
        method: 'POST', 
        path: '/api/auth/login',
        body: JSON.stringify({ 
          email: 'admin@trifusiondynamics.com',
          password: 'WrongPassword' // Trigger failed-login tracking intentionally
        })
      }
    ]
  }, (err, result) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('--- AUTH STRESS RESULTS ---');
      console.log(`Req/Sec: ${result.requests.average}`);
      console.log(`Latency p50: ${result.latency.p50} ms`);
      console.log(`Latency p95: ${result.latency.p95} ms`);
      console.log(`Latency p99: ${result.latency.p99} ms`);
      console.log(`Errors: ${result.errors}`);
      console.log(`Non-2xx: ${result.non2xx}`);
      
      // Breakdown of status codes (to see 429s)
      console.log('Status Codes:');
      for (const [code, count] of Object.entries(result.statusCodeStats)) {
        console.log(`  ${code}: ${count}`);
      }
    }
  });

  autocannon.track(instance, { renderProgressBar: false });
}

run();
