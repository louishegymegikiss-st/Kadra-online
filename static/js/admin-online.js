// Admin Online JS - Gestion produits/commandes par événement sur R2

let currentEventId = null;
let products = [];
let orders = [];
let config = {};

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();
  document.getElementById('event-select').addEventListener('change', onEventChange);
});

// ========== CHARGEMENT ÉVÉNEMENTS ==========
async function loadEvents() {
  try {
    const response = await fetch('/api/admin/events');
    const data = await response.json();
    const select = document.getElementById('event-select');
    select.innerHTML = '<option value="">Sélectionner un événement...</option>';
    
    if (data.events && data.events.length > 0) {
      data.events.forEach(event => {
        const option = document.createElement('option');
        option.value = event.event_id || event.id;
        option.textContent = event.name || event.event_id || event.id;
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">Aucun événement disponible</option>';
    }
  } catch (error) {
    showMessage('Erreur chargement événements: ' + error.message, 'error');
  }
}

// ========== CHANGEMENT D'ÉVÉNEMENT ==========
async function onEventChange() {
  const eventId = document.getElementById('event-select').value;
  if (!eventId) {
    document.getElementById('content').style.display = 'none';
    return;
  }
  
  currentEventId = eventId;
  document.getElementById('content').style.display = 'block';
  
  await Promise.all([
    loadProducts(),
    loadOrders(),
    loadConfig()
  ]);
}

// ========== PRODUITS ==========
async function loadProducts() {
  if (!currentEventId) return;
  
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
  
  let html = '<table><thead><tr><th>Nom</th><th>Prix</th><th>Catégorie</th><th>Statut</th><th>Actions</th></tr></thead><tbody>';
  
  products.forEach(product => {
    html += `
      <tr>
        <td>${escapeHtml(product.name_fr || product.name || 'Sans nom')}</td>
        <td>${(product.price || 0).toFixed(2)} €</td>
        <td>${escapeHtml(product.category || 'numérique')}</td>
        <td>${product.active !== false ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-danger">Inactif</span>'}</td>
        <td>
          <button class="btn btn-primary" onclick="editProduct(${product.id})" style="padding: 6px 12px; font-size: 12px;">Modifier</button>
          <button class="btn btn-danger" onclick="deleteProduct(${product.id})" style="padding: 6px 12px; font-size: 12px;">Supprimer</button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
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
      form.dataset.productId = productId;
    }
  } else {
    title.textContent = 'Ajouter un produit';
    form.reset();
    delete form.dataset.productId;
  }
  
  modal.style.display = 'block';
}

function closeProductForm() {
  document.getElementById('product-modal').style.display = 'none';
}

async function saveProduct(event) {
  event.preventDefault();
  if (!currentEventId) return;
  
  const form = document.getElementById('product-form');
  const productId = form.dataset.productId;
  
  const product = {
    name_fr: document.getElementById('product-name-fr').value,
    name_en: document.getElementById('product-name-en').value,
    name_es: document.getElementById('product-name-es').value,
    name: document.getElementById('product-name-fr').value, // Fallback
    price: parseFloat(document.getElementById('product-price').value),
    category: document.getElementById('product-category').value,
    active: document.getElementById('product-active').checked
  };
  
  try {
    let response;
    if (productId) {
      response = await fetch(`/api/admin/events/${currentEventId}/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
    } else {
      product.id = Date.now();
      response = await fetch(`/api/admin/events/${currentEventId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
    }
    
    if (!response.ok) {
      throw new Error('Erreur sauvegarde produit');
    }
    
    showMessage('Produit enregistré avec succès', 'success');
    closeProductForm();
    await loadProducts();
  } catch (error) {
    showMessage('Erreur sauvegarde: ' + error.message, 'error');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
  if (!currentEventId) return;
  
  try {
    const response = await fetch(`/api/admin/events/${currentEventId}/products/${productId}`, {
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

// ========== COMMANDES ==========
async function loadOrders() {
  if (!currentEventId) return;
  
  try {
    const response = await fetch(`/api/admin/events/${currentEventId}/orders`);
    const data = await response.json();
    orders = data.orders || [];
    renderOrders();
  } catch (error) {
    showMessage('Erreur chargement commandes: ' + error.message, 'error');
    document.getElementById('orders-list').innerHTML = '<p style="color: red;">Erreur de chargement</p>';
  }
}

function renderOrders() {
  const container = document.getElementById('orders-list');
  if (!container) return;
  
  if (orders.length === 0) {
    container.innerHTML = '<p>Aucune commande pour cet événement.</p>';
    return;
  }
  
  let html = '<table><thead><tr><th>ID</th><th>Client</th><th>Montant</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
  
  orders.forEach(order => {
    const amount = order.amount_total_cents ? (order.amount_total_cents / 100).toFixed(2) : '0.00';
    const date = order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : '-';
    const status = order.status || 'pending';
    
    html += `
      <tr>
        <td>${order.order_id || order.id || '-'}</td>
        <td>${escapeHtml(order.client_name || order.client_firstname || 'N/A')}</td>
        <td>${amount} €</td>
        <td>${getStatusBadge(status)}</td>
        <td>${date}</td>
        <td>
          <button class="btn btn-primary" onclick="viewOrder('${order.order_id || order.id}')" style="padding: 6px 12px; font-size: 12px;">Voir</button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge badge-warning">En attente</span>',
    'paid': '<span class="badge badge-success">Payée</span>',
    'completed': '<span class="badge badge-success">Finalisée</span>',
    'cancelled': '<span class="badge badge-danger">Annulée</span>'
  };
  return badges[status] || `<span class="badge">${status}</span>`;
}

function viewOrder(orderId) {
  const order = orders.find(o => (o.order_id || o.id) === orderId);
  if (order) {
    alert(`Commande ${orderId}\nClient: ${order.client_name || 'N/A'}\nMontant: ${order.amount_total_cents ? (order.amount_total_cents / 100).toFixed(2) : '0.00'} €\nStatut: ${order.status || 'pending'}`);
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
  } catch (error) {
    showMessage('Erreur sauvegarde: ' + error.message, 'error');
  }
}

// ========== ONGLETS ==========
function switchTab(tabName) {
  // Désactiver tous les onglets
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // Activer l'onglet sélectionné
  event.target.classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ========== UTILITAIRES ==========
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showMessage(message, type = 'success') {
  const container = document.getElementById('message-container');
  if (!container) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  container.innerHTML = '';
  container.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.remove();
  }, 5000);
}
