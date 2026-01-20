# Installation après clone SSH

## Après avoir cloné le repository

Si vous avez cloné dans `/srv/customer/sites/galerie.photoslesgarennes.com/kadra-online` :

### 1. Nettoyer les node_modules existants

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com/kadra-online
rm -rf node_modules package-lock.json
```

### 2. Installer les dépendances

```bash
npm install --omit=dev
```

### 3. Tester le serveur

```bash
node server.js
```

Vous devriez voir :
```
=== CONFIGURATION SERVEUR ===
ROOT = /srv/customer/sites/galerie.photoslesgarennes.com/kadra-online
index.html existe = true
✅ Serveur démarré sur le port 3000
```

## Configuration Infomaniak Node.js

Dans Manager Infomaniak > Node.js :

```
Répertoire source: kadra-online    (ou le chemin complet si nécessaire)
Commande de construction: npm install --omit=dev
Commande de démarrage: cd /srv/customer/sites/galerie.photoslesgarennes.com/kadra-online && node server.js
Port: 3000
```

**OU** si Infomaniak utilise le répertoire source automatiquement :

```
Commande de construction: npm install --omit=dev
Commande de démarrage: node server.js
Port: 3000
```

## Vérification

Pour vérifier les versions :

```bash
node -v
npm -v
```

Le serveur utilise `__dirname` donc il pointera automatiquement vers le bon répertoire où se trouve `server.js`.
