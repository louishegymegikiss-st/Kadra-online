// Vendor JS - Interface vendeur pour gestion des commandes V2

// État global
const state = {
  orders: [],
  products: [], // Liste des produits avec leurs catégories
  currentTab: 'pending', // pending, processing_print, processing_web, reserved, completed
  turnoverObjective: 0,
  caHT: 0,
  counters: {
    total: 0,
    redim: 0,
    upload: 0
  },
  currentPaymentOrderId: null,
  currentPaymentAction: null, // 'pay' ou 'reserve'
  currentDetailsOrderId: null
};

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  // Initialiser les écouteurs d'événements
  initEventListeners();
  
  // Charger les données
  await loadProducts(); // Charger les produits pour avoir leurs catégories
  await loadObjective();
  await loadOrders();
  await loadStats();
  
  // Rafraîchissement automatique toutes les 30s
  setInterval(loadOrders, 30000);
  setInterval(loadStats, 60000);
  
  // Rafraîchissement automatique quand on clique sur un onglet
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Recharger les commandes après un court délai pour s'assurer que le changement d'onglet est bien appliqué
      setTimeout(loadOrders, 100);
    });
  });
});

function initEventListeners() {
  // Navigation Onglets
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-tab');
      switchTab(tab);
    });
  });
  
  // Bouton supprimer toutes les commandes
  const deleteAllBtn = document.getElementById('delete-all-orders-btn');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', deleteAllOrders);
  }
  
  // Objectif CA
  const objInput = document.getElementById('turnover-objective');
  objInput.addEventListener('change', async (e) => {
    const newVal = parseFloat(e.target.value);
    if (!isNaN(newVal)) {
      await updateObjective(newVal);
    }
  });
  
  // Popup Paiement
  document.getElementById('confirm-payment-btn').addEventListener('click', confirmPayment);
  
  // Bouton Export CSV
  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportCompletedOrdersCSV);
  }
  
  // Fermeture modales (click outside)
  window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
      event.target.classList.remove('active');
    }
  };
}

// --- Chargement des données ---

async function loadOrders() {
  try {
    const response = await fetch('/api/vendeur/orders'); // Récupère tout
    if (!response.ok) throw new Error('Erreur chargement commandes');
    const data = await response.json();
    state.orders = data.orders || [];
    
    updateBadges();
    calculateTurnover();
    renderTable();
  } catch (error) {
    console.error('Erreur loadOrders:', error);
  }
}

async function loadStats() {
  try {
    const response = await fetch('/status');
    if (!response.ok) return;
    const data = await response.json();
    // On suppose que /status renvoie des compteurs
    // Sinon il faudrait un endpoint dédié. Pour l'instant on mock ou on utilise ce qui existe.
    // Si pas dispo, on met à jour avec des valeurs par défaut
    if (data.stats) {
        document.getElementById('counter-total').textContent = data.stats.total_photos || 0;
        document.getElementById('counter-redim').textContent = data.stats.processed || 0;
        document.getElementById('counter-upload').textContent = data.stats.uploaded || 0;
    }
  } catch (e) {
    console.log("Pas de stats globales dispos");
    }
  }

async function loadObjective() {
  try {
    const response = await fetch('/api/vendeur/objective');
    if (response.ok) {
      const data = await response.json();
      state.turnoverObjective = data.objective || 0;
      document.getElementById('turnover-objective').value = state.turnoverObjective;
      updateProgressBar();
    }
  } catch (e) {
    console.error(e);
  }
}

async function updateObjective(val) {
  try {
    await fetch('/api/vendeur/objective', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective: val })
    });
    state.turnoverObjective = val;
    updateProgressBar();
  } catch (e) {
    console.error(e);
  }
}

// --- Logique métier ---

function calculateTurnover() {
  // Calculer le CA sur les commandes PAYÉES ou FINALISÉES (pas pending/cancelled)
  const validStatuses = ['paid', 'processing_web', 'processing_print', 'completed', 'reserved'];
  const totalTTC = state.orders
    .filter(o => validStatuses.includes(o.status))
    .reduce((sum, o) => sum + (o.total || 0), 0);
    
  // Utiliser directement le TTC (plus de ventilation HT/TVA)
  state.caHT = totalTTC; // On garde le nom de variable pour compatibilité mais c'est maintenant TTC
  
  document.getElementById('ca-ttc').textContent = totalTTC.toFixed(2) + ' €';
  
  updateProgressBar();
}

function updateProgressBar() {
  if (state.turnoverObjective <= 0) {
    document.getElementById('objective-progress').style.width = '0%';
    document.getElementById('objective-percent').textContent = '0%';
    return;
  }
  
  // Calculer le pourcentage (peut dépasser 100%)
  const percent = Math.round((state.caHT / state.turnoverObjective) * 100);
  
  // Afficher le pourcentage avec le signe + si on dépasse 100%
  let displayPercent;
  if (percent > 100) {
    const excess = percent - 100;
    displayPercent = `100% +${excess}%`;
  } else {
    displayPercent = percent + '%';
  }
  
  // La barre de progression reste à 100% max visuellement
  const progressWidth = Math.min(100, percent);
  document.getElementById('objective-progress').style.width = progressWidth + '%';
  document.getElementById('objective-percent').textContent = displayPercent;
}

function updateBadges() {
  const counts = {
    pending: 0,
    processing_print: 0,
    processing_web: 0,
    reserved: 0,
    completed: 0
  };
  
  state.orders.forEach(o => {
    // Mapping des statuts API vers onglets
    let tab = o.status;
    if (tab === 'paid') {
        // "paid" est transitoire, on doit deviner où il va selon son type
        // Mais normalement le backend l'a déjà mis dans processing_web/print via les triggers
        // Si il reste "paid", on le met dans pending ou web par défaut
        tab = 'pending'; 
    }
    if (counts.hasOwnProperty(tab)) {
      counts[tab]++;
    }
  });
  
  Object.keys(counts).forEach(key => {
    const el = document.getElementById(`badge-${key}`);
    if (el) el.textContent = counts[key];
  });
}

function switchTab(tabName) {
  state.currentTab = tabName;
  
  // Afficher/masquer le bouton d'export CSV uniquement pour l'onglet "Finalisées"
  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) {
    exportBtn.style.display = (tabName === 'completed') ? 'flex' : 'none';
  }
  
  // Update UI classes
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    }
  });
  
  renderTable();
}

async function loadProducts() {
  try {
    // Interface vendeur : toujours en français (pas de traduction)
    const response = await fetch('/api/client/products?lang=fr');
    if (response.ok) {
      const data = await response.json();
      state.products = data.products || [];
    }
  } catch (e) {
    console.error('Erreur chargement produits:', e);
  }
}

function getOrderType(order) {
  // Détermine si la commande est PAPIER, NUMERIQUE ou MIXTE
  // Basé sur les catégories de produits réelles
  let hasPaper = false;
  let hasDigital = false;
  
  if (!order.items || order.items.length === 0) return 'unknown';
  
  order.items.forEach(item => {
    const productId = item.product_id;
    const productName = (item.product_name || '').toLowerCase();
    
    // Chercher le produit dans la liste chargée (si disponible)
    const product = state.products && state.products.length > 0 
      ? state.products.find(p => p.id === productId)
      : null;
    
    // Priorité 1 : Catégorie du produit si disponible
    if (product && product.category) {
      const category = (product.category || '').toLowerCase().trim();
      
      if (category === 'pack') {
        // Les packs sont toujours numériques (selon les spécifications)
        hasDigital = true;
      } else if (category === 'impression') {
        hasPaper = true;
      } else if (category === 'numérique' || category === 'pack') {
        hasDigital = true;
      }
    }
    
    // Priorité 2 : Analyse du nom du produit (fallback ou confirmation)
    if (productName.includes('pack')) {
      // Packs = toujours numérique
      hasDigital = true;
    } else if (productName.includes('tirage') || 
               productName.includes('15x23') || 
               productName.includes('20x30') || 
               productName.includes('30x45') || 
               productName.includes('40x60') || 
               productName.includes('50x75') ||
               productName.includes('impression') ||
               productName.includes('papier')) {
      hasPaper = true;
    } else if (productName.includes('numérique') || 
               productName.includes('web') || 
               productName.includes('hd') ||
               productName.includes('téléchargement')) {
      hasDigital = true;
    }
  });
  
  if (hasPaper && hasDigital) return 'mixed';
  if (hasDigital) return 'digital';
  if (hasPaper) return 'paper';
  return 'unknown';
}

function renderTable() {
  const tbody = document.getElementById('orders-table-body');
  const container = document.querySelector('.table-container');
  const loading = document.getElementById('loading-indicator');
  const empty = document.getElementById('empty-state');
  
  loading.style.display = 'none';
  tbody.innerHTML = '';
  
  // Filtrer les commandes pour l'onglet courant
  const filteredOrders = state.orders.filter(o => {
    if (state.currentTab === 'pending') return o.status === 'pending' || o.status === 'paid'; // Paid va ici temporairement
    return o.status === state.currentTab;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Plus récent en premier
  
  if (filteredOrders.length === 0) {
    empty.style.display = 'block';
    return;
  }
  
  empty.style.display = 'none';
  
  filteredOrders.forEach(order => {
    const tr = document.createElement('tr');
    const type = getOrderType(order);
    
    // Appliquer la couleur de ligne selon le type
    if (type === 'paper') {
      tr.classList.add('row-paper');
    } else if (type === 'digital') {
      tr.classList.add('row-digital');
    } else if (type === 'mixed') {
      tr.classList.add('row-mixed');
    }
    
    // Type détecté : paper, digital, ou mixed
    
    // Données
    const dateStr = new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const orderRef = order.order_code || order.id;
    
    // Séparer prénom et nom (format: "NOM Prénom" ou "Prénom Nom")
    const nameParts = (order.client_name || '').trim().split(' ');
    let firstName = '';
    let lastName = '';
    
    if (nameParts.length >= 2) {
      // Si le premier mot est en majuscules, c'est probablement le nom de famille
      if (nameParts[0] === nameParts[0].toUpperCase() && nameParts[0].length > 1) {
        lastName = nameParts[0];
        firstName = nameParts.slice(1).join(' ');
      } else {
        // Sinon, on suppose Prénom Nom
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      }
    } else {
      // Un seul mot, on le met comme nom
      lastName = order.client_name;
    }
    
    const clientInfo = `<div style="line-height: 1.3;"><div style="font-size:0.9em;">${escapeHtml(firstName)}</div><div style="font-weight:bold;">${escapeHtml(lastName)}</div></div>`;
    const contactInfo = `<div style="font-size:0.85em">${escapeHtml(order.client_email)}<br>${escapeHtml(order.client_phone || '')}</div>`;
    
    // Dropdown Statut pour changement rapide
    const statusLabels = {
      'pending': 'À régler',
      'paid': 'Payée',
      'reserved': 'Réservée',
      'processing_print': 'Impression',
      'processing_web': 'Web',
      'completed': 'Finalisée',
      'cancelled': 'Annulée'
    };
    
    const statusDropdown = `
      <select class="status-select" onchange="changeOrderStatus(${order.id}, this.value)" style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 3px; font-size: 0.85em;">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>À régler</option>
        <option value="reserved" ${order.status === 'reserved' ? 'selected' : ''}>Réservée</option>
        <option value="processing_print" ${order.status === 'processing_print' ? 'selected' : ''}>Impression</option>
        <option value="processing_web" ${order.status === 'processing_web' ? 'selected' : ''}>Web</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Finalisée</option>
          </select>
    `;
    
    // Boutons Actions selon statut
    let actionsHtml = `<div class="actions-cell">`;
    
    if (order.status === 'pending' || order.status === 'paid') {
      actionsHtml += `<button class="btn btn-pay" onclick="handlePayButton(${order.id})">Payer</button>`;
      actionsHtml += `<button class="btn btn-reserve" onclick="openPaymentModal(${order.id}, 'reserve')">Réserver</button>`;
    } else if (order.status === 'reserved') {
      actionsHtml += `<button class="btn btn-process-web" onclick="processOrder(${order.id}, 'web')">Traiter</button>`;
    } else if (order.status === 'processing_print') {
      actionsHtml += `<button class="btn btn-process-print" onclick="finishOrder(${order.id})">Traiter</button>`;
    } else if (order.status === 'processing_web') {
      actionsHtml += `<button class="btn btn-process-web" onclick="finishOrder(${order.id})">Traiter</button>`;
    }
            
    actionsHtml += `<button class="btn btn-consult" onclick="openDetailsModal(${order.id})">Consulter</button>`;
    
    // Bouton générer toujours disponible
    actionsHtml += `<button class="btn btn-generate" onclick="generateFolders(${order.id})" title="Générer/Régénérer dossiers">Générer</button>`;
    
    actionsHtml += `<button class="btn btn-delete" onclick="deleteOrder(${order.id})">X</button>`;
    actionsHtml += `</div>`;
    
    // Détails de la commande (nombre de photos par produit)
    const orderDetails = getOrderDetails(order);
    
    // Commentaire vendeur (champ input éditable)
    const sellerCommentHtml = `<input type="text" class="seller-comment-input" value="${escapeHtml(order.seller_comment || '')}" onchange="updateSellerComment(${order.id}, this.value)" placeholder="Ajouter un commentaire..." style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 3px;">`;
    
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td><strong>${orderRef}</strong></td>
      <td>${clientInfo}</td>
      <td>${contactInfo}</td>
      <td style="font-weight:bold;">${order.total.toFixed(2)} €</td>
      <td>${escapeHtml(order.payment_method || '-')}</td>
      <td>${(order.invoice_required || order.is_professional) ? 'Oui' : 'Non'}</td>
      <td>${escapeHtml(order.company_name || '-')}</td>
      <td style="font-size: 0.85em;">${orderDetails}</td>
      <td>${sellerCommentHtml}</td>
      <td>${statusDropdown}</td>
      <td>${actionsHtml}</td>
    `;
    
    tbody.appendChild(tr);
  });
}

function getOrderDetails(order) {
  // Fonction pour obtenir la catégorie principale d'un item
  function getMainCategory(item) {
    // Vérifier si c'est un pack
    if (item.notes) {
      try {
        const packData = JSON.parse(item.notes);
        if (packData.photos && Array.isArray(packData.photos)) {
          return 'pack';
        }
      } catch (e) {
        // Ce n'est pas un pack
      }
    }
    
    // Trouver le produit correspondant
    const product = state.products.find(p => p.id === item.product_id);
    if (!product) return 'other';
    
    if (product.category === 'pack') {
      return 'pack';
    } else if (product.category === 'impression') {
      return 'impression';
    } else if (product.category === 'numérique') {
      return 'numérique';
    }
    
    return 'other';
  }
  
  // Fonction pour obtenir l'ordre de tri principal
  function getMainCategoryOrder(category) {
    const orderMap = {
      'impression': 1,
      'numérique': 2,
      'pack': 3,
      'other': 4
    };
    return orderMap[category] || 99;
  }
  
  // Trier les items selon les mêmes règles que dans openDetailsModal
  const sortedItems = [...(order.items || [])].sort((a, b) => {
    const catA = getMainCategory(a);
    const catB = getMainCategory(b);
    const orderA = getMainCategoryOrder(catA);
    const orderB = getMainCategoryOrder(catB);
    
    // Si catégories différentes, trier par catégorie principale
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Même catégorie principale, appliquer les règles spécifiques
    const productA = state.products.find(p => p.id === a.product_id);
    const productB = state.products.find(p => p.id === b.product_id);
    
    if (catA === 'impression') {
      // Impression : trier uniquement par nom de produit
      return (a.product_name || '').localeCompare(b.product_name || '');
    } else if (catA === 'numérique') {
      // Numérique : trier par produit, puis par qualité (MD puis HD)
      const productCompare = (a.product_name || '').localeCompare(b.product_name || '');
      if (productCompare !== 0) {
        return productCompare;
      }
      // Même produit, trier par qualité : MD (email_delivery=true) avant HD (email_delivery=false)
      const qualityA = productA && productA.email_delivery ? 1 : 2; // 1 = MD, 2 = HD
      const qualityB = productB && productB.email_delivery ? 1 : 2;
      return qualityA - qualityB;
    } else if (catA === 'pack') {
      // Pack : trier par qualité (MD puis HD)
      const qualityA = productA && productA.email_delivery ? 1 : 2; // 1 = MD, 2 = HD
      const qualityB = productB && productB.email_delivery ? 1 : 2;
      if (qualityA !== qualityB) {
        return qualityA - qualityB;
      }
      // Même qualité, trier par nom de produit
      return (a.product_name || '').localeCompare(b.product_name || '');
    }
    
    // Fallback : trier par nom de produit
    return (a.product_name || '').localeCompare(b.product_name || '');
  });
  
  // Regrouper les items triés par produit et compter
  const productCounts = {};
  sortedItems.forEach(item => {
    const productName = item.product_name || 'Produit';
    productCounts[productName] = (productCounts[productName] || 0) + item.quantity;
  });
  
  // Formater en liste avec retours à la ligne (un produit par ligne, dans l'ordre trié)
  return Object.entries(productCounts)
    .map(([name, count]) => `${count} ${name}`)
    .join('<br>') || '-';
}

window.updateSellerComment = async function(orderId, comment) {
  try {
    await fetch(`/api/vendeur/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seller_comment: comment })
    });
  } catch (error) {
    console.error('Erreur mise à jour commentaire:', error);
  }
}

// Changement rapide de statut via dropdown
window.changeOrderStatus = async function(orderId, newStatus) {
  try {
    const response = await fetch(`/api/vendeur/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Erreur lors du changement de statut');
    }
    
    const result = await response.json();
    console.log('Statut mis à jour:', result);
    
    // Mettre à jour localement la commande dans state.orders pour un feedback immédiat
    const orderIndex = state.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      state.orders[orderIndex].status = newStatus;
    }
    
    // Recharger les commandes pour mettre à jour l'affichage et les badges
    await loadOrders();
    
    // Si la commande n'est plus dans l'onglet actuel, ne rien faire (elle disparaîtra)
    // Sinon elle restera visible avec le nouveau statut
  } catch (error) {
    console.error('Erreur changement statut:', error);
    alert('Erreur lors du changement de statut: ' + error.message);
    // Recharger pour réinitialiser l'affichage
    await loadOrders();
  }
}

// --- Actions Utilisateur ---

// Fonction pour gérer le bouton "Payer" : ouvre simplement le popup (sans générer les dossiers)
window.handlePayButton = async function(orderId) {
  // Ouvrir le popup de paiement (la génération se fera au clic "Valider le paiement")
  openPaymentModal(orderId, 'pay');
}

window.openPaymentModal = function(orderId, action) {
  state.currentPaymentOrderId = orderId;
  state.currentPaymentAction = action;
  
  const order = state.orders.find(o => o.id == orderId);
  if (!order) return;
  
  // Remplir le montant (éditable)
  document.getElementById('payment-amount-input').value = order.total.toFixed(2);
  
  // Réinitialiser le mode de paiement à CB par défaut
  const paymentMethodSelect = document.getElementById('payment-method');
  paymentMethodSelect.value = 'CB';
  
  // Ne plus mettre le prix à 0 automatiquement au choix du moyen de paiement
  // Le prix ne passera à 0 qu'au clic "Valider" si le mode est "Offert"
  
  document.getElementById('payment-modal').classList.add('active');
}

window.closePaymentModal = function() {
  document.getElementById('payment-modal').classList.remove('active');
  state.currentPaymentOrderId = null;
  state.currentPaymentAction = null;
}

window.confirmPayment = async function() {
  const method = document.getElementById('payment-method').value;
  let newTotal = parseFloat(document.getElementById('payment-amount-input').value);
  const orderId = state.currentPaymentOrderId;
  const action = state.currentPaymentAction;
  
  if (!orderId) return;
  
  // Si le mode de paiement est "Offert", mettre le prix à 0 uniquement maintenant (au clic "Valider")
  if (method === 'Offert') {
    newTotal = 0.00;
  }
  
  // Déterminer le nouveau statut
  // Si action = 'reserve' -> 'reserved'
  // Si action = 'pay' -> dépend du type de commande
  
  const order = state.orders.find(o => o.id == orderId);
  if (!order) {
    alert('Commande introuvable. Veuillez rafraîchir la page.');
    closePaymentModal();
    return;
  }
  const type = getOrderType(order);
  
  let newStatus = 'paid'; // Intermédiaire par défaut
  
  if (action === 'reserve') {
    newStatus = 'reserved';
  } else {
    // Logique automatique
    if (type === 'paper') newStatus = 'processing_print';
    else if (type === 'digital') newStatus = 'processing_web';
    else if (type === 'mixed') newStatus = 'processing_print'; // On commence par print, puis web
    else newStatus = 'processing_web'; // Fallback
  }
  
    // Mettre à jour le prix, le mode de paiement et le statut
  try {
    const response = await fetch(`/api/vendeur/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        total: newTotal,
        payment_method: method,
        status: newStatus
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API ${response.status}: ${errText || response.statusText}`);
    }
    
    // Mettre à jour localement la commande pour un feedback immédiat
    const orderIndex = state.orders.findIndex(o => o.id == orderId);
    if (orderIndex !== -1) {
      state.orders[orderIndex].status = newStatus;
      state.orders[orderIndex].total = newTotal;
      state.orders[orderIndex].payment_method = method;
    }
    updateBadges();
    calculateTurnover();
    renderTable();
    
    // Générer les dossiers en arrière-plan (ne pas attendre)
    // Pour "reserve", les dossiers ne sont pas générés - l'utilisateur devra utiliser "Traiter" ou "Générer"
    if (action === 'pay') {
      // Lancer la génération en arrière-plan sans attendre
      fetch(`/api/vendeur/orders/${orderId}/generate`, {
        method: 'POST'
      }).then(response => {
        if (!response.ok) {
          console.warn('Erreur génération dossiers:', response.statusText);
        } else {
          console.log('Dossiers générés avec succès après validation du paiement');
        }
      }).catch(genError => {
        console.error('Erreur génération dossiers:', genError);
      });
    } else if (action === 'reserve') {
      console.log('Commande réservée - les dossiers seront générés via le bouton "Traiter" ou "Générer"');
    }
    
    // Recharger les commandes en arrière-plan pour synchroniser (sans bloquer l'UI)
    loadOrders().catch(err => console.error('Erreur rechargement commandes:', err));
  } catch (error) {
    console.error('Erreur confirmation paiement:', error);
    const msg = (error && error.message) ? error.message : 'Erreur lors de la confirmation du paiement';
    alert('Erreur lors de la confirmation du paiement: ' + msg);
  }
  
  closePaymentModal();
}

window.processOrder = async function(orderId, target) {
  // Depuis Reserved -> 'web' (Processing Web)
  if (target === 'web') {
    // Mettre à jour le statut localement d'abord
    const orderIndex = state.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      state.orders[orderIndex].status = 'processing_web';
    }
    updateBadges();
    renderTable();
    
    // Mettre à jour le statut en base de données
    updateOrderStatus(orderId, 'processing_web').catch(err => {
      console.error('Erreur mise à jour statut:', err);
    });
    
    // Générer les dossiers en arrière-plan (ne pas attendre)
    fetch(`/api/vendeur/orders/${orderId}/generate`, {
      method: 'POST'
    }).then(response => {
      if (!response.ok) {
        console.warn('Erreur génération dossiers:', response.statusText);
      } else {
        console.log('Dossiers générés avec succès après "Traiter" (réservée)');
      }
    }).catch(genError => {
      console.error('Erreur génération dossiers:', genError);
    });
  }
}

window.finishOrder = async function(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  const type = getOrderType(order);
  
  let nextStatus = 'completed';
  
  // Si on est en print et que c'est mixte -> web
  if (order.status === 'processing_print' && type === 'mixed') {
    nextStatus = 'processing_web';
  }
  
  // Mettre à jour le statut localement d'abord
  const orderIndex = state.orders.findIndex(o => o.id === orderId);
  if (orderIndex !== -1) {
    state.orders[orderIndex].status = nextStatus;
  }
  updateBadges();
  renderTable();
  
  // Mettre à jour le statut en base de données
  updateOrderStatus(orderId, nextStatus).catch(err => {
    console.error('Erreur mise à jour statut:', err);
  });
  
  // Générer les dossiers en arrière-plan (ne pas attendre)
  // Note: pour les mixed, on génère à chaque étape (print puis web)
  fetch(`/api/vendeur/orders/${orderId}/generate`, {
    method: 'POST'
  }).then(response => {
    if (!response.ok) {
      console.warn('Erreur génération dossiers:', response.statusText);
    } else {
      console.log('Dossiers générés avec succès après "Traiter" (processing)');
    }
  }).catch(genError => {
    console.error('Erreur génération dossiers:', genError);
  });
}

window.generateFolders = async function(orderId) {
  try {
    const btn = event?.target || document.querySelector(`button[onclick="generateFolders(${orderId})"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Génération...';
    }
    
    const response = await fetch(`/api/vendeur/orders/${orderId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erreur lors de la génération');
    }
    
    const result = await response.json();
    alert('✅ Dossiers générés avec succès !');
    
    // Recharger les commandes pour voir les changements
    await loadOrders();
  } catch (error) {
    console.error('Erreur génération:', error);
    alert('❌ Erreur lors de la génération: ' + error.message);
  } finally {
    const btn = document.querySelector(`button[onclick="generateFolders(${orderId})"]`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Générer';
}
  }
}

// Fonction pour supprimer toutes les commandes avec protection par mot de passe
async function deleteAllOrders() {
  const password = prompt("Entrez le mot de passe administrateur :");
  if (password === "1512") {
    if (confirm("Êtes-vous sûr de vouloir supprimer TOUTES les commandes de l'interface ? Cette action est irréversible.")) {
      try {
        const response = await fetch('/api/vendeur/orders/delete-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: password })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Erreur lors de la suppression');
        }
        
        const data = await response.json();
        alert(data.message || 'Toutes les commandes ont été supprimées avec succès');
        await loadOrders(); // Recharger les commandes
      } catch (error) {
        alert('Erreur: ' + error.message);
      }
    }
  } else {
    if (password !== null) {
      alert("Mot de passe incorrect");
    }
  }
}

window.deleteOrder = async function(orderId) {
  if (!confirm('⚠️ ATTENTION : Cette action va supprimer la commande de l\'interface (les dossiers seront conservés). Confirmer ?')) return;
  try {
      const response = await fetch(`/api/vendeur/orders/${orderId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression' }));
        throw new Error(errorData.detail || 'Erreur lors de la suppression');
      }
      
      alert('✅ Commande supprimée de l\'interface avec succès');
      await loadOrders();
  } catch(e) {
      console.error('Erreur suppression:', e);
      alert('❌ Erreur lors de la suppression: ' + e.message);
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetch(`/api/vendeur/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Erreur mise à jour');
    }
    
    const result = await response.json();
    console.log('Statut mis à jour:', result);
    
    // Mettre à jour localement la commande dans state.orders pour un feedback immédiat
    const orderIndex = state.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      state.orders[orderIndex].status = status;
    }
    
    // Mettre à jour l'affichage immédiatement
    updateBadges();
    calculateTurnover();
    renderTable();
    
    // Recharger les données en arrière-plan pour synchroniser (sans bloquer l'UI)
    loadOrders().catch(err => console.error('Erreur rechargement commandes:', err));
  } catch (error) {
    console.error('Erreur updateOrderStatus:', error);
    alert('Erreur lors de la mise à jour du statut: ' + error.message);
    // Recharger pour réinitialiser l'affichage
    loadOrders().catch(err => console.error('Erreur rechargement commandes:', err));
  }
}

// --- Détails ---
window.openDetailsModal = function(orderId) {
  state.currentDetailsOrderId = orderId;
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;
  
  const content = document.getElementById('order-details-body');
  
  // Fonction pour obtenir la catégorie principale d'un item
  function getMainCategory(item) {
    // Vérifier si c'est un pack
    if (item.notes) {
      try {
        const packData = JSON.parse(item.notes);
        if (packData.photos && Array.isArray(packData.photos)) {
          return 'pack';
        }
      } catch (e) {
        // Ce n'est pas un pack
      }
    }
    
    // Trouver le produit correspondant
    const product = state.products.find(p => p.id === item.product_id);
    if (!product) return 'other';
    
    if (product.category === 'pack') {
      return 'pack';
    } else if (product.category === 'impression') {
      return 'impression';
    } else if (product.category === 'numérique') {
      return 'numérique';
    }
    
    return 'other';
  }
  
  // Fonction pour obtenir l'ordre de tri principal
  function getMainCategoryOrder(category) {
    const orderMap = {
      'impression': 1,
      'numérique': 2,
      'pack': 3,
      'other': 4
    };
    return orderMap[category] || 99;
  }
  
  // Trier les items selon les règles :
  // - Impression : par produit
  // - Numérique : par produit, puis par qualité (MD puis HD)
  // - Pack : par qualité (MD puis HD)
  const sortedItems = [...(order.items || [])].sort((a, b) => {
    const catA = getMainCategory(a);
    const catB = getMainCategory(b);
    const orderA = getMainCategoryOrder(catA);
    const orderB = getMainCategoryOrder(catB);
    
    // Si catégories différentes, trier par catégorie principale
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Même catégorie principale, appliquer les règles spécifiques
    const productA = state.products.find(p => p.id === a.product_id);
    const productB = state.products.find(p => p.id === b.product_id);
    
    if (catA === 'impression') {
      // Impression : trier uniquement par nom de produit
      return (a.product_name || '').localeCompare(b.product_name || '');
    } else if (catA === 'numérique') {
      // Numérique : trier par produit, puis par qualité (MD puis HD)
      const productCompare = (a.product_name || '').localeCompare(b.product_name || '');
      if (productCompare !== 0) {
        return productCompare;
      }
      // Même produit, trier par qualité : MD (email_delivery=true) avant HD (email_delivery=false)
      const qualityA = productA && productA.email_delivery ? 1 : 2; // 1 = MD, 2 = HD
      const qualityB = productB && productB.email_delivery ? 1 : 2;
      return qualityA - qualityB;
    } else if (catA === 'pack') {
      // Pack : trier par qualité (MD puis HD)
      const qualityA = productA && productA.email_delivery ? 1 : 2; // 1 = MD, 2 = HD
      const qualityB = productB && productB.email_delivery ? 1 : 2;
      if (qualityA !== qualityB) {
        return qualityA - qualityB;
      }
      // Même qualité, trier par nom de produit
      return (a.product_name || '').localeCompare(b.product_name || '');
    }
    
    // Fallback : trier par nom de produit
    return (a.product_name || '').localeCompare(b.product_name || '');
  });
  
  // Générer le HTML par catégorie principale
  let currentMainCategory = null;
  let itemsHtml = '';
  let itemIndex = 0;
  
  sortedItems.forEach((item) => {
    const mainCategory = getMainCategory(item);
    
    // Afficher un titre de section si on change de catégorie principale
    if (mainCategory !== currentMainCategory) {
      if (currentMainCategory !== null) {
        itemsHtml += '</div>'; // Fermer la section précédente
      }
      currentMainCategory = mainCategory;
      
      const categoryTitles = {
        'impression': 'Tirages',
        'numérique': 'Formats numériques',
        'pack': 'Packs'
      };
      
      itemsHtml += `
        <div style="margin-top: ${itemIndex > 0 ? '20px' : '0'};">
          <h4 style="margin: 0 0 10px 0; padding: 8px 12px; background: #2d3561; color: white; border-radius: 4px; font-size: 14px; font-weight: 600;">
            ${categoryTitles[mainCategory] || 'Autres'}
          </h4>
      `;
    }
    
    // Vérifier si c'est un pack
    let isPack = false;
    let packData = null;
    
    if (item.notes) {
      try {
        packData = JSON.parse(item.notes);
        if (packData.photos && Array.isArray(packData.photos)) {
          isPack = true;
        }
      } catch (e) {
        // Ce n'est pas un pack
      }
    }
    
    // Extraire le nom de la photo selon la logique des dossiers de commandes
    // Pour les formats impression (3000x2000) : nom exact du fichier dans redim (avec les #)
    // Pour les formats HD : nom original du fichier dans depot
    let photoName = '';
    
    if (item.photo_path) {
      // Extraire juste le nom du fichier depuis le chemin
      // Utiliser le nom exact tel qu'il apparaît dans le dossier de commande généré
      photoName = item.photo_path.split('/').pop().split('\\').pop();
    }
    
    if (isPack && packData) {
      // Affichage simplifié pour un pack
      itemsHtml += `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; background:${itemIndex % 2 === 0 ? '#f9f9f9' : 'white'};">
          <div style="flex:1;">
            <div style="font-weight:bold;color:#2d3561;">📦 ${escapeHtml(item.product_name || 'Pack')}</div>
            <div style="color:#666;font-size:0.9em;margin-top:4px;">
              ${escapeHtml(item.rider_name || 'Cavalier inconnu')}${item.horse_name ? ' - ' + escapeHtml(item.horse_name) : ''}
            </div>
          </div>
          <div style="text-align:right;margin-left:20px;">
            <div style="font-weight:bold;color:#2d3561;">x${item.quantity}</div>
            <div style="font-size:1.1em;color:#10b981;margin-top:4px;"><strong>${(item.unit_price * item.quantity).toFixed(2)} €</strong></div>
          </div>
        </div>
      `;
    } else {
      // Afficher toujours : cavalier - cheval - nom_photo
      let displayInfo = escapeHtml(item.rider_name || 'Cavalier inconnu');
      if (item.horse_name) {
        displayInfo += ' - ' + escapeHtml(item.horse_name);
      }
      if (photoName) {
        displayInfo += ' - ' + escapeHtml(photoName);
      }
      
      itemsHtml += `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; background:${itemIndex % 2 === 0 ? '#f9f9f9' : 'white'};">
          <div style="flex:1;">
            <div style="font-weight:bold;color:#2d3561;">${escapeHtml(item.product_name || 'Produit inconnu')}</div>
            <div style="color:#666;font-size:0.9em;margin-top:4px;">
              ${displayInfo}
            </div>
          </div>
          <div style="text-align:right;margin-left:20px;">
            <div style="font-weight:bold;color:#2d3561;">x${item.quantity}</div>
            <div style="font-size:1.1em;color:#10b981;margin-top:4px;"><strong>${(item.unit_price * item.quantity).toFixed(2)} €</strong></div>
          </div>
        </div>
      `;
    }
    
    itemIndex++;
  });
  
  // Fermer la dernière section
  if (currentMainCategory !== null) {
    itemsHtml += '</div>';
  }
  
  content.innerHTML = `
    <h2>Détail commande #${order.order_code || order.id}</h2>
    
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
        <!-- Colonne gauche : Informations client -->
        <div style="background:#f9fafb; padding:20px; border-radius:8px;">
            <h3 style="margin-top:0;">Informations client</h3>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Nom</label>
                <input type="text" id="edit-client-name" value="${escapeHtml(order.client_name)}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Email</label>
                <input type="email" id="edit-client-email" value="${escapeHtml(order.client_email)}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Téléphone</label>
                <input type="text" id="edit-client-phone" value="${escapeHtml(order.client_phone || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Adresse</label>
                <input type="text" id="edit-client-address" value="${escapeHtml(order.client_address || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div style="display:grid; grid-template-columns: 1fr 2fr; gap:10px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:4px;">Code postal</label>
                    <input type="text" id="edit-postal-code" value="${escapeHtml(order.postal_code || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:4px;">Ville</label>
                    <input type="text" id="edit-city" value="${escapeHtml(order.city || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:flex; align-items:center; cursor:pointer;">
                    <input type="checkbox" id="edit-invoice-required" ${(order.invoice_required || order.is_professional) ? 'checked' : ''} style="margin-right:8px;">
                    <span style="font-weight:600;">Facture requise</span>
                </label>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Raison sociale</label>
                <input type="text" id="edit-company-name" value="${escapeHtml(order.company_name || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Adresse entreprise (facturation) *</label>
                <textarea id="edit-company-address" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; min-height:60px;">${escapeHtml(order.company_address || '')}</textarea>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 2fr; gap:10px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:4px;">Code postal entreprise *</label>
                    <input type="text" id="edit-company-postal-code" value="${escapeHtml(order.company_postal_code || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:4px;">Ville entreprise *</label>
                    <input type="text" id="edit-company-city" value="${escapeHtml(order.company_city || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">SIRET</label>
                <input type="text" id="edit-company-siret" value="${escapeHtml(order.company_siret || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Numéro TVA</label>
                <input type="text" id="edit-company-tva" value="${escapeHtml(order.company_tva || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
        </div>
        
        <!-- Colonne droite : Informations commande -->
        <div style="background:#f9fafb; padding:20px; border-radius:8px;">
            <h3 style="margin-top:0;">Informations commande</h3>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Référence</label>
                <input type="text" value="${order.order_code || order.id}" disabled style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; background:#e9ecef;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Date</label>
                <input type="text" value="${new Date(order.created_at).toLocaleString()}" disabled style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; background:#e9ecef;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Statut</label>
                <select id="edit-status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>À régler</option>
                    <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Payée</option>
                    <option value="reserved" ${order.status === 'reserved' ? 'selected' : ''}>Réservée</option>
                    <option value="processing_print" ${order.status === 'processing_print' ? 'selected' : ''}>À traiter Impression</option>
                    <option value="processing_web" ${order.status === 'processing_web' ? 'selected' : ''}>À traiter Web</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Finalisée</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulée</option>
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Prix total</label>
                <input type="number" id="edit-total" value="${order.total.toFixed(2)}" step="0.01" min="0" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Mode de paiement</label>
                <select id="edit-payment-method" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                    <option value="">Non défini</option>
                    <option value="CB" ${order.payment_method === 'CB' ? 'selected' : ''}>Carte Bancaire</option>
                    <option value="Especes" ${order.payment_method === 'Especes' ? 'selected' : ''}>Espèces</option>
                    <option value="Offert" ${order.payment_method === 'Offert' ? 'selected' : ''}>Offert</option>
                    <option value="Chèque" ${order.payment_method === 'Chèque' ? 'selected' : ''}>Chèque</option>
                    <option value="Virement" ${order.payment_method === 'Virement' ? 'selected' : ''}>Virement</option>
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Commentaire vendeur</label>
                <textarea id="edit-seller-comment" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; min-height:60px;">${escapeHtml(order.seller_comment || '')}</textarea>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">Notes client</label>
                <textarea id="edit-notes" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; min-height:60px;">${escapeHtml(order.notes || '')}</textarea>
            </div>
        </div>
    </div>
    
    <div style="background:#f9fafb; padding:15px; border-radius:8px; margin-bottom:20px;">
        <h3>Articles commandés</h3>
        ${itemsHtml}
    </div>
    
    <div style="text-align:center;">
        <button onclick="saveOrderDetails(${order.id})" style="padding:12px 30px; background:#2d3561; color:white; border:none; border-radius:6px; font-size:16px; font-weight:600; cursor:pointer;">
            Enregistrer les modifications
        </button>
    </div>
  `;
  
  document.getElementById('order-details-modal').classList.add('active');
}

window.saveOrderDetails = async function(orderId) {
  const payload = {
    client_name: document.getElementById('edit-client-name').value,
    client_email: document.getElementById('edit-client-email').value,
    client_phone: document.getElementById('edit-client-phone').value,
    client_address: document.getElementById('edit-client-address').value,
    postal_code: document.getElementById('edit-postal-code').value,
    city: document.getElementById('edit-city').value,
    invoice_required: document.getElementById('edit-invoice-required').checked,
    company_name: document.getElementById('edit-company-name').value,
    company_address: document.getElementById('edit-company-address').value,
    company_postal_code: document.getElementById('edit-company-postal-code').value,
    company_city: document.getElementById('edit-company-city').value,
    company_siret: document.getElementById('edit-company-siret').value,
    company_tva: document.getElementById('edit-company-tva').value,
    status: document.getElementById('edit-status').value,
    total: parseFloat(document.getElementById('edit-total').value),
    payment_method: document.getElementById('edit-payment-method').value || null,
    seller_comment: document.getElementById('edit-seller-comment').value,
    notes: document.getElementById('edit-notes').value
  };
  
  try {
    const response = await fetch(`/api/vendeur/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error('Erreur lors de la mise à jour');
    
    alert('✅ Commande mise à jour avec succès !');
    closeDetailsModal();
    await loadOrders();
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    alert('❌ Erreur lors de la sauvegarde: ' + error.message);
  }
}

window.closeDetailsModal = function() {
  document.getElementById('order-details-modal').classList.remove('active');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Export CSV des commandes finalisées
async function exportCompletedOrdersCSV() {
  try {
  const exportBtn = document.getElementById('export-csv-btn');
    const originalText = exportBtn.textContent;
    exportBtn.textContent = '⏳ Export en cours...';
    exportBtn.disabled = true;
    
    // Appeler l'endpoint d'export
    const response = await fetch('/api/vendeur/export-orders?status=completed');
    
        if (!response.ok) {
      throw new Error('Erreur lors de l\'export');
        }
    
    // Récupérer le CSV et déclencher le téléchargement
        const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
    a.href = url;
    
    // Récupérer le nom de fichier depuis les headers de la réponse
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `commandes_completed_${new Date().toISOString().split('T')[0]}.csv`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    // Corriger d'éventuels suffixes bizarres (.csv_ etc.) et forcer l'extension .csv
    if (filename.toLowerCase().endsWith('.csv_')) {
      filename = filename.slice(0, -1); // enlève le "_" final
    }
    if (!filename.toLowerCase().endsWith('.csv')) {
      filename += '.csv';
    }
    
    a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    exportBtn.textContent = originalText;
    exportBtn.disabled = false;
      } catch (error) {
    console.error('Erreur export CSV:', error);
        alert('Erreur lors de l\'export CSV: ' + error.message);
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
      exportBtn.textContent = '📥 Exporter Finalisées (CSV)';
      exportBtn.disabled = false;
}
  }
}

// Fonction pour traiter les suppressions/ajouts dans depot
let scanInProgress = false;

async function requestJson(url, options = {}) {
  const resp = await fetch(url, options);
  let data = null;
  try {
    data = await resp.json();
  } catch (e) {
    if (resp.ok) throw new Error("Réponse invalide");
    const txt = await resp.text();
    throw new Error(txt || resp.statusText);
  }
  if (!resp.ok) {
    throw new Error(data && data.detail ? data.detail : resp.statusText);
  }
  return data;
}

function refreshStatus() {
  requestJson("/status")
    .then(data => {
      if (data.stats) {
        document.getElementById('counter-total').textContent = data.stats.total_photos || 0;
        document.getElementById('counter-redim').textContent = data.stats.processed || 0;
        document.getElementById('counter-upload').textContent = data.stats.uploaded || 0;
      }
    })
    .catch(e => {
      console.error("Erreur refreshStatus:", e);
    });
}

function resetUploadCounter() {
  if (!confirm("Réinitialiser le compteur d'upload à 0 ?\n\nCela ne supprime pas les uploads en attente, mais remet simplement l'indicateur à 0.")) {
    return;
  }
  const btn = document.getElementById("reset-upload-btn");
  let original = "";
  if (btn) {
    btn.disabled = true;
    original = btn.textContent;
    btn.textContent = "Réinitialisation...";
    btn.style.opacity = "0.6";
  }
  
  requestJson("/reset-upload-counter", { method: "POST" })
    .then(res => {
      alert("Compteur d'upload réinitialisé à 0.");
      refreshStatus();
    })
    .catch(e => {
      console.error("Erreur réinitialisation upload:", e);
      alert("Erreur réinitialisation upload: " + e.message);
    })
    .finally(() => {
      if (btn && original) {
        btn.disabled = false;
        btn.textContent = original;
        btn.style.opacity = "1";
      }
    });
}

let syncInProgress = false;

function syncDepotRedim() {
  if (syncInProgress) {
    alert("Une synchronisation est déjà en cours.");
    return;
  }
  
  const confirmMsg = 'Voulez-vous synchroniser depot et redim ?\n\nCette opération va vérifier que tous les fichiers dans depot ont leur file_id dans la DB et que les emplacements dans redim correspondent.\n\nDes jobs seront créés pour les fichiers mal placés ou sans file_id.';
  if (!confirm(confirmMsg)) {
    return;
  }
  
  // Demander si on veut supprimer les fichiers orphelins et doublons
  let deleteOrphans = false;
  let deleteDuplicates = false;
  
  const btn = document.getElementById("sync-btn");
  if (btn) {
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Synchronisation en cours...";
    btn.style.opacity = "0.6";
    syncInProgress = true;

    // Faire une première requête pour détecter les problèmes
    requestJson("/sync-depot-redim", { method: "POST" })
      .then(res => {
        // Si des orphelins, doublons ou erreurs sont détectés, proposer de les supprimer
        if ((res.redim_orphans_count > 0 || res.redim_duplicates_count > 0 || res.redim_errors_count > 0) && !res.deleted_orphans && !res.deleted_duplicates && !res.deleted_errors) {
          let deleteMsg = "";
          if (res.redim_orphans_count > 0) {
            deleteMsg += `${res.redim_orphans_count} fichier(s) orphelin(s) détecté(s).\n`;
          }
          if (res.redim_duplicates_count > 0) {
            deleteMsg += `${res.redim_duplicates_count} doublon(s) détecté(s).\n`;
          }
          if (res.redim_errors_count > 0) {
            deleteMsg += `${res.redim_errors_count} fichier(s) avec erreur(s) détecté(s).\n`;
          }
          deleteMsg += "\nVoulez-vous les supprimer automatiquement ?";
          
          if (confirm(deleteMsg)) {
            // Relancer avec suppression
            const deleteOrphans = res.redim_orphans_count > 0;
            const deleteDuplicates = res.redim_duplicates_count > 0;
            const deleteErrors = res.redim_errors_count > 0;
            
            const params = new URLSearchParams();
            if (deleteOrphans) params.append("delete_orphans", "true");
            if (deleteDuplicates) params.append("delete_duplicates", "true");
            if (deleteErrors) params.append("delete_errors", "true");
            
            return requestJson(`/sync-depot-redim?${params.toString()}`, { method: "POST" });
          }
        }
        return Promise.resolve(res);
      })
      .then(res => {
        let message = "Synchronisation terminée.\n\n";
        message += "=== DEPOT ===\n";
        message += `Fichiers scannés: ${res.files_scanned || 0}\n`;
        message += `Fichiers avec file_id: ${res.files_with_file_id || 0}\n`;
        message += `Fichiers sans file_id: ${res.files_missing_file_id || 0}\n`;
        message += `Fichiers mal placés: ${res.files_misplaced || 0}\n`;
        message += `Jobs créés: ${res.jobs_created || 0}\n`;
        if (res.errors > 0) {
          message += `Erreurs: ${res.errors}\n`;
        }
        
        message += "\n=== REDIM ===\n";
        message += `Fichiers scannés: ${res.redim_files_scanned || 0}\n`;
        message += `Fichiers orphelins: ${res.redim_orphans_count || 0}\n`;
        message += `Doublons détectés: ${res.redim_duplicates_count || 0}\n`;
        message += `Fichiers avec erreurs: ${res.redim_errors_count || 0}\n`;
        
        if (res.redim_orphans_count > 0) {
          message += `\n⚠️ ${res.redim_orphans_count} fichier(s) orphelin(s) dans redim (sans correspondant dans depot).\n`;
          if (res.redim_orphans && res.redim_orphans.length > 0) {
            message += "Exemples:\n";
            res.redim_orphans.slice(0, 5).forEach(orphan => {
              message += `  - ${orphan.path} (${orphan.reason})\n`;
            });
            if (res.redim_orphans_count > 5) {
              message += `  ... et ${res.redim_orphans_count - 5} autres\n`;
            }
          }
        }
        
        if (res.redim_duplicates_count > 0) {
          message += `\n⚠️ ${res.redim_duplicates_count} doublon(s) détecté(s) dans redim.\n`;
          if (res.redim_duplicates && res.redim_duplicates.length > 0) {
            message += "Exemples:\n";
            res.redim_duplicates.slice(0, 5).forEach(dup => {
              message += `  - ${dup.path} (${dup.reason})\n`;
            });
            if (res.redim_duplicates_count > 5) {
              message += `  ... et ${res.redim_duplicates_count - 5} autres\n`;
            }
          }
        }
        
        if (res.redim_errors_count > 0) {
          message += `\n⚠️ ${res.redim_errors_count} fichier(s) avec erreur(s) dans redim.\n`;
          if (res.redim_errors && res.redim_errors.length > 0) {
            message += "Exemples:\n";
            res.redim_errors.slice(0, 5).forEach(err => {
              message += `  - ${err.path} (${err.reason})\n`;
            });
            if (res.redim_errors_count > 5) {
              message += `  ... et ${res.redim_errors_count - 5} autres\n`;
            }
          }
        }
        
        if (res.jobs_created > 0) {
          message += `\n⚠️ ${res.jobs_created} job(s) créé(s). Les fichiers seront traités par le pipeline.`;
        }
        
        if (res.deleted_orphans > 0 || res.deleted_duplicates > 0 || res.deleted_errors > 0) {
          message += `\n\n🗑️ Suppression effectuée:\n`;
          if (res.deleted_orphans > 0) {
            message += `  - ${res.deleted_orphans} fichier(s) orphelin(s) supprimé(s)\n`;
          }
          if (res.deleted_duplicates > 0) {
            message += `  - ${res.deleted_duplicates} doublon(s) supprimé(s)\n`;
          }
          if (res.deleted_errors > 0) {
            message += `  - ${res.deleted_errors} fichier(s) avec erreur(s) supprimé(s)\n`;
          }
        }
        
        if (res.redim_orphans_count === 0 && res.redim_duplicates_count === 0 && res.redim_errors_count === 0 && res.jobs_created === 0) {
          message += `\n✅ Tout est synchronisé !`;
        } else if (res.deleted_orphans === 0 && res.deleted_duplicates === 0 && res.deleted_errors === 0) {
          message += `\n\n💡 Relancez la synchronisation et confirmez la suppression pour nettoyer les fichiers orphelins, doublons et erreurs.`;
        }
        
        alert(message);
        refreshStatus();
      })
      .catch(e => alert("Erreur synchronisation: " + e.message))
      .finally(() => {
        syncInProgress = false;
        if (btn) {
          btn.disabled = false;
          btn.textContent = original;
          btn.style.opacity = "1";
        }
      });
  } else {
    alert("Bouton synchronisation introuvable.");
  }
}
