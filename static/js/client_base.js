// Client JS - Interface borne client
// Version optimisée et traduite

// Configuration
// API_BASE peut être défini via window.API_BASE (pour frontend hébergé) ou utilise '/api/client' par défaut (local)
// Si window.API_BASE est explicitement null, on reste en mode statique (pas de fallback)
const API_BASE = (typeof window !== 'undefined' && window.API_BASE !== undefined) ? window.API_BASE : '/api/client';
// API_KEY peut être défini via window.API_KEY (pour frontend hébergé)
const API_KEY = window.API_KEY || null;
let cart = [];

// Helper pour créer les headers avec authentification API si nécessaire
function getApiHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  
  // Ajouter la clé API si configurée
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  
  return headers;
}

// Détecter la langue du navigateur
function detectBrowserLanguage() {
  const supportedLanguages = ['fr', 'en', 'es'];
  
  // Essayer d'abord avec navigator.languages (tableau de préférences)
  if (navigator.languages && navigator.languages.length > 0) {
    for (const lang of navigator.languages) {
      const langCode = lang.toLowerCase().split('-')[0];
      if (supportedLanguages.includes(langCode)) {
        return langCode;
      }
    }
  }
  
  // Fallback : navigator.language ou navigator.userLanguage
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang) {
    const langCode = browserLang.toLowerCase().split('-')[0];
    if (supportedLanguages.includes(langCode)) {
      return langCode;
    }
  }
  
  // Par défaut, retourner français
  return 'fr';
}

let currentLanguage = detectBrowserLanguage();
let currentSuggestions = [];

// Fonction utilitaire pour formater les prix (15 € au lieu de 15.00 €)
function formatPrice(price) {
  if (typeof price !== 'number') price = parseFloat(price);
  if (isNaN(price)) return '0 €';
  // Si c'est un nombre rond, afficher sans décimales
  if (price % 1 === 0) {
    return price + ' €';
  }
  // Sinon, afficher avec 2 décimales
  return price.toFixed(2) + ' €';
}

// Custom Alert/Confirm Functions
function showCustomAlert(message, type = 'info', title = '') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('custom-modal-overlay');
    const icon = document.getElementById('custom-modal-icon');
    const titleEl = document.getElementById('custom-modal-title');
    const messageEl = document.getElementById('custom-modal-message');
    const buttonsEl = document.getElementById('custom-modal-buttons');
    
    // Icons par type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    // Titres par défaut
    const defaultTitles = {
      success: 'Succès',
      error: 'Erreur',
      warning: 'Attention',
      info: 'Information'
    };
    
    icon.textContent = icons[type] || icons.info;
    icon.className = `custom-modal-icon ${type}`;
    titleEl.textContent = title || defaultTitles[type] || defaultTitles.info;
    messageEl.textContent = message;
    
    buttonsEl.innerHTML = `
      <button class="custom-modal-btn custom-modal-btn-primary" onclick="closeCustomModal()">OK</button>
    `;
    
    overlay.classList.add('active');
    
    // Fermer avec Escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeCustomModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    window.closeCustomModal = () => {
      overlay.classList.remove('active');
      document.removeEventListener('keydown', escapeHandler);
      resolve(true);
    };
  });
}

function showCustomConfirm(message, type = 'warning', title = '') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('custom-modal-overlay');
    const icon = document.getElementById('custom-modal-icon');
    const titleEl = document.getElementById('custom-modal-title');
    const messageEl = document.getElementById('custom-modal-message');
    const buttonsEl = document.getElementById('custom-modal-buttons');
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    const defaultTitles = {
      success: 'Confirmation',
      error: 'Erreur',
      warning: 'Confirmation',
      info: 'Information'
    };
    
    icon.textContent = icons[type] || icons.warning;
    icon.className = `custom-modal-icon ${type}`;
    titleEl.textContent = title || defaultTitles[type] || 'Confirmation';
    messageEl.textContent = message;
    
    buttonsEl.innerHTML = `
      <button class="custom-modal-btn custom-modal-btn-secondary" onclick="closeCustomModalWithResult(false)">Annuler</button>
      <button class="custom-modal-btn custom-modal-btn-danger" onclick="closeCustomModalWithResult(true)">Confirmer</button>
    `;
    
    overlay.classList.add('active');
    
    // Fermer avec Escape = annuler
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeCustomModalWithResult(false);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    window.closeCustomModalWithResult = (result) => {
      overlay.classList.remove('active');
      document.removeEventListener('keydown', escapeHandler);
      resolve(result);
    };
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function encodePhotoPath(path) {
  if (!path) return '';
  return path
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

function getPhotoUrlFromFilename(filename, relPath = null, originalFilename = null, fileId = null, eventId = null, variant = 'preview') {
  // Si R2 est configuré et disponible
  if (window.R2_PUBLIC_URL) {
    // NOUVEAU : Utiliser les nouveaux chemins R2 simplifiés si file_id disponible
    if (fileId && eventId) {
      // Format : events/{event_id}/photos/{file_id}/{variant}.{ext}
      const ext = variant === 'small' ? 'jpg' : 'webp';
      const r2Path = `events/${eventId}/photos/${fileId}/${variant}.${ext}`;
      const newUrl = `${window.R2_PUBLIC_URL}/${r2Path}`;
      
      // Pour l'instant, on retourne le nouveau chemin
      // Si l'image ne charge pas, le navigateur essaiera l'ancien chemin via le fallback
      return newUrl;
    }
    
    // ANCIEN : Fallback sur ancien format si relPath disponible (rétrocompatibilité)
    if (relPath) {
      try {
        const relPathNormalized = relPath.replace(/\\/g, '/');
        const filenameNormalized = filename.replace(/\\/g, '/');
        const filenameOnly = filenameNormalized.split('/').pop() || filenameNormalized;
        
        const relPathParts = relPathNormalized.split('/');
        const parentDir = relPathParts.slice(0, -1).join('/');
        
        let originalFile = originalFilename;
        if (!originalFile) {
          const filenameParts = filenameOnly.split('#');
          if (filenameParts.length > 0) {
            const lastPart = filenameParts[filenameParts.length - 1];
            const stem = lastPart.replace(/_\w+\.(jpg|jpeg|png)$/i, '');
            originalFile = stem + '.JPG';
          } else {
            originalFile = filenameOnly.replace(/\.(jpg|jpeg|png)$/i, '.JPG');
          }
        }
        
        const webpFilename = filenameOnly.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        const r2Path = `${parentDir}/${originalFile}/${webpFilename}`;
        
        return `${window.R2_PUBLIC_URL}/${r2Path}`;
      } catch (e) {
        console.warn('Erreur construction URL R2 (ancien format):', e);
      }
    }
  }
  
  // Fallback : API locale (toujours utilisé pour interface offline)
  const encoded = encodePhotoPath(filename);
  const apiBase = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE.replace('/api/client', '') : '';
  return encoded ? `${apiBase}/api/photo/${encoded}` : '';
}

// Traductions
const translations = {
  fr: {
    header_title: 'BORNE COMMANDE PHOTOS',
    cart_title: 'Panier',
    promotions_title: 'Nos offres',
    view_promotions: '+ Nos offres',
    search_photos_title: 'Rechercher mes photos',
    search_placeholder: 'Rechercher par nom de cavalier ou cheval (ex: Jappeloup)',
    search_btn: 'Rechercher',
    buy_pack_btn: 'Acheter mon pack',
    tutorial_title: 'Comment utiliser la borne',
    view_tutorial: '+ Voir tuto',
    summary_title: 'Récapitulatif',
    total_label: 'Total',
    cancel_order_btn: 'Annuler la commande',
    submit_order_btn: 'Valider ma commande',
    pay_now_btn: 'Payer maintenant',
    pay_on_site_btn: 'Payer sur place',
    shipping_btn: 'Livraison (paiement)',
    personal_info_title: 'Informations personnelles',
    last_name_label: 'Nom *',
    last_name_placeholder: 'Nom',
    first_name_label: 'Prénom *',
    first_name_placeholder: 'Prénom',
    email_label: 'Email',
    email_placeholder: 'Votre adresse email',
    phone_label: 'Téléphone *',
    phone_placeholder: 'Votre numéro de téléphone',
    notes_label: 'Notes (optionnel)',
    notes_placeholder: 'Précisions sur la commande...',
    unit_price_label: 'à l\'unité',
    see_more: 'Voir plus',
    see_less: 'Voir moins',
    economy_label: 'Économie:',
    special_offer_title: 'Offre spéciale',
    bought_label: 'acheté',
    bought_plural: 'achetés',
    free_label: 'offerte',
    free_plural: 'offertes',
    same_format_label: 'dans le même format',
    badge_pickup: 'Impression sur place',
    badge_shipping: 'Envoi postal',
    badge_email: 'Envoi par mail',
    badge_pack: 'Pack',
    product_label_fallback: 'Produit',
    // Nouveaux textes
    tuto_step_3_title: 'Choisir mes photos',
    tuto_step_3_text: 'Cliquez sur le + en haut à droite de vos photos préférées pour les ajouter dans le panier',
    tuto_step_4_title: 'Sélectionner les formats',
    tuto_step_4_text: 'Choisissez les formats et ajustez les quantités pour chaque photo dans le panier',
    pack_search_first: 'Faire une recherche cavalier ou cheval d\'abord',
    pack_unit: 'pack',
    packs_unit: 'packs',
    tuto_step_1_text: 'Tapez le nom du cavalier ou du cheval dans la barre de recherche (ex : Jappeloup)',
    tuto_step_2_title: 'Visualiser les photos',
    tuto_step_2_text: 'Cliquez sur une photo pour l\'agrandir',
    tuto_step_5_title: 'Valider ma commande',
    tuto_step_5_text: 'Remplissez vos informations et réglez au comptoir en nous donnant votre nom',
    cart_empty: 'Votre panier est vide',
    pack_modal_title: 'Pack Photos',
    pack_modal_description: 'Achetez toutes vos photos d\'un coup avec le pack.',
    pack_modal_rider: 'Cavalier :',
    pack_modal_horse: 'Cheval :',
    pack_modal_add_to_cart: 'Ajouter au panier',
    cart_add_btn: 'Ajouter',
    cart_added_btn: 'Ajouté',
    cart_remove_btn: 'Retirer du panier',
    pro_client_label: 'Client professionnel (Je veux une facture)',
    postal_address_label: 'Adresse postale *',
    postal_address_placeholder: 'Votre adresse',
    postal_code_label: 'Code Postal *',
    postal_code_placeholder: 'CP',
    city_label: 'Ville *',
    company_name_label: 'Nom de l\'entreprise *',
    company_name_placeholder: 'Nom de l\'entreprise',
    siret_label: 'SIRET (Optionnel)',
    siret_placeholder: 'SIRET',
    tva_label: 'Numéro de TVA (Optionnel)',
    tva_placeholder: 'TVA Intracom',
    billing_address_label: 'Adresse de facturation *',
    billing_address_placeholder: 'Adresse complète',
    field_required: 'Ce champ est requis',
    order_validated_title: 'Commande validée',
    order_success_message: 'Rendez-vous au comptoir pour le règlement, merci pour votre commande !',
    cart_empty_warning: 'Panier vide',
    warning_title: 'Attention',
    invalid_email_message: 'Merci de saisir une adresse email valide',
    invalid_email_title: 'Email invalide',
    error_title: 'Erreur',
    error_message: 'Erreur: ',
    search_required_title: 'Recherche requise',
    next_photo_price: 'Prochaine:',
    next_photo_text: 'Prochaine photo à',
    pack_other_photos: 'autres photos',
    pack_photo_singular: 'photo',
    pack_photo_plural: 'photos',
    add_free: 'Ajouter (Gratuit)',
    next_photo_free: 'Prochaine photo offerte',
    paper_formats_title: 'Formats papier',
    digital_formats_title: 'Formats numériques',
    add_for_price: 'Ajouter pour',
    included_in_pack: 'inclus dans votre pack',

    // Panier sauvegardé / code panier
    save_cart_btn: 'Finaliser plus tard',
    cart_code_placeholder: 'Code panier',
    saved_cart_title: 'Panier sauvegardé',
    saved_cart_success: 'Votre panier a été sauvegardé avec succès !',
    saved_cart_recovery_code: 'Code de récupération :',
    saved_cart_note: 'Notez ce code pour récupérer votre panier plus tard.',
    close_btn: 'Fermer',

    // Lightbox / UI
    add_to_cart_btn: 'Ajouter au panier',
    apply_choice_all_photos: 'Appliquer ce choix à toutes mes photos',

    // Recherche / messages
    search_in_progress: 'Recherche en cours...',
    search_error: 'Erreur lors de la recherche',
    no_photos_found: 'Aucune photo trouvée',
    blocked_digital_title: 'Certains formats numériques sont déjà inclus dans un pack',
    blocked_digital_badge_title: 'Formats numériques déjà présents dans le pack',

    // Sauvegarde / chargement panier
    save_cart_error: 'Erreur lors de la sauvegarde',
    save_cart_error_prefix: 'Erreur lors de la sauvegarde du panier:',
    cancel_confirm: 'Voulez-vous vraiment vider le panier ?',
    load_cart_code_invalid: 'Veuillez entrer un code à 4 chiffres',
    load_cart_replace_confirm: 'Charger ce panier remplacera votre panier actuel. Continuer ?',
    load_cart_not_found: 'Panier non trouvé ou expiré. Vérifiez votre code.',
    load_cart_error: 'Erreur lors du chargement',
    load_cart_error_prefix: 'Erreur lors du chargement du panier:',
    invalid_cart_format: 'Format de panier invalide',
    cart_loaded_success: 'Panier chargé avec succès !'
  },
  en: {
    header_title: 'PHOTO ORDER KIOSK',
    cart_title: 'Cart',
    promotions_title: 'Our offers',
    view_promotions: '+ Our offers',
    search_photos_title: 'Search my photos',
    search_placeholder: 'Search by rider or horse name (ex: Jappeloup)',
    search_btn: 'Search',
    buy_pack_btn: 'Buy my pack',
    tutorial_title: 'How to use the terminal',
    view_tutorial: '+ View tutorial',
    summary_title: 'Summary',
    total_label: 'Total',
    cancel_order_btn: 'Cancel order',
    submit_order_btn: 'Validate order',
    pay_now_btn: 'Pay now',
    pay_on_site_btn: 'Pay on site',
    shipping_btn: 'Shipping (pay now)',
    personal_info_title: 'Personal Information',
    last_name_label: 'Last Name *',
    last_name_placeholder: 'Last Name',
    first_name_label: 'First Name *',
    first_name_placeholder: 'First Name',
    email_label: 'Email',
    email_placeholder: 'Your email address',
    phone_label: 'Phone *',
    phone_placeholder: 'Your phone number',
    notes_label: 'Notes (optional)',
    notes_placeholder: 'Order details...',
    unit_price_label: 'per unit',
    see_more: 'See more',
    see_less: 'See less',
    economy_label: 'Savings:',
    special_offer_title: 'Special offer',
    bought_label: 'bought',
    bought_plural: 'bought',
    free_label: 'free',
    free_plural: 'free',
    same_format_label: 'in the same format',
    badge_pickup: 'Print on site',
    badge_shipping: 'Postal delivery',
    badge_email: 'Email delivery',
    badge_pack: 'Pack',
    product_label_fallback: 'Product',
    tuto_step_3_title: 'Choose my photos',
    tuto_step_3_text: 'Click on the + at the top right of your favorite photos to add them to the cart',
    tuto_step_4_title: 'Select formats',
    tuto_step_4_text: 'Choose formats and adjust quantities for each photo in the cart',
    pack_search_first: 'Please search for a rider or horse first',
    pack_unit: 'pack',
    packs_unit: 'packs',
    tuto_step_1_text: 'Type the name of the rider or horse in the search bar (ex: Jappeloup)',
    tuto_step_2_title: 'View photos',
    tuto_step_2_text: 'Click on a photo to enlarge it',
    tuto_step_5_title: 'Validate my order',
    tuto_step_5_text: 'Fill in your information and pay at the counter by giving us your name',
    cart_empty: 'Your cart is empty',
    pack_modal_title: 'Photo Pack',
    pack_modal_description: 'Buy all your photos at once with the pack.',
    pack_modal_rider: 'Rider:',
    pack_modal_horse: 'Horse:',
    pack_modal_add_to_cart: 'Add to cart',
    cart_add_btn: 'Add',
    cart_added_btn: 'Added',
    cart_remove_btn: 'Remove',
    pro_client_label: 'Professional client (I want an invoice)',
    postal_address_label: 'Postal Address *',
    postal_address_placeholder: 'Your address',
    postal_code_label: 'Postal Code *',
    postal_code_placeholder: 'Postal Code',
    city_label: 'City *',
    company_name_label: 'Company Name *',
    company_name_placeholder: 'Company name',
    siret_label: 'SIRET (Optional)',
    siret_placeholder: 'SIRET',
    tva_label: 'VAT Number (Optional)',
    tva_placeholder: 'VAT Number',
    billing_address_label: 'Billing Address *',
    billing_address_placeholder: 'Full address',
    field_required: 'This field is required',
    order_validated_title: 'Order validated',
    order_success_message: 'Go to the counter for payment, thank you for your order!',
    cart_empty_warning: 'Cart is empty',
    warning_title: 'Warning',
    invalid_email_message: 'Please enter a valid email address',
    invalid_email_title: 'Invalid email',
    error_title: 'Error',
    error_message: 'Error: ',
    search_required_title: 'Search required',
    next_photo_price: 'Next:',
    next_photo_text: 'Next photo at',
    pack_other_photos: 'other photos',
    pack_photo_singular: 'photo',
    pack_photo_plural: 'photos',
    add_free: 'Add (Free)',
    next_photo_free: 'Next photo free',
    paper_formats_title: 'Paper formats',
    digital_formats_title: 'Digital formats',
    add_for_price: 'Add for',
    included_in_pack: 'included in your pack',

    // Saved cart / cart code
    save_cart_btn: 'Finish later',
    cart_code_placeholder: 'Cart code',
    saved_cart_title: 'Saved cart',
    saved_cart_success: 'Your cart has been saved successfully!',
    saved_cart_recovery_code: 'Recovery code:',
    saved_cart_note: 'Write down this code to retrieve your cart later.',
    close_btn: 'Close',

    // Lightbox / UI
    add_to_cart_btn: 'Add to cart',
    apply_choice_all_photos: 'Apply this choice to all my photos',

    // Search / messages
    search_in_progress: 'Searching...',
    search_error: 'Search error',
    no_photos_found: 'No photos found',
    blocked_digital_title: 'Some digital formats are already included in a pack',
    blocked_digital_badge_title: 'Digital formats already included in the pack',

    // Save / load cart
    save_cart_error: 'Error while saving',
    save_cart_error_prefix: 'Error while saving cart:',
    cancel_confirm: 'Do you really want to clear the cart?',
    load_cart_code_invalid: 'Please enter a 4-digit code',
    load_cart_replace_confirm: 'Loading this cart will replace your current cart. Continue?',
    load_cart_not_found: 'Cart not found or expired. Please check your code.',
    load_cart_error: 'Error while loading',
    load_cart_error_prefix: 'Error while loading cart:',
    invalid_cart_format: 'Invalid cart format',
    cart_loaded_success: 'Cart loaded successfully!'
  },
  es: {
    header_title: 'TERMINAL DE PEDIDOS DE FOTOS',
    cart_title: 'Carrito',
    promotions_title: 'Nuestras ofertas',
    view_promotions: '+ Nuestras ofertas',
    search_photos_title: 'Buscar mis fotos',
    search_placeholder: 'Buscar por nombre de jinete o caballo (ej: Jappeloup)',
    search_btn: 'Buscar',
    buy_pack_btn: 'Comprar mi pack',
    tutorial_title: 'Cómo usar el terminal',
    view_tutorial: '+ Ver tutorial',
    summary_title: 'Resumen',
    total_label: 'Total',
    cancel_order_btn: 'Cancelar pedido',
    submit_order_btn: 'Validar mi pedido',
    pay_now_btn: 'Pagar ahora',
    pay_on_site_btn: 'Pagar en el lugar',
    shipping_btn: 'Envío (pago)',
    personal_info_title: 'Información personal',
    last_name_label: 'Apellido *',
    last_name_placeholder: 'Apellido',
    first_name_label: 'Nombre *',
    first_name_placeholder: 'Nombre',
    email_label: 'Email',
    email_placeholder: 'Su dirección de email',
    phone_label: 'Teléfono *',
    phone_placeholder: 'Su número de teléfono',
    notes_label: 'Notas (opcional)',
    notes_placeholder: 'Detalles del pedido...',
    unit_price_label: 'por unidad',
    see_more: 'Ver más',
    see_less: 'Ver menos',
    economy_label: 'Ahorro:',
    special_offer_title: 'Oferta especial',
    bought_label: 'comprado',
    bought_plural: 'comprados',
    free_label: 'gratis',
    free_plural: 'gratis',
    same_format_label: 'en el mismo formato',
    badge_pickup: 'Impresión en el lugar',
    badge_shipping: 'Envío postal',
    badge_email: 'Envío por email',
    badge_pack: 'Pack',
    product_label_fallback: 'Producto',
    tuto_step_3_title: 'Elegir mis fotos',
    tuto_step_3_text: 'Haga clic en el + en la parte superior derecha de sus fotos favoritas para agregarlas al carrito',
    tuto_step_4_title: 'Seleccionar formatos',
    tuto_step_4_text: 'Elija los formatos y ajuste las cantidades para cada foto en el carrito',
    pack_search_first: 'Haga primero una búsqueda de jinete o caballo',
    pack_unit: 'pack',
    packs_unit: 'packs',
    tuto_step_1_text: 'Escriba el nombre del jinete o del caballo en la barra de búsqueda (ej: Jappeloup)',
    tuto_step_2_title: 'Visualizar las fotos',
    tuto_step_2_text: 'Haga clic en una foto para ampliarla',
    tuto_step_5_title: 'Validar mi pedido',
    tuto_step_5_text: 'Complete su información y pague en el mostrador dándonos su nombre',
    cart_empty: 'Su carrito está vacío',
    pack_modal_title: 'Pack de Fotos',
    pack_modal_description: 'Compre todas sus fotos de una vez con el pack.',
    pack_modal_rider: 'Jinete:',
    pack_modal_horse: 'Caballo:',
    pack_modal_add_to_cart: 'Agregar al carrito',
    cart_add_btn: 'Agregar',
    cart_added_btn: 'Agregado',
    cart_remove_btn: 'Eliminar',
    pro_client_label: 'Cliente profesional (Quiero una factura)',
    postal_address_label: 'Dirección postal *',
    postal_address_placeholder: 'Su dirección',
    postal_code_label: 'Código Postal *',
    postal_code_placeholder: 'CP',
    city_label: 'Ciudad *',
    company_name_label: 'Nombre de la empresa *',
    company_name_placeholder: 'Nombre de la empresa',
    siret_label: 'NIF (Opcional)',
    siret_placeholder: 'NIF',
    tva_label: 'Número de IVA (Opcional)',
    tva_placeholder: 'IVA Intracomunitario',
    billing_address_label: 'Dirección de facturación *',
    billing_address_placeholder: 'Dirección completa',
    field_required: 'Este campo es obligatorio',
    order_validated_title: 'Pedido validado',
    order_success_message: 'Vaya al mostrador para el pago, ¡gracias por su pedido!',
    cart_empty_warning: 'Carrito vacío',
    warning_title: 'Atención',
    invalid_email_message: 'Por favor ingrese una dirección de email válida',
    invalid_email_title: 'Email inválido',
    error_title: 'Error',
    error_message: 'Error: ',
    search_required_title: 'Búsqueda requerida',
    next_photo_price: 'Siguiente:',
    next_photo_text: 'Siguiente foto a',
    pack_other_photos: 'otras fotos',
    pack_photo_singular: 'foto',
    pack_photo_plural: 'fotos',
    add_free: 'Agregar (Gratis)',
    next_photo_free: 'Siguiente foto gratis',
    paper_formats_title: 'Formatos papel',
    digital_formats_title: 'Formatos digitales',
    add_for_price: 'Agregar por',
    included_in_pack: 'incluido en su pack',

    // Carrito guardado / código carrito
    save_cart_btn: 'Finalizar más tarde',
    cart_code_placeholder: 'Código carrito',
    saved_cart_title: 'Carrito guardado',
    saved_cart_success: '¡Su carrito se ha guardado con éxito!',
    saved_cart_recovery_code: 'Código de recuperación:',
    saved_cart_note: 'Anote este código para recuperar su carrito más tarde.',
    close_btn: 'Cerrar',

    // Lightbox / UI
    add_to_cart_btn: 'Agregar al carrito',
    apply_choice_all_photos: 'Aplicar esta opción a todas mis fotos',

    // Búsqueda / mensajes
    search_in_progress: 'Buscando...',
    search_error: 'Error durante la búsqueda',
    no_photos_found: 'No se encontraron fotos',
    blocked_digital_title: 'Algunos formatos digitales ya están incluidos en un pack',
    blocked_digital_badge_title: 'Formatos digitales ya incluidos en el pack',

    // Guardar / cargar carrito
    save_cart_error: 'Error al guardar',
    save_cart_error_prefix: 'Error al guardar el carrito:',
    cancel_confirm: '¿Desea vaciar el carrito?',
    load_cart_code_invalid: 'Por favor, introduzca un código de 4 dígitos',
    load_cart_replace_confirm: 'Cargar este carrito reemplazará su carrito actual. ¿Continuar?',
    load_cart_not_found: 'Carrito no encontrado o expirado. Verifique su código.',
    load_cart_error: 'Error al cargar',
    load_cart_error_prefix: 'Error al cargar el carrito:',
    invalid_cart_format: 'Formato de carrito inválido',
    cart_loaded_success: '¡Carrito cargado con éxito!'
  }
};

function t(key) {
  return translations[currentLanguage][key] || key;
}

function updateInterfaceLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLanguage][key]) {
      el.textContent = translations[currentLanguage][key];
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[currentLanguage][key]) {
      el.setAttribute('placeholder', translations[currentLanguage][key]);
    }
  });
  
  // Mettre à jour les boutons de langue
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.dataset.lang === currentLanguage) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Re-rendre le tutoriel pour mettre à jour les textes dynamiques
  renderTutorial();
}

// État global
let products = [];
/** Cache produits par événement : { 'global': [...], 'BJ025': [...], ... } — utilisé pour le panier (prix selon event_id de la photo) */
let productsByEvent = {};
let currentSearch = '';
let currentSearchResults = []; // Stocker les résultats de recherche pour extraire les infos cavalier/cheval

// Initialisation - À faire dans les fichiers spécifiques (client_local_desktop.js, client_online_desktop.js, client_online_mobile.js)

function toggleColumn(side) {
  const col = document.getElementById(`${side}-column`);
  const btn = document.querySelector(`.toggle-column-btn[data-column="${side}"]`);
  const layout = document.querySelector('.main-layout');
  
  col.classList.toggle('collapsed');
  
  if (col.classList.contains('collapsed')) {
    btn.textContent = '+';
    layout.classList.add(`${side}-collapsed`);
  } else {
    btn.textContent = '−';
    layout.classList.remove(`${side}-collapsed`);
  }
  
  // Gérer la classe both-collapsed
  if (document.getElementById('left-column').classList.contains('collapsed') && 
      document.getElementById('right-column').classList.contains('collapsed')) {
    layout.classList.add('both-collapsed');
  } else {
    layout.classList.remove('both-collapsed');
  }
}

// Retourne la liste des produits pour un event_id (panier : prix selon la photo). Utilise le cache.
function getProductsForEventId(eventId) {
  const key = eventId && String(eventId).trim() ? eventId : 'global';
  return productsByEvent[key] || productsByEvent['global'] || products;
}

// Charge en arrière-plan les produits d'un événement pour le cache (panier multi-événements).
async function ensureProductsForEvent(eventId) {
  const key = eventId && String(eventId).trim() ? eventId : 'global';
  if (productsByEvent[key]) return productsByEvent[key];
  try {
    const url = `/api/products?event_id=${encodeURIComponent(key)}&lang=${encodeURIComponent(currentLanguage || 'fr')}`;
    const response = await fetch(url);
    if (!response.ok) return products;
    const data = await response.json();
    productsByEvent[key] = data.products || [];
    return productsByEvent[key];
  } catch (e) {
    return products;
  }
}

// Chargement des produits (formats et prix selon l'événement courant, depuis R2)
async function loadProducts() {
  // Borne online : charger les produits depuis l'API par événement (R2)
  const useEventApi = !API_BASE || API_BASE === 'null' || API_BASE === null;
  if (useEventApi) {
    try {
      // Un seul événement sélectionné → prix de cet événement (global + spécifique). Sinon → produits globaux (prix par défaut à l'arrivée).
      const eventId = selectedEventIds.length === 1 ? selectedEventIds[0] : 'global';
      const url = `/api/products?event_id=${encodeURIComponent(eventId)}&lang=${encodeURIComponent(currentLanguage || 'fr')}`;
      console.log('Chargement produits:', eventId === 'global' ? 'globaux (par défaut)' : `événement ${eventId}`);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn('API produits indisponible, liste vide');
        products = [];
        productsByEvent[eventId === 'global' ? 'global' : eventId] = [];
        renderPromotions();
        if (cart.length > 0) await renderCartItems();
        return;
      }
      const data = await response.json();
      products = data.products || [];
      const cacheKey = eventId === 'global' ? 'global' : eventId;
      productsByEvent[cacheKey] = products;
      console.log(`✅ ${products.length} produit(s) chargé(s) ${eventId === 'global' ? '(globaux, par défaut)' : `pour l'événement ${data.event_id || eventId}`}`);
      renderPromotions();
      if (cart.length > 0) await renderCartItems();
      return;
    } catch (error) {
      console.warn('Erreur chargement produits par événement:', error);
      products = [];
      renderPromotions();
      if (cart.length > 0) await renderCartItems();
      return;
    }
  }

  try {
    const response = await fetch(`${API_BASE}/products?lang=${currentLanguage}`, {
      headers: getApiHeaders()
    });
    if (!response.ok) throw new Error('Erreur chargement produits');
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Réponse API n\'est pas du JSON, API peut-être indisponible');
    }
    const data = await response.json();
    products = data.products;
    renderPromotions();
    if (cart.length > 0) await renderCartItems();
  } catch (error) {
    console.error('Erreur:', error);
    if (API_BASE && API_BASE !== 'null' && API_BASE !== null) {
      showMessage('Impossible de charger les produits', 'error');
    }
  }
}

// Affichage des promotions
function renderPromotions() {
  const container = document.getElementById('promotions-list');
  container.innerHTML = '';
  
  // Trier les produits : packs en premier, puis par position (1, 2, 3...), puis par nom
  // Les produits avec featured_position=0 ne sont pas affichés ici (sauf si c'est un pack ?)
  // Supposons que featured_position > 0 signifie "afficher dans Nos Offres"
  
  const featuredProducts = products
    .filter(p => p.featured_position > 0)
    .sort((a, b) => {
      // Tri par position
      return a.featured_position - b.featured_position;
    });

  featuredProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'promotion-card';
    
    // Calcul badge et prix
    let badgeText = '';
    let badgeClass = 'promo-badge';
    let priceDisplay = '';
    let descriptionText = '';
    
    // Utiliser uniquement badge_text configuré (pas de valeurs par défaut)
    if (product.badge_text && product.badge_text.trim()) {
      badgeText = product.badge_text;
      // Déterminer la classe selon la catégorie pour garder le style
    if (product.category === 'pack') {
      badgeClass += ' volume';
      }
    }
    // Si pas de badge_text configuré, on n'affiche pas de badge
    
    // Description pour l'affichage
    if (product.category === 'pack') {
      descriptionText = t('pack_unit'); // "pack"
    } else {
      descriptionText = t('unit_price_label'); // "à l'unité"
    }

    // Remplacer "à l'unité" par la description du produit si elle existe
    if (product.description && product.description.trim()) {
        descriptionText = product.description;
    }

    // Prix principal
    priceDisplay = `<div style="font-size: 1.8em; font-weight: 700; color: #e74c3c; line-height: 1;">${formatPrice(product.price)}</div>`;
    if (product.promo_price && product.promo_price < product.price) {
      priceDisplay = `
        <div style="font-size: 1em; color: #999; text-decoration: line-through; margin-bottom: 4px;">${formatPrice(product.price)}</div>
        <div style="font-size: 1.8em; font-weight: 700; color: #e74c3c; line-height: 1;">${formatPrice(product.promo_price)}</div>
      `;
    }

    // Règles de prix
    let rulesHtml = '';
    // Afficher les règles si pricing_rules existe OU si special_promo_rule existe
    if (product.pricing_rules || product.special_promo_rule) {
      // Convertir les clés (positions) en entiers et trier
      // Les règles sont interprétées comme des prix unitaires par position (photo 1 = X€, photo 2 = Y€, etc.)
      const rules = product.pricing_rules 
        ? Object.entries(product.pricing_rules)
            .map(([position, unitPrice]) => ({ position: parseInt(position), unitPrice: parseFloat(unitPrice) }))
            .filter(rule => !isNaN(rule.position) && !isNaN(rule.unitPrice))
            .sort((a, b) => a.position - b.position)
        : [];

      // Calculer les totaux cumulés pour chaque quantité
      // Exemple: si photo 1 = 3€, photo 2 = 2€, photo 3 = 1€
      // Alors: 1 photo = 3€, 2 photos = 5€ (3+2), 3 photos = 6€ (3+2+1)
      const cumulativeRules = [];
      let cumulativeTotal = 0;
      const defaultPrice = product.price; // Prix par défaut si position non définie
      
      // Parser la promo spéciale "X=Y" (ex: "2=1" → toutes les 2 photos, 1 est offerte)
      let promoGroupSize = null;
      let promoFreeCount = null;
      if (product.special_promo_rule) {
        const match = product.special_promo_rule.match(/(\d+)\s*=\s*(\d+)/);
        if (match) {
          promoGroupSize = parseInt(match[1]); // Taille du groupe (ex: 2)
          promoFreeCount = parseInt(match[2]); // Nombre de photos gratuites dans le groupe (ex: 1)
        }
      }
      
      // Trouver la position maximale définie et le dernier prix défini
      const maxPosition = rules.length > 0 ? Math.max(...rules.map(r => r.position)) : 0;
      const lastDefinedPrice = maxPosition > 0 
        ? rules.find(r => r.position === maxPosition).unitPrice 
        : defaultPrice;
      
      // Trouver le dernier prix non nul dans les règles (pour éviter de reprendre 0€ après)
      let lastNonZeroPrice = defaultPrice;
      for (let i = maxPosition; i >= 1; i--) {
        const rule = rules.find(r => r.position === i);
        if (rule && rule.unitPrice > 0) {
          lastNonZeroPrice = rule.unitPrice;
          break;
        }
      }
      
      // Toujours afficher jusqu'à 6 photos
      const maxDisplay = 6;
      
      for (let qty = 1; qty <= maxDisplay; qty++) {
        // Trouver le prix unitaire pour cette position
        const ruleForPosition = rules.find(r => r.position === qty);
        let unitPriceForPosition;
        
        // Vérifier si cette position est dans la promo gratuite (logique en boucle)
        // Ex: "2=1" → toutes les 2 photos, 1 est offerte (positions 2, 4, 6, 8...)
        if (promoGroupSize && promoFreeCount) {
          // Calculer dans quel groupe se trouve cette position (0-indexed)
          const groupe = Math.floor((qty - 1) / promoGroupSize);
          // Position dans le groupe (1-indexed)
          const posInGroup = ((qty - 1) % promoGroupSize) + 1;
          // Les Y dernières photos du groupe sont gratuites
          if (posInGroup > (promoGroupSize - promoFreeCount)) {
            unitPriceForPosition = 0; // Gratuit
          } else {
            // Photo payante
            if (ruleForPosition) {
              unitPriceForPosition = ruleForPosition.unitPrice;
            } else if (qty <= maxPosition) {
              unitPriceForPosition = defaultPrice;
            } else {
              unitPriceForPosition = (lastDefinedPrice === 0) ? lastNonZeroPrice : lastDefinedPrice;
            }
          }
        } else if (ruleForPosition) {
          // Règle définie pour cette position
          unitPriceForPosition = ruleForPosition.unitPrice;
        } else if (qty <= maxPosition) {
          // Position avant la dernière définie : utiliser le prix par défaut
          unitPriceForPosition = defaultPrice;
        } else {
          // Position après la dernière définie
          // Si on est dans une promo gratuite (multiple), c'est déjà géré plus haut
          // Sinon, utiliser le dernier prix défini (ou le dernier prix non nul si c'est 0€)
          unitPriceForPosition = (lastDefinedPrice === 0) ? lastNonZeroPrice : lastDefinedPrice;
        }
        
        // Ajouter au total cumulé
        cumulativeTotal += unitPriceForPosition;
        
        cumulativeRules.push({
          qty: qty,
          total: cumulativeTotal
        });
      }

      const unitLabel = product.category === 'pack' ? t('pack_unit') : 'photo';
      const unitsLabel = product.category === 'pack' ? t('packs_unit') : 'photos';

      // Afficher toutes les règles dans une seule box en colonne (cachée par défaut, visible via bouton "voir plus")
      if (cumulativeRules.length > 0) {
      rulesHtml = `
        <div class="promotion-rules-grid" style="display: none;">
            ${cumulativeRules.map(rule => {
             const label = rule.qty > 1 ? unitsLabel : unitLabel;
             return `
              <div class="promotion-rule-item">
                   <span class="qty-badge">${rule.qty} ${label}</span>
                <div style="text-align: right;">
                     <div class="rule-price">${formatPrice(rule.total)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
          <button class="btn" onclick="toggleRules(this)" style="margin-top: 8px; background: #2d3561; font-size: 0.8em; padding: 6px 12px;">${t('see_more')}</button>
      `;
    }
    }

    card.innerHTML = `
      ${badgeText ? `<div class="${badgeClass}">${badgeText}</div>` : ''}
      <div class="promo-content" style="display: flex; flex-direction: column; height: 100%;">
        <h3>${product.name}</h3>
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 10px 0;">
          ${priceDisplay}
          <div class="product-description">${descriptionText}</div>
        </div>
        ${rulesHtml}
      </div>
    `;
    
    container.appendChild(card);
  });
}

function toggleRules(btn) {
  const rulesDiv = btn.previousElementSibling;
  if (rulesDiv && rulesDiv.classList.contains('promotion-rules-grid')) {
    if (rulesDiv.style.display === 'none' || !rulesDiv.style.display) {
      rulesDiv.style.display = 'block';
    btn.textContent = t('see_less');
  } else {
    rulesDiv.style.display = 'none';
    btn.textContent = t('see_more');
    }
  }
}

// Recherche
function setupEventListeners() {
  const searchInput = document.getElementById('photo-search');
  const suggestionsBox = document.getElementById('suggestions-box');
  
  if (!searchInput || !suggestionsBox) {
    console.warn('Champ de recherche ou suggestions non trouvés');
    return;
  }
  
  let timeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      suggestionsBox.style.display = 'none';
      currentSuggestions = [];
      return;
    }
    
    timeout = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  });
  
  // Bouton de recherche (peut ne pas exister dans certaines interfaces)
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        suggestionsBox.style.display = 'none';
        searchPhotos(query);
      }
    });
  }
  
  // Support de la touche Entrée pour la recherche
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        suggestionsBox.style.display = 'none';
        currentSuggestions = [];
        searchPhotos(query);
      }
    }
  });

  // Bouton pack (peut ne pas exister)
  const packBtn = document.getElementById('pack-btn');
  if (packBtn) {
    packBtn.addEventListener('click', handleBuyPack);
  }
  
  // Validation commande
  const orderForm = document.getElementById('order-form');
  if (orderForm) {
    orderForm.addEventListener('submit', submitOrder);
  }

  const payOnSiteBtn = document.getElementById('pay-on-site-btn');
  if (payOnSiteBtn) {
    payOnSiteBtn.addEventListener('click', () => submitOrder(null, { payment_mode: 'on_site', button_id: 'pay-on-site-btn' }));
  }

  const shippingBtn = document.getElementById('shipping-btn');
  if (shippingBtn) {
    shippingBtn.addEventListener('click', () => submitOrder(null, { payment_mode: 'online', fulfillment: 'shipping', button_id: 'shipping-btn' }));
  }

  // Lightbox events
  const lightboxClose = document.querySelector('.lightbox-close');
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  
  const lightboxPrev = document.getElementById('lightbox-prev');
  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
  }
  
  const lightboxNext = document.getElementById('lightbox-next');
  if (lightboxNext) {
    lightboxNext.addEventListener('click', () => navigateLightbox(1));
  }
  
  const lightboxAddBtn = document.getElementById('lightbox-add-btn');
  if (lightboxAddBtn) {
    lightboxAddBtn.addEventListener('click', toggleCurrentLightboxPhoto);
  }
  
  // Navigation clavier dans le lightbox
  document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && lightbox.classList.contains('active')) {
      if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    }
  });
  
  // Fermer lightbox en cliquant à côté de l'image
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-image-container')) {
        closeLightbox();
      }
    });
  }

  // Cart events
  const validateCartBtn = document.getElementById('validate-cart-btn');
  if (validateCartBtn) {
    validateCartBtn.addEventListener('click', showPersonalInfoModal);
  }
  
  const saveCartBtn = document.getElementById('save-cart-btn');
  if (saveCartBtn) {
    saveCartBtn.addEventListener('click', saveCartForLater);
  }
  
  // Event listener pour le champ de recherche de code panier (Entrée) - géré inline dans le HTML
  
  // Gestion checkbox professionnel
  const isProfessional = document.getElementById('is-professional');
  if (isProfessional) {
    isProfessional.addEventListener('change', function() {
      const proFields = document.getElementById('pro-fields');
      if (this.checked) {
          if (proFields) proFields.style.display = 'block';
      } else {
          if (proFields) proFields.style.display = 'none';
          // Vider explicitement les champs pro quand on décoche pour éviter que Firefox garde les valeurs
          const companyName = document.getElementById('company-name');
          const companySiret = document.getElementById('company-siret');
          const companyTva = document.getElementById('company-tva');
          const companyAddress = document.getElementById('company-address');
          const companyPostalCode = document.getElementById('company-postal-code');
          const companyCity = document.getElementById('company-city');
          if (companyName) companyName.value = '';
          if (companySiret) companySiret.value = '';
          if (companyTva) companyTva.value = '';
          if (companyAddress) companyAddress.value = '';
          if (companyPostalCode) companyPostalCode.value = '';
          if (companyCity) companyCity.value = '';
      }
      // Mettre à jour la visibilité des champs en fonction du type de commande
      if (typeof updateFormFieldsVisibility === 'function') {
        updateFormFieldsVisibility();
      }
    });
  }
}

async function fetchSuggestions(query) {
  const suggestionsBox = document.getElementById('suggestions-box');
  if (!suggestionsBox) return;
  
  try {
    const response = await fetch(`${API_BASE}/search-suggestions?query=${encodeURIComponent(query)}`, {
      headers: getApiHeaders()
    });
    if (!response.ok) throw new Error('Erreur suggestions');
    const data = await response.json();
    const suggestions = data.suggestions || [];
    currentSuggestions = suggestions;
    
    if (!suggestions.length) {
      suggestionsBox.style.display = 'none';
    return;
  }
  
    suggestionsBox.innerHTML = suggestions.map((name, idx) => `
      <div class="suggestion-item" data-suggestion-index="${idx}">
        ${escapeHtml(name)}
      </div>
    `).join('');
    suggestionsBox.style.display = 'block';
    
    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.suggestionIndex, 10);
        applySuggestion(currentSuggestions[index] || '');
      });
    });
  } catch (error) {
    suggestionsBox.style.display = 'none';
    currentSuggestions = [];
  }
}

function applySuggestion(value) {
  const searchInput = document.getElementById('photo-search');
  const suggestionsBox = document.getElementById('suggestions-box');
  if (!searchInput) return;
  
  searchInput.value = value;
  suggestionsBox.style.display = 'none';
  currentSuggestions = [];
  if (value) {
    searchPhotos(value);
  }
}

// Cache pour les photos depuis R2
let staticPhotosCache = null; // Cache global (pour compatibilité avec code existant)
let multiEventPhotosCache = {}; // Cache multi-événements : { event_id: [photos] }
let selectedEventIds = []; // Événements sélectionnés pour la recherche

/** Charge le script sql.js (une seule fois). */
function loadSqlJs() {
  if (window.initSqlJs) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('sql.js load failed'));
    document.head.appendChild(script);
  });
}

/**
 * Charge l'index photos depuis la DB FTS sur R2 (events/{eventId}/photos_index.db).
 * Retourne un tableau d'items (file_id, rider_name, horse_name, r2_key_*, etc.) ou null en cas d'erreur.
 */
async function loadPhotosFromIndexDb(eventId) {
  const r2Url = window.R2_PUBLIC_URL;
  if (!r2Url) return null;
  const r2Key = `events/${eventId}/photos_index.db`;
  const cacheBuster = `?t=${Date.now()}`;
  let response;
  try {
    response = await fetch(`${r2Url}/${r2Key}${cacheBuster}`);
  } catch (e) {
    return null;
  }
  if (!response.ok) return null;
  const arrayBuffer = await response.arrayBuffer();
  try {
    await loadSqlJs();
    const SQL = await window.initSqlJs({
      locateFile: () => 'https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.wasm'
    });
    const db = new SQL.Database(new Uint8Array(arrayBuffer));
    const result = db.exec('SELECT file_id, rider_name, horse_name, rider_number, class_name, contest, r2_key_thumb, r2_key_preview, r2_key_hd, r2_key_webp FROM photos_index');
    db.close();
    if (!result || !result[0] || !result[0].values) return null;
    const cols = result[0].columns;
    const photos = result[0].values.map(row => {
      const o = {};
      cols.forEach((c, i) => { o[c] = row[i] != null ? row[i] : ''; });
      o.event_id = eventId;
      return o;
    });
    return photos;
  } catch (e) {
    console.warn('Erreur chargement photos_index.db pour', eventId, e);
    return null;
  }
}

/**
 * Charge les photos pour un ou plusieurs événements
 * @param {string|string[]} eventIds - Un event_id ou un tableau d'event_ids. Si null, détecte automatiquement.
 * @returns {Promise<Array>} Tableau de toutes les photos des événements demandés
 */
async function loadStaticPhotos(eventIds = null) {
  // Si eventIds est null, détecter automatiquement (comportement legacy)
  if (!eventIds) {
    let eventId = null;
    
    // Méthode 1 : Depuis l'URL (ex: ?event=BJ025)
    const urlParams = new URLSearchParams(window.location.search);
    eventId = urlParams.get('event');
    
    // Méthode 2 : Depuis window ou localStorage
    if (!eventId && typeof window !== 'undefined') {
      eventId = window.currentEventId || localStorage.getItem('currentEventId');
    }
    
    // Méthode 3 : Utiliser les événements sélectionnés
    if (!eventId && selectedEventIds.length > 0) {
      eventId = selectedEventIds[0];
    }
    
    // Méthode 4 : Essayer de détecter depuis les photos déjà chargées en cache
    if (!eventId && Object.keys(multiEventPhotosCache).length > 0) {
      eventId = Object.keys(multiEventPhotosCache)[0];
    }
    
    // Si pas d'event_id, essayer de découvrir les événements disponibles
    if (!eventId) {
      console.warn('⚠️ Aucun event_id détecté, tentative de découverte des événements');
      const availableEvents = await discoverAvailableEvents();
      if (availableEvents.length > 0) {
        eventIds = availableEvents;
      } else {
        console.error('❌ Aucun événement disponible, impossible de charger les photos');
        return [];
      }
    } else {
      eventIds = [eventId];
    }
  }
  
  // Normaliser en tableau
  if (typeof eventIds === 'string') {
    eventIds = [eventIds];
  }
  
  // Charger tous les événements demandés
  const allPhotos = [];
  for (const eventId of eventIds) {
    // Vérifier le cache pour cet event_id
    const cacheKey = `photos_cache_${eventId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    let photos = null;
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const cacheTime = parsed.timestamp || 0;
        const cacheAge = Date.now() - cacheTime;
        // Cache valide pendant 5 minutes
        if (cacheAge < 5 * 60 * 1000) {
          photos = parsed.items || [];
          console.log(`✅ ${photos.length} photos chargées depuis cache (event_id: ${eventId})`);
        }
      } catch (e) {
        console.warn('Erreur parsing cache:', e);
      }
    }
    
    // Si pas de cache, charger depuis R2 : index DB uniquement (photos_index.db)
    if (!photos) {
      const r2Url = window.R2_PUBLIC_URL;
      if (!r2Url) {
        console.error('❌ R2_PUBLIC_URL non défini');
        continue;
      }
      try {
        photos = await loadPhotosFromIndexDb(eventId);
        if (photos === null) {
          console.warn(`⚠️ Index photos introuvable sur R2 pour ${eventId} (photos_index.db)`);
          continue;
        }

        multiEventPhotosCache[eventId] = photos;
        const MAX_SESSION_STORAGE_ITEMS = 2500;
        if (photos.length <= MAX_SESSION_STORAGE_ITEMS) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              items: photos,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('Erreur mise en cache sessionStorage:', e);
          }
        } else {
          console.log(`Cache mémoire uniquement pour ${eventId} (${photos.length} photos, pas de sessionStorage)`);
        }

        console.log(`✅ ${photos.length} photos chargées depuis R2 (event_id: ${eventId}, photos_index.db)`);
      } catch (error) {
        console.warn(`Erreur chargement photos depuis R2 pour ${eventId}:`, error);
        continue;
      }
    } else {
      multiEventPhotosCache[eventId] = photos; // Mettre dans le cache mémoire
    }
    
    if (photos && photos.length > 0) {
      allPhotos.push(...photos);
    }
  }
  
  // Si aucun événement chargé, retourner un tableau vide
  if (allPhotos.length === 0) {
    console.warn('⚠️ Aucune photo chargée depuis R2 pour les événements demandés');
    return [];
  }
  
  // Mettre à jour le cache pour compatibilité
  staticPhotosCache = allPhotos;
  
  return allPhotos;
}

async function searchPhotos(query) {
  currentSearch = query; // Sauvegarder la recherche pour le pack
  const container = document.getElementById('photos-results');
  container.style.display = 'block';
  container.innerHTML = `<div style="text-align: center; padding: 20px;">${t('search_in_progress')}</div>`;
  
  // Mode statique : recherche dans le JSON local
  if (!API_BASE || API_BASE === 'null' || API_BASE === null) {
    try {
      console.log('🔍 Mode statique : recherche de', query);
      // Charger les photos des événements sélectionnés (ou détecter automatiquement)
      const eventIdsToLoad = selectedEventIds.length > 0 ? selectedEventIds : null;
      const allPhotos = await loadStaticPhotos(eventIdsToLoad);
      if (!allPhotos || allPhotos.length === 0) {
        console.warn('⚠️ Aucune photo chargée');
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: orange;">Aucune photo disponible</div>`;
        return;
      }
      
      console.log(`📸 ${allPhotos.length} photos chargées`);
      
      // Recherche côté client
      const queryLower = query.toLowerCase().trim();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
      
      if (queryWords.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px;">${t('search_error')}</div>`;
        return;
      }
      
      console.log('🔎 Mots recherchés:', queryWords);
      
      // Filtrer les photos
      const filtered = allPhotos.filter(photo => {
        // Extraire les noms depuis différentes sources possibles (JSON R2, API legacy, etc.)
        const rider = (photo.rider_name || photo.rider || photo.cavalier || '').toLowerCase().trim();
        const horse = (photo.horse_name || photo.horse || photo.cheval || '').toLowerCase().trim();
        const number = (photo.rider_number || photo.number || photo.bib || '').toLowerCase().trim();
        
        // Construire le texte de recherche avec tous les champs possibles
        const searchText = `${rider} ${horse} ${number}`.toLowerCase();
        
        // Debug désactivé pour éviter les logs répétitifs
        // if (queryWords.length > 0 && queryWords[0].length > 2) {
        //   console.debug('Photo data:', {
        //     rider_name: photo.rider_name,
        //     horse_name: photo.horse_name,
        //     rider_number: photo.rider_number,
        //     searchText: searchText,
        //     query: queryWords.join(' ')
        //   });
        // }
        
        // Tous les mots de la requête doivent être présents
        const matches = queryWords.every(word => searchText.includes(word));
        // Log désactivé pour éviter la répétition excessive
        // if (matches) {
        //   console.log('✅ Match trouvé:', { rider, horse, number, query: queryWords.join(' ') });
        // }
        return matches;
      });
      
      console.log(`📊 ${filtered.length} résultats trouvés`);
      
      // Normaliser et trier
      const photos = normalizePhotosData(filtered);
      const sortedPhotos = [...photos].sort(naturalSort);
      
      // Stocker les résultats
      currentSearchResults = sortedPhotos;
      
      // Afficher
      renderPhotos(sortedPhotos);
      return;
    } catch (error) {
      console.error('❌ Erreur recherche statique:', error);
      console.error('Stack:', error.stack);
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">${t('search_error')}: ${error.message}</div>`;
      return;
    }
  }
  
  // Mode API : recherche via API
  try {
    const response = await fetch(`${API_BASE}/search-photos?query=${encodeURIComponent(query)}&page=1&limit=80`, {
      headers: getApiHeaders()
    });
    if (!response.ok) throw new Error('Erreur recherche');
    const data = await response.json();
    const photos = normalizePhotosData(data.items || data.photos || []);
    
    // Trier les photos par ordre alphanumérique (comme Windows)
    const sortedPhotos = [...photos].sort(naturalSort);
    
    // Stocker les résultats triés pour extraire les infos cavalier/cheval
    currentSearchResults = sortedPhotos;
    
    renderPhotos(sortedPhotos);
  } catch (error) {
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">${t('search_error')}</div>`;
  }
}

function normalizePhotosData(rawPhotos) {
  return (rawPhotos || []).map(photo => {
    // Construire le filename : priorité aux champs existants, sinon construire depuis file_id/event_id
    let filename = photo.filename || photo.rel_path || photo.photo_path || photo.path || photo.id || '';
    
    // Si pas de filename mais qu'on a file_id et event_id, construire un filename
    if (!filename && photo.file_id && photo.event_id) {
      // Construire un filename basé sur les infos disponibles
      const riderName = (photo.rider_name || photo.rider || photo.cavalier || '').replace(/[^a-zA-Z0-9]/g, '_');
      const horseName = (photo.horse_name || photo.horse || photo.cheval || '').replace(/[^a-zA-Z0-9]/g, '_');
      const riderNumber = photo.rider_number || photo.number || photo.bib || '';
      filename = `${photo.event_id}/${riderNumber}_${riderName}_${horseName}/${photo.file_id.substring(0, 8)}.jpg`;
    } else if (!filename && photo.file_id) {
      // Fallback : utiliser juste le file_id
      filename = `${photo.event_id || 'UNKNOWN'}/photos/${photo.file_id.substring(0, 8)}.jpg`;
    }
    
    const normalizedFilename = filename.replace(/\\/g, '/');
    const displayName = photo.name || photo.displayName || (normalizedFilename ? normalizedFilename.split('/').pop() : '') || `${photo.rider_name || ''} - ${photo.horse_name || ''}`.trim();
    
    // NOUVEAU : Utiliser les URLs R2 depuis l'index JSON R2 ou l'API
    let imageUrl = null;
    let previewUrl = null;
    const r2PublicUrl = window.R2_PUBLIC_URL;
    if (!r2PublicUrl) {
      console.error('❌ R2_PUBLIC_URL non défini');
      return photo; // Retourner photo sans URLs R2
    }
    
    // Priorité 1 : Utiliser r2_key_* depuis l'index JSON R2 (format events/{event_id}/photos/{file_id}/webp.webp)
    if (window.R2_PUBLIC_URL) {
      if (photo.r2_key_webp) {
        // Utiliser webp comme preview (prioritaire car plus léger)
        previewUrl = `${r2PublicUrl}/${photo.r2_key_webp}`;
        imageUrl = previewUrl; // Utiliser webp comme image principale aussi
      } else if (photo.r2_key_preview) {
        previewUrl = `${r2PublicUrl}/${photo.r2_key_preview}`;
        imageUrl = previewUrl;
      } else if (photo.r2_key_thumb) {
        imageUrl = `${r2PublicUrl}/${photo.r2_key_thumb}`;
        previewUrl = imageUrl;
      } else if (photo.r2_key_hd) {
        // Utiliser HD comme fallback si pas de preview/webp
        imageUrl = `${r2PublicUrl}/${photo.r2_key_hd}`;
        previewUrl = imageUrl;
      }
    }
    
    // Priorité 2 : Utiliser urls depuis l'API (format legacy)
    if (!imageUrl && photo.urls && window.R2_PUBLIC_URL) {
      // L'API retourne les chemins R2 dans urls.thumb, urls.preview, urls.small
      if (photo.urls.thumb) {
        imageUrl = `${r2PublicUrl}/${photo.urls.thumb}`;
      }
      if (photo.urls.preview) {
        previewUrl = `${r2PublicUrl}/${photo.urls.preview}`;
      }
      if (!imageUrl && photo.urls.preview) {
        imageUrl = previewUrl; // Fallback sur preview si thumb manquant
      }
    }
    
    // Si pas d'URLs R2 depuis l'API, construire depuis file_id ou ancien format
    if (!imageUrl) {
      const fileId = photo.file_id || null;
      const eventId = photo.event_id || photo.contest || null;
      const relPath = photo.rel_path || photo.photo_path || photo.path || null;
      const originalFilename = photo.original_filename || null;
      
      if (fileId && eventId) {
        // Nouveau format avec file_id (prioritaire)
        imageUrl = getPhotoUrlFromFilename(normalizedFilename, null, null, fileId, eventId, 'thumb');
        previewUrl = getPhotoUrlFromFilename(normalizedFilename, null, null, fileId, eventId, 'preview');
      }
      
      // Fallback sur ancien format si nouveau format non disponible
      if (!imageUrl && relPath) {
        imageUrl = photo.thumb_url || getPhotoUrlFromFilename(normalizedFilename, relPath, originalFilename);
        previewUrl = photo.preview_url || imageUrl;
      }
    }
    
    return {
      ...photo,
      filename: normalizedFilename,
      displayName,
      imageUrl: imageUrl || photo.thumb_url || '',
      previewUrl: previewUrl || photo.preview_url || imageUrl || '',
      // S'assurer que rider_name et horse_name sont préservés depuis le JSON R2
      rider_name: photo.rider_name || photo.rider || photo.cavalier || '',
      horse_name: photo.horse_name || photo.horse || photo.cheval || '',
      rider_number: photo.rider_number || photo.number || photo.bib || '',
      // Garder les infos pour fallback si nouveau chemin échoue
      _fallbackRelPath: photo.rel_path || photo.photo_path || photo.path || null,
      _fallbackOriginalFilename: photo.original_filename || null,
    };
  });
}

// Fonction de tri alphanumérique (comme Windows)
function naturalSort(a, b) {
  // Extraire uniquement le nom de fichier (sans le chemin)
  const aFilename = (a.filename || '').split('/').pop().split('\\').pop().toLowerCase();
  const bFilename = (b.filename || '').split('/').pop().split('\\').pop().toLowerCase();
  
  // Extraire les parties numériques et textuelles
  const regex = /(\d+)|(\D+)/g;
  const aParts = aFilename.match(regex) || [];
  const bParts = bFilename.match(regex) || [];
  
  const maxLength = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';
    
    // Si les deux parties sont numériques, comparer numériquement
    const aNum = parseInt(aPart);
    const bNum = parseInt(bPart);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } else {
      // Comparaison textuelle
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
  }
  
  return 0;
}

// Rendu des photos
function renderPhotos(photos) {
  const container = document.getElementById('photos-results');
  
  if (!photos || photos.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 20px;">${t('no_photos_found')}</div>`;
    return;
  }
  
  // Trier les photos par ordre alphanumérique (comme Windows)
  const sortedPhotos = [...photos].sort(naturalSort);
  
  const grid = document.createElement('div');
  grid.className = 'photos-grid';
  
  sortedPhotos.forEach(photo => {
    // S'assurer que filename est défini - construire depuis file_id si nécessaire
    let filename = photo.filename || photo.rel_path || photo.photo_path || photo.path || photo.id || '';
    
    // Si pas de filename mais qu'on a file_id, construire un filename
    if (!filename && photo.file_id) {
      const eventId = photo.event_id || photo.contest || 'UNKNOWN';
      const riderName = (photo.rider_name || photo.rider || photo.cavalier || '').replace(/[^a-zA-Z0-9]/g, '_');
      const horseName = (photo.horse_name || photo.horse || photo.cheval || '').replace(/[^a-zA-Z0-9]/g, '_');
      const riderNumber = photo.rider_number || photo.number || photo.bib || '';
      filename = `${eventId}/${riderNumber}_${riderName}_${horseName}/${photo.file_id.substring(0, 8)}.jpg`;
    }
    
    if (!filename) {
      console.warn('Photo sans filename ni file_id, ignorée:', photo);
      return;
    }
    
    const imageUrl = photo.imageUrl || getPhotoUrlFromFilename(filename);
    if (!imageUrl) return;
    const displayName = escapeHtml(photo.displayName || (filename.split('/').pop() || ''));
    
    // Créer un ID unique pour cette photo (priorité: file_id > combinaison unique > index)
    const fileId = photo.file_id || photo.id || null;
    const eventId = photo.event_id || photo.contest || 'UNKNOWN';
    const photoUniqueId = fileId ? `${eventId}-${fileId}` : `photo-${sortedPhotos.indexOf(photo)}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Vérifier si cette photo est déjà dans le panier (par photo_id unique)
    const inCart = isInCartByPhotoId(photoUniqueId);
    
    // Récupérer les infos rider/horse de la photo
    const riderName = photo.rider_name || photo.cavalier || '';
    const horseName = photo.horse_name || photo.cheval || '';
    
    // Vérifier si des produits numériques sont bloqués par un pack pour ce couple
    const blockedDigitalProducts = products
      .filter(p => p.category === 'numérique' && isDigitalPhotoBlockedByPack(p.id, riderName, horseName))
      .map(p => p.id);
    
    const hasBlockedDigital = blockedDigitalProducts.length > 0;
    
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.dataset.filename = filename; // S'assurer que filename est toujours défini
    card.dataset.photoId = photoUniqueId;
    card.id = `photo-card-${photoUniqueId}`;
    
    if (inCart) {
      card.classList.add('in-cart');
    }
    if (hasBlockedDigital) {
      card.classList.add('has-blocked-digital');
      card.title = t('blocked_digital_title');
    }
    
    // Préparer le fallback sur l'ancien chemin si le nouveau échoue
    const fallbackUrl = photo._fallbackRelPath ? 
      getPhotoUrlFromFilename(photo.filename, photo._fallbackRelPath, photo._fallbackOriginalFilename) : 
      null;
    
    // Gestionnaire d'erreur pour fallback sur ancien chemin
    const imgErrorHandler = fallbackUrl && fallbackUrl !== imageUrl ? 
      `this.onerror=null; this.src='${fallbackUrl.replace(/'/g, "\\'")}';` : '';
    
    // Échapper le filename pour éviter les problèmes avec les caractères spéciaux
    const escapedFilename = filename.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const escapedPhotoId = photoUniqueId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    card.innerHTML = `
      <div class="photo-in-cart-badge" style="display: ${inCart ? 'flex' : 'none'}" onclick="event.stopPropagation(); event.preventDefault(); removePhotoFromCart('${escapedPhotoId}')">✓</div>
      <button class="photo-add-btn" onclick="event.stopPropagation(); event.preventDefault(); toggleCartItem('${escapedPhotoId}', this)" style="display: ${inCart ? 'none' : 'flex'}">+</button>
      ${hasBlockedDigital ? `<div class="photo-blocked-badge" title="${escapeHtml(t('blocked_digital_badge_title'))}">📦</div>` : ''}
      <img src="${imageUrl}" class="photo-thumbnail" loading="lazy" alt="${displayName}" onload="detectPhotoOrientation(this)" ${imgErrorHandler ? `onerror="${imgErrorHandler}"` : ''}>
    `;
    
    // Gérer le clic sur la carte (ouvrir lightbox) - mais pas si on clique sur le bouton
    card.onclick = (e) => {
      // Ne pas ouvrir la lightbox si on clique sur le bouton + ou le badge
      if (e.target.closest('.photo-add-btn') || e.target.closest('.photo-in-cart-badge') || e.target.closest('.photo-blocked-badge')) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      openLightbox(filename, sortedPhotos);
    };

    grid.appendChild(card);
  });
  
  container.innerHTML = '';
  container.appendChild(grid);
}

// Détecter l'orientation de la photo et ajouter une classe CSS
function detectPhotoOrientation(img) {
  if (img.naturalWidth && img.naturalHeight) {
    const isVertical = img.naturalHeight > img.naturalWidth;
    const card = img.closest('.photo-card');
    if (card) {
      if (isVertical) {
        card.classList.add('photo-vertical');
      } else {
        card.classList.add('photo-horizontal');
      }
    }
  } else {
    // Si les dimensions ne sont pas encore chargées, attendre
    img.onload = function() {
      detectPhotoOrientation(img);
    };
  }
}

// Détecter l'orientation dans le panier pour ajuster le layout (colonne formats calée sur la hauteur photo)
function detectCartPhotoOrientation(img) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return;
  const row = img.closest('.cart-photo-row');
  if (!row) return;

  const ratio = img.naturalWidth / img.naturalHeight;
  let orientation = 'square';
  if (ratio >= 1.15) orientation = 'horizontal';
  else if (ratio <= 0.87) orientation = 'vertical';

  row.dataset.photoOrientation = orientation;
}

// Gestion du Panier
function toggleCartItem(photoId, btn) {
  // Empêcher toute propagation d'événement
  if (typeof event !== 'undefined') {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // Trouver la carte spécifique qui contient ce bouton
  if (!btn) {
    console.warn('Bouton non fourni pour toggleCartItem');
    return;
  }
  
  const card = btn.closest('.photo-card');
  if (!card) {
    console.warn('Photo card non trouvée pour photoId:', photoId?.substring(0, 50));
    return;
  }
  
  // Vérifier que cette carte correspond bien au photoId EXACT
  const cardPhotoId = card.dataset.photoId;
  if (cardPhotoId !== photoId) {
    console.warn('PhotoId mismatch:', cardPhotoId?.substring(0, 50), 'vs', photoId?.substring(0, 50));
    return;
  }
  
  // Récupérer le filename depuis la carte
  const filename = card.dataset.filename;
  if (!filename) {
    console.warn('Filename manquant sur la carte');
    return;
  }
  
  // Vérifier si cette photo est déjà dans le panier (par photoId unique)
  const index = cart.findIndex(item => item.type === 'photo' && item.photo_id === photoId);
  
  // Si déjà dans le panier, ne rien faire (le bouton + ne devrait pas être visible)
  if (index !== -1) {
    console.log('Photo déjà dans le panier (photoId):', photoId.substring(0, 50));
    return;
  }
  
  console.log('✅ Ajout photo au panier:', filename.substring(0, 50), 'Photo ID:', photoId.substring(0, 50), 'Card ID:', card.id);
  
  const badge = card.querySelector('.photo-in-cart-badge');
  const addBtn = card.querySelector('.photo-add-btn');
  
  // Ajouter - récupérer rider_name et horse_name depuis currentSearchResults
  // PRIORITÉ : chercher par photoId unique d'abord
  const photoData = currentSearchResults.find(p => {
    const pFileId = p.file_id || p.id || null;
    const pEventId = p.event_id || p.contest || 'UNKNOWN';
    const pPhotoId = pFileId ? `${pEventId}-${pFileId}` : null;
    // Priorité 1 : correspondance exacte par photoId
    if (pPhotoId && pPhotoId === photoId) return true;
    return false; // Ne pas utiliser filename comme fallback, car plusieurs photos peuvent avoir le même filename
  });
  const riderName = photoData ? (photoData.rider_name || photoData.cavalier || '') : '';
  const horseName = photoData ? (photoData.horse_name || photoData.cheval || '') : '';
  const eventId = photoData ? (photoData.event_id || photoData.contest || null) : null;
  const fileId = photoData ? (photoData.file_id || photoData.id || null) : null;
  
  cart.push({
    type: 'photo',
    photo_id: photoId, // ID unique de la photo
    filename: filename,
    formats: {}, // { product_id: quantity }
    rider_name: riderName,
    horse_name: horseName,
    event_id: eventId, // Stocker l'event_id dans le panier
    file_id: fileId // Stocker le file_id dans le panier
  });
  
  // Mettre à jour UNIQUEMENT cette carte spécifique (par photoId unique)
  card.classList.add('in-cart');
  if (badge) badge.style.display = 'flex';
  if (addBtn) addBtn.style.display = 'none';
  
  // NE PAS mettre à jour d'autres cartes - chaque photo est unique par son photoId
  // (même si elles ont le même filename, elles ont des photoId différents)
  
  updateCartUI();
  
  // Animation
  const cartBtn = document.getElementById('cart-header-btn');
  if (cartBtn) {
    cartBtn.style.transform = 'scale(1.2)';
    setTimeout(() => cartBtn.style.transform = 'scale(1)', 200);
  }
}

// Pour retirer via le badge ou lightbox
function removePhotoFromCart(photoId) {
  // Retirer de la carte par photo_id (unique)
  cart = cart.filter(item => !(item.type === 'photo' && item.photo_id === photoId));
  
  // Mettre à jour UNIQUEMENT la carte avec ce photoId
  const card = document.querySelector(`.photo-card[data-photo-id="${CSS.escape(photoId)}"]`);
  if (card) {
    card.classList.remove('in-cart');
    const addBtn = card.querySelector('.photo-add-btn');
    const badge = card.querySelector('.photo-in-cart-badge');
    if (addBtn) addBtn.style.display = 'flex';
    if (badge) badge.style.display = 'none';
  }
  
  updateCartUI();
}

function getCartItemRiderHorse(cartItem) {
  // Priorité aux infos stockées dans l'item
  let riderName = cartItem.rider_name || '';
  let horseName = cartItem.horse_name || '';

  // Fallback : chercher dans les résultats courants
  if (!riderName) {
    const photoData = currentSearchResults.find(p => p.filename === cartItem.filename);
    if (photoData) {
      riderName = photoData.rider_name || photoData.cavalier || '';
      horseName = photoData.horse_name || photoData.cheval || '';
      cartItem.rider_name = riderName;
      cartItem.horse_name = horseName;
    }
  }

  return { riderName, horseName };
}

function applyFirstPhotoChoiceToAll(firstFilename) {
  const source = cart.find(i => i.type === 'photo' && i.filename === firstFilename);
  if (!source) return;

  const sourceFormats = source.formats || {};

  cart.forEach(item => {
    if (item.type !== 'photo') return;
    if (item.filename === firstFilename) return;

    const { riderName, horseName } = getCartItemRiderHorse(item);

    const nextFormats = {};
    Object.entries(sourceFormats).forEach(([pidStr, qtyRaw]) => {
      const productId = parseInt(pidStr, 10);
      const qty = parseInt(qtyRaw, 10) || 0;
      if (!productId || qty <= 0) return;

      const product = products.find(p => p.id === productId);
      if (!product || product.category === 'pack') return;

      if (product.category === 'numérique') {
        // Respecter le blocage par pack
        if (isDigitalPhotoBlockedByPack(productId, riderName, horseName)) return;
        nextFormats[productId] = 1;
        return;
      }

      // Impression : appliquer la même quantité
      nextFormats[productId] = qty;
    });

    item.formats = nextFormats;
  });

  updateCartUI();
}

// Fonction pour normaliser le nom d'un couple pour la comparaison
function normalizeCoupleName(riderName, horseName) {
  const rider = (riderName || '').trim();
  const horse = (horseName || '').trim();
  // Si on a "RIDER - HORSE" dans riderName, extraire les deux
  if (rider.includes(' - ')) {
    const parts = rider.split(' - ');
    return {
      rider: parts[0].trim(),
      horse: parts[1] ? parts[1].trim() : ''
    };
  }
  return { rider, horse };
}

// Fonction pour comparer deux couples
function isSameCouple(rider1, horse1, rider2, horse2) {
  const couple1 = normalizeCoupleName(rider1, horse1);
  const couple2 = normalizeCoupleName(rider2, horse2);
  
  // Comparer rider (insensible à la casse)
  if (couple1.rider.toLowerCase() !== couple2.rider.toLowerCase()) {
    return false;
  }
  
  // Si les deux ont un horse, comparer
  if (couple1.horse && couple2.horse) {
    return couple1.horse.toLowerCase() === couple2.horse.toLowerCase();
  }
  
  // Si aucun n'a de horse, c'est le même couple
  if (!couple1.horse && !couple2.horse) {
    return true;
  }
  
  // Si un seul a un horse, ce n'est pas le même couple
  return false;
}

// Fonction pour vérifier si une photo numérique est bloquée par un pack pour le même couple
// Un pack (catégorie "pack") bloque une photo numérique si :
// 1. C'est pour le même couple (rider/horse)
// 2. Le pack et la photo numérique ont le même email_delivery (3000x2000 si email_delivery=true, HD si email_delivery=false)
function isDigitalPhotoBlockedByPack(productId, riderName, horseName) {
  if (!productId || !riderName) return false;
  
  // Récupérer le produit numérique pour vérifier son email_delivery
  const digitalProduct = products.find(p => p.id === productId);
  if (!digitalProduct || digitalProduct.category !== 'numérique') return false;
  
  const digitalEmailDelivery = digitalProduct.email_delivery || false;
  
  // Vérifier si un pack (catégorie "pack") dans le panier pour le même couple a le même email_delivery
  const blockingPack = cart.find(cartItem => {
    if (cartItem.type === 'pack') {
      // Extraire rider et horse du rider_name du pack (format "RIDER - HORSE" ou juste "RIDER")
      const packCouple = normalizeCoupleName(cartItem.rider_name || '', '');
      
      // Vérifier que c'est le même couple
      if (isSameCouple(riderName, horseName, packCouple.rider, packCouple.horse)) {
        const packProduct = products.find(p => p.id === cartItem.product_id);
        
        // Vérifier que c'est bien un pack (catégorie "pack")
        if (packProduct && packProduct.category === 'pack') {
          // Un pack bloque automatiquement tous les produits numériques avec le même email_delivery
          // email_delivery=true → pack 3000x2000 bloque les photos numériques 3000x2000
          // email_delivery=false → pack HD bloque les photos numériques HD
          const packEmailDelivery = packProduct.email_delivery || false;
          return packEmailDelivery === digitalEmailDelivery;
        }
      }
    }
    return false;
  });
  
  return !!blockingPack;
}

// Fonction pour supprimer les photos individuelles concernées par un pack qu'on vient d'ajouter
function removePhotosBlockedByPack(packProductId, packDisplayName) {
  // Récupérer le produit pack pour connaître son email_delivery
  const packProduct = products.find(p => p.id === packProductId);
  if (!packProduct || packProduct.category !== 'pack') return;
  
  const packEmailDelivery = packProduct.email_delivery || false;
  
  // Extraire rider et horse du displayName du pack
  const packCouple = normalizeCoupleName(packDisplayName || '', '');
  
  // Parcourir le panier et identifier les photos individuelles concernées
  const photosToRemove = [];
  
  cart.forEach((item, index) => {
    if (item.type === 'photo') {
      // Extraire rider et horse de la photo
      const photoRider = item.rider_name || '';
      const photoHorse = item.horse_name || '';
      
      // Vérifier que c'est le même couple
      if (isSameCouple(photoRider, photoHorse, packCouple.rider, packCouple.horse)) {
        // Pour chaque format de la photo dans le panier
        if (item.formats) {
          Object.keys(item.formats).forEach(productId => {
            const product = products.find(p => p.id === parseInt(productId));
            if (!product) return;
            
            // Si c'est une photo impression (papier), NE PAS supprimer
            // Le pack est uniquement numérique, donc les photos papier doivent toujours être conservées
            if (product.category === 'impression') {
              // Ne rien faire - ne pas supprimer les photos papier (le pack ne les inclut pas)
              return;
            }
            // Si c'est une photo numérique, supprimer seulement si même email_delivery
            else if (product.category === 'numérique') {
              const digitalEmailDelivery = product.email_delivery || false;
              if (digitalEmailDelivery === packEmailDelivery) {
                photosToRemove.push({ index, filename: item.filename, productId: parseInt(productId) });
              }
            }
          });
        }
      }
    }
  });
  
  // Supprimer les formats concernés (en parcourant à l'envers pour éviter les problèmes d'index)
  for (let i = cart.length - 1; i >= 0; i--) {
    const item = cart[i];
    if (item && item.type === 'photo') {
      const formatsToRemove = photosToRemove
        .filter(p => p.index === i && p.filename === item.filename)
        .map(p => p.productId);
      
      if (formatsToRemove.length > 0 && item.formats) {
        // Supprimer les formats concernés
        formatsToRemove.forEach(productId => {
          delete item.formats[productId];
        });
        
        // Si plus aucun format, supprimer complètement la photo du panier
        if (Object.keys(item.formats).length === 0) {
          cart.splice(i, 1);
          // Mettre à jour l'UI de TOUTES les cartes avec ce filename
          document.querySelectorAll(`.photo-card[data-filename="${CSS.escape(item.filename)}"]`).forEach(card => {
            card.classList.remove('in-cart');
            const addBtn = card.querySelector('.photo-add-btn');
            const badge = card.querySelector('.photo-in-cart-badge');
            if (addBtn) addBtn.style.display = 'flex';
            if (badge) badge.style.display = 'none';
          });
        }
      }
    }
  }
}

function isInCart(filename) {
  // Fonction legacy - utiliser isInCartByPhotoId de préférence
  return cart.some(item => item.type === 'photo' && item.filename === filename);
}

function isInCartByPhotoId(photoId) {
  return cart.some(item => item.type === 'photo' && item.photo_id === photoId);
}

function updateCartUI() {
  const count = cart.length; // Nombre de photos/items
  const countEls = ['cart-count', 'cart-count-header'];
  
  countEls.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-block' : 'none';
    }
  });
  
  renderCartItems();
  
  // Rafraîchir le popup pack si ouvert
  const packModal = document.getElementById('pack-modal');
  if (packModal && packModal.classList.contains('active')) {
    refreshPackModalButtons();
    updatePackModalPrices();
  }
  
  // Mettre à jour le bandeau panier mobile si la fonction existe
  if (typeof updateMobileCartBar === 'function') {
    updateMobileCartBar();
  }
}

function toggleCart() {
  // Portail : déplacer le modal en enfant direct de <body>
  ensureModalInBody('cart-modal');
  const modal = document.getElementById('cart-modal');
  modal.classList.toggle('active');
  
  // Bloquer le scroll du body sur mobile quand le panier est ouvert
  // Sans position: fixed sur body (problème n°2)
  if (modal.classList.contains('active')) {
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    updateCartUI();
    
    // Ajouter l'événement de fermeture en cliquant en dehors (une seule fois)
    if (!modal.dataset.clickOutsideHandler) {
      modal.dataset.clickOutsideHandler = 'true';
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          toggleCart();
        }
      });
    }
  } else {
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
  }
}

async function renderCartItems() {
  const container = document.getElementById('cart-items');
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: #666;">${t('cart_empty')}</div>`;
    updateCartTotal();
    return;
  }

  const useEventApi = !API_BASE || API_BASE === 'null' || API_BASE === null;
  if (useEventApi) {
    const eventIds = [...new Set(cart.map(i => (i.event_id && String(i.event_id).trim()) || 'global'))];
    await Promise.all(eventIds.map(eid => ensureProductsForEvent(eid)));
  }

  let total = 0;
  const firstPhotoIndex = cart.findIndex(i => i.type === 'photo');

  cart.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cart-photo-row';
    
    if (item.type === 'photo') {
      // Affichage Photo - MÊME SYSTÈME QUE LA LIGHTBOX
      // Trouver la photo dans currentSearchResults en utilisant photoId (comme la lightbox)
      let photo = null;
      
      if (item.photo_id) {
        // Priorité 1 : chercher par photoId unique (comme la lightbox)
        photo = currentSearchResults.find(p => {
          const pFileId = p.file_id || p.id || null;
          const pEventId = p.event_id || p.contest || 'UNKNOWN';
          const pPhotoId = pFileId ? `${pEventId}-${pFileId}` : null;
          return pPhotoId && pPhotoId === item.photo_id;
        });
      }
      
      // Fallback : chercher par filename (comme la lightbox)
      if (!photo) {
        photo = currentSearchResults.find(p => {
          if (p.filename === item.filename) return true;
          const pBasename = p.filename ? p.filename.split('/').pop() : '';
          const itemBasename = item.filename ? item.filename.split('/').pop() : '';
          return pBasename && pBasename === itemBasename;
        });
      }
      
      // Si toujours pas trouvé, utiliser les données de l'item
      if (!photo) {
        console.warn('Photo non trouvée dans currentSearchResults, utilisation des données de l\'item:', item.photo_id);
        photo = {
          filename: item.filename,
          rider_name: item.rider_name || '',
          horse_name: item.horse_name || '',
          file_id: item.file_id || null,
          event_id: item.event_id || null
        };
      }
      
      // Utiliser les données de la photo normalisée (comme la lightbox)
      const filename = photo.filename || item.filename;
      const riderName = photo.rider_name || photo.cavalier || item.rider_name || '';
      const horseName = photo.horse_name || photo.cheval || item.horse_name || '';
      const fileId = photo.file_id || photo.id || item.file_id || null;
      const eventId = photo.event_id || photo.contest || item.event_id || null;
      
      // Sauvegarder dans l'item pour la prochaine fois
      item.filename = filename;
      item.rider_name = riderName;
      item.horse_name = horseName;
      item.file_id = fileId;
      item.event_id = eventId;
      
      // Construire le nom d'affichage
      let displayName = '';
      if (riderName && horseName && riderName !== horseName) {
        displayName = `${riderName} - ${horseName}`;
      } else if (riderName) {
        displayName = riderName;
      } else if (horseName) {
        displayName = horseName;
      } else {
        displayName = filename; // Fallback
      }
      
      // Calculer les totaux pour cette photo
      let photoTotal = 0;
      let formatsHtml = '';
      
      // Vérifier si cette photo est déjà dans un pack acheté
      const isInPack = cart.some(cartItem => {
        if (cartItem.type === 'pack') {
          // Vérifier si le pack contient cette photo
          const packPhotos = currentSearchResults.filter(p => {
            const photoRider = p.rider_name || p.cavalier || '';
            const photoHorse = p.horse_name || p.cheval || '';
            const displayName = (photoRider && photoHorse && photoRider !== photoHorse) 
              ? `${photoRider} - ${photoHorse}` 
              : (photoRider || photoHorse);
            return displayName === cartItem.rider_name;
          });
          return packPhotos.some(p => p.filename === item.filename);
        }
        return false;
      });
      
      // Calculer la quantité totale de chaque produit dans tout le panier (pour les règles de prix)
      const productTotals = {};
      // Calculer aussi la position de cette photo pour chaque produit (combien de photos avant celle-ci ont ce format)
      const productPositionBeforeThis = {};
      cart.forEach(cartItem => {
        if (cartItem.type === 'photo') {
          for (const [pid, q] of Object.entries(cartItem.formats)) {
            productTotals[pid] = (productTotals[pid] || 0) + q;
            // Si cette photo est avant la photo actuelle dans le panier, compter ses formats
            if (cartItem.filename !== item.filename) {
              productPositionBeforeThis[pid] = (productPositionBeforeThis[pid] || 0) + q;
            }
          }
        }
      });
      
      // Produits de l'événement de cette photo (prix selon l'event_id de la photo)
      const eventProducts = getProductsForEventId(eventId);
      const sortedProducts = eventProducts
        .filter(p => p.category !== 'pack')
        .sort((a, b) => {
          // Séparer impression et numérique
          const aIsImpression = a.category === 'impression';
          const bIsImpression = b.category === 'impression';
          if (aIsImpression && !bIsImpression) return -1;
          if (!aIsImpression && bIsImpression) return 1;
          // Dans la même catégorie, trier par cart_order (puis par id si cart_order identique)
          const aOrder = a.cart_order || a.id || 999;
          const bOrder = b.cart_order || b.id || 999;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.id || 0) - (b.id || 0);
        });
      
      // Séparer les produits en impression et numérique
      const impressionProducts = sortedProducts.filter(p => p.category === 'impression');
      const numericProducts = sortedProducts.filter(p => p.category === 'numérique');
      
      // Fonction pour générer le HTML d'un format
      const generateFormatHtml = (product) => {
        const qty = item.formats[product.id] || 0;
        const totalQtyInCart = productTotals[product.id] || 0;
        
        // Pour les formats numériques, max 1
        const isDigital = product.category === 'numérique';
        
        // Si le produit est numérique, vérifier si un pack dans le panier pour le même couple contient ce format
        const isBlockedByPack = isDigital ? isDigitalPhotoBlockedByPack(product.id, riderName, horseName) : false;
        
        // Vérifier si une impression de la même photo est dans le panier (pour appliquer le prix réduit)
        let hasPrintForSamePhoto = false;
        if (isDigital && product.reduced_price_with_print) {
          // Chercher dans le panier si une impression de la même photo existe
          hasPrintForSamePhoto = cart.some(cartItem => {
            if (cartItem.type === 'photo' && cartItem.filename === item.filename) {
              for (const [pid, qty] of Object.entries(cartItem.formats || {})) {
                const printProduct = getProductsForEventId(cartItem.event_id).find(p => p.id == pid);
                if (printProduct && printProduct.category === 'impression' && qty > 0) {
                  return true;
                }
              }
            }
            return false;
          });
        }

        // Calculer le prix actuel (de la prochaine photo à ajouter) et le prix suivant selon les règles de prix
        // Si c'est un produit numérique avec impression dans le panier, utiliser le prix réduit
        let basePrice = (isDigital && hasPrintForSamePhoto && product.reduced_price_with_print) 
          ? product.reduced_price_with_print 
          : product.price;
        let currentPrice = basePrice; // Prix de base
        let nextPrice = basePrice; // Par défaut, le prix suivant est le même que le prix de base
        
        // Parser la promo spéciale "X=Y" (ex: "3=10" → la 3ème photo coûte 10 €)
        let specialPromoPosition = null;
        let specialPromoPrice = null;
        if (product.special_promo_rule) {
          const match = product.special_promo_rule.match(/(\d+)\s*=\s*(\d+)/);
          if (match) {
            specialPromoPosition = parseInt(match[1]); // Position (ex: 3)
            specialPromoPrice = parseFloat(match[2]); // Prix pour cette position (ex: 10)
          }
        }
        
        const nextPhotoPosition = totalQtyInCart + 1;
        const followingPhotoPosition = totalQtyInCart + 2;
        
        // Définir getPriceForPosition avant de l'utiliser (accessible partout dans generateFormatHtml)
        let getPriceForPosition = null;
        let firstDefinedRank = 0;
        let lastDefinedPrice = basePrice;
        
        // Si produit numérique avec impression : le prix réduit avec impression prend le dessus sur les tarifs dégressifs
        const useReducedPrice = isDigital && hasPrintForSamePhoto && product.reduced_price_with_print;
        
        if (product.pricing_rules && typeof product.pricing_rules === 'object' && !useReducedPrice) {
          // Utiliser les tarifs dégressifs seulement si on n'a pas de prix réduit avec impression
          const rules = product.pricing_rules;
          const hasNumericKeys = Object.keys(rules).some(k => !isNaN(parseInt(k)));
          const hasDefault = 'default' in rules;
          
          if (hasNumericKeys || hasDefault) {
            // Trouver le premier et dernier rang avec dégressivité
            const numericKeys = Object.keys(rules)
              .filter(k => !isNaN(parseInt(k)))
              .map(k => parseInt(k))
              .sort((a, b) => a - b);
            firstDefinedRank = numericKeys.length > 0 ? numericKeys[0] : 0;
            const lastDefinedRank = numericKeys.length > 0 ? numericKeys[numericKeys.length - 1] : 0;
            const lastDefinedPriceBase = lastDefinedRank > 0 ? parseFloat(rules[lastDefinedRank.toString()]) : (hasDefault ? parseFloat(rules.default) : product.price);
            // Les tarifs dégressifs restent à leur valeur fixe, même avec reduced_price_with_print
            lastDefinedPrice = lastDefinedPriceBase;
            
            // Fonction pour obtenir le prix selon la position
            // Note: useReducedPrice est déjà vérifié avant d'entrer dans ce bloc, donc on n'a pas besoin de le vérifier ici
            // Mais on doit quand même vérifier useReducedPrice dans cette fonction pour être sûr
            getPriceForPosition = (position) => {
              // Si produit numérique avec impression : le prix réduit avec impression prend le dessus sur TOUT
              if (useReducedPrice) {
                return product.reduced_price_with_print;
              }
              // Vérifier si cette position correspond à la promo spéciale (ex: "3=10")
              if (specialPromoPosition && position === specialPromoPosition) {
                return specialPromoPrice;
              }
              if (rules[position.toString()]) {
                const rulePrice = parseFloat(rules[position.toString()]);
                // Les tarifs dégressifs restent à leur valeur fixe, même avec reduced_price_with_print
                return rulePrice;
              }
              // Pas de prix défini pour ce rang
              if (position < firstDefinedRank) {
                // Avant la première dégressivité : utiliser le prix de base (ou prix réduit si applicable)
                return basePrice;
              } else {
                // Après la dernière dégressivité : utiliser le dernier prix dégressif
                return lastDefinedPrice;
              }
            };
            
            // Prix de la prochaine photo à ajouter
            // Vérifier useReducedPrice AVANT d'appeler getPriceForPosition pour être sûr
            if (useReducedPrice) {
              currentPrice = product.reduced_price_with_print;
              nextPrice = product.reduced_price_with_print;
            } else {
              currentPrice = getPriceForPosition(nextPhotoPosition);
              // Prix de la photo suivante (celle d'après)
              nextPrice = getPriceForPosition(followingPhotoPosition);
            }
          }
        } else {
          // Pas de pricing_rules ou prix réduit avec impression : utiliser basePrice ou specialPromoPrice
          if (useReducedPrice) {
            // Prix réduit avec impression prend le dessus sur TOUT (promo spéciale et tarifs dégressifs)
            currentPrice = product.reduced_price_with_print;
            nextPrice = product.reduced_price_with_print;
          } else if (specialPromoPosition && specialPromoPrice !== null) {
            // Pas de pricing_rules, mais vérifier la promo spéciale "X=Y" (ex: "3=10")
            // Seulement si on n'a pas de prix réduit avec impression
            // Vérifier si la prochaine photo correspond à la position de la promo
            if (nextPhotoPosition === specialPromoPosition) {
              currentPrice = specialPromoPrice;
            } else {
              currentPrice = basePrice;
            }
            // Vérifier si la photo suivante correspond à la position de la promo
            if (followingPhotoPosition === specialPromoPosition) {
              nextPrice = specialPromoPrice;
            } else {
              nextPrice = basePrice;
            }
          }
        }
        
        if (qty > 0) {
          // Si bloqué par pack, le prix est 0
          let actualPrice = 0;
          if (!isBlockedByPack) {
            // Si produit numérique avec impression : utiliser le prix réduit avec impression (prend le dessus sur les tarifs dégressifs)
            if (useReducedPrice) {
              actualPrice = product.reduced_price_with_print;
            } else {
              // Calculer la position de cette photo pour ce format (combien de photos avant + 1)
              const positionBeforeThis = productPositionBeforeThis[product.id] || 0;
              const thisPhotoPosition = positionBeforeThis + 1;
              
              // Utiliser getPriceForPosition si disponible, sinon utiliser basePrice ou specialPromoPrice
              if (getPriceForPosition) {
                actualPrice = getPriceForPosition(thisPhotoPosition);
              } else {
                // Pas de pricing_rules : utiliser basePrice ou specialPromoPrice
                if (specialPromoPosition && thisPhotoPosition === specialPromoPosition) {
                  actualPrice = specialPromoPrice;
                } else {
                  actualPrice = basePrice;
                }
              }
            }
          }
          photoTotal += actualPrice * qty;
        }

        const displayPrice = isBlockedByPack ? 0 : currentPrice;
        const isFree = displayPrice === 0;
        
        return `
          <div class="cart-format-item">
            <div class="cart-format-name-wrapper">
            <div class="cart-format-name">${product.name}</div>
              ${isBlockedByPack ? '<div style="color: #27ae60; font-size: 0.85em; margin-top: 4px;">' + t('included_in_pack') + '</div>' : ''}
              ${!isDigital && totalQtyInCart > 0 && !isBlockedByPack ? `
                <div style="color: ${isFree ? '#27ae60' : '#2d3561'}; font-size: 0.85em; margin-top: 6px; font-weight: ${isFree ? '700' : '400'};">
                  ${isFree ? t('next_photo_free') : t('next_photo_text') + ' ' + formatPrice(displayPrice)}
                </div>
              ` : ''}
            </div>
            <div class="cart-format-controls">
              ${qty > 0 ? `
                  ${isDigital ? `
                      <button class="cart-btn-remove-format" onclick="updateCartFormat('${item.filename}', ${product.id}, -1)" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">${t('cart_remove_btn')}</button>
                  ` : `
                      <div class="cart-qty-controls">
                        <button class="cart-btn-qty" onclick="updateCartFormat('${item.filename}', ${product.id}, -1)">-</button>
                        <span class="cart-qty-value">${qty}</span>
                        <button class="cart-btn-qty" onclick="updateCartFormat('${item.filename}', ${product.id}, 1)">+</button>
                      </div>
                  `}
              ` : `
                  <button class="cart-btn-add-format" onclick="updateCartFormat('${item.filename}', ${product.id}, 1)" ${isBlockedByPack ? 'style="opacity: 0.6; cursor: not-allowed;" disabled' : ''}>${isFree ? t('add_free') : t('add_for_price') + ' ' + formatPrice(displayPrice)}</button>
              `}
            </div>
          </div>
        `;
      };
      
      // Générer les sections séparées
      let impressionHtml = '';
      if (impressionProducts.length > 0) {
        impressionHtml = '<div style="margin-bottom: 10px;"><div class="cart-format-section-title">' + t('paper_formats_title') + '</div>';
        impressionProducts.forEach(product => {
          impressionHtml += generateFormatHtml(product);
        });
        impressionHtml += '</div>';
      }
      
      let numericHtml = '';
      if (numericProducts.length > 0) {
        numericHtml = '<div><div class="cart-format-section-title">' + t('digital_formats_title') + '</div>';
        numericProducts.forEach(product => {
          numericHtml += generateFormatHtml(product);
        });
        numericHtml += '</div>';
      }
      
      formatsHtml = impressionHtml + numericHtml;

      const applyAllBtnHtml = (index === firstPhotoIndex) ? `
        <div style="margin-bottom: 12px;">
          <button
            onclick="applyFirstPhotoChoiceToAll('${filename}')"
            style="width: 100%; padding: 10px 12px; background: #f1f5f9; color: #1a1a2e; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; font-weight: 700;"
          >
            ${t('apply_choice_all_photos')}
          </button>
        </div>
      ` : '';
      
      // Construire l'URL de l'image - MÊME SYSTÈME QUE LA LIGHTBOX
      // Utiliser directement imageUrl/previewUrl de la photo normalisée (comme la lightbox)
      let imageUrl = photo.previewUrl || photo.imageUrl || null;
      
      // Si pas d'URL directe, construire avec file_id et event_id (comme la lightbox)
      if (!imageUrl) {
        imageUrl = getPhotoUrlFromFilename(filename, null, null, fileId, eventId, 'preview');
      }
      
      // Fallback : essayer avec les données de l'item
      let fallbackUrl = imageUrl;
      if (!imageUrl && fileId && eventId) {
        fallbackUrl = getPhotoUrlFromFilename(filename, null, null, fileId, eventId, 'preview');
      }
      
      row.innerHTML = `
        <div class="cart-photo-container">
            <img src="${imageUrl}" class="cart-photo-large" onclick="openLightbox('${filename}', null, true)" onload="detectCartPhotoOrientation(this)" onerror="if(this.src !== '${fallbackUrl}') { this.onerror=null; this.src='${fallbackUrl}'; } else { this.style.display='none'; }">
            <div class="cart-photo-info" style="font-weight: 600; color: #2d3561; margin-top: 8px;">${displayName}</div>
            <button onclick="buyPackForPhoto('${riderName.replace(/'/g, "\\'")}', '${horseName.replace(/'/g, "\\'")}')" style="margin-top: 8px; padding: 8px 16px; background: #2d3561; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85em; font-weight: 600; width: 100%;">
                📦 ${t('buy_pack_btn')}
            </button>
            <button onclick="removePhotoFromCart('${item.photo_id || item.filename}')" style="margin-top: 8px; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85em; font-weight: 600; width: 100%;">
                ${t('cart_remove_btn')}
            </button>
        </div>
        <div class="cart-formats-container">
            ${applyAllBtnHtml}
            ${formatsHtml}
        </div>
      `;
      
    } else if (item.type === 'pack') {
      const eventProductsPack = getProductsForEventId(item.event_id || 'global');
      const product = eventProductsPack.find(p => p.id === item.product_id);
      if (!product) return;
      
      // Déterminer le titre à afficher (Pack en gros, puis Cheval/Cavalier en petit)
      const title = product.name; // Pack HD en gros
      const subtitle = item.rider_name || item.search || ''; // AMAR DOROTHEE - NANUK en petit
      
      // Utiliser les photos stockées dans l'item du panier, ou les récupérer depuis currentSearchResults
      let packPhotos = [];
      if (item.packPhotos && Array.isArray(item.packPhotos) && item.packPhotos.length > 0) {
        // Utiliser les photos stockées dans l'item
        packPhotos = item.packPhotos;
      } else {
        // Fallback : récupérer depuis currentSearchResults
        packPhotos = currentSearchResults.filter(p => {
          const photoRider = p.rider_name || p.cavalier || '';
          const photoHorse = p.horse_name || p.cheval || '';
          const displayName = (photoRider && photoHorse && photoRider !== photoHorse) 
            ? `${photoRider} - ${photoHorse}` 
            : (photoRider || photoHorse);
          return displayName === item.rider_name;
        });
        // Sauvegarder les photos dans l'item pour la prochaine fois
        if (packPhotos.length > 0) {
          item.packPhotos = packPhotos.map(p => ({
            filename: p.filename,
            rider_name: p.rider_name || p.cavalier || '',
            horse_name: p.horse_name || p.cheval || ''
          }));
        }
      }
      
      // Initialiser l'index de photo si pas déjà fait
      if (!item.currentPhotoIndex) {
        item.currentPhotoIndex = 0;
      }
      
      // Obtenir la photo actuelle
      const currentPhoto = packPhotos[item.currentPhotoIndex] || packPhotos[0];
      const imageUrl = currentPhoto ? getPhotoUrlFromFilename(currentPhoto.filename || currentPhoto) : '';
      const totalPhotos = packPhotos.length;
      
      // Afficher combien de photos sur le total
      const overlayText = totalPhotos > 1 
        ? `+ ${totalPhotos - 1} ${t('pack_other_photos')}` 
        : `${totalPhotos} ${totalPhotos > 1 ? t('pack_photo_plural') : t('pack_photo_singular')}`;
      
      row.innerHTML = `
        <div class="cart-photo-container">
            <div style="position: relative; width: 100%; cursor: pointer;">
                ${imageUrl ? `
                  <img src="${imageUrl}" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 8px;" onclick="openPackLightbox(${index}, event)" onerror="this.style.display='none';">
                  ${totalPhotos > 1 ? `
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(45, 53, 97, 0.9); color: white; padding: 10px; border-radius: 0 0 8px 8px; font-weight: 600; font-size: 0.95em; text-align: center; cursor: pointer;" onclick="openPackLightbox(${index}, event)">
                      📦 ${overlayText}
                    </div>
                  ` : ''}
                ` : `
            <div style="width: 100%; aspect-ratio: 4/3; background: #e0e7ff; display: flex; align-items: center; justify-content: center; font-size: 50px; border-radius: 8px;">📦</div>
                `}
            </div>
        </div>
        <div class="cart-formats-container">
            <div class="cart-format-item">
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 1.1em; color: #2d3561;">${title}</div>
                    ${subtitle ? `<div style="color: #666; font-size: 0.9em; margin-top: 4px;">${subtitle}</div>` : ''}
                </div>
                <div class="cart-format-controls">
                    <button class="cart-btn-remove-format" onclick="removeCartItem(${index})" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">${t('cart_remove_btn')}</button>
                </div>
            </div>
        </div>
      `;
    }
    
    container.appendChild(row);
  });
  
  updateCartTotal();
}

function updateCartFormat(filename, productId, change) {
  const item = cart.find(i => i.type === 'photo' && i.filename === filename);
  if (!item) return;
  
  const product = products.find(p => p.id == productId);
  if (!product) return;
  
  // Si on ajoute un format numérique (change > 0), vérifier l'exclusion MD/HD
  if (change > 0 && product.category === 'numérique') {
    const productEmailDelivery = product.email_delivery || false;
    
    // Retirer tous les formats numériques avec un email_delivery différent pour la même photo
    Object.keys(item.formats).forEach(pid => {
      const otherProduct = products.find(p => p.id == pid);
      if (otherProduct && otherProduct.category === 'numérique') {
        const otherEmailDelivery = otherProduct.email_delivery || false;
        if (otherEmailDelivery !== productEmailDelivery) {
          // Format incompatible, le retirer
          delete item.formats[pid];
        }
      }
    });
  }
  
  if (!item.formats[productId]) item.formats[productId] = 0;
  item.formats[productId] += change;
  
  if (item.formats[productId] <= 0) {
    delete item.formats[productId];
  }
  
  renderCartItems();
}

function updateCartPack(index, change) {
  if (cart[index]) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
      removeCartItem(index);
  } else {
      renderCartItems();
    }
  }
}

function removeCartItem(index) {
  const item = cart[index];
  if (item.type === 'photo') {
    removePhotoFromCart(item.photo_id || item.filename);
    } else {
    cart.splice(index, 1);
    updateCartUI();
  }
}

window.openPackLightbox = function(index, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  const item = cart[index];
  if (!item || item.type !== 'pack') return;
  
  // Utiliser les photos stockées dans l'item du panier, ou les récupérer depuis currentSearchResults
  let packPhotos = [];
  if (item.packPhotos && Array.isArray(item.packPhotos) && item.packPhotos.length > 0) {
    // Utiliser les photos stockées dans l'item
    packPhotos = item.packPhotos;
  } else {
    // Fallback : récupérer depuis currentSearchResults
    packPhotos = currentSearchResults.filter(p => {
      const photoRider = p.rider_name || p.cavalier || '';
      const photoHorse = p.horse_name || p.cheval || '';
      const displayName = (photoRider && photoHorse && photoRider !== photoHorse) 
        ? `${photoRider} - ${photoHorse}` 
        : (photoRider || photoHorse);
      return displayName === item.rider_name;
    });
    // Sauvegarder les photos dans l'item pour la prochaine fois
    if (packPhotos.length > 0) {
      item.packPhotos = packPhotos.map(p => ({
        filename: p.filename,
        rider_name: p.rider_name || p.cavalier || '',
        horse_name: p.horse_name || p.cheval || ''
      }));
    }
  }
  
  if (packPhotos.length === 0) return;
  
  // Ouvrir le lightbox avec les photos du pack
  lightboxPhotos = packPhotos.map(photo => {
    const filename = photo.filename || photo;
    return {
      filename: filename,
      imageUrl: photo.previewUrl || photo.imageUrl || getPhotoUrlFromFilename(filename),
      displayName: (typeof filename === 'string' ? filename.split('/').pop() : '') || '',
      rider_name: photo.rider_name,
      horse_name: photo.horse_name
    };
  });
  currentLightboxIndex = 0;
  
  const lightbox = document.getElementById('lightbox');
  
  // Masquer le bouton d'ajout (les photos sont déjà dans le pack)
  const addBtn = document.getElementById('lightbox-add-btn');
  if (addBtn) addBtn.style.display = 'none';
  
  // Mettre le lightbox au-dessus du panier
  lightbox.style.zIndex = '10000';
  lightbox.dataset.fromPack = 'true';
  
  // Afficher la première photo
  updateLightboxContent();
  lightbox.classList.add('active');
}

function updateCartTotal() {
  let total = 0;
  const summaryLines = [];
  const productPositions = {}; // position globale par productId (pour règles dégressives)

  cart.forEach(item => {
    const eventProducts = getProductsForEventId(item.event_id || 'global');
    if (item.type === 'photo') {
      for (const [pid, qty] of Object.entries(item.formats || {})) {
        const product = eventProducts.find(p => p.id == pid);
        if (!product || !qty) continue;
        let hasPrintForSamePhoto = false;
        if (product.category === 'numérique' && product.reduced_price_with_print) {
          hasPrintForSamePhoto = cart.some(ci => ci.type === 'photo' && ci.filename === item.filename && Object.keys(ci.formats || {}).some(printPid => {
            const pp = getProductsForEventId(ci.event_id).find(p => p.id == printPid);
            return pp && pp.category === 'impression' && (ci.formats[printPid] || 0) > 0;
          }));
        }
        let lineTotal = 0;
        for (let i = 0; i < qty; i++) {
          productPositions[pid] = (productPositions[pid] || 0) + 1;
          lineTotal += getPriceForPosition(product, productPositions[pid], hasPrintForSamePhoto);
        }
        total += lineTotal;
        summaryLines.push({ name: product.name_fr || product.name, qty, lineTotal });
      }
    } else if (item.type === 'pack') {
      const product = eventProducts.find(p => p.id == item.product_id);
      if (!product) return;
      const packTotal = (product.price || 0) * (item.quantity || 1);
      total += packTotal;
      summaryLines.push({ name: product.name_fr || product.name, qty: item.quantity || 1, lineTotal: packTotal });
    }
  });

  const summaryHtml = summaryLines.map(l => `
    <div class="summary-line">
      <span>${l.qty} x ${l.name}</span>
      <span>${formatPrice(l.lineTotal)}</span>
    </div>
  `).join('');
  document.getElementById('cart-summary-details').innerHTML = summaryHtml;
  document.getElementById('cart-total').textContent = formatPrice(total);
  
  const cancelBtn = document.getElementById('cancel-order-btn');
  const validateBtn = document.getElementById('validate-cart-btn');
  const saveCartBtn = document.getElementById('save-cart-btn');
  
  if (cart.length > 0) {
      cancelBtn.style.display = 'block';
      validateBtn.style.display = 'block';
      if (saveCartBtn) saveCartBtn.style.display = 'block';
  } else {
      cancelBtn.style.display = 'none';
      validateBtn.style.display = 'none';
      if (saveCartBtn) saveCartBtn.style.display = 'none';
  }
  
  // Gérer l'annulation
  cancelBtn.onclick = async () => {
    const confirmed = await showCustomConfirm(
      t('cancel_confirm') || 'Voulez-vous vraiment vider le panier ?',
      'warning',
      'Annuler la commande'
    );
    if (confirmed) {
        // Recharger la page pour réinitialiser complètement l'interface
        location.reload();
    }
  };
}

// Lightbox
let lightboxPhotos = [];
let currentLightboxIndex = 0;

function openLightbox(startFilename, photosList = null, fromCart = false) {
  ensureModalInBody('lightbox');
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  const addBtn = document.getElementById('lightbox-add-btn');
  const checkBadge = document.getElementById('lightbox-check');
  
  // Si ouvert depuis le panier, on ne navigue que dans les photos du panier (pas les packs)
  if (fromCart) {
      // Extraire uniquement les photos (type 'photo'), pas les packs
      const cartPhotos = cart
        .filter(i => i.type === 'photo')
        .map(i => {
          const photoData = currentSearchResults.find(p => {
            if (p.filename === i.filename) return true;
            const pBasename = p.filename.split('/').pop();
            const iBasename = i.filename.split('/').pop();
            return pBasename === iBasename;
          });
          const fileId = i.file_id || (photoData ? (photoData.file_id || photoData.id || null) : null);
          const eventId = i.event_id || (photoData ? (photoData.event_id || photoData.contest || null) : null);
          const imageUrl = photoData?.previewUrl || photoData?.imageUrl || getPhotoUrlFromFilename(i.filename, null, null, fileId, eventId, 'preview');
          return {
            filename: i.filename,
            imageUrl: imageUrl,
            displayName: i.filename.split('/').pop(),
            rider_name: i.rider_name || (photoData ? (photoData.rider_name || photoData.cavalier || '') : ''),
            horse_name: i.horse_name || (photoData ? (photoData.horse_name || photoData.cheval || '') : ''),
            file_id: fileId,
            event_id: eventId
          };
        });
      
      lightboxPhotos = cartPhotos;
      lightbox.dataset.fromCart = 'true';
      lightbox.dataset.fromPack = 'false';
      // Passer le lightbox au-dessus du panier
      lightbox.style.zIndex = '12000';
  } else {
      // Si photosList est fourni, l'utiliser, sinon utiliser currentSearchResults
      const sourcePhotos = photosList || currentSearchResults || [];
      lightboxPhotos = sourcePhotos.map(photo => ({
        filename: photo.filename,
        imageUrl: photo.previewUrl || photo.imageUrl || getPhotoUrlFromFilename(photo.filename),
        displayName: photo.displayName || (photo.filename.split('/').pop() || ''),
        rider_name: photo.rider_name || photo.cavalier || '',
        horse_name: photo.horse_name || photo.cheval || ''
      }));
      lightbox.dataset.fromCart = 'false';
      lightbox.dataset.fromPack = 'false';
      // Remettre le z-index normal
      lightbox.style.zIndex = '';
  }
  
  // Trouver l'index de la photo à ouvrir (comparaison flexible mais précise)
  currentLightboxIndex = lightboxPhotos.findIndex(p => {
    // Comparaison exacte d'abord
    if (p.filename === startFilename) return true;
    // Comparaison par nom de fichier (sans le chemin)
    const pBasename = p.filename.split('/').pop();
    const startBasename = startFilename.split('/').pop();
    if (pBasename && startBasename && pBasename === startBasename) return true;
    return false;
  });
  
  // Si toujours pas trouvé, chercher par inclusion (fallback)
  if (currentLightboxIndex === -1) {
    currentLightboxIndex = lightboxPhotos.findIndex(p => {
      return p.filename.includes(startFilename) || startFilename.includes(p.filename);
    });
  }
  
  // Si toujours pas trouvé, utiliser le premier
  if (currentLightboxIndex === -1) {
    console.warn('Photo non trouvée dans lightboxPhotos, utilisation de la première:', startFilename, 'Disponibles:', lightboxPhotos.map(p => p.filename));
    currentLightboxIndex = 0;
  } else {
    console.log('✅ Lightbox ouverte sur index:', currentLightboxIndex, 'pour:', startFilename);
  }
  
  updateLightboxContent();
  lightbox.classList.add('active');
}

function updateLightboxContent() {
  const photo = lightboxPhotos[currentLightboxIndex];
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  const addBtn = document.getElementById('lightbox-add-btn');
  const lightbox = document.getElementById('lightbox');
  const imageContainer = document.querySelector('.lightbox-image-container');
  
  const previewUrl = photo.imageUrl || getPhotoUrlFromFilename(photo.filename);
  
  // Détecter l'orientation après chargement de l'image
  img.onload = function() {
    if (img.naturalWidth && img.naturalHeight) {
      const isVertical = img.naturalHeight > img.naturalWidth;
      if (imageContainer) {
        if (isVertical) {
          imageContainer.classList.add('lightbox-vertical');
          imageContainer.classList.remove('lightbox-horizontal');
        } else {
          imageContainer.classList.add('lightbox-horizontal');
          imageContainer.classList.remove('lightbox-vertical');
        }
      }
    }
  };
  
  // Charger l'image après avoir défini le handler onload
  img.src = previewUrl;
  
  // Si l'image est déjà chargée (cache), déclencher manuellement
  if (img.complete && img.naturalWidth && img.naturalHeight) {
    img.onload();
  }
  
  // Nom en bas
  caption.textContent = photo.filename.split('/').pop();
  
  // Si on est dans un pack, masquer le bouton d'ajout
  if (lightbox.dataset.fromPack === 'true') {
    if (addBtn) addBtn.style.display = 'none';
  } else {
  // État panier - changer le texte et le style du bouton
    if (addBtn) addBtn.style.display = 'block';
    
  if (isInCart(photo.filename)) {
      addBtn.textContent = 'Retirer du panier';
      addBtn.classList.add('in-cart');
  } else {
      addBtn.textContent = 'Ajouter au panier';
      addBtn.classList.remove('in-cart');
    }
  }
}

function navigateLightbox(dir) {
  const newIndex = currentLightboxIndex + dir;
  if (newIndex >= 0 && newIndex < lightboxPhotos.length) {
    currentLightboxIndex = newIndex;
    updateLightboxContent();
  }
}

function toggleCurrentLightboxPhoto() {
  const lightbox = document.getElementById('lightbox');
  
  // Si on visualise un pack, ne pas permettre d'ajouter/retirer les photos individuellement
  if (lightbox.dataset.fromPack === 'true') {
    return;
  }
  
  const photo = lightboxPhotos[currentLightboxIndex];
  if (photo) {
      const filename = photo.filename;
      // Construire le photoId unique pour cette photo
      const fileId = photo.file_id || photo.id || null;
      const eventId = photo.event_id || photo.contest || 'UNKNOWN';
      const photoId = fileId ? `${eventId}-${fileId}` : filename;
      
      if (isInCartByPhotoId(photoId)) {
          // Retirer du panier
          removePhotoFromCart(photoId);
      } else {
          // Ajouter au panier - récupérer rider_name et horse_name
          const photoData = lightboxPhotos[currentLightboxIndex];
          const riderName = photoData ? (photoData.rider_name || photoData.cavalier || '') : '';
          const horseName = photoData ? (photoData.horse_name || photoData.cheval || '') : '';
          const eventIdData = photoData ? (photoData.event_id || photoData.contest || null) : null;
          const fileIdData = photoData ? (photoData.file_id || photoData.id || null) : null;
          
          cart.push({
              type: 'photo',
              photo_id: photoId, // ID unique de la photo
              filename: filename,
              formats: {},
              rider_name: riderName,
              horse_name: horseName,
              event_id: eventIdData,
              file_id: fileIdData
          });
          // Mettre à jour l'UI de la carte correspondante (par photoId unique)
          const card = document.querySelector(`.photo-card[data-photo-id="${CSS.escape(photoId)}"]`);
          if (card) {
            card.classList.add('in-cart');
            const addBtn = card.querySelector('.photo-add-btn');
            const badge = card.querySelector('.photo-in-cart-badge');
            if (addBtn) addBtn.style.display = 'none';
            if (badge) badge.style.display = 'flex';
          }
          updateCartUI();
      }
      updateLightboxContent();
  }
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const addBtn = document.getElementById('lightbox-add-btn');
  
  lightbox.classList.remove('active');
  
  // Réinitialiser le bouton d'ajout
  if (addBtn) addBtn.style.display = 'block';
  
  // Si on vient du panier ou d'un pack, on rouvre le panier
  if (lightbox.dataset.fromCart === 'true' || lightbox.dataset.fromPack === 'true') {
      const cartModal = document.getElementById('cart-modal');
      if (!cartModal.classList.contains('active')) {
          cartModal.classList.add('active');
      }
  }
  
  lightbox.style.zIndex = '';

  // Réinitialiser les flags
  lightbox.dataset.fromCart = 'false';
  lightbox.dataset.fromPack = 'false';
}

// Packs
async function handleBuyPack() {
  if (!currentSearch || currentSearch.length < 2) {
    await showCustomAlert(t('pack_search_first'), 'warning', t('search_required_title'));
    return;
  }
  
  const packProducts = products.filter(p => p.category === 'pack');
  
  if (packProducts.length === 0) {
    await showCustomAlert('Aucun pack disponible', 'info', 'Information');
    return;
  }
  
  // Extraire tous les couples cavalier/cheval uniques depuis les résultats de recherche
  const couples = new Map(); // Utiliser une Map pour éviter les doublons
  
  if (currentSearchResults && currentSearchResults.length > 0) {
    currentSearchResults.forEach(photo => {
      const riderName = photo.rider_name || photo.cavalier || '';
      const horseName = photo.horse_name || photo.cheval || '';
      
      if (riderName || horseName) {
        // Créer une clé unique pour le couple
        const key = `${riderName}|${horseName}`;
        if (!couples.has(key)) {
          couples.set(key, {
            rider: riderName,
            horse: horseName,
            displayName: horseName && horseName !== riderName ? `${riderName} - ${horseName}` : riderName || horseName
          });
        }
      }
    });
  }
  
  // Si aucun couple trouvé, utiliser la recherche
  if (couples.size === 0) {
    couples.set(currentSearch, {
      rider: currentSearch,
      horse: '',
      displayName: currentSearch
    });
  }
  
  // Afficher la popup avec les packs et les couples
  showPackModal(packProducts, Array.from(couples.values()));
}

// Fonction pour calculer le prix d'un pack en fonction du nombre déjà dans le panier
function calculatePackPrice(pack, displayName) {
  // Compter combien de packs de ce type sont déjà dans le panier
  const packsInCart = cart.filter(item => 
    item.type === 'pack' && item.product_id === pack.id
  );
  const totalPacksInCart = packsInCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  // Le prochain pack sera à la position totalPacksInCart + 1
  const nextPackPosition = totalPacksInCart + 1;
  
  let calculatedPrice = pack.price;
  
  // Si le pack a des pricing_rules, calculer le prix avec dégressivité
  if (pack.pricing_rules && typeof pack.pricing_rules === 'object') {
    const rules = pack.pricing_rules;
    const hasNumericKeys = Object.keys(rules).some(k => !isNaN(parseInt(k)));
    const hasDefault = 'default' in rules;
    
    if (hasNumericKeys || hasDefault) {
      const defaultPrice = parseFloat(rules.default || pack.price);
      const numericKeys = Object.keys(rules)
        .filter(k => !isNaN(parseInt(k)))
        .map(k => parseInt(k))
        .sort((a, b) => a - b);
      const firstDefinedRank = numericKeys.length > 0 ? numericKeys[0] : 0;
      const lastDefinedRank = numericKeys.length > 0 ? numericKeys[numericKeys.length - 1] : 0;
      const lastDefinedPrice = lastDefinedRank > 0 ? parseFloat(rules[lastDefinedRank.toString()]) : defaultPrice;
      
      // Obtenir le prix pour la position du prochain pack
      const rankPrice = rules[nextPackPosition.toString()];
      if (rankPrice !== undefined) {
        calculatedPrice = parseFloat(rankPrice);
      } else if (nextPackPosition < firstDefinedRank) {
        // Avant la première dégressivité : utiliser le prix de base
        calculatedPrice = pack.price;
      } else {
        // Après la dernière dégressivité : utiliser le dernier prix dégressif
        calculatedPrice = lastDefinedPrice;
      }
    }
  }
  
  return calculatedPrice;
}

// Fonction pour mettre à jour les prix dans le modal des packs
function updatePackModalPrices() {
  const packList = document.getElementById('pack-list');
  if (!packList) return;
  
  const packCards = packList.querySelectorAll('[data-pack-id]');
  packCards.forEach(card => {
    const packId = parseInt(card.dataset.packId);
    const displayName = card.dataset.displayName;
    
    const pack = products.find(p => p.id === packId);
    if (!pack) return;
    
    // Vérifier si le pack est dans le panier
    const cartIndex = isPackInCart(packId, displayName);
    let displayPrice;
    
    // Si le pack est dans le panier, utiliser le prix stocké au moment de l'ajout
    // Sinon, calculer le prix dynamiquement
    if (cartIndex !== -1 && cart[cartIndex].packPrice !== undefined) {
      displayPrice = cart[cartIndex].packPrice;
    } else {
      displayPrice = calculatePackPrice(pack, displayName);
    }
    
    const priceElement = card.querySelector('.pack-price');
    if (priceElement) {
      priceElement.textContent = formatPrice(displayPrice);
    }
  });
}

// Fonction pour vérifier si un pack est dans le panier
function isPackInCart(productId, displayName) {
  return cart.findIndex(item => 
    item.type === 'pack' && 
    item.product_id === productId && 
    item.rider_name === displayName
  );
}

function showPackModal(packProducts, couples) {
  const modal = document.getElementById('pack-modal');
  const packList = document.getElementById('pack-list');
  
  if (!modal || !packList) {
    console.error('Pack modal elements not found');
    showCustomAlert('Erreur d\'affichage de la popup. Veuillez recharger la page.', 'error', 'Erreur');
    return;
  }
  
  packList.innerHTML = '';
  
  // Pour chaque couple, afficher tous les packs disponibles
  couples.forEach(couple => {
    packProducts.forEach(pack => {
      const packCard = document.createElement('div');
      packCard.style.cssText = 'border: 2px solid #2d3561; border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; align-items: center; background: white;';
      packCard.setAttribute('data-pack-id', pack.id);
      packCard.setAttribute('data-display-name', couple.displayName);
      
      // Construire l'affichage cavalier/cheval
      let coupleInfo = '';
      if (couple.rider && couple.horse && couple.rider !== couple.horse) {
        coupleInfo = `<p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${t('pack_modal_rider')} ${couple.rider}</p>
                      <p style="margin: 0; color: #666; font-size: 14px;">${t('pack_modal_horse')} ${couple.horse}</p>`;
      } else if (couple.rider) {
        coupleInfo = `<p style="margin: 0; color: #666; font-size: 14px;">${t('pack_modal_rider')} ${couple.rider}</p>`;
      } else if (couple.horse) {
        coupleInfo = `<p style="margin: 0; color: #666; font-size: 14px;">${t('pack_modal_horse')} ${couple.horse}</p>`;
      }
      
      // Vérifier si le pack est déjà dans le panier
      const cartIndex = isPackInCart(pack.id, couple.displayName);
      const isInCart = cartIndex !== -1;
      
      // Si le pack est dans le panier, utiliser le prix stocké au moment de l'ajout
      // Sinon, calculer le prix dynamiquement en fonction des packs déjà dans le panier
      let displayPrice;
      if (isInCart && cart[cartIndex].packPrice !== undefined) {
        displayPrice = cart[cartIndex].packPrice;
      } else {
        displayPrice = calculatePackPrice(pack, couple.displayName);
      }
      
      // Déterminer le texte et le style du bouton
      const buttonText = isInCart ? t('cart_remove_btn') : t('pack_modal_add_to_cart');
      const buttonStyle = isInCart 
        ? 'padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;'
        : 'padding: 10px 20px; background: #2d3561; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;';
      
      packCard.innerHTML = `
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 24px;">📦</span>
            <h3 style="margin: 0; color: #2d3561; font-size: 18px;">${pack.name}</h3>
          </div>
          ${coupleInfo}
        </div>
        <div style="text-align: right;">
          <div class="pack-price" style="font-size: 24px; font-weight: bold; color: #2d3561; margin-bottom: 10px;">${formatPrice(displayPrice)}</div>
          <button class="pack-cart-btn" data-pack-id="${pack.id}" data-display-name="${couple.displayName.replace(/'/g, "\\'")}" style="${buttonStyle}" onclick="togglePackInCart(${pack.id}, '${couple.displayName.replace(/'/g, "\\'")}')">
            ${buttonText}
          </button>
        </div>
      `;
      
      packList.appendChild(packCard);
    });
  });
  
  // S'assurer que le modal pack est au-dessus du modal panier
  modal.style.zIndex = '10001';
  modal.classList.add('active');
  
  // Ajouter l'événement de fermeture en cliquant en dehors
  if (!modal.dataset.clickOutsideHandler) {
    modal.dataset.clickOutsideHandler = 'true';
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closePackModal();
      }
    });
  }
}

function closePackModal() {
  const modal = document.getElementById('pack-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Fonction pour retirer un pack du panier
function removePackFromCart(productId, displayName) {
  const packCouple = normalizeCoupleName(displayName, '');
  
  // Retirer le pack du panier
  cart = cart.filter(item => {
    if (item.type === 'pack' && item.product_id === productId) {
      const itemCouple = normalizeCoupleName(item.rider_name || '', '');
      return !isSameCouple(packCouple.rider, packCouple.horse, itemCouple.rider, itemCouple.horse);
    }
    return true;
  });
  
  updateCartUI();
  updatePackModalPrices();
  refreshPackModalButtons();
  showMessage('Pack retiré du panier', 'success');
}

// Fonction pour retirer les packs exclus (MD/HD) pour le même couple
function removeExcludedPacks(productId, displayName) {
  const packProduct = products.find(p => p.id === productId);
  if (!packProduct || packProduct.category !== 'pack') return;
  
  const packEmailDelivery = packProduct.email_delivery || false;
  const packCouple = normalizeCoupleName(displayName, '');
  
  // Retirer tous les packs du même couple avec un email_delivery différent
  cart = cart.filter(item => {
    if (item.type === 'pack') {
      const itemCouple = normalizeCoupleName(item.rider_name || '', '');
      if (isSameCouple(packCouple.rider, packCouple.horse, itemCouple.rider, itemCouple.horse)) {
        const itemProduct = getProductsForEventId(item.event_id || 'global').find(p => p.id === item.product_id);
        if (itemProduct && itemProduct.category === 'pack') {
          const itemEmailDelivery = itemProduct.email_delivery || false;
          // Retirer si email_delivery différent
          return itemEmailDelivery === packEmailDelivery;
        }
      }
    }
    return true;
  });
}

function togglePackInCart(productId, displayName) {
  const cartIndex = isPackInCart(productId, displayName);
  
  if (cartIndex !== -1) {
    // Le pack est dans le panier, le retirer
    removePackFromCart(productId, displayName);
  } else {
    // Le pack n'est pas dans le panier, l'ajouter
    addPackToCart(productId, displayName);
  }
}

function addPackToCart(productId, displayName) {
  // Retirer les packs exclus (MD/HD) pour le même couple
  removeExcludedPacks(productId, displayName);
  
  // Trouver le produit pack
  const pack = products.find(p => p.id === productId);
  if (!pack) return;
  
  // Calculer le prix au moment de l'ajout (avant que le pack soit dans le panier)
  const priceAtAdd = calculatePackPrice(pack, displayName);
  
  // Trouver toutes les photos du pack pour ce couple et les stocker dans l'item
  const packPhotos = currentSearchResults.filter(p => {
    const photoRider = p.rider_name || p.cavalier || '';
    const photoHorse = p.horse_name || p.cheval || '';
    const photoDisplayName = (photoRider && photoHorse && photoRider !== photoHorse) 
      ? `${photoRider} - ${photoHorse}` 
      : (photoRider || photoHorse);
    return photoDisplayName === displayName;
  });
  
  // Stocker les photos dans l'item du panier pour qu'elles soient disponibles même si currentSearchResults change
  cart.push({
    type: 'pack',
    product_id: productId,
    quantity: 1,
    search: currentSearch,
    rider_name: displayName,
    packPrice: priceAtAdd, // Stocker le prix au moment de l'ajout
    packPhotos: packPhotos.map(p => ({
      filename: p.filename,
      rider_name: p.rider_name || p.cavalier || '',
      horse_name: p.horse_name || p.cheval || ''
    }))
  });
  
  // Supprimer les photos individuelles concernées par ce pack
  // Ne pas supprimer les photos papier qui sont déjà dans le panier
  removePhotosBlockedByPack(productId, displayName);
  
  updateCartUI();
  
  // Mettre à jour les prix dans le modal des packs pour refléter la dégressivité
  updatePackModalPrices();
  
  // Rafraîchir les boutons du modal
  refreshPackModalButtons();
  
  // NE PAS fermer le popup pack, NE PAS ouvrir le panier automatiquement
  // L'utilisateur peut continuer à ajouter d'autres packs
  showMessage('Pack ajouté au panier', 'success');
}

// Fonction pour rafraîchir les boutons du modal pack
function refreshPackModalButtons() {
  const packButtons = document.querySelectorAll('.pack-cart-btn');
  packButtons.forEach(btn => {
    const packId = parseInt(btn.dataset.packId);
    const displayName = btn.dataset.displayName;
    const cartIndex = isPackInCart(packId, displayName);
    const isInCart = cartIndex !== -1;
    
    if (isInCart) {
      btn.textContent = t('cart_remove_btn');
      btn.style.background = '#dc3545';
    } else {
      btn.textContent = t('pack_modal_add_to_cart');
      btn.style.background = '#2d3561';
    }
  });
}

function buyPackForPhoto(riderName, horseName) {
  const packProducts = products.filter(p => p.category === 'pack');
  
  if (packProducts.length === 0) {
    showCustomAlert('Aucun pack disponible', 'info', 'Information');
    return;
  }
  
  // Construire le nom d'affichage
  let displayName = '';
  if (riderName && horseName && riderName !== horseName) {
    displayName = `${riderName} - ${horseName}`;
  } else if (riderName) {
    displayName = riderName;
  } else if (horseName) {
    displayName = horseName;
  }
  
  // Afficher la popup avec les packs pour ce couple uniquement
  const couples = [{
    rider: riderName,
    horse: horseName,
    displayName: displayName
  }];
  
  showPackModal(packProducts, couples);
}

// Validation Commande
function showPersonalInfoModal() {
    document.getElementById('cart-modal').classList.remove('active');
    document.getElementById('order-info-modal').classList.add('active');
    
    // Vider les champs pour éviter que Firefox en mode kiosque garde les données précédentes
    document.getElementById('client-lastname').value = '';
    document.getElementById('client-firstname').value = '';
    document.getElementById('client-email').value = '';
    document.getElementById('client-phone').value = '';
    const addressField = document.getElementById('client-address');
    const zipField = document.getElementById('client-zip');
    const cityField = document.getElementById('client-city');
    if (addressField) addressField.value = '';
    if (zipField) zipField.value = '';
    if (cityField) cityField.value = '';
    
    // Réinitialiser la checkbox "client professionnel" et tous les champs de facturation
    document.getElementById('is-professional').checked = false;
    document.getElementById('company-name').value = '';
    document.getElementById('company-siret').value = '';
    document.getElementById('company-tva').value = '';
    document.getElementById('company-address').value = '';
    document.getElementById('company-postal-code').value = '';
    document.getElementById('company-city').value = '';
    
    // Cacher les champs professionnels
    const proFields = document.getElementById('pro-fields');
    const proAddressGroup = document.getElementById('pro-address-group');
    if (proFields) proFields.style.display = 'none';
    if (proAddressGroup) proAddressGroup.style.display = 'none';
    
    // Détecter le type de commande et afficher les champs appropriés
    updateFormFieldsVisibility();
}

function updateFormFieldsVisibility() {
    // Analyser le panier pour déterminer les types de produits
    let hasDigital = false;
    let hasPaperPickup = false;
    let hasPaperShipping = false;
    
  cart.forEach(item => {
    const eventProducts = getProductsForEventId(item.event_id || 'global');
    if (item.type === 'photo') {
      for (const [pid, qty] of Object.entries(item.formats)) {
        const product = eventProducts.find(p => p.id == pid);
        if (product) {
                    if (product.category === 'numérique') {
                        hasDigital = true;
                    } else if (product.category === 'impression') {
                        if (product.delivery_method === 'pickup') {
                            hasPaperPickup = true;
                        } else if (product.delivery_method === 'shipping') {
                            hasPaperShipping = true;
                        }
                    }
                }
            }
        } else if (item.type === 'pack') {
            const product = getProductsForEventId(item.event_id || 'global').find(p => p.id == item.product_id);
            if (product && product.category === 'pack') {
                // Les packs peuvent contenir du numérique, on considère qu'ils nécessitent un email
                hasDigital = true;
            }
        }
    });
    
    const isPro = document.getElementById('is-professional').checked;
    const emailField = document.getElementById('client-email');
    const emailIndicator = document.getElementById('email-required-indicator');
    const addressGroup = document.getElementById('client-address-group');
    const proAddressGroup = document.getElementById('pro-address-group');
    const proFields = document.getElementById('pro-fields');
    
    // Règles d'affichage :
    // 1. Commande que papier impression sur place : Email optionnel
    // 2. Commande que numérique : Email obligatoire
    // 3. Commande papier + numérique : Email obligatoire
    // 4. Commande papier avec envoi postal : Email obligatoire + Adresse client
    // 5. Commande professionnels : Email obligatoire + Infos société (+ Adresse client seulement si envoi postal)
    
    if (isPro) {
        // Client professionnel : email obligatoire + infos société
        emailField.required = true;
        if (emailIndicator) emailIndicator.textContent = ' *';
        if (proFields) proFields.style.display = 'block';
        proAddressGroup.style.display = 'block';
        document.getElementById('company-name').required = true;
        document.getElementById('company-address').required = true;
        document.getElementById('company-postal-code').required = true;
        document.getElementById('company-city').required = true;
        
        // Adresse client uniquement si envoi postal nécessaire
        if (hasPaperShipping) {
            addressGroup.style.display = 'block';
        document.getElementById('client-address').required = true;
        document.getElementById('client-zip').required = true;
        document.getElementById('client-city').required = true;
        } else {
            addressGroup.style.display = 'none';
            document.getElementById('client-address').required = false;
            document.getElementById('client-zip').required = false;
            document.getElementById('client-city').required = false;
        }
    } else {
        // Client non professionnel : cacher et désactiver tous les champs pro
        if (proFields) proFields.style.display = 'none';
        proAddressGroup.style.display = 'none';
        document.getElementById('company-name').required = false;
        document.getElementById('company-address').required = false;
        document.getElementById('company-postal-code').required = false;
        document.getElementById('company-city').required = false;
        
        // Vider les champs pro pour éviter qu'ils soient envoyés
        document.getElementById('company-name').value = '';
        document.getElementById('company-siret').value = '';
        document.getElementById('company-tva').value = '';
        document.getElementById('company-address').value = '';
        document.getElementById('company-postal-code').value = '';
        document.getElementById('company-city').value = '';
        // Envoi postal (non pro) : Email + Adresse obligatoires
        if (hasPaperShipping) {
        emailField.required = true;
        if (emailIndicator) emailIndicator.textContent = ' *';
        addressGroup.style.display = 'block';
        document.getElementById('client-address').required = true;
        document.getElementById('client-zip').required = true;
        document.getElementById('client-city').required = true;
    } else if (hasDigital || (hasPaperPickup && hasDigital)) {
        // Numérique ou mixte : Email obligatoire, pas d'adresse
        emailField.required = true;
        if (emailIndicator) emailIndicator.textContent = ' *';
        addressGroup.style.display = 'none';
        document.getElementById('client-address').required = false;
        document.getElementById('client-zip').required = false;
        document.getElementById('client-city').required = false;
    } else if (hasPaperPickup && !hasDigital) {
        // Que papier sur place : Email optionnel, pas d'adresse
        emailField.required = false;
        if (emailIndicator) emailIndicator.textContent = ' (optionnel)';
        addressGroup.style.display = 'none';
        document.getElementById('client-address').required = false;
        document.getElementById('client-zip').required = false;
        document.getElementById('client-city').required = false;
    } else {
        // Par défaut : Email optionnel
        emailField.required = false;
        if (emailIndicator) emailIndicator.textContent = ' (optionnel)';
        addressGroup.style.display = 'none';
            document.getElementById('client-address').required = false;
            document.getElementById('client-zip').required = false;
            document.getElementById('client-city').required = false;
        }
    }
}

// Fonction pour calculer le prix d'une photo selon sa position (même logique que updateCartTotal)
// hasPrintForSamePhoto: true si une impression de la même photo est dans le panier (pour prix réduit numérique)
function getPriceForPosition(product, position, hasPrintForSamePhoto = false) {
  // Pour les produits numériques avec impression dans le panier, utiliser le prix réduit comme base
  const isDigital = product.category === 'numérique';
  let basePrice = product.price;
  if (isDigital && hasPrintForSamePhoto && product.reduced_price_with_print) {
    basePrice = product.reduced_price_with_print;
  }
  
  // Si produit numérique avec impression : le prix réduit avec impression prend le dessus sur TOUT (promo spéciale et tarifs dégressifs)
  const useReducedPrice = isDigital && hasPrintForSamePhoto && product.reduced_price_with_print;
  
  // Si on a un prix réduit avec impression, l'utiliser directement (prend le dessus sur tout)
  if (useReducedPrice) {
    return product.reduced_price_with_print;
  }
  
  // Parser la promo spéciale "X=Y" (ex: "3=10" → la 3ème photo coûte 10 €)
  // Seulement si on n'a pas de prix réduit avec impression
  let specialPromoPosition = null;
  let specialPromoPrice = null;
  if (product.special_promo_rule) {
    const match = product.special_promo_rule.match(/(\d+)\s*=\s*(\d+)/);
    if (match) {
      specialPromoPosition = parseInt(match[1]); // Position (ex: 3)
      specialPromoPrice = parseFloat(match[2]); // Prix pour cette position (ex: 10)
    }
  }
  
  // Vérifier si cette position correspond à la promo spéciale (ex: "3=10")
  if (specialPromoPosition && position === specialPromoPosition) {
    return specialPromoPrice;
  }
  
  // Calculer selon pricing_rules (seulement si pas de prix réduit avec impression)
  if (product.pricing_rules && typeof product.pricing_rules === 'object') {
    const rules = product.pricing_rules;
    const hasNumericKeys = Object.keys(rules).some(k => !isNaN(parseInt(k)));
    const hasDefault = 'default' in rules;
    
    if (hasNumericKeys || hasDefault) {
      const defaultPriceBase = parseFloat(rules.default || product.price);
      const defaultPrice = defaultPriceBase;
      
      const numericKeys = Object.keys(rules)
        .filter(k => !isNaN(parseInt(k)))
        .map(k => parseInt(k))
        .sort((a, b) => a - b);
      const firstDefinedRank = numericKeys.length > 0 ? numericKeys[0] : 0;
      const lastDefinedRank = numericKeys.length > 0 ? numericKeys[numericKeys.length - 1] : 0;
      const lastDefinedPriceBase = lastDefinedRank > 0 ? parseFloat(rules[lastDefinedRank.toString()]) : defaultPrice;
      // Les tarifs dégressifs restent à leur valeur fixe, même avec reduced_price_with_print
      const lastDefinedPrice = lastDefinedPriceBase;
      
      const rankPrice = rules[position.toString()];
      if (rankPrice !== undefined) {
        const rulePrice = parseFloat(rankPrice);
        // Les tarifs dégressifs restent à leur valeur fixe, même avec reduced_price_with_print
        return rulePrice;
    }
      if (position < firstDefinedRank) {
        return basePrice;
      } else {
        return lastDefinedPrice;
      }
    }
  }
  
  // Pas de pricing_rules : prix standard ou promo
  const standardPrice = (product.promo_price && product.promo_price < product.price) 
    ? product.promo_price 
    : basePrice;
  return standardPrice;
}

function detectFulfillmentFromCart() {
  let hasDigital = false;
  let hasPaperPickup = false;
  let hasPaperShipping = false;

  cart.forEach(item => {
    const eventProducts = getProductsForEventId(item.event_id || 'global');
    if (item.type === 'photo') {
      for (const [pid, qty] of Object.entries(item.formats || {})) {
        if (!qty || qty <= 0) continue;
        const product = eventProducts.find(p => p.id == pid);
        if (!product) continue;
        if (product.category === 'numérique') hasDigital = true;
        if (product.category === 'impression') {
          if (product.delivery_method === 'shipping') hasPaperShipping = true;
          else hasPaperPickup = true;
        }
      }
    } else if (item.type === 'pack') {
      hasDigital = true;
    }
  });

  if (hasPaperShipping) return 'shipping';
  if (hasPaperPickup) return 'pickup';
  if (hasDigital) return 'digital';
  return 'digital';
}

async function submitOrder(e, options = {}) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const payment_mode = options.payment_mode || 'online'; // online (Stripe) by default
  const fulfillment = options.fulfillment || detectFulfillmentFromCart();
  const buttonId = options.button_id || 'submit-btn';
  
  const submitBtn = document.getElementById(buttonId) || document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Validation...';
  
  // Compter les quantités totales par produit pour connaître les positions
  const productTotals = {}; // { productId: totalQuantity }
  cart.forEach(item => {
    if (item.type === 'photo') {
      for (const [pid, qty] of Object.entries(item.formats)) {
        productTotals[pid] = (productTotals[pid] || 0) + qty;
      }
    } else if (item.type === 'pack') {
      productTotals[item.product_id] = (productTotals[item.product_id] || 0) + item.quantity;
    }
  });
  
  // Compteur de position pour chaque produit
  const productPositions = {}; // { productId: currentPosition }
  for (const pid in productTotals) {
    productPositions[pid] = 0;
  }
  
  // Récupérer les données avec les prix calculés selon la position
  const items = [];
  cart.forEach(item => {
      const eventProducts = getProductsForEventId(item.event_id || 'global');
      if (item.type === 'photo') {
          for (const [pid, qty] of Object.entries(item.formats)) {
              const product = eventProducts.find(p => p.id == pid);
              if (!product) return;
              
              // Vérifier si une impression de la même photo est dans le panier (pour prix réduit numérique)
              const isDigital = product.category === 'numérique';
              let hasPrintForSamePhoto = false;
              if (isDigital && product.reduced_price_with_print) {
                hasPrintForSamePhoto = cart.some(cartItem => {
                  if (cartItem.type === 'photo' && cartItem.filename === item.filename) {
                    for (const [printPid, printQty] of Object.entries(cartItem.formats || {})) {
                      const printProduct = getProductsForEventId(cartItem.event_id).find(p => p.id == printPid);
                      if (printProduct && printProduct.category === 'impression' && printQty > 0) {
                        return true;
                      }
                    }
                  }
                  return false;
                });
              }
              
              // Envoyer chaque unité comme un item séparé avec son prix exact
              // pour éviter les problèmes d'arrondi
              const prices = [];
              for (let i = 0; i < qty; i++) {
                productPositions[pid]++;
                const pos = productPositions[pid];
                const price = getPriceForPosition(product, pos, hasPrintForSamePhoto);
                prices.push(price);
                
                // Créer un item pour chaque unité avec son prix exact
                items.push({ 
                  product_id: parseInt(pid), 
                  quantity: 1,
                  unit_price: price,  // Prix exact pour cette position
                  filename: item.filename,
                  rider_name: item.rider_name || '',
                  horse_name: item.horse_name || '',
                  event_id: item.event_id || null // Inclure l'event_id depuis le panier
                });
              }
              
              console.log(`Item: product_id=${pid}, qty=${qty}, hasPrint=${hasPrintForSamePhoto}, positions=${prices.map((p, i) => productPositions[pid] - qty + i + 1).join(',')}, prices=${prices.join(',')}, total=${prices.reduce((a, b) => a + b, 0)}`);
          }
      } else if (item.type === 'pack') {
          // Extraire rider_name et horse_name du displayName
          let riderName = '';
          let horseName = '';
          
          if (item.rider_name) {
            const parts = item.rider_name.split(' - ');
            if (parts.length === 2) {
              riderName = parts[0].trim();
              horseName = parts[1].trim();
            } else {
              riderName = item.rider_name;
            }
          }
          
          // Utiliser les photos stockées dans l'item du panier
          let packPhotos = [];
          if (item.packPhotos && Array.isArray(item.packPhotos) && item.packPhotos.length > 0) {
            // Utiliser les photos stockées dans l'item
            packPhotos = item.packPhotos;
          } else {
            // Fallback : récupérer depuis currentSearchResults
            packPhotos = currentSearchResults.filter(p => {
              const photoRider = p.rider_name || p.cavalier || '';
              const photoHorse = p.horse_name || p.cheval || '';
              const displayName = (photoRider && photoHorse && photoRider !== photoHorse) 
                ? `${photoRider} - ${photoHorse}` 
                : (photoRider || photoHorse);
              return displayName === item.rider_name;
            }).map(p => ({
              filename: p.filename,
              rider_name: p.rider_name || p.cavalier || '',
              horse_name: p.horse_name || p.cheval || ''
            }));
          }
          
          const firstPhoto = packPhotos[0];
          
          // Stocker toutes les photos du pack dans les notes en JSON
          const allPhotosData = {
            pack_for: item.rider_name,
            total_photos: packPhotos.length,
            photos: packPhotos
          };
          
          const product = getProductsForEventId(item.event_id || 'global').find(p => p.id == item.product_id);
          if (!product) return;
          
          // Envoyer chaque unité comme un item séparé avec son prix exact
          // pour éviter les problèmes d'arrondi
          const prices = [];
          for (let i = 0; i < item.quantity; i++) {
            productPositions[item.product_id]++;
            const pos = productPositions[item.product_id];
            const price = getPriceForPosition(product, pos);
            prices.push(price);
            
            // Créer un item pour chaque unité avec son prix exact
            // Récupérer l'event_id depuis les photos du pack
            let packEventId = item.event_id || null;
            if (!packEventId && firstPhoto) {
              const firstPhotoData = currentSearchResults.find(p => 
                p.filename === (firstPhoto.filename || firstPhoto)
              );
              if (firstPhotoData) {
                packEventId = firstPhotoData.event_id || firstPhotoData.contest || null;
              }
            }
            
            items.push({ 
              product_id: item.product_id, 
              quantity: 1,
              unit_price: price,  // Prix exact pour cette position
              filename: firstPhoto ? (firstPhoto.filename || firstPhoto) : '',
              rider_name: riderName,
              horse_name: horseName,
              notes: JSON.stringify(allPhotosData),
              event_id: packEventId // Inclure l'event_id
            });
          }
          
          console.log(`Pack: product_id=${item.product_id}, qty=${item.quantity}, positions=${prices.map((p, i) => productPositions[item.product_id] - item.quantity + i + 1).join(',')}, prices=${prices.join(',')}, total=${prices.reduce((a, b) => a + b, 0)}`);
      }
  });
  
  if (items.length === 0) {
      await showCustomAlert(t('cart_empty_warning'), 'warning', t('warning_title'));
      submitBtn.disabled = false;
    return;
  }
  
  const isPro = document.getElementById('is-professional').checked;

  // Validation simple de l'email : si présent, doit contenir un @ avec du texte avant/après
  const emailInput = document.getElementById('client-email');
  const rawEmail = (emailInput ? emailInput.value : '').trim();
  if (rawEmail) {
    // Regex très simple: au moins un caractère non-espace avant et après le @,
    // et au moins un point dans la partie domaine.
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(rawEmail)) {
          await showCustomAlert(
            t('invalid_email_message'),
            'warning',
            t('invalid_email_title')
          );
      submitBtn.disabled = false;
      submitBtn.textContent = t('submit_order_btn');
      return;
    }
  }
  
  const orderData = {
    client_name: document.getElementById('client-lastname').value + ' ' + document.getElementById('client-firstname').value,
    client_email: rawEmail,
    client_phone: document.getElementById('client-phone').value,
    items: items,
    notes: document.getElementById('notes') ? document.getElementById('notes').value : '',
    is_professional: isPro,
    tva_required: isPro, // Simplification: si pro, on demande facture/TVA
    company_name: isPro ? document.getElementById('company-name').value : null,
    company_siret: isPro ? document.getElementById('company-siret').value : null,
    company_tva: isPro ? document.getElementById('company-tva').value : null,
    company_address: isPro ? document.getElementById('company-address').value : null,
    company_postal_code: isPro ? document.getElementById('company-postal-code').value : null,
    company_city: isPro ? document.getElementById('company-city').value : null,
    client_address: document.getElementById('client-address') ? document.getElementById('client-address').value : null,
    client_zip: document.getElementById('client-zip') ? document.getElementById('client-zip').value : null,
    client_city: document.getElementById('client-city') ? document.getElementById('client-city').value : null
  };
  
  // Log détaillé pour debug
  console.log('=== SOUMISSION COMMANDE ===');
  console.log('Items à envoyer:', JSON.stringify(items, null, 2));
  const calculatedTotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  console.log('Total calculé côté client:', calculatedTotal);
  
  // Mode statique : envoyer vers endpoint public Infomaniak qui écrit dans R2
  if (!API_BASE || API_BASE === 'null' || API_BASE === null) {
    try {
      // Générer référence simple : web + 4 chiffres aléatoires (ex: web5226)
      const randomDigits = Math.floor(1000 + Math.random() * 9000); // 1000-9999
      const orderId = 'web' + randomDigits;
      console.log('🔢 Order ID généré:', orderId);
      
      // Détecter event_id depuis les items (priorité : event_id stocké dans l'item)
      let eventId = null;
      
      // Méthode 1 : Chercher l'event_id directement dans les items (stocké lors de l'ajout au panier)
      for (const item of items) {
        if (item.event_id) {
          eventId = item.event_id;
          console.log('✅ Event ID trouvé dans item:', eventId);
          break;
        }
      }
      
      // Méthode 2 : Si pas trouvé, chercher via filename dans currentSearchResults
      if (!eventId) {
        for (const item of items) {
          if (item.filename) {
            const photo = currentSearchResults.find(p => p.filename === item.filename);
            if (photo && (photo.event_id || photo.contest)) {
              eventId = photo.event_id || photo.contest;
              console.log('✅ Event ID trouvé via filename:', eventId);
              break;
            }
          }
        }
      }
      
      // Méthode 3 : Si pas trouvé, chercher via rider_name/horse_name dans toutes les photos chargées
      if (!eventId) {
        try {
          const allPhotos = await loadStaticPhotos();
          for (const item of items) {
            if (item.rider_name || item.horse_name) {
              const photo = allPhotos.find(p => 
                (p.rider_name && p.rider_name.toLowerCase() === item.rider_name?.toLowerCase()) ||
                (p.horse_name && p.horse_name.toLowerCase() === item.horse_name?.toLowerCase()) ||
                (p.cavalier && p.cavalier.toLowerCase() === item.rider_name?.toLowerCase()) ||
                (p.cheval && p.cheval.toLowerCase() === item.horse_name?.toLowerCase())
              );
              if (photo && (photo.event_id || photo.contest)) {
                eventId = photo.event_id || photo.contest;
                console.log('✅ Event ID détecté via rider/horse:', eventId);
                break;
              }
            }
          }
        } catch (e) {
          console.warn('Erreur chargement photos pour event_id:', e);
        }
      }
      
      // Méthode 4 : Chercher dans le localStorage ou window si défini
      if (!eventId && typeof window !== 'undefined') {
        if (window.currentEventId) {
          eventId = window.currentEventId;
          console.log('✅ Event ID depuis window.currentEventId:', eventId);
        } else if (localStorage.getItem('currentEventId')) {
          eventId = localStorage.getItem('currentEventId');
          console.log('✅ Event ID depuis localStorage:', eventId);
        }
      }
      
      // Fallback : utiliser 'UNKNOWN' si pas d'event_id trouvé
      if (!eventId) {
        eventId = 'UNKNOWN';
        console.warn('⚠️ Event ID non détecté, utilisation de "UNKNOWN"');
        console.warn('Items:', items.map(i => ({ filename: i.filename, rider: i.rider_name, horse: i.horse_name, event_id: i.event_id })));
      } else {
        console.log('✅ Event ID final:', eventId);
      }
      
      const orderWithId = {
        ...orderData,
        order_id: orderId, // Format: web + 4 chiffres (ex: web2556)
        event_id: eventId,
        created_at: new Date().toISOString(),
        status: payment_mode === 'on_site' ? 'pending_payment_on_site' : 'pending_payment_online',
        payment_mode,
        fulfillment,
        amount_total_cents: Math.round(calculatedTotal * 100),
        currency: 'eur'
      };
      
      console.log('📦 OrderWithId avant envoi:', JSON.stringify(orderWithId, null, 2));
      
      // Stripe Checkout (paiement en ligne)
      if (payment_mode === 'online') {
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: orderWithId,
            cart,
            event_id: eventId,
            currency: 'eur',
            fulfillment
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Stripe session creation failed');
        }

        const data = await response.json();
        if (!data.checkout_url) throw new Error('Missing checkout_url');

        window.location.href = data.checkout_url;
        return;
      }

      // Paiement sur place : envoyer vers endpoint public Infomaniak (R2)
      const publicApiUrl = window.PUBLIC_API_URL || '/api/orders/snapshot';
      
      try {
        const response = await fetch(publicApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event_id: eventId,
            orders: [orderWithId]
          })
        });
        
        if (response.ok) {
          console.log('✅ Commande envoyée vers R2 via endpoint public');
        } else {
          console.warn('⚠️ Échec envoi vers endpoint public, stockage local uniquement');
          // Fallback : stocker dans localStorage
          const pendingOrders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
          pendingOrders.push(orderWithId);
          localStorage.setItem('pending_orders', JSON.stringify(pendingOrders));
        }
      } catch (fetchError) {
        console.warn('⚠️ Erreur envoi vers endpoint public, stockage local:', fetchError);
        // Fallback : stocker dans localStorage
        const pendingOrders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
        pendingOrders.push(orderWithId);
        localStorage.setItem('pending_orders', JSON.stringify(pendingOrders));
      }
      
      // Succès
      await showCustomAlert(
        'Commande enregistrée. Elle sera synchronisée avec l\'interface vendeur lors de la prochaine synchronisation.',
        'success',
        'Commande enregistrée'
      );
      
      // Recharger la page pour réinitialiser complètement l'interface
      location.reload();
      
    } catch (error) {
      console.error(error);
      await showCustomAlert('Erreur lors de l\'enregistrement: ' + error.message, 'error', 'Erreur');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t(buttonId === 'submit-btn' ? 'pay_now_btn' : (buttonId === 'pay-on-site-btn' ? 'pay_on_site_btn' : 'shipping_btn'));
    }
    return;
  }
  
  // Mode avec API : envoyer directement
  try {
    // Générer référence simple : web + 4 chiffres aléatoires (ex: web5226)
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 1000-9999
    const orderId = 'web' + randomDigits;
    console.log('🔢 Order ID généré (mode API):', orderId);
    
    // Ajouter l'order_id au orderData
    const orderDataWithId = {
      ...orderData,
      order_id: orderId // Format: web + 4 chiffres (ex: web2556)
    };
    
    console.log('📦 OrderDataWithId avant envoi:', JSON.stringify(orderDataWithId, null, 2));
    
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(orderDataWithId)
    });
    
    if (!response.ok) throw new Error('Erreur lors de la commande');
    
    const result = await response.json();
    
    // Succès
    await showCustomAlert(t('order_success_message'), 'success', t('order_validated_title'));
    
    // Recharger la page pour réinitialiser complètement l'interface
    location.reload();
    
  } catch (error) {
    console.error(error);
    await showCustomAlert(t('error_message') + error.message, 'error', t('error_title'));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t('submit_order_btn');
  }
}

function renderTutorial() {
  const steps = [
    { title: t('search_photos_title'), text: t('tuto_step_1_text') },
    { title: t('tuto_step_2_title'), text: t('tuto_step_2_text') },
    { title: t('tuto_step_3_title'), text: t('tuto_step_3_text') },
    { title: t('tuto_step_4_title'), text: t('tuto_step_4_text') },
    { title: t('tuto_step_5_title'), text: t('tuto_step_5_text') }
  ];
  
  const container = document.getElementById('tutorial-content');
  container.innerHTML = steps.map((step, index) => `
    <div class="tutorial-step">
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span class="tutorial-step-number">${index + 1}</span>
        <div class="tutorial-step-title" style="margin: 0;">${step.title}</div>
      </div>
      <div class="tutorial-step-text">${step.text}</div>
    </div>
  `).join('');
}

function showMessage(msg, type) {
    const el = document.getElementById('message');
    el.textContent = msg;
    el.className = `message ${type}`;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

// Fonction pour réinitialiser l'interface (clic sur logo)
function resetInterface() {
    // Vider le panier
    cart = [];
    updateCartUI();
    
    // Réinitialiser la recherche
    const searchInput = document.getElementById('photo-search');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Masquer les résultats de recherche
    const resultsContainer = document.getElementById('photos-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
    
    // Masquer les suggestions
    const suggestionsBox = document.getElementById('suggestions-box');
    if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }
    
    // Fermer le panier s'il est ouvert
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
        cartModal.classList.remove('active');
    }
    
    // Réinitialiser les variables globales
    currentSearch = '';
    currentSearchResults = [];
    currentSuggestions = [];
}

// Fonction pour sauvegarder le panier pour plus tard
async function saveCartForLater() {
    if (cart.length === 0) {
        alert(t('cart_empty'));
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/carts/save`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify(cart)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || t('save_cart_error'));
        }
        
        const data = await response.json();
        const code = data.code;
        
        // Fermer le modal du panier
        document.getElementById('cart-modal').classList.remove('active');
        
        // Afficher le code dans le modal personnalisé
        const codeDisplay = document.getElementById('saved-cart-code-display');
        if (codeDisplay) {
            codeDisplay.textContent = code;
        }
        const savedCartModal = document.getElementById('saved-cart-code-modal');
        if (savedCartModal) {
            savedCartModal.classList.add('active');
        }
        
        // Le modal se fermera et rechargera la page uniquement au clic sur "Fermer"
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du panier:', error);
        alert(`${t('save_cart_error_prefix')} ${error.message}`);
    }
}

// Fonction pour charger un panier sauvegardé
async function loadSavedCart() {
    const codeInput = document.getElementById('cart-code-search');
    if (!codeInput) return;
    
    const code = codeInput.value.trim();
    
    if (!code || code.length !== 4) {
        alert(t('load_cart_code_invalid'));
        return;
    }
    
    // Vérifier si le panier actuel n'est pas vide
    if (cart.length > 0) {
        const confirmed = confirm(t('load_cart_replace_confirm'));
        if (!confirmed) return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/carts/${code}`, {
            headers: getApiHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                alert(t('load_cart_not_found'));
            } else {
                const error = await response.json();
                throw new Error(error.detail || t('load_cart_error'));
            }
            return;
        }
        
        const data = await response.json();
        const savedCart = data.cart;
        
        // Restaurer le panier (s'assurer que c'est un array)
        if (Array.isArray(savedCart)) {
            cart = savedCart;
        } else if (savedCart && Array.isArray(savedCart.items)) {
            // Si c'est un objet avec une propriété "items"
            cart = savedCart.items;
        } else {
            throw new Error(t('invalid_cart_format'));
        }
        
        updateCartUI();
        
        // Vider le champ de code
        codeInput.value = '';
        
        // Ouvrir le panier
        const cartModal = document.getElementById('cart-modal');
        if (cartModal) {
            cartModal.classList.add('active');
        }
        
        // Afficher un message de succès
        showMessage(t('cart_loaded_success'), 'success');
        
    } catch (error) {
        console.error('Erreur lors du chargement du panier:', error);
        alert(`${t('load_cart_error_prefix')} ${error.message}`);
    }
}

// Exposer la fonction globalement pour le bouton onclick
window.loadSavedCart = loadSavedCart;

// Fonction pour s'assurer qu'un modal est enfant direct de <body>
// Fix pour problème de position: fixed qui ne fonctionne pas si parent a transform
function ensureModalInBody(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  // Si le modal n'est pas déjà enfant direct de body, le déplacer
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
}

// Fonction pour ouvrir le modal des promotions (mobile)
function openPromotionsModal() {
  // Portail : déplacer le modal en enfant direct de <body>
  ensureModalInBody('promotions-modal');
  const modal = document.getElementById('promotions-modal');
  const modalList = document.getElementById('promotions-modal-list');
  
  if (!modal || !modalList) return;
  
  // Récupérer le contenu des promotions depuis la colonne gauche
  const leftColumn = document.getElementById('left-column');
  const promotionsList = leftColumn ? leftColumn.querySelector('.promotions-list') : null;
  
  if (promotionsList) {
    // Copier le contenu des promotions dans le modal
    modalList.innerHTML = promotionsList.innerHTML;
  } else {
    // Si pas de contenu, re-rendre les promotions
    renderPromotions();
    const updatedList = document.querySelector('.promotions-list');
    if (updatedList) {
      modalList.innerHTML = updatedList.innerHTML;
    }
  }
  
  // Ouvrir le modal
  modal.classList.add('active');
  // Bloquer le scroll sans position: fixed (problème n°2)
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
  
  // Gérer la fermeture en cliquant en dehors
  if (!modal.dataset.clickOutsideHandler) {
    modal.dataset.clickOutsideHandler = 'true';
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
      }
    });
  }
}

// Exposer la fonction globalement pour les onclick dans le HTML
window.openPromotionsModal = openPromotionsModal;

// Fonction pour ouvrir le modal du tutoriel (mobile)
function openTutorialModal() {
  // Portail : déplacer le modal en enfant direct de <body>
  ensureModalInBody('tutorial-modal');
  const modal = document.getElementById('tutorial-modal');
  const modalContent = document.getElementById('tutorial-modal-content');
  
  if (!modal || !modalContent) return;
  
  // Récupérer le contenu du tutoriel depuis la colonne droite
  const rightColumn = document.getElementById('right-column');
  const tutorialContent = rightColumn ? rightColumn.querySelector('#tutorial-content') : null;
  
  if (tutorialContent) {
    // Copier le contenu du tutoriel dans le modal
    modalContent.innerHTML = tutorialContent.innerHTML;
  } else {
    // Si pas de contenu, re-rendre le tutoriel
    renderTutorial();
    const updatedContent = document.getElementById('tutorial-content');
    if (updatedContent) {
      modalContent.innerHTML = updatedContent.innerHTML;
    }
  }
  
  // Ouvrir le modal
  modal.classList.add('active');
  // Bloquer le scroll sans position: fixed (problème n°2)
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
  
  // Gérer la fermeture en cliquant en dehors
  if (!modal.dataset.clickOutsideHandler) {
    modal.dataset.clickOutsideHandler = 'true';
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
      }
    });
  }
}

// Exposer la fonction globalement pour les onclick dans le HTML
window.openTutorialModal = openTutorialModal;
window.toggleCart = toggleCart;
window.resetInterface = resetInterface;

/**
 * Découvre les événements disponibles depuis R2
 * @returns {Promise<string[]>} Tableau des event_ids disponibles
 */
async function discoverAvailableEvents() {
  const events = new Set();
  
  // Méthode 1 : Charger le fichier events_list.json depuis la racine de R2
  try {
    const r2Url = window.R2_PUBLIC_URL;
    if (!r2Url) {
      console.error('❌ R2_PUBLIC_URL non défini');
      return Array.from(events);
    }
    const eventsListUrl = `${r2Url}/events_list.json?t=${Date.now()}`;
    const response = await fetch(eventsListUrl);
    if (response.ok) {
      const data = await response.json();
      // Accepter soit un tableau direct, soit un objet avec une propriété "events"
      const eventsList = Array.isArray(data) ? data : (data.events || []);
      eventsList.forEach(eventId => {
        if (eventId && eventId !== 'UNKNOWN') {
          events.add(eventId);
        }
      });
      console.log(`✅ Liste d'événements chargée depuis events_list.json: ${events.size} événement(s)`);
    } else {
      console.debug('events_list.json non trouvé (404), utilisation des méthodes de fallback');
    }
  } catch (e) {
    console.debug('Erreur chargement events_list.json:', e);
  }
  
  // Méthode 2 : Détecter depuis les photos déjà chargées dans le cache (fallback)
  if (events.size === 0) {
    // Vérifier dans le cache multi-événements
    if (multiEventPhotosCache && Object.keys(multiEventPhotosCache).length > 0) {
      Object.keys(multiEventPhotosCache).forEach(eventId => {
        if (eventId && eventId !== 'UNKNOWN') {
          events.add(eventId);
        }
      });
      console.log(`✅ Événements détectés depuis multiEventPhotosCache: ${events.size} événement(s)`);
    }
    
    // Vérifier dans staticPhotosCache
    if (staticPhotosCache && Array.isArray(staticPhotosCache) && staticPhotosCache.length > 0) {
      staticPhotosCache.forEach(photo => {
        const eventId = photo.event_id || photo.contest;
        if (eventId && eventId !== 'UNKNOWN') {
          events.add(eventId);
        }
      });
      if (events.size > 0) {
        console.log(`✅ Événements détectés depuis staticPhotosCache: ${events.size} événement(s)`);
      }
    }
  }
  
  // Méthode 3 : Essayer de détecter depuis l'URL ou localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const urlEvent = urlParams.get('event');
  if (urlEvent && urlEvent !== 'UNKNOWN') {
    events.add(urlEvent);
  }
  
  const storedEvent = localStorage.getItem('currentEventId');
  if (storedEvent && storedEvent !== 'UNKNOWN') {
    events.add(storedEvent);
  }
  
  const sortedEvents = Array.from(events).sort();
  console.log(`📋 Événements disponibles: ${sortedEvents.length} événement(s)`, sortedEvents);
  
  return sortedEvents;
}

/**
 * Gère le changement de sélection d'événements
 */
function handleEventFilterChange(availableEvents) {
  selectedEventIds = [];
  
  // Récupérer la sélection depuis mobile ou desktop
  const mobileSelect = document.getElementById('event-filter-mobile') || document.getElementById('event-filter-header');
  const desktopSelect = document.getElementById('event-filter-desktop');
  
  let selectedValue = null;
  if (desktopSelect && desktopSelect.value) {
    selectedValue = desktopSelect.value;
  } else if (mobileSelect && mobileSelect.value) {
    selectedValue = mobileSelect.value;
  }
  
  if (selectedValue === 'all') {
    // "Tous" sélectionné : charger tous les événements disponibles
    selectedEventIds = availableEvents;
  } else if (selectedValue) {
    // Événement spécifique sélectionné
    selectedEventIds = [selectedValue];
  } else {
    // Par défaut, tous les événements
    selectedEventIds = availableEvents;
  }
  
  console.log('📋 Événements sélectionnés:', selectedEventIds);

  try {
    localStorage.setItem('borne_selected_event', selectedValue || 'all');
  } catch (e) {}

  // Synchroniser les deux selects
  if (desktopSelect && mobileSelect) {
    desktopSelect.value = selectedValue || 'all';
    mobileSelect.value = selectedValue || 'all';
  }

  // Vider le cache pour forcer le rechargement
  staticPhotosCache = null;
  multiEventPhotosCache = {};

  // Si une recherche est en cours, relancer la recherche
  const searchInput = document.getElementById('photo-search');
  if (searchInput && searchInput.value.trim()) {
    searchPhotos(searchInput.value.trim());
  }
  // Recharger les produits (formats/prix) pour l'événement sélectionné
  loadProducts();
}

/**
 * Initialise le filtre d'événements
 */
async function initEventFilter() {
  const filterSelectMobile = document.getElementById('event-filter-mobile') || document.getElementById('event-filter-header');
  const filterSelectDesktop = document.getElementById('event-filter-desktop');
  
  if (!filterSelectMobile && !filterSelectDesktop) {
    console.warn('Filtre d\'événements introuvable dans le DOM');
    return;
  }
  
  // Découvrir les événements disponibles
  const availableEvents = await discoverAvailableEvents();
  
  // Fonction pour initialiser un select
  const initSelect = (select) => {
    if (!select) return;
    select.innerHTML = '<option value="all" selected>Tous</option>';
    for (const eventId of availableEvents) {
      const option = document.createElement('option');
      option.value = eventId;
      option.textContent = eventId;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      handleEventFilterChange(availableEvents);
    });
  };
  
  // Initialiser les deux selects
  initSelect(filterSelectMobile);
  initSelect(filterSelectDesktop);

  let selectedValue = 'all';
  try {
    const saved = localStorage.getItem('borne_selected_event');
    if (saved && (saved === 'all' || availableEvents.includes(saved))) {
      selectedValue = saved;
    }
  } catch (e) {}

  if (availableEvents.length === 1) {
    selectedValue = availableEvents[0];
    selectedEventIds = [availableEvents[0]];
  } else if (availableEvents.length > 0) {
    if (selectedValue === 'all') {
      selectedEventIds = availableEvents;
    } else {
      selectedEventIds = [selectedValue];
    }
    if (filterSelectMobile) filterSelectMobile.value = selectedValue;
    if (filterSelectDesktop) filterSelectDesktop.value = selectedValue;
  }
  
  // Gérer le changement de sélection
  filterSelectMobile.addEventListener('change', () => handleEventFilterChange(availableEvents));
  
  // Afficher le filtre mobile si on est sur mobile
  if (window.innerWidth <= 768) {
    const mobileContainer = document.getElementById('event-filter-container-mobile');
    if (mobileContainer) {
      mobileContainer.style.display = 'block';
    }
  }
  
  console.log(`✅ Filtre d'événements initialisé: ${availableEvents.length} événement(s) disponible(s)`);
  // Recharger les produits (formats/prix) pour l'événement sélectionné
  loadProducts();
}

// Initialiser le filtre au chargement de la page
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventFilter);
  } else {
    // DOM déjà chargé
    setTimeout(initEventFilter, 100);
  }
}
