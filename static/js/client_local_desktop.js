// Client Local Desktop JS - Interface locale desktop (16:9, écran fixe)
// Initialisation spécifique pour l'interface locale desktop

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  // Portail : déplacer les modals en enfant direct de <body> dès le chargement
  // Fix pour problème n°1 : parent avec transform
  ensureModalInBody('cart-modal');
  ensureModalInBody('promotions-modal');
  ensureModalInBody('saved-cart-code-modal');
  ensureModalInBody('order-info-modal');
  ensureModalInBody('pack-modal');
  
  loadProducts();
  setupEventListeners();
  renderTutorial();
  
  // Setup boutons langue
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLanguage = btn.dataset.lang;
      updateInterfaceLanguage();
      loadProducts(); // Recharger les produits pour avoir les noms traduits
      // Re-rendre le panier pour mettre à jour les noms traduits
      if (cart.length > 0) {
        renderCartItems();
      }
    });
  });
  
  // Setup colonne toggle
  document.querySelectorAll('.toggle-column-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Empêcher la propagation
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
});
