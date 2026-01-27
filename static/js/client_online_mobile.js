// Client Online Mobile JS - Interface online mobile (responsive mobile)
// Polling intelligent + fonctions spécifiques mobile

// Polling intelligent pour détecter les changements de photos
// Vérifier si la variable n'est pas déjà déclarée (évite SyntaxError si chargé deux fois)
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

const MOBILE_SEARCH_BREAKPOINT = 768;
const MOBILE_SEARCH_SHELL_ID = 'mobile-search-shell';
let mobileSearchResizeTimer = null;

function relocatePhotoSearchForMobile() {
  const headerSearch = document.querySelector('.header-search');
  const searchBox = headerSearch?.querySelector('.search-box');
  const mobileShell = document.getElementById(MOBILE_SEARCH_SHELL_ID);

  if (!headerSearch || !searchBox || !mobileShell) {
    return;
  }

  const shouldUseMobileShell = window.innerWidth <= MOBILE_SEARCH_BREAKPOINT;
  const isInMobileShell = mobileShell.contains(searchBox);
  const isInHeader = headerSearch.contains(searchBox);

  if (shouldUseMobileShell && !isInMobileShell) {
    // Déplacer la barre de recherche dans le mobile shell (après le filtre d'événements)
    const eventFilterMobile = document.getElementById('event-filter-container-mobile');
    if (eventFilterMobile && eventFilterMobile.parentNode === mobileShell) {
      // Insérer après le filtre d'événements
      mobileShell.insertBefore(searchBox, eventFilterMobile.nextSibling);
    } else {
      // Si pas de filtre, insérer au début
      mobileShell.insertBefore(searchBox, mobileShell.firstChild);
    }
    // S'assurer que le mobile shell est visible
    mobileShell.style.display = 'flex';
    // Afficher le filtre d'événements mobile
    if (eventFilterMobile) {
      eventFilterMobile.style.display = 'flex';
    }
    // S'assurer que la search-box est visible
    searchBox.style.display = 'block';
    const searchInput = searchBox.querySelector('input');
    if (searchInput) {
      searchInput.style.display = 'block';
    }
    console.log('✅ Barre de recherche déplacée dans mobile-shell');
  } else if (!shouldUseMobileShell && !isInHeader) {
    // Remettre la barre de recherche dans le header
    headerSearch.appendChild(searchBox);
    // Cacher le mobile shell
    mobileShell.style.display = 'none';
    // Cacher le filtre d'événements mobile
    const eventFilterMobile = document.getElementById('event-filter-container-mobile');
    if (eventFilterMobile) {
      eventFilterMobile.style.display = 'none';
    }
    console.log('✅ Barre de recherche remise dans header');
  }
}

function initMobileSearchRelocation() {
  // Appeler immédiatement
  relocatePhotoSearchForMobile();
  
  // Attendre que le DOM soit complètement chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(relocatePhotoSearchForMobile, 100);
    });
  } else {
    setTimeout(relocatePhotoSearchForMobile, 100);
  }
  
  // Écouter les changements de taille
  window.addEventListener('resize', () => {
    clearTimeout(mobileSearchResizeTimer);
    mobileSearchResizeTimer = setTimeout(relocatePhotoSearchForMobile, 150);
  });
}

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

// Gérer le dropdown de langue sur mobile avec select natif
function setupMobileLangDropdown() {
  const headerRightSection = document.querySelector('.header > div > div:last-child');
  
  if (!headerRightSection) return;
  
  // Créer le select natif s'il n'existe pas déjà
  let mobileSelect = document.getElementById('mobile-lang-select');
  
  if (window.innerWidth <= 768 && !mobileSelect) {
    // Créer le select
    mobileSelect = document.createElement('select');
    mobileSelect.id = 'mobile-lang-select';
    
    // Ajouter les options
    const languages = [
      { code: 'fr', label: 'FR' },
      { code: 'en', label: 'EN' },
      { code: 'es', label: 'ES' }
    ];
    
    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.label;
      // Sélectionner la langue détectée automatiquement
      if (lang.code === currentLanguage) {
        option.selected = true;
      }
      mobileSelect.appendChild(option);
    });
    
    // Gérer le changement de langue
    mobileSelect.addEventListener('change', (e) => {
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
      
      // Mettre à jour le bouton actif pour le desktop
      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === newLang);
      });
    });
    
    // Ajouter le select au header
    headerRightSection.appendChild(mobileSelect);
  } else if (window.innerWidth > 768 && mobileSelect) {
    // Supprimer le select sur desktop
    mobileSelect.remove();
  }
  
  // Gérer le redimensionnement (une seule fois, pas à chaque appel)
  if (!window.mobileResizeHandlerAdded) {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setupMobileLangDropdown();
        setupMobileCartBar();
      }, 250);
    });
    window.mobileResizeHandlerAdded = true;
  }
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

function handleClientOnlineMobileReady() {
  initMobileSearchRelocation();
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
  
  // Gérer le dropdown de langue sur mobile
  setupMobileLangDropdown();
  
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
  document.addEventListener('DOMContentLoaded', handleClientOnlineMobileReady);
} else {
  handleClientOnlineMobileReady();
}
