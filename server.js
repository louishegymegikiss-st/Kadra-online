/**
 * Serveur Express minimal pour servir les fichiers statiques
 * Le repo contient déjà index.html à la racine + static/
 * On sert directement depuis la racine du repo (où est server.js)
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Charger les variables depuis .env si présent (utile quand on n'a que SSH)
try {
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  // dotenv non installé ou .env absent → OK, on dépendra des variables d'env système
}

const app = express();
const PORT = process.env.PORT || 3000;

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

// -----------------------
// Stripe (Checkout + Webhook)
// IMPORTANT: Le webhook Stripe doit recevoir le RAW body.
// On déclare donc la route webhook AVANT express.json().
// -----------------------
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

let stripe = null;
if (STRIPE_SECRET_KEY) {
  try {
    // eslint-disable-next-line global-require
    const Stripe = require('stripe');
    stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
    console.log('✅ Stripe initialisé');
  } catch (e) {
    console.error('❌ Erreur init Stripe:', e);
  }
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY non défini: endpoints Stripe désactivés');
}

function getPublicBaseUrl(req) {
  const envUrl = process.env.PUBLIC_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString();
  return `${proto}://${host}`;
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeWriteJsonAtomic(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      console.log(`📁 Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
    console.log(`✅ File written: ${filePath}`);
  } catch (e) {
    console.error(`❌ Error writing file ${filePath}:`, e);
    throw e;
  }
}

const STRIPE_ORDERS_PATH = path.join(ROOT, 'api', 'orders', 'stripe_orders.json');

function upsertStripeOrder(order) {
  const store = safeReadJson(STRIPE_ORDERS_PATH, { orders: [] });
  const orders = Array.isArray(store.orders) ? store.orders : [];
  const idx = orders.findIndex(o => o.order_id && order.order_id && o.order_id === order.order_id);
  const now = new Date().toISOString();
  const next = { ...order, updated_at: now, created_at: order.created_at || now };
  if (idx >= 0) orders[idx] = { ...orders[idx], ...next };
  else orders.push(next);
  safeWriteJsonAtomic(STRIPE_ORDERS_PATH, { orders });
  return next;
}

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Stripe not configured');
  }

  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const order_id = session.metadata?.order_id || null;
      const event_id = session.metadata?.event_id || null;

      if (order_id) {
        upsertStripeOrder({
          order_id,
          event_id,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent || null,
          amount_total_cents: session.amount_total || null,
          currency: session.currency || 'eur',
          status: 'paid',
          payment_mode: 'online',
          fulfillment: session.metadata?.fulfillment || '',
          paid_at: new Date().toISOString(),
        });
        console.log('✅ Stripe PAID:', order_id, session.id);
      }
    }

    return res.json({ received: true });
  } catch (e) {
    console.error('❌ Webhook handler error:', e);
    return res.status(500).json({ received: true });
  }
});

// Middleware pour parser JSON (après le webhook Stripe)
app.use(express.json());

function loadProductsFromStatic() {
  const productsPath = path.join(ROOT, 'static', 'products.json');
  const data = safeReadJson(productsPath, null);
  if (!data || !Array.isArray(data.products)) return [];
  return data.products;
}

function getUnitPrice(product, position, hasPrintForSamePhoto = false) {
  const isDigital = product.category === 'numérique';
  let basePrice = product.price;
  if (isDigital && hasPrintForSamePhoto && product.reduced_price_with_print) {
    basePrice = product.reduced_price_with_print;
  }

  const useReducedPrice = isDigital && hasPrintForSamePhoto && product.reduced_price_with_print;
  if (useReducedPrice) return product.reduced_price_with_print;

  let specialPromoPosition = null;
  let specialPromoPrice = null;
  if (product.special_promo_rule) {
    const match = String(product.special_promo_rule).match(/(\d+)\s*=\s*(\d+)/);
    if (match) {
      specialPromoPosition = parseInt(match[1], 10);
      specialPromoPrice = parseFloat(match[2]);
    }
  }

  if (specialPromoPosition && position === specialPromoPosition) {
    return specialPromoPrice;
  }

  if (product.pricing_rules && typeof product.pricing_rules === 'object') {
    const rules = product.pricing_rules;
    const hasNumericKeys = Object.keys(rules).some(k => !Number.isNaN(parseInt(k, 10)));
    const hasDefault = Object.prototype.hasOwnProperty.call(rules, 'default');

    if (hasNumericKeys || hasDefault) {
      const defaultPriceBase = parseFloat(rules.default || product.price);
      const defaultPrice = defaultPriceBase;

      const numericKeys = Object.keys(rules)
        .filter(k => !Number.isNaN(parseInt(k, 10)))
        .map(k => parseInt(k, 10))
        .sort((a, b) => a - b);
      const firstDefinedRank = numericKeys.length > 0 ? numericKeys[0] : 0;
      const lastDefinedRank = numericKeys.length > 0 ? numericKeys[numericKeys.length - 1] : 0;
      const lastDefinedPriceBase = lastDefinedRank > 0 ? parseFloat(rules[lastDefinedRank.toString()]) : defaultPrice;
      const lastDefinedPrice = lastDefinedPriceBase;

      const rankPrice = rules[position.toString()];
      if (rankPrice !== undefined) {
        return parseFloat(rankPrice);
      }
      if (position < firstDefinedRank) return basePrice;
      return lastDefinedPrice;
    }
  }

  const standardPrice = (product.promo_price && product.promo_price < product.price)
    ? product.promo_price
    : basePrice;
  return standardPrice;
}

function computeCartTotalCents(cart, products) {
  const productById = new Map(products.map(p => [String(p.id), p]));
  const positions = new Map(); // productId -> current position
  let total = 0;

  const impressionProductIds = new Set(
    products.filter(p => p.category === 'impression').map(p => String(p.id))
  );

  (Array.isArray(cart) ? cart : []).forEach(item => {
    if (!item) return;

    if (item.type === 'pack') {
      const pid = String(item.product_id);
      const product = productById.get(pid);
      if (!product) return;
      const qty = Number(item.quantity || 1);
      for (let i = 0; i < qty; i += 1) {
        const pos = (positions.get(pid) || 0) + 1;
        positions.set(pid, pos);
        const unit = getUnitPrice(product, pos, false);
        total += unit;
      }
      return;
    }

    if (item.type === 'photo') {
      const formats = item.formats && typeof item.formats === 'object' ? item.formats : {};
      const hasPrintForSamePhoto = Object.entries(formats).some(([pid, qty]) => (
        impressionProductIds.has(String(pid)) && Number(qty) > 0
      ));

      Object.entries(formats).forEach(([pidRaw, qtyRaw]) => {
        const pid = String(pidRaw);
        const product = productById.get(pid);
        if (!product) return;
        const qty = Number(qtyRaw || 0);
        if (!Number.isFinite(qty) || qty <= 0) return;

        for (let i = 0; i < qty; i += 1) {
          const pos = (positions.get(pid) || 0) + 1;
          positions.set(pid, pos);
          const unit = getUnitPrice(product, pos, hasPrintForSamePhoto);
          total += unit;
        }
      });
    }
  });

  return Math.round(total * 100);
}

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  if (!stripe) {
    console.error('❌ Stripe not configured - STRIPE_SECRET_KEY missing');
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  try {
    console.log('📥 POST /api/stripe/create-checkout-session');
    const { order, cart, currency = 'eur', event_id, fulfillment } = req.body || {};
    console.log('📦 Request body summary:', JSON.stringify({ 
      order_id: order?.order_id, 
      cart_type: Array.isArray(cart) ? 'array' : typeof cart,
      cart_length: Array.isArray(cart) ? cart.length : (cart ? Object.keys(cart).length : 0), 
      event_id, 
      fulfillment 
    }, null, 2));
    
    if (cart && Array.isArray(cart) && cart.length > 0) {
      console.log('📋 Cart sample (first item):', JSON.stringify(cart[0], null, 2));
    } else if (cart) {
      console.log('📋 Cart (not array):', JSON.stringify(cart, null, 2));
    } else {
      console.warn('⚠️ Cart is missing or empty!');
    }
    
    const order_id = (order && order.order_id) ? String(order.order_id) : crypto.randomUUID();
    const eventId = String(event_id || order?.event_id || '').trim();

    const products = loadProductsFromStatic();
    console.log(`📊 Products loaded: ${products.length}`);
    
    if (!cart || (Array.isArray(cart) && cart.length === 0)) {
      console.error('❌ Cart is empty or invalid');
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    const amount_total_cents = computeCartTotalCents(cart, products);
    console.log(`💰 Total calculated: ${amount_total_cents} cents`);
    
    if (!Number.isInteger(amount_total_cents) || amount_total_cents <= 0) {
      console.error('❌ Invalid amount:', amount_total_cents);
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const baseUrl = getPublicBaseUrl(req);
    console.log(`🌐 Base URL: ${baseUrl}`);
    
    console.log('🔄 Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: eventId ? `Commande ${eventId}` : 'Commande' },
            unit_amount: amount_total_cents,
          },
          quantity: 1,
        },
      ],
      customer_email: order?.client_email || undefined,
      success_url: `${baseUrl}/success?order_id=${encodeURIComponent(order_id)}`,
      cancel_url: `${baseUrl}/cancel?order_id=${encodeURIComponent(order_id)}`,
      ...(fulfillment === 'shipping'
        ? { shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH'] } }
        : {}),
      metadata: {
        order_id,
        event_id: eventId || '',
        fulfillment: fulfillment || '',
      },
    });
    console.log(`✅ Stripe session created: ${session.id}`);

    console.log('💾 Saving order to local store...');
    try {
      upsertStripeOrder({
        order_id,
        event_id: eventId || null,
        stripe_session_id: session.id,
        status: 'pending',
        payment_mode: 'online',
        fulfillment: fulfillment || '',
        amount_total_cents,
        currency,
        order_payload: order || null,
      });
      console.log(`✅ Order saved: ${order_id}`);
    } catch (saveError) {
      console.error('❌ Error saving order (non-fatal):', saveError);
      // Continue même si la sauvegarde échoue
    }

    return res.json({ checkout_url: session.url, order_id, amount_total_cents });
  } catch (e) {
    console.error('❌ create-checkout-session failed:', e);
    console.error('❌ Error stack:', e.stack);
    console.error('❌ Error message:', e.message);
    if (e.type) console.error('❌ Error type:', e.type);
    if (e.code) console.error('❌ Error code:', e.code);
    return res.status(500).json({ 
      error: 'Stripe session creation failed',
      message: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
});

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
    
    // Merger avec upsert par order_id (permet de mettre à jour un statut, ex: pending -> paid)
    let allOrders = orders;
    if (existingSnapshot && Array.isArray(existingSnapshot.orders)) {
      const byId = new Map();
      const withoutId = [];
      existingSnapshot.orders.forEach(o => {
        if (o && o.order_id) byId.set(o.order_id, o);
        else withoutId.push(o);
      });
      orders.forEach(o => {
        if (o && o.order_id) byId.set(o.order_id, o);
        else withoutId.push(o);
      });
      allOrders = [...Array.from(byId.values()), ...withoutId];
      console.log(`🔄 Upsert: ${orders.length} commande(s) reçue(s), total=${allOrders.length}`);
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
    console.log(`📤 Upload temporaire: ${tmpKey} (${snapshotJson.length} bytes)`);
    const tmpCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: tmpKey,
      Body: snapshotJson,
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    try {
      await s3Client.send(tmpCommand);
      console.log(`✅ Upload temporaire réussi: ${tmpKey}`);
    } catch (tmpError) {
      console.error(`❌ Erreur upload temporaire ${tmpKey}:`, tmpError);
      console.error('Error code:', tmpError.code);
      console.error('Error message:', tmpError.message);
      throw tmpError;
    }
    
    // Puis upload final
    console.log(`📤 Upload final: ${r2Key} (${snapshotJson.length} bytes)`);
    const finalCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: snapshotJson,
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    try {
      await s3Client.send(finalCommand);
      console.log(`✅ Upload final réussi: ${r2Key}`);
    } catch (finalError) {
      console.error(`❌ Erreur upload final ${r2Key}:`, finalError);
      console.error('Error code:', finalError.code);
      console.error('Error message:', finalError.message);
      throw finalError;
    }
    
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
