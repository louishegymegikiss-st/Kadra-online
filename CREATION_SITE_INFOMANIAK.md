# Création du site sur Infomaniak

## ⚠️ Si vous ne pouvez rien créer

Le répertoire `/srv/customer/sites/galerie.photoslesgarennes.com/` doit être créé par Infomaniak lors de la création du site/domaine.

## Étape 1 : Créer le site dans Manager Infomaniak

1. **Connectez-vous à Manager Infomaniak**
2. Allez dans **"Sites web"** ou **"Domaines"**
3. Cliquez sur **"Ajouter un site"** ou **"Créer un site"**
4. Entrez le domaine : `galerie.photoslesgarennes.com`
5. Choisissez le type : **"Site Node.js"** ou **"Site web"**
6. Validez la création

Infomaniak créera automatiquement le répertoire `/srv/customer/sites/galerie.photoslesgarennes.com/`

## Étape 2 : Vérifier que le répertoire existe

Après création, vérifiez via SSH (si vous avez accès) :

```bash
ls -la /srv/customer/sites/galerie.photoslesgarennes.com/
```

Ou vérifiez dans Manager Infomaniak > Fichiers (File Manager) que le répertoire existe.

## Étape 3 : Upload des fichiers

Une fois le site créé et le répertoire existant, vous pouvez :

### Option A : Via File Manager Infomaniak

1. Allez dans Manager Infomaniak > **Fichiers**
2. Naviguez vers `/srv/customer/sites/galerie.photoslesgarennes.com/`
3. Uploadez tous les fichiers du dossier `deploy_infomaniak/`

### Option B : Via FTP/SFTP

1. Utilisez un client FTP (FileZilla, WinSCP, etc.)
2. Connectez-vous avec vos identifiants Infomaniak
3. Naviguez vers le répertoire du site
4. Uploadez tous les fichiers

### Option C : Via SSH (si disponible)

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com
git clone https://github.com/louishegymegikiss-st/Kadra-online.git .
```

## Étape 4 : Configurer Node.js

Dans Manager Infomaniak > **Node.js** :

1. Sélectionnez votre site `galerie.photoslesgarennes.com`
2. **Commande de construction** : (vide ou `npm install`)
3. **Commande de démarrage** : `cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js`
4. **Port** : `3000`
5. Activez Node.js pour ce site

## Si le site existe déjà

Si le site existe déjà mais que vous ne pouvez pas créer de fichiers :

1. Vérifiez les **permissions** du répertoire
2. Vérifiez que vous êtes connecté avec le **bon compte utilisateur**
3. Contactez le support Infomaniak si nécessaire

## Alternative : Utiliser un sous-dossier

Si vous ne pouvez pas modifier le répertoire racine, créez un sous-dossier :

1. Créez `/srv/customer/sites/galerie.photoslesgarennes.com/kadra/`
2. Uploadez les fichiers dans ce sous-dossier
3. Modifiez `server.js` pour pointer vers ce sous-dossier (ou servez depuis là)
