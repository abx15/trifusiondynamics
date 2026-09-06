const http = require('http');
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    const isLogin = req.url === '/api/auth/login';
    const isAnalytics = req.url === '/api/analytics/dashboard';
    
    res.setHeader('Content-Type', 'application/json');
    if (isLogin) {
      res.writeHead(201);
      res.end(JSON.stringify({ accessToken: 'fake_token' }));
    } else if (isAnalytics) {
      res.writeHead(200);
      res.end(JSON.stringify({ id: 'mock_' + Date.now(), status: 'PAID', revenue: 1000 }));
    } else {
      res.writeHead(201);
      res.end(JSON.stringify({ id: 'mock_' + Date.now(), status: 'PAID' }));
    }
  });
});
server.listen(3001, () => console.log('Mock server listening on port 3001'));
