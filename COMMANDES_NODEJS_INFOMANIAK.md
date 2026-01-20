# Commandes Node.js Infomaniak - Configuration Finale

## Configuration Node.js dans Manager Infomaniak

### Commande de construction (Build) :

```
npm install
```

**OU** si vous voulez être plus explicite :

```
cd /srv/customer/sites/galerie.photoslesgarennes.com && npm install
```

### Commande d'exécution (Start) :

```
cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js
```

### Port :

```
3000
```

## Configuration complète

Dans Manager Infomaniak > Node.js :

```
Répertoire source: (ne peut pas être changé - laissé tel quel)
Commande de construction: npm install
Commande de démarrage: cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js
Port: 3000
```

## Explication

- **`npm install`** : Installe Express.js et les dépendances depuis `package.json`
- **`cd ... && node server.js`** : Se place dans le bon répertoire puis lance le serveur
- **Port 3000** : Port par défaut (ou celui défini par Infomaniak via `process.env.PORT`)

## Si erreur "Cannot find module"

Si vous obtenez une erreur, utilisez la commande complète avec `cd` :

```
Commande de démarrage: cd /srv/customer/sites/galerie.photoslesgarennes.com && node server.js
```

## Vérification

Après démarrage, vérifiez les logs. Vous devriez voir :

```
=== CONFIGURATION SERVEUR ===
ROOT = /srv/customer/sites/galerie.photoslesgarennes.com
index.html existe = true
✅ Serveur démarré sur le port 3000
```
