# Déploiement Infomaniak - Étape par étape

## ⚠️ Si rien n'est stocké dans Infomaniak

Cela signifie que le déploiement Git n'a pas encore été fait ou n'est pas configuré.

## Étape 1 : Vérifier la configuration Git dans Infomaniak

Dans Manager Infomaniak > Git (ou Déploiement automatique) :

1. **Repository** : `https://github.com/louishegymegikiss-st/Kadra-online.git`
2. **Branche** : `main`
3. **Répertoire source** : (ne peut pas être changé - laissé tel quel)
4. **Répertoire de déploiement** : (laisser vide ou mettre `.` pour racine)

## Étape 2 : Lancer le déploiement Git

1. Cliquez sur **"Déployer"** ou **"Synchroniser"** dans Manager Infomaniak
2. Attendez que le déploiement se termine
3. Vérifiez les logs de déploiement

## Étape 3 : Vérifier que les fichiers sont déployés

Après le déploiement Git, vous devriez avoir dans `/srv/customer/sites/galerie.photoslesgarennes.com/` :

- `index.html`
- `server.js`
- `package.json`
- `static/` (dossier avec css, js, logo)
- `package.json`
- etc.

## Étape 4 : Configurer Node.js

Une fois les fichiers déployés, configurez Node.js :

**Commande de construction** :
```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com && npm install
```

**Commande de démarrage** :
```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js
```

**Port** : `3000`

## Si le déploiement Git ne fonctionne pas

### Option A : Déploiement manuel via SSH

1. Connectez-vous en SSH à Infomaniak
2. Clonez le repository :
```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com
git clone https://github.com/louishegymegikiss-st/Kadra-online.git .
```

### Option B : Upload via FTP/SFTP

1. Téléchargez tous les fichiers du repository local
2. Uploadez-les via FTP/SFTP dans `/srv/customer/sites/galerie.photoslesgarennes.com/`

## Vérification

Pour vérifier que les fichiers sont présents, connectez-vous en SSH et exécutez :

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com
ls -la
```

Vous devriez voir `index.html`, `server.js`, `package.json`, etc.
