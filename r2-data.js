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

// Exposer le client S3 pour utilisation dans server.js
function getS3Client() {
  return s3Client;
}

/**
 * Lit un fichier JSON depuis R2
 * @param {string} r2Key - Chemin R2 (ex: "events/BJ025/products.json")
 * @returns {Promise<object|null>} - Données JSON ou null si introuvable
 */
async function readJsonFromR2(r2Key) {
  try {
    console.log(`📖 Lecture R2: ${r2Key}`);
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key
    });
    const response = await s3Client.send(command);
    const body = await response.Body.transformToString();
    const parsed = JSON.parse(body);
    console.log(`✅ R2 ${r2Key} lu avec succès:`, JSON.stringify(parsed, null, 2).substring(0, 500));
    return parsed;
  } catch (e) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) {
      console.log(`⚠️ R2 ${r2Key} non trouvé (404)`);
      return null;
    }
    console.error(`❌ Erreur lecture R2 ${r2Key}:`, e);
    console.error(`❌ Détails erreur:`, e.message, e.name, e.$metadata);
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
    
    // Nettoyer un ancien .tmp s'il existe (safe - seulement si c'est un .tmp)
    if (tmpKey.endsWith('.tmp')) {
      try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const deleteTmpCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: tmpKey
        });
        await s3Client.send(deleteTmpCommand);
        console.log(`🧹 Nettoyage ancien .tmp R2: ${tmpKey}`);
      } catch (cleanupError) {
        // Ignorer si le fichier n'existe pas ou autre erreur (safe)
        if (cleanupError.name !== 'NoSuchKey' && cleanupError.$metadata?.httpStatusCode !== 404) {
          console.debug(`⚠️ Impossible de nettoyer .tmp ${tmpKey}:`, cleanupError.message);
        }
      }
    }
    
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
    
    // 3. Supprimer le .tmp après succès (safe - seulement si c'est un .tmp)
    if (tmpKey.endsWith('.tmp')) {
      try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const deleteTmpCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: tmpKey
        });
        await s3Client.send(deleteTmpCommand);
        console.log(`🧹 .tmp supprimé après succès: ${tmpKey}`);
      } catch (deleteError) {
        // Ignorer si suppression échoue (non-critique)
        console.debug(`⚠️ Impossible de supprimer .tmp ${tmpKey}:`, deleteError.message);
      }
    }
    
    return true;
  } catch (e) {
    // Nettoyer le .tmp en cas d'erreur (safe)
    const tmpKey = `${r2Key}.tmp`;
    if (tmpKey.endsWith('.tmp')) {
      try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const deleteTmpCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: tmpKey
        });
        await s3Client.send(deleteTmpCommand);
      } catch (cleanupError) {
        // Ignorer
      }
    }
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
 * Récupère les produits pour un événement (fusionne avec produits globaux)
 * @param {string} eventId - ID de l'événement (ex: "BJ025") ou "global" pour tous
 * @returns {Promise<Array>} - Liste des produits
 */
async function getProductsForEvent(eventId) {
  const products = [];
  
  // 1. Charger les produits globaux (tous événements)
  try {
    const globalData = await readJsonFromR2('products_global.json');
    if (globalData?.products && Array.isArray(globalData.products)) {
      globalData.products.forEach(p => {
        products.push({ ...p, is_global: true });
      });
      console.log(`📦 ${globalData.products.length} produit(s) global(aux) chargé(s)`);
    }
  } catch (e) {
    // Fichier global n'existe pas encore, c'est normal
    console.debug('📦 Aucun produit global (fichier products_global.json absent)');
  }
  
  // 2. Charger les produits spécifiques à l'événement (si eventId n'est pas "global")
  if (eventId && eventId !== 'global') {
    try {
      const r2Key = `events/${eventId}/products.json`;
      const data = await readJsonFromR2(r2Key);
      if (data?.products && Array.isArray(data.products)) {
        data.products.forEach(p => {
          products.push({ ...p, is_global: false, event_id: eventId });
        });
        console.log(`📦 ${data.products.length} produit(s) spécifique(s) chargé(s) pour ${eventId}`);
      }
    } catch (e) {
      console.debug(`📦 Aucun produit spécifique pour ${eventId}`);
    }
  }

  // Dédupliquer par id : version événement écrase la version globale ; garder event_sources pour l'admin (suppression)
  const byId = {};
  products.forEach(p => {
    const id = p.id != null ? String(p.id) : null;
    if (!id) return;
    const source = p.is_global ? 'global' : (p.event_id || null);
    if (!byId[id]) {
      byId[id] = { ...p, event_sources: [] };
    } else {
      Object.assign(byId[id], p);
    }
    if (source && !byId[id].event_sources.includes(source)) {
      byId[id].event_sources.push(source);
    }
  });
  return Object.values(byId);
}

/**
 * Sauvegarde les produits pour un événement ou globalement
 * @param {string} eventId - ID de l'événement ou "global" pour tous
 * @param {Array} products - Liste des produits
 * @returns {Promise<boolean>}
 */
async function saveProductsForEvent(eventId, products) {
  // Séparer produits globaux et spécifiques
  const globalProducts = products.filter(p => p.is_global === true);
  const eventProducts = products.filter(p => p.is_global !== true);
  
  // Sauvegarder produits globaux
  if (globalProducts.length > 0 || eventId === 'global') {
    const globalData = {
      version: 1,
      updated_at: new Date().toISOString(),
      products: globalProducts.map(p => {
        const { is_global, event_id, ...product } = p;
        return product;
      })
    };
    await writeJsonToR2('products_global.json', globalData);
    console.log(`💾 ${globalProducts.length} produit(s) global(aux) sauvegardé(s)`);
  }
  
  // Sauvegarder produits spécifiques à l'événement
  if (eventId && eventId !== 'global' && eventProducts.length > 0) {
    const r2Key = `events/${eventId}/products.json`;
    const data = {
      version: 1,
      event_id: eventId,
      updated_at: new Date().toISOString(),
      products: eventProducts.map(p => {
        const { is_global, event_id, ...product } = p;
        return product;
      })
    };
    await writeJsonToR2(r2Key, data);
    console.log(`💾 ${eventProducts.length} produit(s) spécifique(s) sauvegardé(s) pour ${eventId}`);
  }
  
  return true;
}

/**
 * Ajoute ou met à jour un produit dans products_global.json
 * @param {object} product - Produit (avec id)
 * @returns {Promise<boolean>}
 */
async function mergeProductIntoGlobal(product) {
  const data = await readJsonFromR2('products_global.json');
  const list = data?.products && Array.isArray(data.products) ? data.products : [];
  const id = product.id != null ? String(product.id) : null;
  const idx = id ? list.findIndex(p => String(p.id) === id) : -1;
  const clean = { ...product };
  delete clean.is_global;
  delete clean.event_id;
  if (idx >= 0) {
    list[idx] = clean;
  } else {
    list.push(clean);
  }
  await writeJsonToR2('products_global.json', {
    version: 1,
    updated_at: new Date().toISOString(),
    products: list
  });
  return true;
}

/**
 * Ajoute ou met à jour un produit dans events/{eventId}/products.json
 * @param {string} eventId - ID événement
 * @param {object} product - Produit (avec id)
 * @returns {Promise<boolean>}
 */
async function mergeProductIntoEvent(eventId, product) {
  const r2Key = `events/${eventId}/products.json`;
  const data = await readJsonFromR2(r2Key);
  const list = data?.products && Array.isArray(data.products) ? data.products : [];
  const id = product.id != null ? String(product.id) : null;
  const idx = id ? list.findIndex(p => String(p.id) === id) : -1;
  const clean = { ...product };
  delete clean.is_global;
  delete clean.event_id;
  if (idx >= 0) {
    list[idx] = clean;
  } else {
    list.push(clean);
  }
  await writeJsonToR2(r2Key, {
    version: 1,
    event_id: eventId,
    updated_at: new Date().toISOString(),
    products: list
  });
  return true;
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
  const r2Key = `orders/${eventId}/pending_orders.json`;
  console.log(`📖 Lecture R2: ${r2Key}`);
  const data = await readJsonFromR2(r2Key);
  const orders = data?.orders || [];
  console.log(`  ✅ ${orders.length} commande(s) lue(s) depuis ${r2Key}`);
  return orders;
}

/**
 * Sauvegarde les commandes pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {Array} orders - Liste des commandes
 * @returns {Promise<boolean>}
 */
async function saveOrdersForEvent(eventId, orders) {
  const r2Key = `orders/${eventId}/pending_orders.json`;
  const snapshot = {
    event_id: eventId,
    snapshot_version: 1, // Sera incrémenté si fichier existe déjà
    generated_at: new Date().toISOString(),
    count: orders.length,
    orders: orders
  };
  
  // Si le fichier existe, préserver le snapshot_version
  const existing = await readJsonFromR2(r2Key);
  if (existing && existing.snapshot_version) {
    snapshot.snapshot_version = existing.snapshot_version + 1;
  }
  
  return writeJsonToR2(r2Key, snapshot);
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
    console.log('📋 Récupération toutes les commandes depuis R2...');
    const eventsList = await readJsonFromR2('events_list.json');
    let events = eventsList?.events || [];
    console.log(`📅 ${events.length} événement(s) trouvé(s) dans events_list.json`);
    
    // Si events est un tableau de strings (format: ["BJ025", "BJ026"]), convertir en objets
    if (events.length > 0 && typeof events[0] === 'string') {
      console.log(`📅 Format détecté: tableau de strings, conversion en objets`);
      events = events.map(eventId => ({
        event_id: eventId,
        id: eventId,
        name: eventId // Par défaut, utiliser l'ID comme nom
      }));
    }
    
    const allOrders = [];
    
    for (const event of events) {
      const eventId = event.event_id || event.id || event; // Support aussi si event est directement une string
      const eventName = event.name || event.event_name || eventId;
      
      if (eventId) {
        try {
          console.log(`🔍 Lecture commandes pour événement: ${eventId} (${eventName})`);
          const orders = await getOrdersForEvent(eventId);
          console.log(`  ✅ ${orders.length} commande(s) trouvée(s) pour ${eventId}`);
          
          orders.forEach(order => {
            allOrders.push({
              ...order,
              event_id: eventId,
              event_name: eventName // Utiliser le nom de l'événement depuis events_list
            });
          });
        } catch (e) {
          // Ignorer les erreurs pour un événement spécifique et continuer
          console.warn(`⚠️ Erreur récupération commandes pour ${eventId}:`, e.message);
        }
      }
    }
    
    console.log(`✅ Total: ${allOrders.length} commande(s) récupérée(s) depuis tous les événements`);
    return allOrders;
  } catch (e) {
    console.error('❌ Erreur récupération toutes les commandes:', e);
    console.error('Stack:', e.stack);
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
  getS3Client,

  // Produits
  getProductsForEvent,
  saveProductsForEvent,
  mergeProductIntoGlobal,
  mergeProductIntoEvent,
  
  // Commandes
  getOrdersForEvent,
  saveOrdersForEvent,
  upsertOrderForEvent,
  getAllOrders,
  
  // Configuration
  getConfigForEvent,
  saveConfigForEvent
};
