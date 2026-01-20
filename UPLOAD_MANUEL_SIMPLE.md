# Upload Manuel - Guide Simple

## ⚠️ Pas d'option Git dans Infomaniak

Si Infomaniak n'a pas d'option Git, il faut uploader les fichiers manuellement.

## Option 1 : Via File Manager Infomaniak (le plus simple)

### Étape 1 : Accéder au File Manager

1. Connectez-vous à **Manager Infomaniak**
2. Allez dans **"Fichiers"** ou **"File Manager"**
3. Naviguez vers `/srv/customer/sites/galerie.photoslesgarennes.com/`

### Étape 2 : Upload des fichiers

1. **Sélectionnez tous les fichiers** du dossier `deploy_infomaniak/` sur votre PC :
   - `index.html`
   - `server.js`
   - `package.json`
   - `.gitignore`
   - `.htaccess`
   - `.npmrc`
   - `README.md`

2. **Uploadez-les** dans le répertoire du site

3. **Créez le dossier `static/`** et uploadez son contenu :
   - `static/css/` (tous les fichiers .css)
   - `static/js/` (tous les fichiers .js)
   - `static/favicon.png`
   - `static/logo/Photo Les Garennes.png`

## Option 2 : Via FTP/SFTP

### Étape 1 : Obtenir les identifiants FTP

Dans Manager Infomaniak, trouvez :
- **Serveur FTP** : `ftp.galerie.photoslesgarennes.com` (ou similaire)
- **Utilisateur FTP**
- **Mot de passe FTP**
- **Port** : 21 (FTP) ou 22 (SFTP)

### Étape 2 : Utiliser un client FTP

Utilisez **FileZilla**, **WinSCP**, ou un autre client FTP :

1. Connectez-vous avec les identifiants FTP
2. Naviguez vers `/srv/customer/sites/galerie.photoslesgarennes.com/`
3. Uploadez tous les fichiers du dossier `deploy_infomaniak/`

### Structure à créer

```
/srv/customer/sites/galerie.photoslesgarennes.com/
  ├── index.html
  ├── server.js
  ├── package.json
  ├── .gitignore
  ├── .htaccess
  ├── .npmrc
  ├── static/
  │   ├── css/
  │   │   ├── admin.css
  │   │   ├── client_base.css
  │   │   ├── client_local_desktop.css
  │   │   ├── client_online_desktop.css
  │   │   ├── client_online_mobile.css
  │   │   └── vendor.css
  │   ├── js/
  │   │   ├── admin.js
  │   │   ├── client_base.js
  │   │   ├── client_local_desktop.js
  │   │   ├── client_offline.js
  │   │   ├── client_online.js
  │   │   ├── client_online_desktop.js
  │   │   ├── client_online_mobile.js
  │   │   ├── client_polling.js
  │   │   ├── client.js
  │   │   └── vendor.js
  │   ├── favicon.png
  │   └── logo/
  │       └── Photo Les Garennes.png
```

## Option 3 : Via SSH (si disponible)

Si vous avez accès SSH :

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com
git clone https://github.com/louishegymegikiss-st/Kadra-online.git temp
mv temp/* .
mv temp/.gitignore .
mv temp/.htaccess .
mv temp/.npmrc .
rm -rf temp
```

## Après l'upload

1. **Installer les dépendances** :
   - Via SSH : `cd /srv/customer/sites/galerie.photoslesgarennes.com && npm install`
   - OU via Manager Infomaniak > Node.js > Commande de construction : `npm install`

2. **Configurer Node.js** dans Manager Infomaniak :
   - Commande de démarrage : `cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js`
   - Port : `3000`

## Vérification

Pour vérifier que les fichiers sont bien uploadés :

- Via File Manager : vérifiez que `index.html` et `server.js` sont présents
- Via SSH : `ls -la /srv/customer/sites/galerie.photoslesgarennes.com/`
