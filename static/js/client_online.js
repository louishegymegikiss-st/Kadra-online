// Client Online JS - Interface online (desktop + mobile unifié)
// Polling intelligent + fonctions spécifiques mobile

// Variables globales pour polling
if (typeof lastPhotoStatusHash === 'undefined') {
  var lastPhotoStatusHash = null;
}
if (typeof photoPollingInterval === 'undefined') {
  var photoPollingInterval = null;
}
if (typeof pollIntervalMs === 'undefined') {
  var pollIntervalMs = 5000; // 5 secondes par défaut (actif)
}
const POLL_INTERVAL_ACTIVE = 5000; // 5 secondes quand l'utilisateur est actif
const POLL_INTERVAL_INACTIVE = 30000; // 30 secondes quand l'utilisateur est inactif

// ========== FONCTIONS MOBILE ==========

// Toggle menu burger mobile
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (!menu) {
    console.error('Menu mobile non trouvé');
    return;
  }
  
  // Vérifier si le menu est ouvert en regardant la classe active
  const isOpen = menu.classList.contains('active');
  
  if (isOpen) {
    menu.classList.remove('active');
    document.body.style.overflow = '';
  } else {
    menu.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  console.log('Menu mobile toggled:', isOpen ? 'fermé' : 'ouvert');
}

// S'assurer que la fonction est accessible globalement
window.toggleMobileMenu = toggleMobileMenu;

// Créer la bottom bar sticky pour le panier mobile
function setupMobileCartBar() {
  let cartBar = document.getElementById('mobile-cart-bar');
  
  if (window.innerWidth <= 768 && !cartBar) {
    // Créer la bottom bar
    cartBar = document.createElement('div');
    cartBar.id = 'mobile-cart-bar';
    cartBar.innerHTML = `
      <div class="cart-info">
        <span class="cart-icon">🛒</span>
        <span class="cart-text" data-i18n="mobile_cart_selected">0 photo sélectionnée</span>
      </div>
      <button class="view-cart-btn" data-i18n="view_cart_btn" onclick="toggleCart()">Voir le panier</button>
    `;
    
    document.body.appendChild(cartBar);
    
    // Mettre à jour la bar
    updateMobileCartBar();
  } else if (window.innerWidth > 768 && cartBar) {
    // Supprimer sur desktop
    cartBar.remove();
    document.body.classList.remove('has-cart-bar');
  }
}

// Mettre à jour la bottom bar du panier mobile
function updateMobileCartBar() {
  const cartBar = document.getElementById('mobile-cart-bar');
  if (!cartBar) return;
  
  const count = cart.length;
  const cartText = cartBar.querySelector('.cart-text');
  
  if (count > 0) {
    cartBar.classList.add('active');
    document.body.classList.add('has-cart-bar');
    
    // Texte pluriel
    const text = count === 1 ? '1 photo sélectionnée' : `${count} photos sélectionnées`;
    if (cartText) cartText.textContent = text;
    
    // Animation pop
    cartBar.style.transform = 'scale(1.02)';
    setTimeout(() => cartBar.style.transform = 'scale(1)', 200);
  } else {
    cartBar.classList.remove('active');
    document.body.classList.remove('has-cart-bar');
    if (cartText) cartText.textContent = '0 photo sélectionnée';
  }
}

// Surcharger updateCartUI pour mettre à jour la bar mobile
const originalUpdateCartUI = window.updateCartUI;
if (originalUpdateCartUI) {
  window.updateCartUI = function() {
    originalUpdateCartUI.apply(this, arguments);
    updateMobileCartBar();
  };
} else {
  // Si updateCartUI n'existe pas encore, l'attendre
  window.addEventListener('DOMContentLoaded', () => {
    if (window.updateCartUI) {
      const original = window.updateCartUI;
      window.updateCartUI = function() {
        original.apply(this, arguments);
        updateMobileCartBar();
      };
    }
  });
}

// Initialiser le filtre d'événements dans le header mobile
function initMobileEventFilter() {
  const eventFilter = document.getElementById('event-filter-header');
  if (!eventFilter) return;
  
  // Synchroniser avec le filtre principal si il existe
  const mainFilter = document.getElementById('event-filter-mobile') || document.getElementById('event-filter');
  if (mainFilter) {
    // Copier les options
    eventFilter.innerHTML = mainFilter.innerHTML;
    eventFilter.value = mainFilter.value;
    
    // Synchroniser les changements
    eventFilter.addEventListener('change', (e) => {
      if (mainFilter) mainFilter.value = e.target.value;
      if (typeof handleEventFilterChange === 'function') {
        handleEventFilterChange(e);
      }
    });
    
    if (mainFilter.addEventListener) {
      mainFilter.addEventListener('change', (e) => {
        eventFilter.value = e.target.value;
      });
    }
  }
  
  // Initialiser les événements disponibles
  if (typeof initEventFilter === 'function') {
    initEventFilter();
  }
}

// Gérer le select de langue dans le menu mobile
function setupMobileMenuLangSelect() {
  const langSelect = document.getElementById('mobile-lang-select-menu');
  if (!langSelect) return;
  
  // Définir la langue actuelle
  langSelect.value = currentLanguage || 'fr';
  
  // Gérer le changement de langue
  langSelect.addEventListener('change', (e) => {
    const newLang = e.target.value;
    currentLanguage = newLang;
    
    // Sauvegarder la préférence
    try {
      localStorage.setItem('preferred_language', newLang);
    } catch (e) {
      console.log('Impossible de sauvegarder la langue');
    }
    
    updateInterfaceLanguage();
    loadProducts();
    if (cart.length > 0) {
      renderCartItems();
    }
    
    // Mettre à jour les boutons langue desktop
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === newLang);
    });
  });
}

// Gérer le hide/show du header au scroll sur mobile uniquement
function setupMobileHeaderScroll() {
  // Ne s'exécute que sur mobile
  if (window.innerWidth > 768) {
    const header = document.querySelector('.header');
    if (header) {
      header.classList.remove('header-hidden');
      header.style.cssText = '';
    }
    return;
  }
  
  let lastScrollTop = 0;
  let ticking = false;
  const header = document.querySelector('.header');
  
  if (!header) {
    console.warn('Header non trouvé pour setupMobileHeaderScroll');
    return;
  }
  
  // Vérifier si un parent a un transform qui casse le position: fixed
  let parent = header.parentElement;
  let hasTransformParent = false;
  while (parent && parent !== document.body) {
    const computed = window.getComputedStyle(parent);
    if (computed.transform !== 'none' || computed.perspective !== 'none' || computed.filter !== 'none') {
      hasTransformParent = true;
    }
    parent = parent.parentElement;
  }
  
  // Si un parent a un transform, sortir le header du container
  if (hasTransformParent || header.parentElement.classList.contains('container')) {
    const container = header.parentElement;
    document.body.insertBefore(header, document.body.firstChild);
  }
  
  header.classList.remove('header-hidden');
  header.setAttribute('data-mobile-header', 'true');
  
  const headerHeight = header.offsetHeight || 70;
  
  const forceFixedPosition = () => {
    header.style.setProperty('position', 'fixed', 'important');
    header.style.setProperty('top', '0', 'important');
    header.style.setProperty('left', '0', 'important');
    header.style.setProperty('right', '0', 'important');
    header.style.setProperty('width', '100%', 'important');
    header.style.setProperty('z-index', '1000', 'important');
    header.style.setProperty('transition', 'transform 0.3s ease-in-out', 'important');
    return window.getComputedStyle(header).position === 'fixed';
  };
  
  let isFixed = forceFixedPosition();
  if (!isFixed) {
    setTimeout(() => {
      forceFixedPosition();
    }, 100);
  }
  
  const setHeaderPosition = (translateY) => {
    header.style.setProperty('transform', `translateY(${translateY})`, 'important');
  };
  
  setHeaderPosition('0');
  
  const handleScroll = (event) => {
    if (window.innerWidth > 768) {
      header.classList.remove('header-hidden');
      header.style.cssText = '';
      return;
    }
    
    let scrollTop = 0;
    const container = document.querySelector('.container');
    
    if (event && event.target && event.target.scrollTop !== undefined && event.target.scrollTop > 0) {
      scrollTop = event.target.scrollTop;
    } else if (container && container.scrollTop > 0) {
      scrollTop = container.scrollTop;
    } else {
      scrollTop = window.pageYOffset 
        || document.documentElement.scrollTop 
        || document.body.scrollTop 
        || window.scrollY 
        || 0;
    }
    
    const scrollDelta = scrollTop - lastScrollTop;
    
    if (scrollTop < 50) {
      if (header.classList.contains('header-hidden')) {
        header.classList.remove('header-hidden');
        setHeaderPosition('0');
      }
    } else if (scrollDelta > 5) {
      if (!header.classList.contains('header-hidden')) {
        header.classList.add('header-hidden');
        setHeaderPosition(`-${headerHeight}px`);
      }
    } else if (scrollDelta < -5) {
      if (header.classList.contains('header-hidden')) {
        header.classList.remove('header-hidden');
        setHeaderPosition('0');
      }
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  };
  
  const optimizedHandleScroll = (event) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll(event);
        ticking = false;
      });
      ticking = true;
    }
  };
  
  const scrollContainer = document.querySelector('.container') || document.body;
  window.addEventListener('scroll', optimizedHandleScroll, { passive: true });
  document.addEventListener('scroll', optimizedHandleScroll, { passive: true });
  scrollContainer.addEventListener('scroll', optimizedHandleScroll, { passive: true });
  
  handleScroll();
  
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.innerWidth > 768) {
        header.classList.remove('header-hidden');
        header.style.cssText = '';
      } else {
        header.classList.remove('header-hidden');
        setHeaderPosition('0');
        handleScroll();
      }
    }, 100);
  });
}

// ========== FONCTIONS POLLING ==========

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

// ========== INITIALISATION ==========

function handleClientOnlineReady() {
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
  
  // Setup bouton burger mobile avec addEventListener (plus fiable que onclick)
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Bouton burger cliqué');
      toggleMobileMenu();
    });
    console.log('Bouton burger initialisé');
  } else {
    console.warn('Bouton burger non trouvé');
  }
  
  // Setup bouton fermer du menu
  const mobileMenuClose = document.querySelector('.mobile-menu-close');
  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Bouton fermer menu cliqué');
      toggleMobileMenu();
    });
  }
  
  // Setup actions des items du menu
  document.querySelectorAll('.mobile-menu-item[data-action]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      console.log('Action menu:', action);
      
      toggleMobileMenu(); // Fermer le menu d'abord
      
      // Exécuter l'action après un court délai pour laisser le menu se fermer
      setTimeout(() => {
        switch(action) {
          case 'promotions':
            if (typeof openPromotionsModal === 'function') {
              openPromotionsModal();
            }
            break;
          case 'pack':
            if (typeof handleBuyPack === 'function') {
              handleBuyPack();
            }
            break;
          case 'cart':
            if (typeof toggleCart === 'function') {
              toggleCart();
            }
            break;
          case 'tutorial':
            const rightColumn = document.querySelector('.right-column');
            if (rightColumn) {
              rightColumn.scrollIntoView({behavior: 'smooth'});
            }
            break;
        }
      }, 300);
    });
  });
  
  // Setup code panier mobile
  const cartCodeMobile = document.getElementById('cart-code-search-mobile');
  if (cartCodeMobile) {
    cartCodeMobile.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (typeof loadSavedCart === 'function') {
          loadSavedCart();
        }
        toggleMobileMenu();
      }
    });
  }
  
  // Fermer le menu si on clique en dehors (sur le fond)
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) {
    mobileMenu.addEventListener('click', (e) => {
      // Ne fermer que si on clique directement sur le fond (pas sur le contenu)
      if (e.target === mobileMenu) {
        console.log('Clic sur fond du menu, fermeture');
        toggleMobileMenu();
      }
    });
    
    // Empêcher la propagation des clics sur le contenu du menu
    const menuContent = mobileMenu.querySelector('.mobile-menu-content');
    if (menuContent) {
      menuContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }
  
  // Fonctions spécifiques mobile
  if (window.innerWidth <= 768) {
    // Initialiser le filtre d'événements dans le header
    initMobileEventFilter();
    
    // Gérer le select de langue dans le menu mobile
    setupMobileMenuLangSelect();
    
    // Créer la bottom bar panier sur mobile
    setupMobileCartBar();
    
    // S'assurer que updateMobileCartBar est appelé après chaque updateCartUI
    // Vérifier périodiquement que le bandeau est à jour
    setInterval(() => {
      if (window.innerWidth <= 768) {
        updateMobileCartBar();
      }
    }, 1000);
    
    // Gérer le header qui se cache au scroll sur mobile
    setupMobileHeaderScroll();
  }
  
  // Synchroniser le code panier mobile avec le desktop (si pas déjà fait)
  const cartCodeMobileSync = document.getElementById('cart-code-search-mobile');
  const cartCodeDesktop = document.getElementById('cart-code-search');
  if (cartCodeMobileSync && cartCodeDesktop && !cartCodeMobileSync.dataset.synced) {
    cartCodeMobileSync.dataset.synced = 'true';
    cartCodeMobileSync.addEventListener('input', (e) => {
      cartCodeDesktop.value = e.target.value;
    });
    cartCodeDesktop.addEventListener('input', (e) => {
      cartCodeMobileSync.value = e.target.value;
    });
  }
  
  // Démarrer le polling intelligent
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleClientOnlineReady);
} else {
  handleClientOnlineReady();
}
