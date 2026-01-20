# Début Rapide - Configuration Infomaniak

## ✅ Les fichiers sont déjà dans le repository GitHub

Le repository `https://github.com/louishegymegikiss-st/Kadra-online.git` contient déjà :
- ✅ `index.html`
- ✅ `server.js`
- ✅ `package.json`
- ✅ `static/` (css, js, logo, favicon)

## Configuration Infomaniak

### Étape 1 : Cloner le repository (si vous avez SSH)

Connectez-vous en SSH et exécutez :

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com
git clone https://github.com/louishegymegikiss-st/Kadra-online.git .
```

### Étape 2 : OU Upload manuel

Si pas de SSH, uploadez tous les fichiers du repository via File Manager ou FTP.

### Étape 3 : Configurer Node.js

Dans Manager Infomaniak > Node.js :

```
Commande de construction: npm install
Commande de démarrage: cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js
Port: 3000
```

## Vérification

Après configuration, vérifiez que ces fichiers existent :
- `/srv/customer/sites/galerie.photoslesgarennes.com/index.html`
- `/srv/customer/sites/galerie.photoslesgarennes.com/server.js`
- `/srv/customer/sites/galerie.photoslesgarennes.com/package.json`
- `/srv/customer/sites/galerie.photoslesgarennes.com/static/`

Si les fichiers sont là, le serveur devrait démarrer correctement.
