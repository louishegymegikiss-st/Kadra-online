/**
 * Serveur Express minimal pour servir les fichiers statiques
 * Utilisé uniquement si Infomaniak nécessite Node.js
 * Sinon, servez directement depuis le répertoire web (www/)
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir les fichiers statiques depuis le répertoire courant
app.use(express.static(path.join(__dirname)));

// Route pour index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Fichiers statiques servis depuis: ${__dirname}`);
});
