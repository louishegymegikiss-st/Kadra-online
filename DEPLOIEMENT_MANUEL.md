# Déploiement Manuel sur Infomaniak

## Option 1 : Upload via FTP/SFTP (le plus simple)

### 1. Préparer les fichiers

Tous les fichiers à uploader sont dans :
```
C:\Kadra by ST\Livrables\Phase 1\deploy_infomaniak\
```

### 2. Fichiers à uploader

Uploadez **tous** les fichiers et dossiers suivants dans `/srv/customer/sites/galerie.photoslesgarennes.com/` :

**Fichiers à la racine :**
- `index.html`
- `server.js`
- `package.json`
- `.gitignore`
- `.htaccess`
- `.npmrc`
- `README.md`

**Dossier `static/` (tout le contenu) :**
- `static/css/` (tous les fichiers .css)
- `static/js/` (tous les fichiers .js)
- `static/favicon.png`
- `static/logo/Photo Les Garennes.png`

### 3. Structure finale sur Infomaniak

```
/srv/customer/sites/galerie.photoslesgarennes.com/
  index.html
  server.js
  package.json
  .gitignore
  .htaccess
  .npmrc
  static/
    css/
      admin.css
      client_base.css
      client_local_desktop.css
      client_online_desktop.css
      client_online_mobile.css
      vendor.css
    js/
      admin.js
      client_base.js
      client_local_desktop.js
      client_offline.js
      client_online.js
      client_online_desktop.js
      client_online_mobile.js
      client_polling.js
      client.js
      vendor.js
    favicon.png
    logo/
      Photo Les Garennes.png
```

## Option 2 : Clone manuel via SSH

1. Connectez-vous en SSH à Infomaniak
2. Exécutez :

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com
git clone https://github.com/louishegymegikiss-st/Kadra-online.git temp
mv temp/* .
mv temp/.gitignore .
mv temp/.htaccess .
mv temp/.npmrc .
rm -rf temp
```

## Option 3 : Script PowerShell pour upload (Windows)

Voir `upload-to-infomaniak.ps1` (à créer si vous avez les credentials FTP)

## Après l'upload

1. **Installer les dépendances Node.js** :
```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com
npm install
```

2. **Configurer Node.js dans Infomaniak** :
   - Commande de construction : (vide ou `npm install`)
   - Commande de démarrage : `cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js`
   - Port : `3000`

3. **Démarrer le serveur** et vérifier les logs
