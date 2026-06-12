const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
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
    case 'payment.created':
    case 'payment.updated':
      console.log('💳 支払い完了:', event.data);
      supabase.from('sales').insert({
  amount: event.data.object?.amount_money?.amount || 0,
  item_name: event.data.object?.line_items?.[0]?.name || '',
  payment_type: event.data.object?.source_type || '',
  order_id: event.data.object?.order_id || ''
});
   sendLineNotify('💰 売上発生: ' + (event.data.object?.amount_money?.amount || 0) + '円');


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
function sendLineNotify(message) {
  const data = JSON.stringify({
    to: process.env.LINE_USER_ID,
    messages: [{ type: 'text', text: message }]
  });

  const options = {
    hostname: 'api.line.me',
    path: '/v2/bot/message/push',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.LINE_TOKEN
    }
  };

  const req = https.request(options, (res) => {
    res.on('data', () => {});
  });
  req.write(data);
  req.end();
}


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

