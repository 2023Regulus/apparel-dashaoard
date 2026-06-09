const https = require('https');

const PORT = process.env.PORT || 3000;

function squareRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'connect.squareup.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Square-Version': '2024-01-18',
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

require('http').createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const token = req.headers['authorization']?.replace('Bearer ', '') || '';

  if (!token) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'No token' }));
    return;
  }

  if (url.pathname === '/api/payments') {
    const begin = url.searchParams.get('begin_time') || '';
    const end = url.searchParams.get('end_time') || '';
    const path = `/v2/payments?begin_time=${encodeURIComponent(begin)}&end_time=${encodeURIComponent(end)}&limit=100`;
    try {
      const data = await squareRequest(path, token);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));

}).listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
