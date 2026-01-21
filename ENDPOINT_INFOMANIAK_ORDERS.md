# Endpoint Infomaniak pour commandes → R2

## À créer côté serveur Infomaniak

Le frontend JavaScript envoie les commandes vers un endpoint public hébergé sur Infomaniak, qui écrit dans R2.

### Endpoint à créer

**URL** : `/api/orders/snapshot` (ou selon votre configuration)

**Méthode** : `POST`

**Format de requête** :
```json
{
  "event_id": "BJ025",
  "orders": [
    {
      "order_id": "order_xxxxx",
      "event_id": "BJ025",
      "client_name": "Dupont Jean",
      "client_email": "jean@example.com",
      "client_phone": "0612345678",
      "items": [...],
      "created_at": "2026-01-21T10:30:00Z",
      "status": "pending",
      ...
    }
  ]
}
```

### Implémentation (exemple Node.js/Express)

```javascript
const express = require('express');
const AWS = require('aws-sdk');
const app = express();

app.use(express.json());

// Configuration R2 (Cloudflare)
const s3 = new AWS.S3({
  endpoint: 'https://0ed22897e4a8686bd8c20227ad79d736.r2.cloudflarestorage.com',
  accessKeyId: 'VOTRE_ACCESS_KEY_ID',
  secretAccessKey: 'VOTRE_SECRET_ACCESS_KEY',
  signatureVersion: 'v4',
  region: 'auto'
});

const BUCKET_NAME = 'photos-kadra';

app.post('/api/orders/snapshot', async (req, res) => {
  try {
    const { event_id, orders } = req.body;
    
    if (!event_id || !orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'event_id et orders requis' });
    }
    
    // Lire le snapshot existant depuis R2
    const r2Key = `orders/${event_id}/pending_orders.json`;
    let existingSnapshot = null;
    
    try {
      const existing = await s3.getObject({
        Bucket: BUCKET_NAME,
        Key: r2Key
      }).promise();
      existingSnapshot = JSON.parse(existing.Body.toString());
    } catch (e) {
      // Fichier n'existe pas encore, c'est normal
    }
    
    // Merger avec les nouvelles commandes (éviter doublons)
    let allOrders = orders;
    if (existingSnapshot) {
      const existingOrderIds = new Set(
        existingSnapshot.orders.map(o => o.order_id).filter(Boolean)
      );
      const newOrders = orders.filter(o => !existingOrderIds.has(o.order_id));
      allOrders = [...existingSnapshot.orders, ...newOrders];
    }
    
    // Créer le snapshot
    const snapshot = {
      event_id,
      snapshot_version: existingSnapshot ? existingSnapshot.snapshot_version + 1 : 1,
      generated_at: new Date().toISOString(),
      count: allOrders.length,
      orders: allOrders
    };
    
    // Upload atomique : d'abord .tmp
    const tmpKey = `orders/${event_id}/pending_orders.tmp.json`;
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: tmpKey,
      Body: JSON.stringify(snapshot, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    }).promise();
    
    // Puis upload final
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: r2Key,
      Body: JSON.stringify(snapshot, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    }).promise();
    
    res.json({
      message: `Snapshot v${snapshot.snapshot_version} créé`,
      event_id,
      new_orders: orders.length,
      total_orders: allOrders.length
    });
    
  } catch (error) {
    console.error('Erreur création snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Implémentation (exemple PHP)

```php
<?php
// api/orders/snapshot.php

header('Content-Type: application/json');

require_once 'vendor/autoload.php'; // AWS SDK PHP

use Aws\S3\S3Client;

$s3 = new S3Client([
    'version' => 'latest',
    'region' => 'auto',
    'endpoint' => 'https://0ed22897e4a8686bd8c20227ad79d736.r2.cloudflarestorage.com',
    'credentials' => [
        'key' => 'VOTRE_ACCESS_KEY_ID',
        'secret' => 'VOTRE_SECRET_ACCESS_KEY',
    ],
]);

$bucket = 'photos-kadra';
$data = json_decode(file_get_contents('php://input'), true);

$eventId = $data['event_id'] ?? null;
$orders = $data['orders'] ?? [];

if (!$eventId || !is_array($orders)) {
    http_response_code(400);
    echo json_encode(['error' => 'event_id et orders requis']);
    exit;
}

$r2Key = "orders/{$eventId}/pending_orders.json";

// Lire snapshot existant
$existingSnapshot = null;
try {
    $result = $s3->getObject([
        'Bucket' => $bucket,
        'Key' => $r2Key
    ]);
    $existingSnapshot = json_decode($result['Body'], true);
} catch (Exception $e) {
    // Fichier n'existe pas
}

// Merger
$allOrders = $orders;
if ($existingSnapshot) {
    $existingIds = array_column($existingSnapshot['orders'], 'order_id');
    $newOrders = array_filter($orders, fn($o) => !in_array($o['order_id'], $existingIds));
    $allOrders = array_merge($existingSnapshot['orders'], $newOrders);
}

$snapshot = [
    'event_id' => $eventId,
    'snapshot_version' => ($existingSnapshot['snapshot_version'] ?? 0) + 1,
    'generated_at' => date('c'),
    'count' => count($allOrders),
    'orders' => $allOrders
];

// Upload atomique
$tmpKey = "orders/{$eventId}/pending_orders.tmp.json";
$s3->putObject([
    'Bucket' => $bucket,
    'Key' => $tmpKey,
    'Body' => json_encode($snapshot, JSON_PRETTY_PRINT),
    'ContentType' => 'application/json',
    'CacheControl' => 'no-cache'
]);

$s3->putObject([
    'Bucket' => $bucket,
    'Key' => $r2Key,
    'Body' => json_encode($snapshot, JSON_PRETTY_PRINT),
    'ContentType' => 'application/json',
    'CacheControl' => 'no-cache'
]);

echo json_encode([
    'message' => "Snapshot v{$snapshot['snapshot_version']} créé",
    'event_id' => $eventId,
    'new_orders' => count($orders),
    'total_orders' => count($allOrders)
]);
```

## Configuration frontend

Dans `index.html`, l'endpoint est configuré via :
```javascript
window.PUBLIC_API_URL = '/api/orders/snapshot';
```

## Sécurité

⚠️ **Important** : Les credentials R2 ne doivent **jamais** être exposés dans le frontend JavaScript.

- Stocker les credentials côté serveur uniquement
- Utiliser des variables d'environnement
- Optionnel : Ajouter une authentification (API key, JWT, etc.)
