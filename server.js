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
// __dirname pointe vers le répertoire où se trouve server.js
// Mais Infomaniak peut cloner ailleurs ou dans un sous-dossier

// Liste des emplacements possibles pour index.html
const possibleDirs = [
  __dirname,                                    // Répertoire où se trouve server.js
  process.cwd(),                                 // Répertoire de travail courant
  path.dirname(__dirname),                       // Répertoire parent
  path.join(__dirname, 'www'),                  // Sous-dossier www
  path.join(__dirname, 'public_html'),          // Sous-dossier public_html
  path.join(__dirname, 'public'),               // Sous-dossier public
  path.join(__dirname, 'dist'),                 // Sous-dossier dist
  path.join(__dirname, 'build'),                // Sous-dossier build
  '/srv/customer/site/galerie.photolesgarennes.com',  // Chemin exact Infomaniak
];

// Chercher index.html dans tous les emplacements possibles
let actualStaticDir = null;
let indexPath = null;

console.log('\n=== RECHERCHE index.html ===');
for (const dir of possibleDirs) {
  try {
    if (!fs.existsSync(dir)) {
      console.log(`  [SKIP] ${dir} (n'existe pas)`);
      continue;
    }
    
    const testPath = path.join(dir, 'index.html');
    if (fs.existsSync(testPath)) {
      actualStaticDir = dir;
      indexPath = testPath;
      console.log(`  ✅ TROUVÉ: ${dir}`);
      break;
    } else {
      console.log(`  [NOT FOUND] ${dir}`);
    }
  } catch (err) {
    console.log(`  [ERROR] ${dir} - ${err.message}`);
  }
}

// Si toujours pas trouvé, recherche récursive dans __dirname
if (!actualStaticDir) {
  console.log('\n=== RECHERCHE RÉCURSIVE ===');
  const recursiveResult = findIndexHtmlRecursive(__dirname);
  if (recursiveResult) {
    actualStaticDir = recursiveResult;
    indexPath = path.join(recursiveResult, 'index.html');
    console.log(`  ✅ TROUVÉ (récursif): ${recursiveResult}`);
  } else {
    console.log(`  ❌ Pas trouvé même en récursif`);
  }
}

// Si toujours pas trouvé, utiliser __dirname par défaut et lister TOUT
if (!actualStaticDir) {
  actualStaticDir = __dirname;
  indexPath = path.join(__dirname, 'index.html');
  console.error(`\n❌ index.html NON TROUVÉ - Liste complète des fichiers:`);
  
  // Lister récursivement tous les fichiers pour diagnostic
  function listAllFiles(dir, prefix = '', maxDepth = 5, currentDepth = 0) {
    if (currentDepth > maxDepth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            console.error(`${prefix}[DIR] ${entry.name}/`);
            listAllFiles(fullPath, prefix + '  ', maxDepth, currentDepth + 1);
          }
        } else {
          console.error(`${prefix}[FILE] ${entry.name}`);
        }
      }
    } catch (err) {
      console.error(`${prefix}[ERROR] ${err.message}`);
    }
  }
  
  console.error(`\nContenu de __dirname (${__dirname}):`);
  listAllFiles(__dirname);
  
  console.error(`\nContenu de process.cwd() (${process.cwd()}):`);
  if (process.cwd() !== __dirname) {
    listAllFiles(process.cwd());
  }
}

// Diagnostic complet
console.log('=== DIAGNOSTIC SERVEUR ===');
console.log(`__dirname: ${__dirname}`);
console.log(`process.cwd(): ${process.cwd()}`);
console.log(`Répertoire statique utilisé: ${actualStaticDir}`);
console.log(`index.html trouvé: ${indexPath}`);
console.log(`index.html existe: ${fs.existsSync(indexPath)}`);

// Lister tous les fichiers dans le répertoire statique utilisé
try {
  const files = fs.readdirSync(actualStaticDir);
  console.log(`\nFichiers dans ${actualStaticDir}:`);
  files.forEach(file => {
    const filePath = path.join(actualStaticDir, file);
    try {
      const stats = fs.statSync(filePath);
      console.log(`  ${stats.isDirectory() ? '[DIR]' : '[FILE]'} ${file}`);
    } catch (err) {
      console.log(`  [ERROR] ${file} - ${err.message}`);
    }
  });
} catch (err) {
  console.error(`Erreur lecture répertoire ${actualStaticDir}: ${err.message}`);
}

if (!fs.existsSync(indexPath)) {
  console.error(`\n❌ ERREUR CRITIQUE: index.html introuvable même après recherche`);
  console.error(`Tous les emplacements testés:`, possibleDirs);
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
  console.log(`\n✅ Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Fichiers statiques servis depuis: ${actualStaticDir}`);
  console.log(`📄 index.html accessible: ${indexPath}`);
  console.log(`🌐 Serveur prêt à recevoir des requêtes`);
});
