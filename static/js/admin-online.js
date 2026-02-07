// Admin Online JS - Gestion produits/commandes par événement sur R2

let currentEventId = null;
let products = [];
let orders = [];
let config = {};
let allEvents = [];

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();
  document.getElementById('event-select').addEventListener('change', onEventChange);
  document.getElementById('hd-event-select').addEventListener('change', (e) => {
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
      });
    }
    
    allEvents = events;
    console.log(`✅ ${allEvents.length} événement(s) formaté(s):`, allEvents);
    
    const select = document.getElementById('event-select');
    const hdSelect = document.getElementById('hd-event-select');
    
    if (!select || !hdSelect) {
      console.error('❌ Éléments select non trouvés dans le DOM');
      return;
    }
    
    select.innerHTML = '<option value="">Tous les événements</option>';
    hdSelect.innerHTML = '<option value="">Sélectionner un événement...</option>';
    
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
        
        const hdOption = option.cloneNode(true);
        hdSelect.appendChild(hdOption);
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

function renderOrders() {
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
  
  let html = '';
  filteredOrders.forEach(order => {
    const date = order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : '-';
    const amount = order.amount_total_cents ? (order.amount_total_cents / 100).toFixed(2) : '0.00';
    const status = order.status || 'pending';
    const paymentMode = order.payment_mode || '-';
    const clientName = order.client_name || order.client_firstname || order.order_payload?.client_name || 'N/A';
    const clientEmail = order.client_email || order.order_payload?.client_email || '-';
    
    // Récupérer le nom de l'événement depuis allEvents si disponible
    let eventName = order.event_name || order.event_id || '-';
    if (order.event_id && allEvents.length > 0) {
      const event = allEvents.find(e => (e.event_id || e.id) === order.event_id);
      if (event) {
        eventName = event.name || event.event_name || event.event_id || order.event_id;
      }
    }
    
    console.log(`📋 Commande ${order.order_id || order.id}: event_id=${order.event_id}, event_name=${eventName}`);
    
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
  if (!currentEventId) {
    document.getElementById('products-list').innerHTML = '<p>Sélectionnez un événement pour gérer les produits.</p>';
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/events/${currentEventId}/products`);
    const data = await response.json();
    products = data.products || [];
    renderProducts();
  } catch (error) {
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
      document.getElementById('product-name-fr').value = product.name_fr || product.name || '';
      document.getElementById('product-name-en').value = product.name_en || '';
      document.getElementById('product-name-es').value = product.name_es || '';
      document.getElementById('product-price').value = product.price || 0;
      document.getElementById('product-category').value = product.category || 'numérique';
      document.getElementById('product-active').checked = product.active !== false;
      document.getElementById('product-is-global').checked = product.is_global === true;
      form.dataset.productId = productId;
    }
  } else {
    title.textContent = 'Ajouter un produit';
    form.reset();
    document.getElementById('product-active').checked = true;
    document.getElementById('product-is-global').checked = false;
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
  
  const product = {
    name_fr: document.getElementById('product-name-fr').value,
    name_en: document.getElementById('product-name-en').value,
    name_es: document.getElementById('product-name-es').value,
    name: document.getElementById('product-name-fr').value, // Fallback
    price: parseFloat(document.getElementById('product-price').value),
    category: document.getElementById('product-category').value,
    active: document.getElementById('product-active').checked,
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
