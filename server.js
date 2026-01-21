/**
 * Serveur Express minimal pour servir les fichiers statiques
 * Le repo contient déjà index.html à la racine + static/
 * On sert directement depuis la racine du repo (où est server.js)
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser JSON
app.use(express.json());

// CORS pour permettre les requêtes depuis le frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Dossier où est server.js = racine du repo
const ROOT = __dirname;
const indexPath = path.join(ROOT, 'index.html');

console.log('=== CONFIGURATION SERVEUR ===');
console.log('ROOT =', ROOT);
console.log('index.html existe =', fs.existsSync(indexPath));

if (!fs.existsSync(indexPath)) {
  console.error('\n❌ ERREUR: index.html manquant dans', ROOT);
  console.error('Contenu de ROOT:', fs.readdirSync(ROOT));
} else {
  console.log('✅ index.html trouvé, serveur prêt');
}

// Endpoint pour créer snapshot des commandes dans R2
app.post('/api/orders/snapshot', async (req, res) => {
  console.log('📥 Requête reçue: POST /api/orders/snapshot');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Vérifier que AWS SDK v3 est disponible
    let S3Client, GetObjectCommand, PutObjectCommand;
    try {
      const awsSdk = require('@aws-sdk/client-s3');
      S3Client = awsSdk.S3Client;
      GetObjectCommand = awsSdk.GetObjectCommand;
      PutObjectCommand = awsSdk.PutObjectCommand;
      console.log('✅ AWS SDK v3 chargé');
    } catch (e) {
      console.error('❌ @aws-sdk/client-s3 non installé. Exécutez: npm install @aws-sdk/client-s3');
      return res.status(500).json({ 
        error: 'AWS SDK non disponible',
        hint: 'Installer avec: npm install @aws-sdk/client-s3'
      });
    }
    
    const { event_id, orders } = req.body;
    
    if (!event_id || !orders || !Array.isArray(orders)) {
      console.error('❌ Validation échouée: event_id ou orders manquants');
      return res.status(400).json({ error: 'event_id et orders requis' });
    }
    
    console.log(`📦 Traitement: event_id=${event_id}, ${orders.length} commande(s)`);
    
    // Configuration R2 depuis variables d'environnement ou valeurs par défaut
    const R2_ENDPOINT = process.env.R2_ENDPOINT || 'https://0ed22897e4a8686bd8c20227ad79d736.r2.cloudflarestorage.com';
    const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || '6ed17ae409c1969b754af590ee6b2d84';
    const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || '38725e098bc5d93f940f4bdcac31013da64fd4ddaeb2f348f87a7913e986f09b';
    const R2_BUCKET = process.env.R2_BUCKET_NAME || 'photos-kadra';
    
    // Configuration S3 Client pour R2 (v3)
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY
      }
    });
    
    // Lire le snapshot existant depuis R2
    const r2Key = `orders/${event_id}/pending_orders.json`;
    let existingSnapshot = null;
    
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key
      });
      const response = await s3Client.send(command);
      const bodyString = await response.Body.transformToString();
      existingSnapshot = JSON.parse(bodyString);
      console.log(`📥 Snapshot existant chargé: v${existingSnapshot.snapshot_version}, ${existingSnapshot.count} commandes`);
    } catch (e) {
      if (e.name !== 'NoSuchKey' && e.$metadata?.httpStatusCode !== 404) {
        console.error('Erreur lecture snapshot R2:', e);
      }
      // Fichier n'existe pas encore, c'est normal
    }
    
    // Merger avec les nouvelles commandes (éviter doublons par order_id)
    let allOrders = orders;
    if (existingSnapshot) {
      const existingOrderIds = new Set(
        existingSnapshot.orders.map(o => o.order_id).filter(Boolean)
      );
      const newOrders = orders.filter(o => o.order_id && !existingOrderIds.has(o.order_id));
      allOrders = [...existingSnapshot.orders, ...newOrders];
      console.log(`🔄 Merge: ${newOrders.length} nouvelle(s) commande(s) sur ${orders.length} reçue(s)`);
    }
    
    // Créer le snapshot
    const snapshot = {
      event_id,
      snapshot_version: existingSnapshot ? existingSnapshot.snapshot_version + 1 : 1,
      generated_at: new Date().toISOString(),
      count: allOrders.length,
      orders: allOrders
    };
    
    const snapshotJson = JSON.stringify(snapshot, null, 2);
    
    // Upload atomique : d'abord .tmp
    const tmpKey = `orders/${event_id}/pending_orders.tmp.json`;
    const tmpCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: tmpKey,
      Body: snapshotJson,
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    await s3Client.send(tmpCommand);
    
    // Puis upload final
    const finalCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: snapshotJson,
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    await s3Client.send(finalCommand);
    
    console.log(`✅ Snapshot v${snapshot.snapshot_version} uploadé: ${allOrders.length} commandes (${orders.length} nouvelles)`);
    
    res.json({
      message: `Snapshot v${snapshot.snapshot_version} de ${allOrders.length} commande(s) créé`,
      event_id,
      snapshot_version: snapshot.snapshot_version,
      new_orders: orders.length,
      total_orders: allOrders.length
    });
    
  } catch (error) {
    console.error('❌ Erreur création snapshot:', error);
    console.error('Stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Détails supplémentaires pour erreurs AWS
    if (error.code) {
      console.error('AWS Error Code:', error.code);
    }
    if (error.statusCode) {
      console.error('HTTP Status:', error.statusCode);
    }
    
    res.status(500).json({ 
      error: error.message || 'Erreur serveur',
      code: error.code,
      hint: 'Vérifier les credentials R2 et la connexion',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Servir les fichiers statiques depuis la racine
app.use(express.static(ROOT, {
  dotfiles: 'ignore',
  index: false // Ne pas servir index.html automatiquement, on le gère manuellement
}));

// Route pour index.html (SPA) - toutes les routes non-fichiers
app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h1>Erreur 404 - index.html introuvable</h1>
      <p>Le fichier index.html n'a pas été trouvé dans: ${ROOT}</p>
      <p>Vérifiez que le répertoire source Node.js pointe vers la racine du repo</p>
      <pre>ROOT: ${ROOT}</pre>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Fichiers servis depuis: ${ROOT}`);
  console.log(`🌐 Serveur prêt à recevoir des requêtes`);
});
