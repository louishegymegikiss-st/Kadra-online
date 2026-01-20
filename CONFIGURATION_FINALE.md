# Configuration Finale Infomaniak

## Principe : Convention simple

Le serveur cherche `index.html` dans **un seul endroit** : `www/` (répertoire de déploiement Git).

## Configuration Git (déploiement automatique)

Dans Manager Infomaniak > Git :

```
Repository: https://github.com/louishegymegikiss-st/Kadra-online.git
Branche: main
Répertoire source: (ne peut pas être changé - laissé tel quel)
Répertoire de déploiement: www/    ← OBLIGATOIRE
```

**Important** : Le répertoire de déploiement doit être `www/` pour que le serveur trouve les fichiers.

## Configuration Node.js

Dans Manager Infomaniak > Node.js :

```
Répertoire source: (ne peut pas être changé - laissé tel quel)
Commande de construction: npm install
Commande de démarrage: npm start
Port: 3000
```

## Structure attendue après déploiement Git

```
/srv/customer/sites/galerie.photolesgarennes.com/
  www/                    ← Répertoire de déploiement Git
    index.html            ← Doit être ici
    static/
      css/
      js/
    server.js
    package.json
```

## Si erreur "index.html introuvable"

1. Vérifiez que le **répertoire de déploiement Git** est bien `www/`
2. Vérifiez que les fichiers sont bien copiés dans `www/` après le déploiement
3. Consultez les logs du serveur pour voir où il cherche

## Alternative : Si Infomaniak utilise `public_html/`

Si Infomaniak déploie dans `public_html/` au lieu de `www/`, modifiez `server.js` ligne 15 :

```js
const STATIC_DIR = path.join(BASE, 'public_html'); // au lieu de 'www'
```

Puis recommitez et redéployez.
