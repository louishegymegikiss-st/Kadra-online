/**
 * Serveur Express minimal pour servir les fichiers statiques
 * Le repo contient déjà index.html à la racine + static/
 * On sert directement depuis la racine du repo (où est server.js)
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Dossier où est server.js = racine du repo
const ROOT = __dirname;
const indexPath = path.join(ROOT, 'index.html');

console.log('=== CONFIGURATION SERVEUR ===');
console.log('ROOT =', ROOT);
console.log('index.html existe =', fs.existsSync(indexPath));

if (!fs.existsSync(indexPath)) {
  console.error('\n❌ ERREUR: index.html manquant dans', ROOT);
  console.error('Contenu de ROOT:', fs.readdirSync(ROOT));
} else {
  console.log('✅ index.html trouvé, serveur prêt');
}

// Servir les fichiers statiques depuis la racine
app.use(express.static(ROOT, {
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
      <p>Le fichier index.html n'a pas été trouvé dans: ${ROOT}</p>
      <p>Vérifiez que le répertoire source Node.js pointe vers la racine du repo</p>
      <pre>ROOT: ${ROOT}</pre>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Fichiers servis depuis: ${ROOT}`);
  console.log(`🌐 Serveur prêt à recevoir des requêtes`);
});
