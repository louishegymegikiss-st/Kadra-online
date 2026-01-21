/**
 * Script de test pour l'endpoint /api/orders/snapshot
 * 
 * Usage: node test_endpoint.js [URL]
 * Exemple: node test_endpoint.js http://localhost:3000
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:3000';

const testOrder = {
  event_id: 'BJ025',
  orders: [
    {
      order_id: 'test_' + Date.now(),
      event_id: 'BJ025',
      client_name: 'Test User',
      client_email: 'test@example.com',
      client_phone: '0612345678',
      items: [
        {
          product_id: 1,
          quantity: 1,
          unit_price: 10.50,
          filename: 'test.jpg',
          rider_name: 'Test Rider',
          horse_name: 'Test Horse'
        }
      ],
      total: 10.50,
      created_at: new Date().toISOString(),
      status: 'pending'
    }
  ]
};

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('🧪 Test endpoint /api/orders/snapshot');
  console.log('📍 URL:', BASE_URL);
  console.log('📦 Données:', JSON.stringify(testOrder, null, 2));
  console.log('');
  
  try {
    const result = await makeRequest(`${BASE_URL}/api/orders/snapshot`, testOrder);
    
    console.log('📊 Résultat:');
    console.log('  Status:', result.status);
    console.log('  Réponse:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('\n✅ Test réussi !');
      console.log('   Snapshot créé dans R2: orders/' + testOrder.event_id + '/pending_orders.json');
    } else {
      console.log('\n❌ Test échoué');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

test();
