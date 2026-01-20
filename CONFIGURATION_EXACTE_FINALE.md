# Configuration EXACTE Infomaniak - FINALE

## ⚠️ Problème identifié

Le CWD actuel était faux : `/srv/customer/srv/customer/sites/...` (double préfixe).
Solution : forcer le répertoire avec `cd` dans les commandes.

## Configuration Node.js

Dans Manager Infomaniak > Node.js :

### Commande de construction (Build)

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com && npm ci --omit=dev
```

**OU** si pas de `package-lock.json` :

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com && npm install --omit=dev
```

**OU** si `node_modules` existe déjà, laisser vide.

### Commande de démarrage (Start)

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js
```

### Port

```
3000
```

### Répertoire source

(Ne peut pas être changé - laissé tel quel)

## Vérification

Pour vérifier que les fichiers sont bien présents, vous pouvez temporairement mettre en start :

```bash
cd /srv/customer/sites/galerie.photoslesgarennes.com && ls -la && node server.js
```

Cela affichera la liste des fichiers avant de démarrer le serveur.

## Logs attendus

Après démarrage, vous devriez voir :

```
=== CONFIGURATION SERVEUR ===
ROOT = /srv/customer/sites/galerie.photoslesgarennes.com
index.html existe = true
✅ index.html trouvé, serveur prêt
✅ Serveur démarré sur le port 3000
📁 Fichiers servis depuis: /srv/customer/sites/galerie.photoslesgarennes.com
🌐 Serveur prêt à recevoir des requêtes
```

## Important

- **Ne pas préfixer** avec `/srv/customer` dans d'autres champs (répertoire de travail, etc.)
- Le double préfixe `/srv/customer/srv/customer` vient d'un champ qui ajoute déjà `/srv/customer`
- Vérifier qu'il n'y a pas de "répertoire de travail" ou "working directory" configuré ailleurs
