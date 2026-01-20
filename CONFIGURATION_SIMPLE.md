# Configuration Simple Infomaniak

## Principe

Le repo contient déjà `index.html` à la racine + `static/`. Pas besoin de build ni de `www/` ou `dist/`.

## Configuration Node.js

Dans Manager Infomaniak > Node.js :

```
Répertoire source: (ne peut pas être changé - doit pointer vers la racine du repo)
Commande de construction: (laisser vide)
OU
Commande de construction: npm ci --omit=dev
Commande de démarrage: node server.js
Port: 3000
```

## Si Infomaniak lance depuis le mauvais répertoire

Si l'erreur montre que Node est lancé depuis `/srv/customer/` au lieu du repo, utilisez :

```
Commande de démarrage: cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js
```

(Remplacez `galerie.photoslesgarennes.com` par votre sous-domaine exact)

## Configuration Git (optionnel - si déploiement automatique)

Si vous utilisez Git pour déployer :

```
Repository: https://github.com/louishegymegikiss-st/Kadra-online.git
Branche: main
Répertoire source: (ne peut pas être changé)
Répertoire de déploiement: (laisser vide ou mettre . pour racine)
```

## Structure du repo

```
repo/
  index.html          ← À la racine
  static/
    css/
    js/
    logo/
  server.js           ← À la racine
  package.json        ← À la racine
```

Le serveur sert directement depuis la racine où se trouve `server.js`.
