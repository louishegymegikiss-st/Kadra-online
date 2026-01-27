// Client Online Desktop JS - Interface online desktop (responsive desktop)
// Polling intelligent pour détecter les changements de photos

// Polling intelligent pour détecter les changements de photos
if (typeof lastPhotoStatusHash === 'undefined') {
  var lastPhotoStatusHash = null;
}
if (typeof photoPollingInterval === 'undefined') {
  var photoPollingInterval = null;
}
let pollIntervalMs = 5000; // 5 secondes par défaut (actif)
const POLL_INTERVAL_ACTIVE = 5000; // 5 secondes quand l'utilisateur est actif
const POLL_INTERVAL_INACTIVE = 30000; // 30 secondes quand l'utilisateur est inactif

// Vérifier les mises à jour des photos
async function checkPhotoUpdates() {
  // Ne pas faire de polling si pas d'API configurée
  if (!API_BASE || API_BASE === 'null' || API_BASE === null || API_BASE === '') {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/photos/status`);
    if (!response.ok) return;
    
    // Vérifier que la réponse est bien du JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Réponse API n\'est pas du JSON, API peut-être indisponible');
      return;
    }
    
    const status = await response.json();
    
    // Si le hash a changé, il y a eu des modifications
    if (status.hash && status.hash !== lastPhotoStatusHash) {
      // Ne pas rafraîchir si l'utilisateur interagit activement
      const lightbox = document.getElementById('lightbox');
      const cartModal = document.getElementById('cart-modal');
      const isLightboxOpen = lightbox && lightbox.classList.contains('active');
      const isCartOpen = cartModal && cartModal.classList.contains('active');
      
      // Ne rafraîchir que si aucune modale n'est ouverte
      if (!isLightboxOpen && !isCartOpen && currentSearch && currentSearch.trim().length >= 2) {
        console.log('Changements détectés, rafraîchissement silencieux...');
        // Rafraîchir en arrière-plan sans perturber l'utilisateur
        await refreshPhotosQuietly(currentSearch);
      }
      lastPhotoStatusHash = status.hash;
    } else if (!lastPhotoStatusHash) {
      // Première vérification : initialiser le hash
      lastPhotoStatusHash = status.hash;
    }
  } catch (error) {
    // Ne pas afficher d'erreur si l'API n'existe pas encore
    if (error.message && error.message.includes('JSON')) {
      // API retourne du HTML au lieu de JSON = API non disponible
      return;
    }
    console.error('Erreur vérification mises à jour photos:', error);
  }
}

// Rafraîchir les photos sans perturber visuellement
async function refreshPhotosQuietly(query) {
  try {
    const response = await fetch(`${API_BASE}/photos/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return;
    
    const data = await response.json();
    
    // Mettre à jour les résultats sans recharger la grille
    const oldResults = currentSearchResults;
    currentSearchResults = data.results || [];
    
    // Vérifier s'il y a vraiment des différences significatives
    if (JSON.stringify(oldResults) === JSON.stringify(currentSearchResults)) {
      return; // Aucun changement réel
    }
    
    // Mise à jour discrète : seulement si nécessaire
    const container = document.getElementById('photos-results');
    if (container && container.style.display !== 'none') {
      // Sauvegarder la position de scroll
      const scrollPos = window.scrollY;
      
      // Recharger la grille
      renderPhotos(currentSearchResults);
      
      // Restaurer la position de scroll
      window.scrollTo(0, scrollPos);
    }
  } catch (error) {
    console.error('Erreur rafraîchissement silencieux:', error);
  }
}

// Démarrer le polling
function startPhotoPolling() {
  if (photoPollingInterval) return; // Déjà démarré
  
  // Ne pas démarrer le polling si pas d'API configurée
  if (!API_BASE || API_BASE === 'null' || API_BASE === null || API_BASE === '') {
    console.log('Mode statique : polling désactivé');
    return;
  }
  
  // Vérifier immédiatement
  checkPhotoUpdates();
  
  // Puis vérifier périodiquement
  photoPollingInterval = setInterval(checkPhotoUpdates, pollIntervalMs);
}

// Arrêter le polling
function stopPhotoPolling() {
  if (photoPollingInterval) {
    clearInterval(photoPollingInterval);
    photoPollingInterval = null;
  }
}

// Adapter la fréquence selon l'activité de l'utilisateur
function updatePollingFrequency() {
  // Si l'onglet est caché ou l'utilisateur inactif, réduire la fréquence
  if (document.hidden) {
    pollIntervalMs = POLL_INTERVAL_INACTIVE;
  } else {
    pollIntervalMs = POLL_INTERVAL_ACTIVE;
  }
  
  // Redémarrer avec la nouvelle fréquence
  if (photoPollingInterval) {
    stopPhotoPolling();
    startPhotoPolling();
  }
}

// Charger le CSS mobile si largeur <= 768px (même en mode responsive)
function loadMobileCSSIfNeeded() {
  if (window.innerWidth <= 768) {
    const mobileCssLink = document.querySelector('link[href*="client_online_mobile.css"]');
    if (!mobileCssLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/static/css/client_online_mobile.css?v=4';
      document.head.appendChild(link);
      console.log('✅ CSS mobile chargé pour mode responsive (largeur <= 768px)');
    }
  }
}

// Détecter si on est sur mobile et charger le fichier mobile si nécessaire
function detectAndLoadMobile() {
  // Détecter si on est sur mobile (largeur <= 768px ou User-Agent mobile)
  // Aussi charger en mode responsive (même sur PC si largeur <= 768px)
  const isMobileWidth = window.innerWidth <= 768;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const shouldLoadMobile = isMobileWidth || isMobileUA;

  // Toujours charger le CSS mobile si largeur <= 768px (même en mode responsive)
  if (isMobileWidth) {
    const mobileCssLink = document.querySelector('link[href*="client_online_mobile.css"]');
    if (!mobileCssLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/static/css/client_online_mobile.css?v=4';
      document.head.appendChild(link);
      console.log('✅ CSS mobile chargé pour mode responsive (largeur <= 768px)');
    }
  }

  // Charger le JS mobile si largeur <= 768px OU User-Agent mobile
  if (!shouldLoadMobile) {
    return false;
  }

  if (window.clientOnlineMobileScriptLoading || window.clientOnlineMobileScriptLoaded) {
    return true;
  }

  const existingScript = document.querySelector('script[src*="client_online_mobile.js"]');
  if (existingScript) {
    window.clientOnlineMobileScriptLoaded = true;
    return true;
  }

  // Charger le fichier mobile
  const script = document.createElement('script');
  script.src = '/static/js/client_online_mobile.js?v=3';
  script.onload = () => {
    window.clientOnlineMobileScriptLoaded = true;
    window.clientOnlineMobileScriptLoading = false;
    console.log('✅ Client online mobile JS chargé (largeur:', window.innerWidth, 'px)');
  };
  script.onerror = () => {
    window.clientOnlineMobileScriptLoading = false;
    console.error('❌ Erreur chargement client_online_mobile.js');
  };
  window.clientOnlineMobileScriptLoading = true;
  document.head.appendChild(script);
  console.log('📱 Chargement JS mobile initié (largeur:', window.innerWidth, 'px, UA mobile:', isMobileUA, ')');
  
  return true;
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  // Portail : déplacer les modals en enfant direct de <body> dès le chargement
  ensureModalInBody('cart-modal');
  ensureModalInBody('promotions-modal');
  ensureModalInBody('tutorial-modal');
  ensureModalInBody('saved-cart-code-modal');
  ensureModalInBody('order-info-modal');
  ensureModalInBody('pack-modal');
  
  // Détecter la langue du navigateur (si pas déjà fait dans client_base.js)
  if (typeof detectBrowserLanguage === 'function') {
    currentLanguage = detectBrowserLanguage();
  }
  
  // Appliquer la langue détectée automatiquement
  updateInterfaceLanguage();
  
  loadProducts();
  setupEventListeners();
  renderTutorial();
  
  // Setup boutons langue
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLanguage = btn.dataset.lang;
      updateInterfaceLanguage();
      loadProducts();
      if (cart.length > 0) {
        renderCartItems();
      }
    });
  });
  
  // Setup colonne toggle
  document.querySelectorAll('.toggle-column-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleColumn(btn.dataset.column);
    });
  });

  // Setup réouverture colonnes au clic sur le bandeau réduit
  const leftColumn = document.querySelector('.left-column');
  if (leftColumn) {
    leftColumn.addEventListener('click', (e) => {
      const col = e.currentTarget;
      if (col.classList.contains('collapsed')) {
        toggleColumn('left');
      }
    });
  }

  const rightColumn = document.querySelector('.right-column');
  if (rightColumn) {
    rightColumn.addEventListener('click', (e) => {
      const col = e.currentTarget;
      if (col.classList.contains('collapsed')) {
        toggleColumn('right');
      }
    });
  }
  
  // Charger le CSS mobile si nécessaire (même en mode responsive)
  loadMobileCSSIfNeeded();
  
  // Écouter les changements de taille pour charger/décharger le CSS mobile
  window.addEventListener('resize', () => {
    loadMobileCSSIfNeeded();
  });
  
  // Détecter mobile et charger le fichier mobile si nécessaire
  const mobileLoaded = detectAndLoadMobile();
  console.log('📱 detectAndLoadMobile() retourné:', mobileLoaded, '(largeur:', window.innerWidth, 'px)');
  
  if (mobileLoaded) {
    // Si on est sur mobile, le fichier mobile.js s'occupera de l'initialisation
    console.log('📱 Mode mobile détecté, initialisation mobile en cours...');
    return;
  }
  
  // Démarrer le polling intelligent (desktop uniquement)
  startPhotoPolling();
  
  // Adapter la fréquence selon la visibilité de l'onglet
  document.addEventListener('visibilitychange', () => {
    updatePollingFrequency();
  });
  
  // Adapter aussi selon l'activité (mouvement de souris, clics, etc.)
  let activityTimeout;
  const resetActivity = () => {
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
      updatePollingFrequency();
    }, 30000); // 30 secondes d'inactivité
  };
  
  document.addEventListener('mousemove', resetActivity);
  document.addEventListener('click', resetActivity);
  document.addEventListener('keypress', resetActivity);
});
