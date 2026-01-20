/**
 * Serveur Express minimal pour servir les fichiers statiques
 * Utilisé uniquement si Infomaniak nécessite Node.js
 * Sinon, servez directement depuis le répertoire web (www/)
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Déterminer le répertoire statique (où se trouve index.html)
// Infomaniak clone le repo dans /srv/customer/site/galerie.photolesgarennes.com
// __dirname pointe vers le répertoire où se trouve server.js (racine du repo cloné)
const STATIC_DIR = __dirname;

// Si index.html n'est pas dans __dirname, chercher dans le répertoire parent
// (au cas où Infomaniak clone dans un sous-dossier)
let actualStaticDir = STATIC_DIR;
const indexPathInDir = path.join(STATIC_DIR, 'index.html');
if (!fs.existsSync(indexPathInDir)) {
  // Essayer le répertoire parent
  const parentDir = path.dirname(STATIC_DIR);
  const indexPathInParent = path.join(parentDir, 'index.html');
  if (fs.existsSync(indexPathInParent)) {
    actualStaticDir = parentDir;
    console.log(`⚠️  index.html trouvé dans le répertoire parent: ${parentDir}`);
  }
}

// Diagnostic complet
console.log('=== DIAGNOSTIC SERVEUR ===');
console.log(`__dirname: ${__dirname}`);
console.log(`process.cwd(): ${process.cwd()}`);
console.log(`STATIC_DIR: ${STATIC_DIR}`);

// Lister tous les fichiers dans le répertoire
try {
  const files = fs.readdirSync(STATIC_DIR);
  console.log(`Fichiers dans ${STATIC_DIR}:`);
  files.forEach(file => {
    const filePath = path.join(STATIC_DIR, file);
    const stats = fs.statSync(filePath);
    console.log(`  ${stats.isDirectory() ? '[DIR]' : '[FILE]'} ${file}`);
  });
} catch (err) {
  console.error(`Erreur lecture répertoire: ${err.message}`);
}

// Vérifier que index.html existe
const indexPath = path.join(actualStaticDir, 'index.html');
console.log(`Recherche index.html dans: ${indexPath}`);
console.log(`index.html existe: ${fs.existsSync(indexPath)}`);

if (!fs.existsSync(indexPath)) {
  console.error(`\n❌ ERREUR: index.html introuvable dans ${STATIC_DIR}`);
  console.error(`Chemin recherché: ${indexPath}`);
  
  // Chercher index.html ailleurs
  console.error('\nRecherche alternative...');
  const possiblePaths = [
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, 'www', 'index.html'),
    path.join(__dirname, 'public_html', 'index.html'),
    path.join(__dirname, 'public', 'index.html'),
    path.join(__dirname, 'dist', 'index.html'),
    path.join(__dirname, 'build', 'index.html'),
  ];
  
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      console.error(`✅ Trouvé index.html dans: ${possiblePath}`);
      console.error(`   Utilisez ce chemin dans la configuration Infomaniak`);
    }
  }
  
  // Ne pas quitter - laisser le serveur démarrer pour voir les autres erreurs
  console.error('\n⚠️  Le serveur démarre quand même, mais index.html ne sera pas accessible');
}

// Servir les fichiers statiques depuis le répertoire déterminé
app.use(express.static(actualStaticDir, {
  dotfiles: 'ignore',
  index: false // Ne pas servir index.html automatiquement, on le gère manuellement
}));

// Route pour index.html (SPA) - toutes les routes non-fichiers
app.get('*', (req, res) => {
  // Si c'est un fichier statique (CSS, JS, images), Express le sert automatiquement
  // Sinon, servir index.html pour le routing SPA
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error(`Tentative d'accès à ${req.path} mais index.html introuvable`);
    res.status(404).send(`
      <h1>Erreur 404 - index.html introuvable</h1>
      <p>Le fichier index.html n'a pas été trouvé dans: ${STATIC_DIR}</p>
      <p>Vérifiez la configuration Infomaniak (répertoire source et déploiement)</p>
      <pre>__dirname: ${__dirname}
process.cwd(): ${process.cwd()}
STATIC_DIR: ${STATIC_DIR}</pre>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Fichiers statiques servis depuis: ${STATIC_DIR}`);
  console.log(`index.html accessible: ${indexPath}`);
});
