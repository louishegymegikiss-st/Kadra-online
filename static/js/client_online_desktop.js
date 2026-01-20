// Client Online Desktop JS - Interface online desktop (responsive desktop)
// Polling intelligent pour détecter les changements de photos

// Polling intelligent pour détecter les changements de photos
let lastPhotoStatusHash = null;
let photoPollingInterval = null;
let pollIntervalMs = 5000; // 5 secondes par défaut (actif)
const POLL_INTERVAL_ACTIVE = 5000; // 5 secondes quand l'utilisateur est actif
const POLL_INTERVAL_INACTIVE = 30000; // 30 secondes quand l'utilisateur est inactif

// Vérifier les mises à jour des photos
async function checkPhotoUpdates() {
  try {
    const response = await fetch(`${API_BASE}/photos/status`);
    if (!response.ok) return;
    
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

// Détecter si on est sur mobile et charger le fichier mobile si nécessaire
function detectAndLoadMobile() {
  // Détecter si on est sur mobile (largeur <= 768px ou User-Agent mobile)
  const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Charger le fichier mobile
    const script = document.createElement('script');
    script.src = '/static/js/client_online_mobile.js?v=1';
    script.onload = () => {
      console.log('Client online mobile JS chargé');
    };
    document.head.appendChild(script);
    
    // Charger aussi le CSS mobile si pas déjà chargé
    const mobileCssLink = document.querySelector('link[href*="client_online_mobile.css"]');
    if (!mobileCssLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/static/css/client_online_mobile.css?v=1';
      document.head.appendChild(link);
    }
    
    return true;
  }
  return false;
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  // Portail : déplacer les modals en enfant direct de <body> dès le chargement
  ensureModalInBody('cart-modal');
  ensureModalInBody('promotions-modal');
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
  
  // Détecter mobile et charger le fichier mobile si nécessaire
  if (detectAndLoadMobile()) {
    // Si on est sur mobile, le fichier mobile.js s'occupera de l'initialisation
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
