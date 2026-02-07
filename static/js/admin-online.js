// Admin Online JS - Gestion produits/commandes par événement sur R2

let currentEventId = null;
let products = [];
let orders = [];
let config = {};
let allEvents = [];

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();
  const eventSelect = document.getElementById('event-select');
  const hdEventSelect = document.getElementById('hd-event-select');
  if (eventSelect) eventSelect.addEventListener('change', onEventChange);
  if (hdEventSelect) hdEventSelect.addEventListener('change', (e) => {
    currentEventId = e.target.value || null;
  });

  // Gestion des onglets
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Charger les commandes par défaut
  await loadAllOrders();
  await loadConfig();
});

// ========== CHARGEMENT ÉVÉNEMENTS ==========
async function loadEvents() {
  try {
    console.log('📥 Chargement événements depuis /api/admin/events...');
    const response = await fetch('/api/admin/events');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('📋 Réponse API events:', data);
    let events = data.events || [];
    console.log(`📅 Événements bruts reçus:`, events);
    console.log(`📅 Type du premier élément:`, events.length > 0 ? typeof events[0] : 'vide');
    
    // Exclure entrées invalides (undefined, null, chaîne "undefined")
    events = events.filter(e => e != null && e !== '' && String(e) !== 'undefined');
    // Convertir les strings en objets si nécessaire (sécurité côté client)
    if (events.length > 0 && typeof events[0] === 'string') {
      console.log(`📅 Conversion côté client: tableau de strings → objets`);
      events = events.map(eventId => ({
        event_id: eventId,
        id: eventId,
        name: eventId
      }));
    } else if (events.length > 0) {
      // S'assurer que tous les événements ont les propriétés nécessaires
      events = events.map(event => {
        if (typeof event === 'string') {
          return {
            event_id: event,
            id: event,
            name: event
          };
        }
        return {
          event_id: event.event_id || event.id || event,
          id: event.event_id || event.id || event,
          name: event.name || event.event_name || event.event_id || event.id || event
        };
      }).filter(e => e.id != null && String(e.id) !== 'undefined');
    }

    allEvents = events;
    console.log(`✅ ${allEvents.length} événement(s) formaté(s):`, allEvents);
    
    const select = document.getElementById('event-select');
    const hdSelect = document.getElementById('hd-event-select');

    if (!select) {
      console.error('❌ Select event-select non trouvé dans le DOM');
      return;
    }

    select.innerHTML = '<option value="">Tous les événements</option>';
    if (hdSelect) hdSelect.innerHTML = '<option value="">Sélectionner un événement...</option>';

    if (allEvents.length > 0) {
      allEvents.forEach(event => {
        const eventId = event.event_id || event.id;
        const eventName = event.name || eventId;
        console.log(`  📅 Ajout événement: ${eventId} (${eventName})`);

        if (!eventId) {
          console.warn(`⚠️ Événement sans ID ignoré:`, event);
          return;
        }

        const option = document.createElement('option');
        option.value = eventId;
        option.textContent = eventName;
        select.appendChild(option);
        if (hdSelect) {
          const hdOption = option.cloneNode(true);
          hdSelect.appendChild(hdOption);
        }
      });
      console.log(`✅ ${allEvents.length} option(s) ajoutée(s) aux selects`);
    } else {
      console.warn('⚠️ Aucun événement à afficher');
    }
  } catch (error) {
    console.error('❌ Erreur chargement événements:', error);
    showMessage('Erreur chargement événements: ' + error.message, 'error');
  }
}

// ========== CHANGEMENT D'ÉVÉNEMENT ==========
async function onEventChange() {
  const eventId = document.getElementById('event-select').value;
  currentEventId = eventId || null;
  
  if (currentEventId) {
    await Promise.all([
      loadProducts(),
      loadOrders(),
      loadConfig()
    ]);
  } else {
    await loadAllOrders();
  }
}

// ========== COMMANDES ==========
async function loadAllOrders() {
  try {
    const response = await fetch('/api/admin/orders/all');
    const data = await response.json();
    orders = data.orders || [];
    renderOrders();
    updateStats();
  } catch (error) {
    console.error('Erreur chargement commandes:', error);
    document.getElementById('orders-table-body').innerHTML = '<tr><td colspan="9" style="color: red;">Erreur de chargement</td></tr>';
  }
}

async function loadOrders() {
  // Si aucun événement sélectionné, charger toutes les commandes
  if (!currentEventId) {
    console.log('📥 Aucun événement sélectionné, chargement de toutes les commandes...');
    await loadAllOrders();
    return;
  }
  
  try {
    console.log(`📥 Chargement commandes pour événement: ${currentEventId}`);
    const response = await fetch(`/api/admin/events/${currentEventId}/orders`);
    const data = await response.json();
    orders = data.orders || [];
    console.log(`✅ ${orders.length} commande(s) chargée(s) pour ${currentEventId}`);
    if (orders.length > 0) {
      console.log('📋 Exemple commande:', orders[0]);
    }
    renderOrders();
    updateStats();
  } catch (error) {
    console.error('❌ Erreur chargement commandes:', error);
    showMessage('Erreur chargement commandes: ' + error.message, 'error');
  }
}

async function renderOrders() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;
  
  // Filtrer par événement si sélectionné
  let filteredOrders = orders;
  if (currentEventId) {
    filteredOrders = orders.filter(o => o.event_id === currentEventId);
  }
  
  if (filteredOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Aucune commande</td></tr>';
    document.getElementById('empty-state').style.display = 'block';
    return;
  }
  
  document.getElementById('empty-state').style.display = 'none';
  
  // Charger les produits pour détecter les formats HD
  let productsList = [];
  if (currentEventId) {
    try {
      const productsResponse = await fetch(`/api/admin/events/${currentEventId}/products`);
      const productsData = await productsResponse.json();
      productsList = productsData.products || [];
    } catch (e) {
      console.warn('Impossible de charger les produits pour détection HD:', e);
    }
  }
  
  // Fonction pour détecter si une commande contient des formats HD
  function hasHDFormats(order) {
    const cart = order.cart || order.order_payload?.cart || [];
    for (const item of cart) {
      if (item.type === 'photo' && item.formats) {
        for (const [productId, qty] of Object.entries(item.formats)) {
          if (qty > 0) {
            const product = productsList.find(p => String(p.id) === String(productId));
            if (product && product.category === 'numérique' && product.email_delivery === false) {
              return true; // Format HD détecté
            }
          }
        }
      } else if (item.type === 'pack') {
        // Pour les packs, vérifier si c'est un pack HD
        const packProduct = productsList.find(p => String(p.id) === String(item.product_id));
        if (packProduct && packProduct.category === 'pack' && packProduct.email_delivery === false) {
          return true; // Pack HD détecté
        }
      }
    }
    return false;
  }
  
  let html = '';
  filteredOrders.forEach(order => {
    const date = order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : '-';
    const amount = order.amount_total_cents ? (order.amount_total_cents / 100).toFixed(2) : '0.00';
    const status = order.status || 'pending';
    const paymentMode = order.payment_mode || '-';
    const clientName = order.client_name || order.client_firstname || order.order_payload?.client_name || 'N/A';
    const clientEmail = order.client_email || order.order_payload?.client_email || '-';
    const hasHD = hasHDFormats(order);
    
    // Récupérer le nom de l'événement depuis allEvents si disponible
    let eventName = order.event_name || order.event_id || '-';
    if (order.event_id && allEvents.length > 0) {
      const event = allEvents.find(e => (e.event_id || e.id) === order.event_id);
      if (event) {
        eventName = event.name || event.event_name || event.event_id || order.event_id;
      }
    }
    
    console.log(`📋 Commande ${order.order_id || order.id}: event_id=${order.event_id}, event_name=${eventName}, hasHD=${hasHD}`);
    
    html += `
      <tr>
        <td>${date}</td>
        <td>${order.order_id || order.id || '-'}</td>
        <td>${escapeHtml(clientName)}</td>
        <td>${escapeHtml(clientEmail)}</td>
        <td>${amount} €</td>
        <td>${paymentMode}</td>
        <td>${getStatusBadge(status)}</td>
        <td>${escapeHtml(eventName)}</td>
        <td>
          <button class="btn btn-primary" onclick="viewOrder('${order.order_id || order.id}', '${order.event_id || ''}')" style="padding: 6px 12px; font-size: 12px;">Voir</button>
          ${hasHD ? `<button class="btn" style="background: #f59e0b; color: white; padding: 6px 12px; font-size: 12px;" onclick="openHDUploadModal('${order.order_id || order.id}', '${order.event_id || ''}')">Upload HD</button>` : ''}
          <button class="btn btn-success" onclick="updateOrderStatus('${order.order_id || order.id}', '${order.event_id || ''}', 'completed')" style="padding: 6px 12px; font-size: 12px;">Finaliser</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  document.getElementById('badge-orders').textContent = filteredOrders.length;
}

function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge badge-warning">En attente</span>',
    'paid': '<span class="badge badge-success">Payée</span>',
    'completed': '<span class="badge badge-success">Finalisée</span>',
    'cancelled': '<span class="badge badge-danger">Annulée</span>',
    'processing_web': '<span class="badge badge-warning">À traiter Web</span>',
    'processing_print': '<span class="badge badge-warning">À traiter Impression</span>'
  };
  return badges[status] || `<span class="badge">${status}</span>`;
}

async function viewOrder(orderId, eventId) {
  try {
    const response = await fetch(`/api/admin/events/${eventId}/orders/${orderId}`);
    const data = await response.json();
    const order = data.order;
    
    alert(`Commande ${orderId}\nClient: ${order.client_name || 'N/A'}\nEmail: ${order.client_email || '-'}\nMontant: ${order.amount_total_cents ? (order.amount_total_cents / 100).toFixed(2) : '0.00'} €\nStatut: ${order.status || 'pending'}\nÉvénement: ${order.event_id || '-'}`);
  } catch (error) {
    showMessage('Erreur chargement commande: ' + error.message, 'error');
  }
}

async function updateOrderStatus(orderId, eventId, newStatus) {
  if (!confirm(`Changer le statut de la commande ${orderId} à "${newStatus}" ?`)) return;
  
  try {
    const response = await fetch(`/api/admin/events/${eventId}/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      throw new Error('Erreur mise à jour statut');
    }
    
    showMessage('Statut mis à jour avec succès', 'success');
    // Recharger les commandes (toutes si aucun événement sélectionné)
    if (currentEventId) {
      await loadOrders();
    } else {
      await loadAllOrders();
    }
  } catch (error) {
    showMessage('Erreur mise à jour: ' + error.message, 'error');
  }
}

function updateStats() {
  const total = orders.reduce((sum, o) => {
    return sum + (o.amount_total_cents ? o.amount_total_cents / 100 : 0);
  }, 0);
  
  document.getElementById('ca-ttc').textContent = total.toFixed(2) + ' €';
  
  // Mettre à jour la barre de progression si objectif défini
  const objective = config.turnover_objective || 0;
  if (objective > 0) {
    const percent = Math.min((total / objective) * 100, 100);
    document.getElementById('objective-progress').style.width = percent + '%';
    document.getElementById('objective-percent').textContent = Math.round(percent) + '%';
  }
}

// ========== PRODUITS ==========
async function loadProducts() {
  // Charger produits globaux + produits de l'événement sélectionné (ou tous si aucun sélectionné)
  const targetEventId = currentEventId || 'global';
  
  try {
    console.log(`📥 Chargement produits pour: ${targetEventId}`);
    const response = await fetch(`/api/admin/events/${targetEventId}/products`);
    const data = await response.json();
    products = data.products || [];
    console.log(`✅ ${products.length} produit(s) chargé(s) (${products.filter(p => p.is_global).length} global(aux), ${products.filter(p => !p.is_global).length} spécifique(s))`);
    renderProducts();
  } catch (error) {
    console.error('❌ Erreur chargement produits:', error);
    showMessage('Erreur chargement produits: ' + error.message, 'error');
    document.getElementById('products-list').innerHTML = '<p style="color: red;">Erreur de chargement</p>';
  }
}

function renderProducts() {
  const container = document.getElementById('products-list');
  if (!container) return;
  
  if (products.length === 0) {
    container.innerHTML = '<p>Aucun produit. Cliquez sur "Ajouter un produit" pour en créer un.</p>';
    return;
  }
  
  let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th>Nom</th><th>Prix</th><th>Catégorie</th><th>Statut</th><th>Actions</th></tr></thead><tbody>';
  
  products.forEach(product => {
    const isGlobal = product.is_global === true;
    html += `
      <tr>
        <td>${escapeHtml(product.name_fr || product.name || 'Sans nom')} ${isGlobal ? '<span class="badge" style="background: #667eea; color: white; margin-left: 5px; font-size: 10px;">Global</span>' : ''}</td>
        <td>${(product.price || 0).toFixed(2)} €</td>
        <td>${escapeHtml(product.category || 'numérique')}</td>
        <td>${product.active !== false ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-danger">Inactif</span>'}</td>
        <td>
          <button class="btn btn-primary" onclick="editProduct(${product.id})" style="padding: 6px 12px; font-size: 12px;">Modifier</button>
          <button class="btn btn-danger" onclick="deleteProduct(${product.id}, ${isGlobal ? 'true' : 'false'})" style="padding: 6px 12px; font-size: 12px;">Supprimer</button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
  document.getElementById('badge-products').textContent = products.length;
}

function openProductForm(productId = null) {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const title = document.getElementById('product-modal-title');
  
  if (productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
      title.textContent = 'Modifier le produit';
      // Traductions
      document.getElementById('product-name-fr').value = product.name_fr || product.name || '';
      document.getElementById('product-name-en').value = product.name_en || '';
      document.getElementById('product-name-es').value = product.name_es || '';
      document.getElementById('product-description-fr').value = product.description_fr || product.description || '';
      document.getElementById('product-description-en').value = product.description_en || '';
      document.getElementById('product-description-es').value = product.description_es || '';
      document.getElementById('product-badge-text-fr').value = product.badge_text_fr || '';
      document.getElementById('product-badge-text-en').value = product.badge_text_en || '';
      document.getElementById('product-badge-text-es').value = product.badge_text_es || '';
      // Prix et catégorie
      document.getElementById('product-price').value = product.price || 0;
      document.getElementById('product-promo-price').value = product.promo_price || '';
      document.getElementById('product-category').value = product.category || 'numérique';
      // Options numériques
      document.getElementById('product-email-delivery').checked = product.email_delivery === true;
      document.getElementById('product-reduced-price-with-print').value = product.reduced_price_with_print || '';
      // Options impression
      document.getElementById('product-delivery-method').value = product.delivery_method || '';
      document.getElementById('product-requires-address').checked = product.requires_address === true;
      // Règles de prix
      document.getElementById('product-pricing-rules').value = product.pricing_rules ? JSON.stringify(product.pricing_rules, null, 2) : '';
      document.getElementById('product-special-promo-rule').value = product.special_promo_rule || '';
      // Options pack
      document.getElementById('product-pack-formats').value = product.pack_formats ? product.pack_formats.join(', ') : '';
      // Affichage
      document.getElementById('product-featured-position').value = product.featured_position || 0;
      document.getElementById('product-cart-order').value = product.cart_order || 0;
      // Statut
      document.getElementById('product-active').checked = product.active !== false;
      document.getElementById('product-hidden').checked = product.hidden === true;
      document.getElementById('product-is-global').checked = product.is_global === true;
      form.dataset.productId = productId;
    }
  } else {
    title.textContent = 'Ajouter un produit';
    form.reset();
    document.getElementById('product-active').checked = true;
    document.getElementById('product-hidden').checked = false;
    document.getElementById('product-is-global').checked = false;
    document.getElementById('product-email-delivery').checked = false;
    document.getElementById('product-requires-address').checked = false;
    document.getElementById('product-featured-position').value = 0;
    document.getElementById('product-cart-order').value = 0;
    delete form.dataset.productId;
  }
  
  modal.style.display = 'block';
}

function closeProductForm() {
  document.getElementById('product-modal').style.display = 'none';
}

async function saveProduct(event) {
  event.preventDefault();
  
  const form = document.getElementById('product-form');
  const productId = form.dataset.productId;
  const isGlobal = document.getElementById('product-is-global').checked;
  
  // Si produit global, utiliser "global" comme eventId, sinon utiliser currentEventId ou le premier événement
  let targetEventId = isGlobal ? 'global' : (currentEventId || (allEvents.length > 0 ? allEvents[0].event_id : null));
  
  if (!targetEventId && !isGlobal) {
    showMessage('Sélectionnez d\'abord un événement ou cochez "Appliquer à tous les événements"', 'error');
    return;
  }
  
  // Parser les règles de prix
  let pricingRules = null;
  const pricingRulesText = document.getElementById('product-pricing-rules').value.trim();
  if (pricingRulesText) {
    try {
      pricingRules = JSON.parse(pricingRulesText);
    } catch (e) {
      showMessage('Erreur dans les règles de prix (format JSON invalide)', 'error');
      return;
    }
  }
  
  // Parser les formats pack
  let packFormats = null;
  const packFormatsText = document.getElementById('product-pack-formats').value.trim();
  if (packFormatsText) {
    packFormats = packFormatsText.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (packFormats.length === 0) packFormats = null;
  }
  
  const product = {
    // Traductions
    name_fr: document.getElementById('product-name-fr').value.trim(),
    name_en: document.getElementById('product-name-en').value.trim() || null,
    name_es: document.getElementById('product-name-es').value.trim() || null,
    name: document.getElementById('product-name-fr').value.trim(), // Fallback
    description_fr: document.getElementById('product-description-fr').value.trim() || null,
    description_en: document.getElementById('product-description-en').value.trim() || null,
    description_es: document.getElementById('product-description-es').value.trim() || null,
    description: document.getElementById('product-description-fr').value.trim() || null, // Fallback
    badge_text_fr: document.getElementById('product-badge-text-fr').value.trim() || null,
    badge_text_en: document.getElementById('product-badge-text-en').value.trim() || null,
    badge_text_es: document.getElementById('product-badge-text-es').value.trim() || null,
    // Prix et catégorie
    price: parseFloat(document.getElementById('product-price').value),
    promo_price: document.getElementById('product-promo-price').value ? parseFloat(document.getElementById('product-promo-price').value) : null,
    category: document.getElementById('product-category').value,
    // Options numériques
    email_delivery: document.getElementById('product-email-delivery').checked,
    reduced_price_with_print: document.getElementById('product-reduced-price-with-print').value ? parseFloat(document.getElementById('product-reduced-price-with-print').value) : null,
    // Options impression
    delivery_method: document.getElementById('product-delivery-method').value || null,
    requires_address: document.getElementById('product-requires-address').checked,
    // Règles de prix
    pricing_rules: pricingRules,
    special_promo_rule: document.getElementById('product-special-promo-rule').value.trim() || null,
    // Options pack
    pack_formats: packFormats,
    // Affichage
    featured_position: parseInt(document.getElementById('product-featured-position').value) || 0,
    cart_order: parseInt(document.getElementById('product-cart-order').value) || 0,
    // Statut
    active: document.getElementById('product-active').checked,
    hidden: document.getElementById('product-hidden').checked,
    is_global: isGlobal
  };
  
  try {
    let response;
    if (productId) {
      response = await fetch(`/api/admin/events/${targetEventId}/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
    } else {
      product.id = Date.now();
      response = await fetch(`/api/admin/events/${targetEventId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
    }
    
    if (!response.ok) {
      throw new Error('Erreur sauvegarde produit');
    }
    
    showMessage(`Produit enregistré avec succès ${isGlobal ? '(tous les événements)' : ''}`, 'success');
    closeProductForm();
    await loadProducts();
  } catch (error) {
    showMessage('Erreur sauvegarde: ' + error.message, 'error');
  }
}

async function deleteProduct(productId, isGlobal = false) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
  
  const targetEventId = isGlobal ? 'global' : (currentEventId || (allEvents.length > 0 ? allEvents[0].event_id : null));
  if (!targetEventId && !isGlobal) {
    showMessage('Sélectionnez d\'abord un événement', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/events/${targetEventId}/products/${productId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Erreur suppression produit');
    }
    
    showMessage('Produit supprimé avec succès', 'success');
    await loadProducts();
  } catch (error) {
    showMessage('Erreur suppression: ' + error.message, 'error');
  }
}

function editProduct(productId) {
  openProductForm(productId);
}

// ========== UPLOAD HD ==========
async function uploadHD(event) {
  event.preventDefault();
  
  const eventId = document.getElementById('hd-event-select').value;
  const fileId = document.getElementById('hd-file-id').value.trim();
  const riderName = document.getElementById('hd-rider-name').value.trim();
  const horseName = document.getElementById('hd-horse-name').value.trim();
  const sourcePath = document.getElementById('hd-source-path').value.trim();
  
  if (!eventId) {
    showMessage('Sélectionnez un événement', 'error');
    return;
  }
  
  if (!fileId && !riderName && !horseName && !sourcePath) {
    showMessage('Remplissez au moins un champ (file_id, nom cavalier/cheval, ou chemin source)', 'error');
    return;
  }
  
  const btn = document.getElementById('upload-hd-btn');
  const resultDiv = document.getElementById('upload-hd-result');
  btn.disabled = true;
  btn.textContent = 'Upload en cours...';
  resultDiv.innerHTML = '<p style="color: #666;">Upload en cours...</p>';
  
  try {
    const response = await fetch('/api/admin/upload-hd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        file_id: fileId || undefined,
        rider_name: riderName || undefined,
        horse_name: horseName || undefined,
        source_path: sourcePath || undefined
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erreur upload');
    }
    
    resultDiv.innerHTML = `<p style="color: #10b981; font-weight: 600;">✅ ${data.message || 'Upload réussi'}</p><p>R2 Key: ${data.r2_key || '-'}</p>`;
    showMessage('Photo HD uploadée avec succès', 'success');
    
    // Réinitialiser le formulaire
    document.getElementById('hd-file-id').value = '';
    document.getElementById('hd-rider-name').value = '';
    document.getElementById('hd-horse-name').value = '';
    document.getElementById('hd-source-path').value = '';
  } catch (error) {
    resultDiv.innerHTML = `<p style="color: #ef4444; font-weight: 600;">❌ Erreur: ${error.message}</p>`;
    showMessage('Erreur upload: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Upload HD vers R2';
  }
}

// ========== CONFIGURATION ==========
async function loadConfig() {
  if (!currentEventId) return;
  
  try {
    const response = await fetch(`/api/admin/events/${currentEventId}/config`);
    const data = await response.json();
    config = data.config || {};
    document.getElementById('turnover-objective').value = config.turnover_objective || 0;
  } catch (error) {
    console.error('Erreur chargement config:', error);
  }
}

async function saveConfig() {
  if (!currentEventId) return;
  
  const turnoverObjective = parseFloat(document.getElementById('turnover-objective').value) || 0;
  
  try {
    const response = await fetch(`/api/admin/events/${currentEventId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turnover_objective: turnoverObjective
      })
    });
    
    if (!response.ok) {
      throw new Error('Erreur sauvegarde configuration');
    }
    
    showMessage('Configuration enregistrée avec succès', 'success');
    await loadConfig();
  } catch (error) {
    showMessage('Erreur sauvegarde: ' + error.message, 'error');
  }
}

// Sauvegarder l'objectif quand on change
document.getElementById('turnover-objective')?.addEventListener('change', saveConfig);

// ========== ONGLETS ==========
function switchTab(tabName) {
  // Désactiver tous les onglets
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
    content.classList.remove('active');
  });
  
  // Activer l'onglet sélectionné
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('active');
  
  const content = document.getElementById(`tab-${tabName}`);
  if (content) {
    content.style.display = 'block';
    content.classList.add('active');
  }
  
  // Charger les données selon l'onglet
  if (tabName === 'orders') {
    // Si aucun événement sélectionné, charger toutes les commandes
    if (currentEventId) {
      loadOrders();
    } else {
      loadAllOrders();
    }
  } else if (tabName === 'products') {
    loadProducts();
  }
}

// ========== UPLOAD HD ==========
let hdUploadOrderId = null;
let hdUploadEventId = null;
let hdUploadFiles = [];

function openHDUploadModal(orderId, eventId) {
  hdUploadOrderId = orderId;
  hdUploadEventId = eventId;
  hdUploadFiles = [];
  
  document.getElementById('hd-upload-order-id').textContent = orderId;
  document.getElementById('hd-upload-event-id').textContent = eventId;
  document.getElementById('hd-upload-files-list').innerHTML = '';
  document.getElementById('hd-upload-progress').style.display = 'none';
  document.getElementById('hd-upload-modal').style.display = 'block';
  
  // Charger les détails de la commande pour extraire les file_ids
  loadOrderForHDUpload(orderId, eventId);
  
  // Setup drag & drop
  setupHDDragDrop();
}

function closeHDUploadModal() {
  document.getElementById('hd-upload-modal').style.display = 'none';
  hdUploadOrderId = null;
  hdUploadEventId = null;
  hdUploadFiles = [];
}

async function loadOrderForHDUpload(orderId, eventId) {
  try {
    const response = await fetch(`/api/admin/events/${eventId}/orders/${orderId}`);
    const data = await response.json();
    const order = data.order;
    
    // Extraire les file_ids depuis le cart
    const cart = order.cart || order.order_payload?.cart || [];
    const fileIds = [];
    
    cart.forEach(item => {
      if (item.type === 'photo' && item.file_id) {
        fileIds.push({
          file_id: item.file_id,
          filename: item.filename || item.file_id,
          rider_name: item.rider_name || item.rider || '',
          horse_name: item.horse_name || item.horse || ''
        });
      }
    });
    
    if (fileIds.length > 0) {
      const infoDiv = document.getElementById('hd-upload-info');
      infoDiv.innerHTML += `<p><strong>Photos à uploader:</strong> ${fileIds.length} photo(s) HD détectée(s)</p>`;
      infoDiv.innerHTML += `<div style="margin-top: 10px; max-height: 150px; overflow-y: auto;"><ul style="list-style: none; padding: 0;">${fileIds.map(f => `<li style="padding: 5px; background: white; margin: 5px 0; border-radius: 3px;">${f.file_id} - ${f.rider_name} / ${f.horse_name}</li>`).join('')}</ul></div>`;
    }
  } catch (error) {
    console.error('Erreur chargement commande pour HD:', error);
  }
}

function setupHDDragDrop() {
  const dropzone = document.getElementById('hd-upload-dropzone');
  const input = document.getElementById('hd-upload-input');
  
  dropzone.addEventListener('click', () => input.click());
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#667eea';
    dropzone.style.background = '#f0f4ff';
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '#667eea';
    dropzone.style.background = '#f9f9f9';
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#667eea';
    dropzone.style.background = '#f9f9f9';
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addHDFiles(files);
  });
  
  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    addHDFiles(files);
  });
}

function addHDFiles(files) {
  files.forEach(file => {
    if (!hdUploadFiles.find(f => f.name === file.name)) {
      hdUploadFiles.push(file);
    }
  });
  
  updateHDFilesList();
}

function updateHDFilesList() {
  const listDiv = document.getElementById('hd-upload-files-list');
  if (hdUploadFiles.length === 0) {
    listDiv.innerHTML = '';
    return;
  }
  
  listDiv.innerHTML = '<h4 style="margin-bottom: 10px;">Fichiers sélectionnés:</h4>' +
    hdUploadFiles.map((file, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; margin: 5px 0; border-radius: 5px;">
        <span>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
        <button onclick="removeHDFile(${idx})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Supprimer</button>
      </div>
    `).join('');
}

function removeHDFile(index) {
  hdUploadFiles.splice(index, 1);
  updateHDFilesList();
}

async function uploadHDFiles() {
  if (hdUploadFiles.length === 0) {
    showMessage('Sélectionnez au moins un fichier', 'error');
    return;
  }
  
  const progressDiv = document.getElementById('hd-upload-progress');
  const progressBar = document.getElementById('hd-upload-progress-bar');
  const statusText = document.getElementById('hd-upload-status');
  
  progressDiv.style.display = 'block';
  progressBar.style.width = '0%';
  statusText.textContent = 'Préparation...';
  
  let uploaded = 0;
  const total = hdUploadFiles.length;
  
  for (const file of hdUploadFiles) {
    try {
      statusText.textContent = `Upload ${uploaded + 1}/${total}: ${file.name}...`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('event_id', hdUploadEventId);
      formData.append('order_id', hdUploadOrderId);
      
      // Essayer d'extraire file_id depuis le nom du fichier
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Sans extension
      formData.append('file_id', fileName);
      
      const response = await fetch('/api/admin/upload-hd-file', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur upload');
      }
      
      uploaded++;
      progressBar.style.width = `${(uploaded / total) * 100}%`;
    } catch (error) {
      console.error(`Erreur upload ${file.name}:`, error);
      statusText.textContent = `❌ Erreur: ${file.name} - ${error.message}`;
      showMessage(`Erreur upload ${file.name}: ${error.message}`, 'error');
      break;
    }
  }
  
  if (uploaded === total) {
    statusText.textContent = `✅ ${uploaded} fichier(s) uploadé(s) avec succès`;
    showMessage(`${uploaded} photo(s) HD uploadée(s) avec succès`, 'success');
    setTimeout(() => closeHDUploadModal(), 2000);
  }
}

// ========== UTILITAIRES ==========
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showMessage(message, type = 'success') {
  // Créer un message temporaire en haut de page
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  messageEl.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 6px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
  messageEl.style.background = type === 'success' ? '#d1fae5' : '#fee2e2';
  messageEl.style.color = type === 'success' ? '#065f46' : '#991b1b';
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.remove();
  }, 5000);
}
