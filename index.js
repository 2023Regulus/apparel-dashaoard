const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

function squareRequest(reqPath, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'connect.squareup.com',
      path: reqPath,
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

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const token = req.headers['authorization']?.replace('Bearer ', '') || '';

  if (url.pathname === '/api/payments') {
    if (!token) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'No token' }));
      return;
    }
    const begin = url.searchParams.get('begin_time') || '';
    const end = url.searchParams.get('end_time') || '';
    const apiPath = `/v2/payments?begin_time=${encodeURIComponent(begin)}&end_time=${encodeURIComponent(end)}&limit=100`;
    try {
      const data = await squareRequest(apiPath, token);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 静的ファイル配信
  let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const mime = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
