/**
 * Module pour gérer les données (produits, commandes) sur R2 par événement
 */
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

// Configuration R2 depuis variables d'environnement
const R2_ENDPOINT = process.env.R2_ENDPOINT || 'https://2dc708dd22889ad3d4a69dc8b22529c9.r2.cloudflarestorage.com';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || 'cf46e4ac89b40447f068513eac99b97c';
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || '03114d0e6c727612caf31d895c16c98d27a723abbc37d63a5d2fbee031cd6efc';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'photolesgarennesgalerie';

// Client S3 pour R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY
  }
});

/**
 * Lit un fichier JSON depuis R2
 * @param {string} r2Key - Chemin R2 (ex: "events/BJ025/products.json")
 * @returns {Promise<object|null>} - Données JSON ou null si introuvable
 */
async function readJsonFromR2(r2Key) {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key
    });
    const response = await s3Client.send(command);
    const body = await response.Body.transformToString();
    return JSON.parse(body);
  } catch (e) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error(`❌ Erreur lecture R2 ${r2Key}:`, e);
    throw e;
  }
}

/**
 * Écrit un fichier JSON vers R2 (écriture atomique)
 * @param {string} r2Key - Chemin R2
 * @param {object} data - Données à écrire
 * @returns {Promise<boolean>} - true si succès
 */
async function writeJsonToR2(r2Key, data) {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const jsonBytes = Buffer.from(jsonContent, 'utf8');
    
    // Écriture atomique via fichier temporaire
    const tmpKey = `${r2Key}.tmp`;
    
    // 1. Écrire dans .tmp
    const tmpCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: tmpKey,
      Body: jsonBytes,
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    await s3Client.send(tmpCommand);
    
    // 2. Écrire le fichier final
    const finalCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: jsonBytes,
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    await s3Client.send(finalCommand);
    
    // 3. Supprimer le .tmp (optionnel, on peut le laisser)
    try {
      const deleteTmpCommand = new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: tmpKey
      });
      // On ne supprime pas vraiment, on laisse le .tmp pour debug si besoin
    } catch (e) {
      // Ignorer
    }
    
    return true;
  } catch (e) {
    console.error(`❌ Erreur écriture R2 ${r2Key}:`, e);
    throw e;
  }
}

/**
 * Vérifie si un fichier existe sur R2
 * @param {string} r2Key - Chemin R2
 * @returns {Promise<boolean>}
 */
async function existsOnR2(r2Key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key
    });
    await s3Client.send(command);
    return true;
  } catch (e) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw e;
  }
}

// ============================================
// PRODUITS par événement
// ============================================

/**
 * Récupère les produits pour un événement
 * @param {string} eventId - ID de l'événement (ex: "BJ025")
 * @returns {Promise<Array>} - Liste des produits
 */
async function getProductsForEvent(eventId) {
  const r2Key = `events/${eventId}/products.json`;
  const data = await readJsonFromR2(r2Key);
  return data?.products || [];
}

/**
 * Sauvegarde les produits pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {Array} products - Liste des produits
 * @returns {Promise<boolean>}
 */
async function saveProductsForEvent(eventId, products) {
  const r2Key = `events/${eventId}/products.json`;
  const data = {
    version: 1,
    event_id: eventId,
    updated_at: new Date().toISOString(),
    products: products
  };
  return writeJsonToR2(r2Key, data);
}

// ============================================
// COMMANDES par événement
// ============================================

/**
 * Récupère les commandes pour un événement
 * @param {string} eventId - ID de l'événement
 * @returns {Promise<Array>} - Liste des commandes
 */
async function getOrdersForEvent(eventId) {
  const r2Key = `events/${eventId}/orders.json`;
  const data = await readJsonFromR2(r2Key);
  return data?.orders || [];
}

/**
 * Sauvegarde les commandes pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {Array} orders - Liste des commandes
 * @returns {Promise<boolean>}
 */
async function saveOrdersForEvent(eventId, orders) {
  const r2Key = `events/${eventId}/orders.json`;
  const data = {
    version: 1,
    event_id: eventId,
    updated_at: new Date().toISOString(),
    orders: orders
  };
  return writeJsonToR2(r2Key, data);
}

/**
 * Ajoute ou met à jour une commande pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {object} order - Commande à ajouter/mettre à jour
 * @returns {Promise<object>} - Commande mise à jour
 */
async function upsertOrderForEvent(eventId, order) {
  const orders = await getOrdersForEvent(eventId);
  const now = new Date().toISOString();
  const orderId = order.order_id || order.id;
  
  const idx = orders.findIndex(o => (o.order_id || o.id) === orderId);
  const updatedOrder = {
    ...order,
    order_id: orderId,
    event_id: eventId,
    updated_at: now,
    created_at: order.created_at || now
  };
  
  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...updatedOrder };
  } else {
    orders.push(updatedOrder);
  }
  
  await saveOrdersForEvent(eventId, orders);
  return updatedOrder;
}

/**
 * Récupère toutes les commandes de tous les événements (pour vue globale)
 * @returns {Promise<Array>} - Liste de toutes les commandes avec event_id
 */
async function getAllOrders() {
  try {
    const eventsList = await readJsonFromR2('events_list.json');
    const events = eventsList?.events || [];
    const allOrders = [];
    
    for (const event of events) {
      const eventId = event.event_id || event.id;
      if (eventId) {
        const orders = await getOrdersForEvent(eventId);
        orders.forEach(order => {
          allOrders.push({
            ...order,
            event_id: eventId,
            event_name: event.name || eventId
          });
        });
      }
    }
    
    return allOrders;
  } catch (e) {
    console.error('❌ Erreur récupération toutes les commandes:', e);
    return [];
  }
}

// ============================================
// CONFIGURATION par événement
// ============================================

/**
 * Récupère la configuration pour un événement
 * @param {string} eventId - ID de l'événement
 * @returns {Promise<object>} - Configuration
 */
async function getConfigForEvent(eventId) {
  const r2Key = `events/${eventId}/config.json`;
  const data = await readJsonFromR2(r2Key);
  return data || {
    event_id: eventId,
    turnover_objective: 0,
    created_at: new Date().toISOString()
  };
}

/**
 * Sauvegarde la configuration pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {object} config - Configuration
 * @returns {Promise<boolean>}
 */
async function saveConfigForEvent(eventId, config) {
  const r2Key = `events/${eventId}/config.json`;
  const data = {
    ...config,
    event_id: eventId,
    updated_at: new Date().toISOString()
  };
  return writeJsonToR2(r2Key, data);
}

module.exports = {
  // Utilitaires
  readJsonFromR2,
  writeJsonToR2,
  existsOnR2,
  
  // Produits
  getProductsForEvent,
  saveProductsForEvent,
  
  // Commandes
  getOrdersForEvent,
  saveOrdersForEvent,
  upsertOrderForEvent,
  getAllOrders,
  
  // Configuration
  getConfigForEvent,
  saveConfigForEvent
};
