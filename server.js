/**
 * Serveur Express minimal pour servir les fichiers statiques
 * Convention : les fichiers statiques sont dans www/ (ou dist/)
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Base = dossier où est server.js (donc là où le repo est cloné)
const BASE = __dirname;

// 2) Choisis UN dossier (www pour Infomaniak, ou dist pour build moderne)
// Infomaniak déploie généralement dans www/
const STATIC_DIR = path.join(BASE, 'www'); // ou 'dist' si build moderne

const indexPath = path.join(STATIC_DIR, 'index.html');

// Logs utiles
console.log('=== CONFIGURATION SERVEUR ===');
console.log('BASE =', BASE);
console.log('STATIC_DIR =', STATIC_DIR);
console.log('indexPath =', indexPath);
console.log('index.html existe =', fs.existsSync(indexPath));

// 3) Fails fast si pas d'index
if (!fs.existsSync(indexPath)) {
  console.error('\n❌ ERREUR: index.html manquant dans', STATIC_DIR);
  console.error('Contenu de BASE:', fs.readdirSync(BASE));
  
  // Essayer dist/ si www/ n'existe pas
  const distPath = path.join(BASE, 'dist', 'index.html');
  if (fs.existsSync(distPath)) {
    console.error('⚠️  Mais index.html trouvé dans dist/ - changez STATIC_DIR vers dist/');
  }
  
  // Essayer public_html/ si www/ n'existe pas
  const publicHtmlPath = path.join(BASE, 'public_html', 'index.html');
  if (fs.existsSync(publicHtmlPath)) {
    console.error('⚠️  Mais index.html trouvé dans public_html/ - changez STATIC_DIR vers public_html/');
  }
  
  // Essayer directement dans BASE
  const baseIndexPath = path.join(BASE, 'index.html');
  if (fs.existsSync(baseIndexPath)) {
    console.error('⚠️  Mais index.html trouvé dans BASE - changez STATIC_DIR vers BASE');
  }
} else {
  console.log('✅ index.html trouvé, serveur prêt');
}

// 4) Static + SPA fallback
app.use(express.static(STATIC_DIR, {
  dotfiles: 'ignore',
  index: false // Ne pas servir index.html automatiquement, on le gère manuellement
}));

// Route pour index.html (SPA) - toutes les routes non-fichiers
app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h1>Erreur 404 - index.html introuvable</h1>
      <p>Le fichier index.html n'a pas été trouvé dans: ${STATIC_DIR}</p>
      <p>Vérifiez la configuration Git (répertoire de déploiement = www/)</p>
      <pre>BASE: ${BASE}
STATIC_DIR: ${STATIC_DIR}
indexPath: ${indexPath}</pre>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Fichiers statiques servis depuis: ${STATIC_DIR}`);
  console.log(`🌐 Serveur prêt à recevoir des requêtes`);
});
