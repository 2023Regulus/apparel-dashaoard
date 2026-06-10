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
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Webhook受信サーバー ──────────────────
const server = http.createServer((req, res) => {

  // ヘルスチェック
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  // Webhookエンドポイント
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        console.log('📩 Webhook受信:', event.type);
        console.log(JSON.stringify(event, null, 2));

        // イベントの種類ごとに処理
        handleWebhookEvent(event);

        res.writeHead(200);
        res.end('OK');
      } catch (e) {
        console.error('Parse error:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

function handleWebhookEvent(event) {
  switch (event.type) {
    case 'payment.completed':
      console.log('💳 支払い完了:', event.data);
      break;
    case 'order.created':
      console.log('🛒 注文作成:', event.data);
      break;
    case 'inventory.count.updated':
      console.log('📦 在庫更新:', event.data);
      break;
    default:
      console.log('📌 その他イベント:', event.type);
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
