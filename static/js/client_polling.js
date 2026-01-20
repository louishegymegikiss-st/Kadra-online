/**
 * MODIFICATIONS POUR POLLING INTELLIGENT - Phase 2
 * ================================================
 * 
 * Ce fichier contient uniquement les modifications à apporter à client.js
 * pour ajouter le polling intelligent.
 * 
 * À ajouter dans client.js après la ligne 582 (après let currentSearchResults = [];)
 */

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
      // Si on a une recherche active, la rafraîchir automatiquement
      if (currentSearch && currentSearch.trim().length >= 2) {
        console.log('Changements détectés, rafraîchissement de la recherche...');
        searchPhotos(currentSearch);
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

// MODIFICATION DANS DOMContentLoaded :
// Remplacer la section d'initialisation par :
/*
// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupEventListeners();
  renderTutorial();
  
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
    pollIntervalMs = POLL_INTERVAL_ACTIVE;
    updatePollingFrequency();
    
    // Si pas d'activité pendant 2 minutes, passer en mode inactif
    activityTimeout = setTimeout(() => {
      if (!document.hidden) {
        pollIntervalMs = POLL_INTERVAL_INACTIVE;
        updatePollingFrequency();
      }
    }, 120000); // 2 minutes
  };
  
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetActivity, { passive: true });
  });
  resetActivity(); // Initialiser
  
  // Setup boutons langue
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLanguage = btn.dataset.lang;
      updateInterfaceLanguage();
      loadProducts(); // Recharger les produits pour avoir les noms traduits
    });
  });
});
*/

