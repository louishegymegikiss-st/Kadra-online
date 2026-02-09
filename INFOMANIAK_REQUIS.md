# Prérequis Infomaniak (client online)

## 1. Serveur Node.js obligatoire

Le client appelle **`/api/products`** pour charger les produits (formats et prix). Si ce chemin renvoie du **HTML** (ex. la page d’accueil) au lieu de JSON, c’est que le site est servi en **statique uniquement** sans Node.

**À faire sur Infomaniak :**
- Lancer le **serveur Node** (pas seulement les fichiers statiques) :
  - `node server.js` ou `npm start`
  - Ou avec PM2 : `pm2 start server.js --name kadra-client`
- Vérifier que l’URL du site pointe bien vers ce serveur (port 3000 ou celui configuré), pas vers un hébergement statique qui renvoie `index.html` pour toutes les routes.

Une fois le serveur actif, `/api/products?event_id=global` et `/api/products?event_id=BJ025` doivent renvoyer du **JSON** (liste de produits).

## 2. Recherche photos (FTS5) dans le navigateur

La recherche utilise **sql.js-fts5** (build SQLite/WebAssembly avec module FTS5) chargé depuis le CDN jsDelivr. Aucune installation côté Infomaniak : le script et le .wasm sont chargés automatiquement par le client.
