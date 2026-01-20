// Admin JS - Interface gestion produits
// Version modulaire

// ========== ÉTAT GLOBAL ==========
let products = [];
let adminState = {
  turnoverObjective: 0,
  caHT: 0,
  orders: []
};

// ========== UTILITAIRES ==========
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showMessage(message, type = 'info') {
  const messageEl = document.getElementById('message');
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.className = `message message-${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  } else {
    alert(message);
  }
}

// ========== CHARGEMENT PRODUITS ==========
async function loadProducts() {
  try {
    const response = await fetch('/api/admin/products');
    if (!response.ok) {
      throw new Error('Erreur chargement produits');
    }
    const data = await response.json();
    products = data.products || [];
    renderProducts();
  } catch (error) {
    console.error('Erreur chargement produits:', error);
    showMessage('Erreur lors du chargement des produits: ' + error.message, 'error');
  }
}

// ========== AFFICHAGE PRODUITS ==========
function renderProducts() {
  const app = document.getElementById('app');
  if (!app) return;
  
  // Initialisation unique de la structure (si vide)
  if (!document.getElementById('products-list-container')) {
    app.innerHTML = `
      <div id="products-list-container"></div>
      <div id="product-form-container"></div>
    `;
    // Initialiser le formulaire une seule fois
    renderForm();
  }
  
  const listContainer = document.getElementById('products-list-container');
  if (!listContainer) return; // Sécurité

  let html = '';
  
  // Boutons pour réorganiser l'ordre
  html += '<div style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">';
  html += '<button onclick="openCartOrderModal()" style="padding: 10px 20px; background: #2d3561; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95em; font-weight: 600;">Reorganiser l\'ordre dans le panier</button>';
  html += '<button onclick="openFeaturedOrderModal()" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95em; font-weight: 600;">Reorganiser les offres</button>';
  html += '</div>';
  
  // Afficher le message si aucun produit
  if (products.length === 0) {
    html += '<p style="padding: 20px; background: #f0f4ff; border-left: 4px solid #667eea; margin-bottom: 30px; border-radius: 4px;">Aucun produit. Créez-en un nouveau ci-dessous.</p>';
  } else {
    // Afficher la liste des produits
    html += '<div class="products-list">';
    products.forEach(product => {
      html += `
        <div class="product-card" data-product-id="${product.id}">
          <div class="product-header">
            <h3>${escapeHtml(product.name)}</h3>
            <div class="product-actions">
              <button class="btn-edit" onclick="editProduct(${product.id})">Modifier</button>
              <button class="btn-delete" onclick="deleteProduct(${product.id})">Supprimer</button>
            </div>
          </div>
          <div class="product-details">
            <p><strong>Description:</strong> ${escapeHtml(product.description || 'Aucune')}</p>
            <p><strong>Prix:</strong> ${product.price.toFixed(2)} EUR${product.promo_price && product.promo_price < product.price ? ` <span style="color: #ef4444; font-weight: bold;">-> ${product.promo_price.toFixed(2)} EUR (PROMO)</span>` : ''}</p>
            <p><strong>Catégorie:</strong> ${escapeHtml(product.category || 'Aucune')}</p>
            <p><strong>Statut:</strong> <span class="status-${product.active ? 'active' : 'inactive'}">${product.active ? 'Actif' : 'Inactif'}</span></p>
            <p><strong>Masqué:</strong> <span class="status-${product.hidden ? 'inactive' : 'active'}">${product.hidden ? 'Oui' : 'Non'}</span></p>
            ${product.featured_position > 0 ? `<p><strong>Position Nos offres:</strong> ${product.featured_position}</p>` : ''}
            ${product.requires_address ? '<p><strong>Demande adresse:</strong> Oui</p>' : ''}
            ${product.special_promo_rule ? `<p><strong>Promo spéciale:</strong> ${escapeHtml(product.special_promo_rule)}</p>` : ''}
            ${product.delivery_method ? `<p><strong>Livraison:</strong> ${product.delivery_method === 'shipping' ? 'Envoi postal' : 'Sur place'}</p>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  listContainer.innerHTML = html;
}

function renderForm() {
  const formContainer = document.getElementById('product-form-container');
  if (!formContainer) return;

  let html = `
    <div class="product-form-container">
      <h2>Ajouter un produit</h2>
      <form id="product-form" class="product-form">
        <div class="form-group">
          <label for="product-name">Nom *</label>
          <input type="text" id="product-name" required>
        </div>
        <div class="form-group">
          <label for="product-name-en">Nom (English)</label>
          <input type="text" id="product-name-en" placeholder="Name in English">
        </div>
        <div class="form-group">
          <label for="product-name-es">Nom (Español)</label>
          <input type="text" id="product-name-es" placeholder="Nombre en español">
        </div>
        <div class="form-group">
          <label for="product-description">Description</label>
          <textarea id="product-description" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="product-description-en">Description (English)</label>
          <textarea id="product-description-en" rows="3" placeholder="Description in English"></textarea>
        </div>
        <div class="form-group">
          <label for="product-description-es">Description (Español)</label>
          <textarea id="product-description-es" rows="3" placeholder="Descripción en español"></textarea>
        </div>
        <div class="form-group">
          <label for="product-badge-text-fr">Texte du badge (Français) - Pour "Nos offres"</label>
          <input type="text" id="product-badge-text-fr" placeholder="Ex: Pack, Impression sur place, Envoi postal...">
          <small style="color:#666;font-size:0.85em;display:block;margin-top:4px;">
            Texte affiché dans le bandeau bleu sur la carte produit dans "Nos offres". Laisser vide pour utiliser les valeurs automatiques.
          </small>
        </div>
        <div class="form-group">
          <label for="product-badge-text-en">Texte du badge (English)</label>
          <input type="text" id="product-badge-text-en" placeholder="Ex: Pack, Print on site, Postal delivery...">
        </div>
        <div class="form-group">
          <label for="product-badge-text-es">Texte du badge (Español)</label>
          <input type="text" id="product-badge-text-es" placeholder="Ex: Pack, Impresión en el lugar, Envío postal...">
        </div>
        <div class="form-group">
          <label for="product-price">Prix (€) *</label>
          <input type="number" id="product-price" step="0.01" min="0" required>
        </div>
        <div class="form-group">
          <label for="product-category">Type</label>
          <select id="product-category">
            <option value="">-- Sélectionner --</option>
            <option value="numérique">Numérique</option>
            <option value="impression">Impression</option>
            <option value="pack">Pack</option>
          </select>
          <small style="color:#666;font-size:0.85em;display:block;margin-top:4px;">
            Astuce : les produits de type <strong>Pack</strong> sont utilisés par le bouton « Acheter mon pack » sur la borne.
          </small>
          <div id="pack-info-box" style="display:none; margin-top:15px; padding:15px; background:#e8f4f8; border-left:4px solid #2d3561; border-radius:4px;">
            <p style="margin:0 0 10px 0; font-weight:600; color:#2d3561;">Configuration du Pack</p>
            <p style="margin:0 0 10px 0; font-size:0.9em; color:#555;">
              Le pack permet aux clients d'acheter <strong>toutes les photos numériques</strong> d'un cavalier/cheval en une seule fois.<br>
              Configurez le <strong>prix dégressif</strong> ci-dessous pour proposer des tarifs avantageux selon le nombre de packs.
            </p>
            <p style="margin:0; font-size:0.85em; color:#666; font-style:italic;">
              Exemple : 1 pack = 50€, 2 packs = 90€, 3 packs = 120€
            </p>
            <p style="margin:10px 0 0 0; font-size:0.85em; color:#2d3561; font-weight:500;">
              Option "Photo redimensionnee en 3000x2000" : activez cette option pour proposer des photos redimensionnees (sinon photos HD completes).
            </p>
          </div>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" id="product-active" checked>
            <span>Actif</span>
          </label>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" id="product-hidden">
            <span>Masquer (caché mais reste actif)</span>
          </label>
        </div>
        <div class="form-group">
          <label for="product-promo-price">Prix promo (€) - Laisser vide si pas de promo</label>
          <input type="number" id="product-promo-price" step="0.01" min="0" placeholder="Ex: 9.99">
        </div>
        <div class="form-group">
          <label>Règles de prix par quantité (optionnel)</label>
          <div id="pricing-rules-container" style="border: 1px solid #ddd; border-radius: 4px; padding: 15px; background: #f9f9f9;">
            <div id="pricing-rules-list"></div>
            <button type="button" id="add-pricing-rule-btn" style="margin-top: 10px; padding: 8px 16px; background: #2d3561; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
              + Ajouter une règle
            </button>
            <small style="color: #666; font-size: 0.9em; display: block; margin-top: 10px;">
              Définissez le prix par photo pour chaque position. Exemple: photo 1 = 15€, photo 2 = 10€, photo 3 = 7€. Le prix affiché sera le total cumulé pour le nombre de photos sélectionnées.
            </small>
          </div>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" id="product-email-delivery">
            <span>Photo redimensionnée en 3000x2000 (livraison par email)</span>
          </label>
          <small style="color:#666;font-size:0.85em;display:block;margin-top:8px;margin-left:28px;">
            <strong>Pour les packs :</strong> si coché, le pack inclura des photos redimensionnées (3000x2000). Si non coché, le pack inclura les photos HD complètes.
          </small>
        </div>
        <!-- Champ adresse masqué, géré par le mode de livraison -->
        <input type="checkbox" id="product-requires-address" style="display:none">
        <!-- Champ featured_position masqué, géré par le modal de réorganisation -->
        <input type="hidden" id="input-featured-position-unique" value="0">
        
        <div class="form-group">
          <label for="product-special-promo-rule">Règle promo spéciale (optionnel)</label>
          <input type="text" id="product-special-promo-rule" placeholder="Ex: 2=1 (toutes les 2 photos, 1 offerte)">
          <small style="color:#666;font-size:0.85em;display:block;margin-top:4px;">
            Format: X=Y où toutes les X photos, Y sont offertes. Exemple: "2=1" signifie que toutes les 2 photos, 1 est offerte (positions 2, 4, 6, 8... gratuites). La règle se répète en boucle. Les photos offertes sont automatiquement facturées à 0€.
          </small>
        </div>
        <div class="form-group" id="delivery-method-group" style="display: none;">
          <label for="product-delivery-method">Mode de livraison (pour produits impression)</label>
          <select id="product-delivery-method">
            <option value="">-- Sélectionner --</option>
            <option value="pickup">Impression sur place</option>
            <option value="shipping">Envoi postal</option>
          </select>
          <small style="color:#666;font-size:0.85em;display:block;margin-top:4px;">
            <strong>Impression sur place :</strong> Le client récupère ses tirages sur place.<br>
            <strong>Envoi postal :</strong> Les produits sont envoyés par la poste (nécessite une adresse).
          </small>
        </div>
        <div class="form-group" id="reduced-price-with-print-group" style="display: none;">
          <label for="product-reduced-price-with-print">Prix réduit avec impression (€) - Pour produits numériques uniquement</label>
          <input type="number" id="product-reduced-price-with-print" step="0.01" min="0" placeholder="Ex: 29.99">
          <small style="color:#666;font-size:0.85em;display:block;margin-top:4px;">
            Si une impression de la même photo est dans le panier, ce prix réduit sera appliqué au produit numérique. Laisser vide si pas de réduction.
          </small>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-submit">Enregistrer</button>
          <button type="button" class="btn-cancel" onclick="cancelEdit()">Annuler</button>
        </div>
      </form>
    </div>
  `;

  formContainer.innerHTML = html;

  // Attacher l'événement submit
  const form = document.getElementById('product-form');
  if (form) {
    form.addEventListener('submit', handleProductSubmit);
  }
  
  // Afficher/masquer la boîte d'info du pack selon le type sélectionné
  const categorySelect = document.getElementById('product-category');
  const packInfoBox = document.getElementById('pack-info-box');
  const deliveryMethodGroup = document.getElementById('delivery-method-group');
  const reducedPriceWithPrintGroup = document.getElementById('reduced-price-with-print-group');
  if (categorySelect) {
    function toggleFields() {
      const category = categorySelect.value.toLowerCase();
      const isPack = category === 'pack';
      const isPrinted = category === 'impression';
      const isDigital = category === 'numérique' || category === '';
      
      if (packInfoBox) {
        packInfoBox.style.display = isPack ? 'block' : 'none';
      }
      
      if (deliveryMethodGroup) {
        deliveryMethodGroup.style.display = isPrinted ? 'block' : 'none';
      }
      
      if (reducedPriceWithPrintGroup) {
        reducedPriceWithPrintGroup.style.display = isDigital ? 'block' : 'none';
      }
    }
    categorySelect.addEventListener('change', toggleFields);
    toggleFields(); // Initialiser au chargement
  }
  
  // Initialiser les règles de prix
  initPricingRules();
}

// ========== GESTION RÈGLES DE PRIX ==========
function initPricingRules() {
  const container = document.getElementById('pricing-rules-list');
  const addBtn = document.getElementById('add-pricing-rule-btn');
  
  if (!container || !addBtn) return;
  
  // Fonction pour mettre à jour le JSON caché
  function updatePricingRulesJSON() {
    const rules = {};
    const items = container.querySelectorAll('.pricing-rule-item');
    
    items.forEach(item => {
      const qty = item.querySelector('.pricing-rule-qty').value.trim();
      const price = item.querySelector('.pricing-rule-price').value.trim();
      
      if (qty && price) {
        const qtyNum = parseInt(qty);
        const priceNum = parseFloat(price);
        if (qtyNum > 0 && priceNum >= 0) {
          rules[String(qtyNum)] = priceNum;
        }
      }
    });
    
    // Stocker dans un champ caché pour le formulaire
    let hiddenInput = document.getElementById('product-pricing-rules-hidden');
    if (!hiddenInput) {
      hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = 'product-pricing-rules-hidden';
      document.getElementById('product-form').appendChild(hiddenInput);
    }
    hiddenInput.value = JSON.stringify(Object.keys(rules).length > 0 ? rules : null);
  }
  
  // Bouton pour ajouter une règle
  addBtn.addEventListener('click', () => {
    const newRule = createPricingRuleElement();
    container.appendChild(newRule);
    updatePricingRulesJSON();
  });
  
  // Exposer la fonction de mise à jour
  window.updatePricingRulesJSON = updatePricingRulesJSON;
}

// ========== GESTION FORMULAIRE ==========
let editingProductId = null;

async function editProduct(productId) {
  // Recharger les produits depuis l'API pour avoir les valeurs les plus récentes
  try {
    const response = await fetch('/api/admin/products');
    if (response.ok) {
      const data = await response.json();
      products = data.products || [];
    }
  } catch (error) {
    console.error('Erreur lors du rechargement des produits:', error);
  }
  
  const product = products.find(p => p.id === productId);
  if (!product) {
    console.error('Produit non trouvé:', productId);
    return;
  }

  console.log('Chargement du produit pour édition:', {
    id: product.id,
    name: product.name,
    category: product.category,
    featured_position: product.featured_position,
    requires_address: product.requires_address,
    delivery_method: product.delivery_method,
    reduced_price_with_print: product.reduced_price_with_print
  });

  editingProductId = productId;
  document.querySelector('.product-form-container h2').textContent = 'Modifier un produit';
  
  // Le champ "Nom" contient le nom français (name_fr ou name)
  const nameEl = document.getElementById('product-name');
  if (nameEl) {
    const name = product.name_fr || product.name || '';
    // Décoder les entités HTML courantes
    nameEl.value = name
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  
  const descEl = document.getElementById('product-description');
  // Pour les textarea, décoder les entités HTML si elles existent, sinon utiliser la valeur brute
  if (descEl) {
    const desc = product.description_fr || product.description || '';
    // Décoder les entités HTML courantes
    descEl.value = desc
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  
  // Traductions
  const nameEnEl = document.getElementById('product-name-en');
  if (nameEnEl) {
    const nameEn = product.name_en || '';
    nameEnEl.value = nameEn
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  
  const nameEsEl = document.getElementById('product-name-es');
  if (nameEsEl) {
    const nameEs = product.name_es || '';
    nameEsEl.value = nameEs
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  
  const descEnEl = document.getElementById('product-description-en');
  if (descEnEl) {
    const descEn = product.description_en || '';
    descEnEl.value = descEn
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  
  const descEsEl = document.getElementById('product-description-es');
  if (descEsEl) {
    const descEs = product.description_es || '';
    descEsEl.value = descEs
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  
  const badgeTextFrEl = document.getElementById('product-badge-text-fr');
  if (badgeTextFrEl) {
    const badgeFr = product.badge_text_fr || '';
    badgeTextFrEl.value = badgeFr
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  
  const badgeTextEnEl = document.getElementById('product-badge-text-en');
  if (badgeTextEnEl) {
    const badgeEn = product.badge_text_en || '';
    badgeTextEnEl.value = badgeEn
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  
  const badgeTextEsEl = document.getElementById('product-badge-text-es');
  if (badgeTextEsEl) {
    const badgeEs = product.badge_text_es || '';
    badgeTextEsEl.value = badgeEs
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  
  document.getElementById('product-price').value = product.price || 0;
  document.getElementById('product-category').value = product.category || '';
  document.getElementById('product-active').checked = product.active !== false;
  document.getElementById('product-hidden').checked = product.hidden === true;
  document.getElementById('product-promo-price').value = (product.promo_price && product.promo_price < product.price) ? product.promo_price : '';
  document.getElementById('product-email-delivery').checked = product.email_delivery === true;
  // featured_position est géré par le modal de réorganisation, on ne le modifie pas ici
  const featPosEl = document.getElementById('input-featured-position-unique');
  if (featPosEl) featPosEl.value = product.featured_position || 0;
  document.getElementById('product-requires-address').checked = product.requires_address === true;
  document.getElementById('product-special-promo-rule').value = escapeHtml(product.special_promo_rule || '');
  document.getElementById('product-delivery-method').value = escapeHtml(product.delivery_method || '');
  const reducedPriceWithPrintEl = document.getElementById('product-reduced-price-with-print');
  if (reducedPriceWithPrintEl) {
    reducedPriceWithPrintEl.value = product.reduced_price_with_print || '';
  }
  // Afficher les règles de prix dans l'interface interactive
  loadPricingRules(product.pricing_rules);
  
  // Afficher les champs conditionnels - utiliser la même logique que toggleFields
  const categorySelect = document.getElementById('product-category');
  const packInfoBox = document.getElementById('pack-info-box');
  const deliveryMethodGroup = document.getElementById('delivery-method-group');
  const reducedPriceWithPrintGroup = document.getElementById('reduced-price-with-print-group');
  if (categorySelect) {
    // IMPORTANT: Définir la catégorie AVANT d'afficher/masquer les champs
    categorySelect.value = product.category || '';
    
    // Déterminer la catégorie et afficher/masquer les champs
    const category = (product.category || '').toLowerCase();
    const isPack = category === 'pack';
    const isPrinted = category === 'impression';
    const isDigital = category === 'numérique' || category === '';
    
    if (packInfoBox) {
      packInfoBox.style.display = isPack ? 'block' : 'none';
    }
    
    if (deliveryMethodGroup) {
      deliveryMethodGroup.style.display = isPrinted ? 'block' : 'none';
    }
    
    if (reducedPriceWithPrintGroup) {
      reducedPriceWithPrintGroup.style.display = isDigital ? 'block' : 'none';
    }
    
    // Ne pas déclencher l'événement change car on a déjà défini l'affichage manuellement
    // toggleFields() sera appelé automatiquement si l'utilisateur change la catégorie
  }

  // Scroll vers le formulaire
  document.querySelector('.product-form-container').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  console.log('Annulation édition (reset form)');
  editingProductId = null;
  document.querySelector('.product-form-container h2').textContent = 'Créer un produit';
  document.getElementById('product-form').reset();
  document.getElementById('product-active').checked = true;
  document.getElementById('product-hidden').checked = false;
  document.getElementById('product-email-delivery').checked = false;
  const featPosEl = document.getElementById('input-featured-position-unique');
  if (featPosEl) featPosEl.value = 0;
  document.getElementById('product-requires-address').checked = false;
  document.getElementById('product-special-promo-rule').value = '';
  document.getElementById('product-delivery-method').value = '';
  const reducedPriceWithPrintEl = document.getElementById('product-reduced-price-with-print');
  if (reducedPriceWithPrintEl) reducedPriceWithPrintEl.value = '';
  loadPricingRules(null);
  
  // Réinitialiser l'affichage des champs conditionnels
  const packInfoBox = document.getElementById('pack-info-box');
  const deliveryMethodGroup = document.getElementById('delivery-method-group');
  const reducedPriceWithPrintGroup = document.getElementById('reduced-price-with-print-group');
  if (packInfoBox) packInfoBox.style.display = 'none';
  if (deliveryMethodGroup) deliveryMethodGroup.style.display = 'none';
  if (reducedPriceWithPrintGroup) reducedPriceWithPrintGroup.style.display = 'none';
}

// Fonction pour charger les règles de prix dans l'interface
function loadPricingRules(pricingRules) {
  const container = document.getElementById('pricing-rules-list');
  if (!container) return;
  
  // Vider le conteneur
  container.innerHTML = '';
  
  if (pricingRules && typeof pricingRules === 'object') {
    // Trier les quantités par ordre croissant
    const sortedRules = Object.entries(pricingRules)
      .map(([qty, price]) => ({ qty: parseInt(qty), price: parseFloat(price) }))
      .sort((a, b) => a.qty - b.qty);
    
    sortedRules.forEach(({ qty, price }) => {
      const ruleDiv = createPricingRuleElement(qty, price);
      container.appendChild(ruleDiv);
    });
  }
  
  // Mettre à jour le JSON caché
  if (window.updatePricingRulesJSON) {
    window.updatePricingRulesJSON();
  } else {
    // Si la fonction n'est pas encore disponible, initialiser manuellement le champ caché
    let hiddenInput = document.getElementById('product-pricing-rules-hidden');
    if (!hiddenInput) {
      hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = 'product-pricing-rules-hidden';
      const form = document.getElementById('product-form');
      if (form) form.appendChild(hiddenInput);
    }
    hiddenInput.value = pricingRules ? JSON.stringify(pricingRules) : 'null';
  }
}

// Fonction pour créer un élément de règle (réutilisable)
function createPricingRuleElement(quantity = '', price = '') {
  const ruleDiv = document.createElement('div');
  ruleDiv.className = 'pricing-rule-item';
  ruleDiv.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #e0e0e0;';
  
  ruleDiv.innerHTML = `
    <div style="flex: 1;">
      <label style="display: block; font-size: 0.85em; color: #666; margin-bottom: 4px;">Quantité</label>
      <input type="number" class="pricing-rule-qty" min="1" value="${quantity}" placeholder="Ex: 1" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="flex: 1;">
      <label style="display: block; font-size: 0.85em; color: #666; margin-bottom: 4px;">Prix (€)</label>
      <input type="number" class="pricing-rule-price" step="0.01" min="0" value="${price}" placeholder="Ex: 15.00" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <button type="button" class="remove-pricing-rule-btn" style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;">
      X
    </button>
  `;
  
  // Ajouter l'événement de suppression
  ruleDiv.querySelector('.remove-pricing-rule-btn').addEventListener('click', () => {
    ruleDiv.remove();
    if (window.updatePricingRulesJSON) {
      window.updatePricingRulesJSON();
    }
  });
  
  // Ajouter les événements de mise à jour
  ruleDiv.querySelector('.pricing-rule-qty').addEventListener('input', () => {
    if (window.updatePricingRulesJSON) {
      window.updatePricingRulesJSON();
    }
  });
  ruleDiv.querySelector('.pricing-rule-price').addEventListener('input', () => {
    if (window.updatePricingRulesJSON) {
      window.updatePricingRulesJSON();
    }
  });
  
  return ruleDiv;
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('product-name').value.trim();
  const description = document.getElementById('product-description').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);
  const category = document.getElementById('product-category').value.trim();
  const active = document.getElementById('product-active').checked;
  const hidden = document.getElementById('product-hidden').checked;
  const promoPriceValue = document.getElementById('product-promo-price').value.trim();
  const promoPrice = promoPriceValue ? parseFloat(promoPriceValue) : null;
  const emailDelivery = document.getElementById('product-email-delivery').checked;
  const reducedPriceWithPrintEl = document.getElementById('product-reduced-price-with-print');
  const reducedPriceWithPrintValue = reducedPriceWithPrintEl ? reducedPriceWithPrintEl.value.trim() : '';
  const reducedPriceWithPrint = reducedPriceWithPrintValue ? parseFloat(reducedPriceWithPrintValue) : null;
  // featured_position est géré par le modal de réorganisation, on garde la valeur existante
  const featuredPositionEl = document.getElementById('input-featured-position-unique');
  let featuredPosition = 0;
  if (editingProductId) {
    // Si on modifie un produit existant, garder sa position actuelle
    const existingProduct = products.find(p => p.id === editingProductId);
    featuredPosition = existingProduct ? (existingProduct.featured_position || 0) : 0;
  } else {
    // Si on crée un nouveau produit, il n'est pas dans les offres par défaut
    featuredPosition = 0;
  }
  
  const requiresAddressEl = document.getElementById('product-requires-address');
  const requiresAddress = requiresAddressEl ? requiresAddressEl.checked : false;
  
  const specialPromoRuleEl = document.getElementById('product-special-promo-rule');
  const specialPromoRule = specialPromoRuleEl ? (specialPromoRuleEl.value.trim() || null) : null;
  
  const deliveryMethodEl = document.getElementById('product-delivery-method');
  const deliveryMethod = deliveryMethodEl ? (deliveryMethodEl.value.trim() || null) : null;
  
  // Si envoi postal, forcer requires_address à true
  const finalRequiresAddress = requiresAddress || (deliveryMethod === 'shipping');
  
  // Debug
  console.log('Données à envoyer:', {
    featured_position: featuredPosition,
    requires_address: finalRequiresAddress,
    special_promo_rule: specialPromoRule,
    delivery_method: deliveryMethod
  });
  
  // Récupérer les règles de prix depuis le champ caché
  let pricing_rules = null;
  const hiddenInput = document.getElementById('product-pricing-rules-hidden');
  if (hiddenInput && hiddenInput.value) {
    try {
      pricing_rules = JSON.parse(hiddenInput.value);
      // Si le parse donne null, le garder
      // Valider seulement si ce n'est pas null
      if (pricing_rules !== null && (typeof pricing_rules !== 'object' || Array.isArray(pricing_rules))) {
        throw new Error('Les règles de prix doivent être un objet JSON');
      }
    } catch (e) {
      showMessage('Erreur dans le format des règles de prix: ' + e.message, 'error');
      return;
    }
  }

  if (!name || isNaN(price) || price < 0) {
    showMessage('Veuillez remplir tous les champs obligatoires avec des valeurs valides.', 'error');
    return;
  }

  try {
    const url = editingProductId 
      ? `/api/admin/products/${editingProductId}`
      : '/api/admin/products';
    
    const method = editingProductId ? 'PUT' : 'POST';
    
    // Récupérer les traductions
    // Le champ "Nom" est le nom français
    const name_fr = name || null;
    const nameEnEl = document.getElementById('product-name-en');
    const name_en = nameEnEl ? (nameEnEl.value.trim() || null) : null;
    const nameEsEl = document.getElementById('product-name-es');
    const name_es = nameEsEl ? (nameEsEl.value.trim() || null) : null;
    // Le champ "Description" est la description française
    const description_fr = description || null;
    const descEnEl = document.getElementById('product-description-en');
    const description_en = descEnEl ? (descEnEl.value.trim() || null) : null;
    const descEsEl = document.getElementById('product-description-es');
    const description_es = descEsEl ? (descEsEl.value.trim() || null) : null;
    
    const badgeTextFrEl = document.getElementById('product-badge-text-fr');
    const badge_text_fr = badgeTextFrEl ? (badgeTextFrEl.value.trim() || null) : null;
    
    const badgeTextEnEl = document.getElementById('product-badge-text-en');
    const badge_text_en = badgeTextEnEl ? (badgeTextEnEl.value.trim() || null) : null;
    
    const badgeTextEsEl = document.getElementById('product-badge-text-es');
    const badge_text_es = badgeTextEsEl ? (badgeTextEsEl.value.trim() || null) : null;
    
    // Debug: afficher les valeurs des traductions
    console.log('Traductions à envoyer:', {
      name_fr, name_en, name_es,
      description_fr, description_en, description_es,
      badge_text_fr, badge_text_en, badge_text_es
    });
    
    // Construire l'objet à envoyer en incluant tous les champs (même ceux à 0 ou false)
    const productData = {
      name,
      description: description || null,
      name_fr,
      name_en,
      name_es,
      description_fr,
      description_en,
      description_es,
      badge_text_fr,
      badge_text_en,
      badge_text_es,
      price,
      category: category || "numérique",
      active,
      hidden,
      promo_price: promoPrice,
      email_delivery: emailDelivery,
      pricing_rules,
      featured_position: featuredPosition,  // Toujours envoyer, même si 0
      requires_address: finalRequiresAddress,  // Toujours envoyer
      special_promo_rule: specialPromoRule,
      delivery_method: deliveryMethod,
      reduced_price_with_print: reducedPriceWithPrint,
    };
    
    console.log('Données complètes à envoyer:', JSON.stringify(productData, null, 2));
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
      throw new Error(error.detail || 'Erreur lors de l\'enregistrement');
    }

    const result = await response.json();
    console.log('Réponse API:', result);
    showMessage(editingProductId ? 'Produit modifié avec succès' : 'Produit créé avec succès', 'success');
    
    // Recharger les produits pour voir les changements
    await loadProducts();
    
    // Si on était en mode édition, recharger le produit pour vérifier que tout est bien sauvegardé
    if (editingProductId) {
      const updatedProduct = products.find(p => p.id === editingProductId);
      if (updatedProduct) {
        console.log('Produit mis à jour:', {
          name: updatedProduct.name,
          featured_position: updatedProduct.featured_position,
          requires_address: updatedProduct.requires_address,
          delivery_method: updatedProduct.delivery_method,
          reduced_price_with_print: updatedProduct.reduced_price_with_print
        });
        // Recharger le produit dans le formulaire pour voir les valeurs sauvegardées
        editProduct(editingProductId);
        return; // Ne pas appeler cancelEdit() pour garder le formulaire ouvert avec les valeurs
      }
    }
    
    cancelEdit();
  } catch (error) {
    console.error('Erreur enregistrement produit:', error);
    showMessage('Erreur: ' + error.message, 'error');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
      throw new Error(error.detail || 'Erreur lors de la suppression');
    }

    showMessage('Produit supprimé avec succès', 'success');
    await loadProducts();
  } catch (error) {
    console.error('Erreur suppression produit:', error);
    showMessage('Erreur: ' + error.message, 'error');
  }
}

// ========== STATS ET KPI ==========
async function loadStats() {
  try {
    const response = await fetch('/status');
    if (!response.ok) return;
    const data = await response.json();
    if (data.stats) {
      const totalEl = document.getElementById('counter-total');
      const redimEl = document.getElementById('counter-redim');
      const uploadEl = document.getElementById('counter-upload');
      if (totalEl) totalEl.textContent = data.stats.total_photos || 0;
      if (redimEl) redimEl.textContent = data.stats.processed || 0;
      if (uploadEl) uploadEl.textContent = data.stats.uploaded || 0;
    }
  } catch (e) {
    console.log("Pas de stats globales disponibles");
  }
}

async function loadObjective() {
  try {
    const response = await fetch('/api/vendeur/objective');
    if (response.ok) {
      const data = await response.json();
      adminState.turnoverObjective = data.objective || 0;
      const objInput = document.getElementById('turnover-objective');
      if (objInput) objInput.value = adminState.turnoverObjective;
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
    adminState.turnoverObjective = val;
    updateProgressBar();
  } catch (e) {
    console.error(e);
  }
}

async function loadOrdersForCA() {
  try {
    const response = await fetch('/api/vendeur/orders');
    if (response.ok) {
      const data = await response.json();
      adminState.orders = data.orders || [];
      calculateTurnover();
    }
  } catch (e) {
    console.error('Erreur chargement commandes pour CA:', e);
  }
}

function calculateTurnover() {
  // Calculer le CA sur les commandes PAYÉES ou FINALISÉES (pas pending/cancelled)
  const validStatuses = ['paid', 'processing_web', 'processing_print', 'completed', 'reserved'];
  const totalTTC = adminState.orders
    .filter(o => validStatuses.includes(o.status))
    .reduce((sum, o) => sum + (o.total || 0), 0);
    
  // CA HT = Total TTC / 1.2
  adminState.caHT = totalTTC / 1.2;
  const tva = totalTTC - adminState.caHT;
  
  const caHTEl = document.getElementById('ca-ht');
  const caTVAEl = document.getElementById('ca-tva');
  if (caHTEl) caHTEl.textContent = adminState.caHT.toFixed(2) + ' €';
  if (caTVAEl) caTVAEl.textContent = tva.toFixed(2) + ' €';
  
  updateProgressBar();
}

function updateProgressBar() {
  const progressEl = document.getElementById('objective-progress');
  const percentEl = document.getElementById('objective-percent');
  if (!progressEl || !percentEl) return;
  
  if (adminState.turnoverObjective <= 0) {
    progressEl.style.width = '0%';
    percentEl.textContent = '0%';
    return;
  }
  
  const percent = Math.min(100, Math.round((adminState.caHT / adminState.turnoverObjective) * 100));
  progressEl.style.width = percent + '%';
  percentEl.textContent = percent + '%';
}

// ========== INITIALISATION ==========
function initAdminUI() {
  loadProducts();
  loadStats();
  loadObjective();
  loadOrdersForCA();
  
  // Rafraîchissement automatique
  setInterval(loadStats, 60000);
  setInterval(loadOrdersForCA, 30000);
  
  // Gestion de l'objectif CA
  const objInput = document.getElementById('turnover-objective');
  if (objInput) {
    objInput.addEventListener('change', async (e) => {
      const newVal = parseFloat(e.target.value);
      if (!isNaN(newVal)) {
        await updateObjective(newVal);
      }
    });
  }
}

// ========== GESTION ORDRE PANIER (DRAG AND DROP) ==========
let draggedElement = null;
let placeholder = null;

function openCartOrderModal() {
  // Filtrer les produits (exclure les packs)
  const productsToOrder = products.filter(p => p.category !== 'pack');
  
  // Séparer impression et numérique
  const impressionProducts = productsToOrder.filter(p => p.category === 'impression').sort((a, b) => (a.cart_order || a.id || 999) - (b.cart_order || b.id || 999));
  const numericProducts = productsToOrder.filter(p => p.category === 'numérique').sort((a, b) => (a.cart_order || a.id || 999) - (b.cart_order || b.id || 999));
  
  // Créer le modal
  const modal = document.createElement('div');
  modal.id = 'cart-order-modal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative;">
      <button onclick="closeCartOrderModal()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
      <h2 style="margin-top: 0; color: #2d3561; margin-bottom: 20px;">Réorganiser l'ordre dans le panier</h2>
      <p style="color: #666; margin-bottom: 25px;">Glissez-déposez les produits pour réorganiser leur ordre d'affichage dans le panier.</p>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #2d3561; margin-bottom: 15px; font-size: 1.1em;">Formats papier</h3>
        <div id="impression-list" style="min-height: 100px; border: 2px dashed #ddd; border-radius: 8px; padding: 15px;">
          ${impressionProducts.map((p, idx) => `
            <div class="draggable-item" data-product-id="${p.id}" data-category="impression" style="background: #2d3561; color: white; padding: 15px; margin-bottom: 10px; border-radius: 6px; cursor: grab; text-align: center; font-weight: 500; transition: all 0.2s; user-select: none; position: relative;">
              ${escapeHtml(p.name)}
              <span style="position: absolute; right: 10px; opacity: 0.7;">|||</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div>
        <h3 style="color: #2d3561; margin-bottom: 15px; font-size: 1.1em;">Formats numériques</h3>
        <div id="numeric-list" style="min-height: 100px; border: 2px dashed #ddd; border-radius: 8px; padding: 15px;">
          ${numericProducts.map((p, idx) => `
            <div class="draggable-item" data-product-id="${p.id}" data-category="numérique" style="background: #2d3561; color: white; padding: 15px; margin-bottom: 10px; border-radius: 6px; cursor: grab; text-align: center; font-weight: 500; transition: all 0.2s; user-select: none; position: relative;">
              ${escapeHtml(p.name)}
              <span style="position: absolute; right: 10px; opacity: 0.7;">|||</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
        <button onclick="closeCartOrderModal()" style="padding: 10px 20px; background: #ccc; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Annuler</button>
        <button onclick="saveCartOrder()" style="padding: 10px 20px; background: #2d3561; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Enregistrer</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Initialiser le drag and drop
  initDragAndDrop();
}

function formatPriceAdmin(price) {
  if (price === null || price === undefined) return '';
  if (price % 1 === 0) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
}

function initDragAndDrop() {
  const impressionList = document.getElementById('impression-list');
  const numericList = document.getElementById('numeric-list');
  
  [impressionList, numericList].forEach(list => {
    if (!list) return;
    
    // Réinitialiser tous les événements
    const items = list.querySelectorAll('.draggable-item');
    items.forEach(item => {
      // Supprimer les anciens listeners
      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);
    });
    
    // Réappliquer les événements
    const newItems = list.querySelectorAll('.draggable-item');
    newItems.forEach(item => {
      item.draggable = true;
      
      item.addEventListener('dragstart', function(e) {
        draggedElement = this;
        this.classList.add('dragging');
        this.style.opacity = '0.5';
        
        // Créer un placeholder
        placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        placeholder.style.cssText = 'background: #e0e0e0; padding: 15px; margin-bottom: 10px; border-radius: 6px; border: 2px dashed #999; height: ' + this.offsetHeight + 'px;';
        this.parentNode.insertBefore(placeholder, this);
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.productId);
      });
      
      item.addEventListener('dragend', function(e) {
        this.classList.remove('dragging');
        this.style.opacity = '1';
        
        if (placeholder && placeholder.parentNode) {
          placeholder.parentNode.removeChild(placeholder);
        }
        
        // Réinitialiser tous les styles
        newItems.forEach(el => {
          el.style.transform = '';
          el.style.opacity = '';
        });
        
        draggedElement = null;
        placeholder = null;
      });
      
      item.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (!draggedElement || draggedElement === this || !placeholder) return;
        
        const rect = this.getBoundingClientRect();
        const y = e.clientY;
        const midpoint = rect.top + rect.height / 2;
        
        if (y < midpoint) {
          // Insérer avant cet élément
          if (placeholder.nextSibling !== this) {
            this.parentNode.insertBefore(placeholder, this);
          }
        } else {
          // Insérer après cet élément
          if (placeholder.previousSibling !== this) {
            if (this.nextSibling) {
              this.parentNode.insertBefore(placeholder, this.nextSibling);
            } else {
              this.parentNode.appendChild(placeholder);
            }
          }
        }
      });
      
      item.addEventListener('drop', function(e) {
        e.preventDefault();
        
        if (draggedElement && draggedElement !== this && placeholder) {
          this.parentNode.insertBefore(draggedElement, placeholder);
          this.parentNode.removeChild(placeholder);
          placeholder = null;
        }
      });
    });
    
    // Gérer le drop sur la zone vide de la liste
    list.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if (!draggedElement || !placeholder) return;
      
      // Si on est dans la zone de la liste mais pas sur un élément
      const rect = this.getBoundingClientRect();
      const items = this.querySelectorAll('.draggable-item:not(.dragging)');
      
      if (items.length === 0 || e.clientY > rect.bottom - 20) {
        // Insérer à la fin
        if (placeholder.parentNode !== this || placeholder.nextSibling !== null) {
          if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
          }
          this.appendChild(placeholder);
        }
      }
    });
    
    list.addEventListener('drop', function(e) {
      e.preventDefault();
      
      if (draggedElement && placeholder && placeholder.parentNode === this) {
        this.insertBefore(draggedElement, placeholder);
        this.removeChild(placeholder);
        placeholder = null;
      }
    });
  });
}

function closeCartOrderModal() {
  const modal = document.getElementById('cart-order-modal');
  if (modal) {
    modal.remove();
  }
}

async function saveCartOrder() {
  const impressionList = document.getElementById('impression-list');
  const numericList = document.getElementById('numeric-list');
  
  if (!impressionList || !numericList) {
    showMessage('Erreur: listes non trouvées', 'error');
    return;
  }
  
  const impressionItems = [...impressionList.querySelectorAll('.draggable-item')];
  const numericItems = [...numericList.querySelectorAll('.draggable-item')];
  
  console.log('Impression items:', impressionItems.length);
  console.log('Numeric items:', numericItems.length);
  
  // Construire l'ordre : impression d'abord, puis numérique
  const order = [];
  impressionItems.forEach((item, idx) => {
    const productId = parseInt(item.dataset.productId);
    if (!isNaN(productId)) {
      order.push({ id: productId, cart_order: idx + 1 });
      console.log(`Impression ${idx + 1}: produit ${productId}`);
    }
  });
  numericItems.forEach((item, idx) => {
    const productId = parseInt(item.dataset.productId);
    if (!isNaN(productId)) {
      order.push({ id: productId, cart_order: impressionItems.length + idx + 1 });
      console.log(`Numérique ${idx + 1}: produit ${productId}, ordre ${impressionItems.length + idx + 1}`);
    }
  });
  
  console.log('Ordre à sauvegarder:', order);
  
  if (order.length === 0) {
    showMessage('Aucun produit à sauvegarder', 'warning');
    return;
  }
  
  try {
    const response = await fetch('/api/admin/products/cart-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
      throw new Error(errorData.detail || 'Erreur lors de la sauvegarde');
    }
    
    const result = await response.json();
    console.log('Réponse serveur:', result);
    
    showMessage('Ordre sauvegardé avec succès ! Rechargez la page client pour voir les changements.', 'success');
    
    // Recharger les produits pour afficher le nouvel ordre dans l'admin
    await loadProducts();
    
    // Attendre un peu avant de fermer le modal pour que l'utilisateur voie le message
    setTimeout(() => {
      closeCartOrderModal();
    }, 1500);
  } catch (error) {
    console.error('Erreur sauvegarde ordre:', error);
    showMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
  }
}

// ========== GESTION ORDRE OFFRES (DRAG AND DROP) ==========

let featuredDraggedItem = null;

window.openFeaturedOrderModal = function () {
  const featuredProducts = products
    .filter(p => p.featured_position > 0)
    .sort((a, b) => a.featured_position - b.featured_position);

  const hiddenProducts = products
    .filter(p => !p.featured_position || p.featured_position === 0);

  const modal = document.createElement('div');
  modal.id = 'featured-order-modal';
  modal.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:30px;max-width:800px;width:90%;max-height:90vh;overflow-y:auto;position:relative;">
      <button onclick="closeFeaturedOrderModal()" style="position:absolute;top:15px;right:15px;background:none;border:none;font-size:24px;cursor:pointer;color:#666">&times;</button>
      <h2 style="margin-top:0;color:#2d3561;margin-bottom:20px;">Réorganiser les offres</h2>
      <p style="color:#666;margin-bottom:20px;">Glissez-déposez les produits au-dessus / en dessous de la ligne rouge.</p>
      <div id="featured-visible-section" style="min-height:80px;border:2px dashed #ddd;border-radius:8px;padding:15px;margin-bottom:15px;">
        ${featuredProducts
          .map(
            p => `
          <div class="draggable-featured-item"
               data-product-id="${p.id}"
               data-visible="true"
               draggable="true"
               style="background:#27ae60;color:#fff;padding:10px 15px;margin-bottom:8px;border-radius:6px;cursor:grab;user-select:none;display:flex;align-items:center;justify-content:space-between;">
            <span style="flex:1;text-align:center;">${escapeHtml(p.name)}</span>
            <span style="opacity:.7;flex-shrink:0;">|||</span>
          </div>`
          )
          .join('')}
      </div>
      <div style="height:3px;background:#e74c3c;margin:15px 0;border-radius:2px;position:relative;">
        <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#fff;padding:0 10px;color:#e74c3c;font-weight:bold;font-size:.9em;">
          Masqués en dessous
        </div>
      </div>
      <div id="featured-hidden-section" style="min-height:80px;border:2px dashed #ddd;border-radius:8px;padding:15px;">
        ${hiddenProducts
          .map(
            p => `
          <div class="draggable-featured-item"
               data-product-id="${p.id}"
               data-visible="false"
               draggable="true"
               style="background:#95a5a6;color:#fff;padding:10px 15px;margin-bottom:8px;border-radius:6px;cursor:grab;user-select:none;display:flex;align-items:center;justify-content:space-between;">
            <span style="flex:1;text-align:center;">${escapeHtml(p.name)}</span>
            <span style="opacity:.7;flex-shrink:0;">|||</span>
          </div>`
          )
          .join('')}
      </div>
      <div style="margin-top:25px;display:flex;gap:10px;justify-content:flex-end;">
        <button onclick="closeFeaturedOrderModal()" style="padding:8px 18px;background:#ccc;color:#333;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Annuler</button>
        <button onclick="saveFeaturedOrder()" style="padding:8px 18px;background:#27ae60;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Enregistrer</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  initFeaturedDragAndDrop();
};

function initFeaturedDragAndDrop() {
  const sections = [
    document.getElementById('featured-visible-section'),
    document.getElementById('featured-hidden-section')
  ].filter(Boolean);

  sections.forEach(section => {
    section.querySelectorAll('.draggable-featured-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        featuredDraggedItem = item;
        item.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.productId || '');
      });

      item.addEventListener('dragend', () => {
        featuredDraggedItem = null;
        item.style.opacity = '1';
      });
    });

    section.addEventListener('dragover', e => {
      e.preventDefault();
      if (!featuredDraggedItem) return;

      const afterElement = getDragAfterElement(section, e.clientY);

      if (afterElement == null) {
        section.appendChild(featuredDraggedItem);
      } else {
        section.insertBefore(featuredDraggedItem, afterElement);
      }
    });

    section.addEventListener('drop', e => {
      e.preventDefault();
      featuredDraggedItem = null;
      updateFeaturedColors();
    });
  });

  updateFeaturedColors();
}

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll('.draggable-featured-item:not(.dragging)')
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function updateFeaturedColors() {
  const visibleSection = document.getElementById('featured-visible-section');
  const hiddenSection = document.getElementById('featured-hidden-section');
  if (!visibleSection || !hiddenSection) return;

  visibleSection.querySelectorAll('.draggable-featured-item').forEach(item => {
    item.dataset.visible = 'true';
    item.style.background = '#27ae60';
  });

  hiddenSection.querySelectorAll('.draggable-featured-item').forEach(item => {
    item.dataset.visible = 'false';
    item.style.background = '#95a5a6';
  });
}

window.closeFeaturedOrderModal = function () {
  const modal = document.getElementById('featured-order-modal');
  if (modal) modal.remove();
};

window.saveFeaturedOrder = async function () {
  const visibleSection = document.getElementById('featured-visible-section');
  const hiddenSection = document.getElementById('featured-hidden-section');

  if (!visibleSection || !hiddenSection) {
    showMessage('Erreur: sections non trouvées', 'error');
    return;
  }

  const visibleItems = [...visibleSection.querySelectorAll('.draggable-featured-item')];
  const hiddenItems = [...hiddenSection.querySelectorAll('.draggable-featured-item')];

  const order = [];

  visibleItems.forEach((item, idx) => {
    const id = parseInt(item.dataset.productId);
    if (!isNaN(id)) order.push({ id, featured_position: idx + 1 });
  });

  hiddenItems.forEach(item => {
    const id = parseInt(item.dataset.productId);
    if (!isNaN(id)) order.push({ id, featured_position: 0 });
  });

  if (!order.length) {
    showMessage('Aucun produit à sauvegarder', 'warning');
    return;
  }

  try {
    const resp = await fetch('/api/admin/products/featured-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Erreur inconnue' }));
      throw new Error(err.detail || 'Erreur lors de la sauvegarde');
    }

    showMessage('Ordre des offres sauvegardé avec succès', 'success');
    await loadProducts();
    setTimeout(closeFeaturedOrderModal, 1000);
  } catch (e) {
    console.error(e);
    showMessage('Erreur: ' + e.message, 'error');
  }
};

window.toggleFeaturedVisibility = async function(productId, visible, event) {
  if (event) {
    event.stopPropagation();
  }
  
  try {
    const response = await fetch('/api/admin/products/featured-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, visible: visible })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
      throw new Error(errorData.detail || 'Erreur lors de la mise à jour');
    }
    
    // Mettre à jour le produit localement
    const product = products.find(p => p.id === productId);
    if (product) {
      if (visible) {
        // Trouver la position max et ajouter 1
        const featuredProducts = products.filter(p => p.featured_position > 0);
        const maxPosition = Math.max(...featuredProducts.map(p => p.featured_position), 0);
        product.featured_position = maxPosition + 1;
      } else {
        product.featured_position = 0;
      }
    }
    
    // Mettre à jour le DOM directement sans fermer/rouvrir
    const visibleSection = document.getElementById('featured-visible-section');
    const hiddenSection = document.getElementById('featured-hidden-section');
    
    if (!visibleSection || !hiddenSection) return;
    
    if (visible) {
      // Déplacer de "masqués" vers "affichés"
      const hiddenItem = event.target.closest('.draggable-featured-item');
      if (hiddenItem) {
        hiddenItem.remove();
      }
      
      // Créer le nouvel élément dans la section visible
      const newItem = document.createElement('div');
      newItem.className = 'draggable-featured-item';
      newItem.dataset.productId = productId;
      newItem.dataset.visible = 'true';
      newItem.style.cssText = 'background: #27ae60; color: white; padding: 15px; margin-bottom: 10px; border-radius: 6px; cursor: grab; text-align: center; font-weight: 500; transition: all 0.2s; user-select: none; position: relative; display: flex; align-items: center; justify-content: space-between;';
      newItem.innerHTML = `
        <span style="flex: 1; text-align: center;">${escapeHtml(product.name)}</span>
        <span style="opacity: 0.7; flex-shrink: 0;">|||</span>
      `;
      
      visibleSection.appendChild(newItem);
      
      // Réinitialiser le drag & drop pour inclure le nouvel élément
      setTimeout(() => {
        initFeaturedDragAndDrop();
      }, 100);
    } else {
      // Déplacer de "affichés" vers "masqués"
      const visibleItem = event.target.closest('.draggable-featured-item');
      if (visibleItem) {
        visibleItem.remove();
        
        // Créer le nouvel élément dans la section masquée
        const newItem = document.createElement('div');
        newItem.className = 'draggable-featured-item';
        newItem.dataset.productId = productId;
        newItem.dataset.visible = 'false';
        newItem.style.cssText = 'background: #95a5a6; color: white; padding: 15px; margin-bottom: 10px; border-radius: 6px; cursor: grab; text-align: center; font-weight: 500; transition: all 0.2s; user-select: none; position: relative; display: flex; align-items: center; justify-content: space-between;';
        newItem.innerHTML = `
          <span style="flex: 1; text-align: center;">${escapeHtml(product.name)}</span>
          <span style="opacity: 0.7; flex-shrink: 0;">|||</span>
        `;
        
        hiddenSection.appendChild(newItem);
        
        // Réinitialiser le drag & drop
        setTimeout(() => {
          initFeaturedDragAndDrop();
        }, 100);
      }
    }
  } catch (error) {
    console.error('Erreur toggle visibilité:', error);
    showMessage('Erreur: ' + error.message, 'error');
  }
}

// Démarrer quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminUI);
} else {
  initAdminUI();
}



