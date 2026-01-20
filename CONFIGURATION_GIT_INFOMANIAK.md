# Configuration Git dans Infomaniak

## Si vous avez choisi Git pour l'upload

Infomaniak doit avoir une option "Déploiement Git" ou "Git" dans la configuration du site.

## Configuration Git dans Manager Infomaniak

### Étape 1 : Accéder à la configuration Git

1. Connectez-vous à **Manager Infomaniak**
2. Allez dans **"Sites web"** ou votre site `galerie.photoslesgarennes.com`
3. Cherchez **"Git"**, **"Déploiement Git"**, ou **"Déploiement automatique"**
4. Cliquez pour configurer

### Étape 2 : Configurer le repository

Dans la configuration Git, entrez :

```
Repository: https://github.com/louishegymegikiss-st/Kadra-online.git
Branche: main
Répertoire source: .          (un point = racine du repo)
Répertoire de déploiement: .  (un point = racine du site)
```

**OU** si Infomaniak demande un répertoire de déploiement spécifique :

```
Répertoire de déploiement: www/    (si Infomaniak utilise www/)
```

### Étape 3 : Lancer le déploiement

1. Cliquez sur **"Déployer"**, **"Synchroniser"**, ou **"Pull"**
2. Attendez que le déploiement se termine
3. Vérifiez les logs de déploiement

### Étape 4 : Vérifier les fichiers

Après déploiement, les fichiers doivent être dans :
`/srv/customer/sites/galerie.photoslesgarennes.com/`

Vous devriez voir :
- `index.html`
- `server.js`
- `package.json`
- `static/` (dossier)

## Si Git n'est pas disponible

Si l'option Git n'apparaît pas dans Manager Infomaniak :

1. Vérifiez que votre hébergement Infomaniak supporte Git
2. Vérifiez que Git est activé pour votre compte
3. Contactez le support Infomaniak pour activer Git

## Alternative : SSH + Git clone

Si Git n'est pas disponible dans l'interface mais que vous avez SSH :

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com
git clone https://github.com/louishegymegikiss-st/Kadra-online.git .
```

## Après le déploiement Git

Une fois les fichiers déployés via Git :

1. **Installer les dépendances** :
```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com
npm install
```

2. **Configurer Node.js** dans Manager Infomaniak :
   - Commande de construction : (vide ou `npm install`)
   - Commande de démarrage : `cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js`
   - Port : `3000`
