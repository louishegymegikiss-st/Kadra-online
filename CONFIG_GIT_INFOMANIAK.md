# Configuration Git Infomaniak - IMPORTANT

## ⚠️ Le répertoire source ne peut pas être changé

Si vous ne pouvez pas modifier le **répertoire source** dans Infomaniak, configurez uniquement le **répertoire de déploiement**.

## Configuration Git (déploiement automatique)

Dans Manager Infomaniak > Git :

```
Repository: https://github.com/louishegymegikiss-st/Kadra-online.git
Branche: main
Répertoire source: (ne peut pas être changé - laissé tel quel)
Répertoire de déploiement: www/    ← METTEZ www/ ICI
```

**OU** si `www/` ne fonctionne pas :

```
Répertoire de déploiement: public_html/    ← Essayez public_html/
```

## Configuration Node.js

Dans Manager Infomaniak > Node.js :

```
Répertoire source: (ne peut pas être changé - laissé tel quel)
Commande de construction: npm install
Commande de démarrage: npm start
Port: 3000
```

## Explication

1. **Git clone** le repo dans `/srv/customer/sites/galerie.photolesgarennes.com/`
2. **Git copie** les fichiers dans le **répertoire de déploiement** (`www/` ou `public_html/`)
3. Le **serveur Node.js** cherche automatiquement dans tous les emplacements possibles, y compris `www/` et `public_html/`

## Si erreur de déploiement

1. Vérifiez que le **répertoire de déploiement** est bien `www/` (ou `public_html/`)
2. Vérifiez que les fichiers sont bien copiés dans ce répertoire après le déploiement Git
3. Le serveur Node.js trouvera automatiquement les fichiers, même si le répertoire source ne peut pas être changé

## Vérification

Après déploiement, vérifiez que ces fichiers existent :
- `/srv/customer/sites/galerie.photolesgarennes.com/www/index.html`
- `/srv/customer/sites/galerie.photolesgarennes.com/www/server.js`
- `/srv/customer/sites/galerie.photolesgarennes.com/www/package.json`

Si les fichiers sont là, le serveur les trouvera automatiquement.
