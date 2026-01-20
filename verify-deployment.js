/**
 * Script de vérification du déploiement
 * À exécuter après le clone sur Infomaniak pour vérifier que tous les fichiers sont présents
 */
const fs = require('fs');
const path = require('path');

console.log('=== VERIFICATION DEPLOIEMENT ===');
console.log(`Répertoire courant: ${process.cwd()}`);
console.log(`__dirname: ${__dirname}`);

const requiredFiles = [
  'index.html',
  'package.json',
  'server.js',
  'static/css/client_base.css',
  'static/css/client_online_desktop.css',
  'static/js/client_base.js',
  'static/js/client_online_desktop.js',
];

let allPresent = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file} ${exists ? 'PRESENT' : 'MANQUANT'}`);
  if (!exists) {
    allPresent = false;
    // Chercher dans le répertoire parent
    const parentPath = path.join(path.dirname(__dirname), file);
    if (fs.existsSync(parentPath)) {
      console.log(`   ⚠️  Trouvé dans le répertoire parent: ${parentPath}`);
    }
  }
});

if (!allPresent) {
  console.error('\n❌ Certains fichiers requis sont manquants !');
  console.error('Vérifiez la configuration Git dans Infomaniak.');
  process.exit(1);
} else {
  console.log('\n✅ Tous les fichiers requis sont présents !');
}
