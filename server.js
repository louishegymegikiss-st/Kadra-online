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
// Infomaniak clone le repo, donc __dirname pointe vers le repo cloné
const STATIC_DIR = __dirname;

// Vérifier que index.html existe
const indexPath = path.join(STATIC_DIR, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error(`ERREUR: index.html introuvable dans ${STATIC_DIR}`);
  console.error(`Fichiers présents:`, fs.readdirSync(STATIC_DIR));
  process.exit(1);
}

console.log(`Répertoire statique: ${STATIC_DIR}`);
console.log(`index.html trouvé: ${indexPath}`);

// Servir les fichiers statiques depuis le répertoire courant
app.use(express.static(STATIC_DIR));

// Route pour index.html (SPA) - toutes les routes non-fichiers
app.get('*', (req, res) => {
  // Si c'est un fichier statique (CSS, JS, images), Express le sert automatiquement
  // Sinon, servir index.html pour le routing SPA
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Fichiers statiques servis depuis: ${STATIC_DIR}`);
  console.log(`index.html accessible: ${indexPath}`);
});
