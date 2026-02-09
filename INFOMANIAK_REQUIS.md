# Prérequis Infomaniak (client online)

## 1. Produits (formats / prix)

Les produits sont créés depuis l’**interface admin online** et stockés sur R2 : **`events/{event_id}/products.json`** (ex. `events/BJ025/products.json`). URL publique type : `https://cdnphotoslesgarennes.com/events/BJ025/products.json`. Format : `{ "version": 1, "event_id": "BJ025", "updated_at": "...", "products": [ ... ] }`.

Le client charge les produits via **`/api/products`** (serveur Node) : le serveur lit depuis R2 et renvoie le JSON. Aucun fallback vers une autre source (ex. fichier statique) : si Node ne tourne pas ou `/api/products` renvoie du HTML, la liste des produits reste vide. Les seuls fallbacks autorisés sont logiques (ex. pas de produits pour l’événement sélectionné → utiliser les produits « tous événements »).

**À faire sur Infomaniak :** lancer le serveur Node (`node server.js` ou `npm start` / PM2) et faire pointer le site vers ce serveur pour que `/api/products` soit servi en JSON.

### Installer les dépendances avant de lancer

Après un clone ou un `git pull`, les modules Node ne sont pas installés (`node_modules` n’est pas versionné). Sur le serveur, exécuter **une fois** dans le dossier du projet :

```bash
npm install
```

Puis lancer le serveur :

```bash
npm start
```

Si vous voyez `Error: Cannot find module 'multer'` (ou autre module), c’est que `npm install` n’a pas été exécuté sur ce répertoire.

### Vérifier que Node tourne

Si vous voyez :
- **Client :** « API produits a renvoyé du HTML au lieu de JSON » → les requêtes ne passent pas par Node.
- **Admin :** `404` sur `/api/admin/products/distribute` (ou autres `/api/admin/*`) → idem.

Dans les deux cas, le site est servi en **statique** (fichiers seuls). Il faut que l’hébergeur exécute **server.js** et envoie les requêtes (au moins `/api/*`) à ce serveur. Une fois Node actif, `/api/products` et `/api/admin/products/distribute` répondent correctement (pas de correctif côté code pour le 404 : la route existe déjà dans server.js).

## 2. Recherche photos (FTS5) dans le navigateur

La recherche utilise **sql.js-fts5** (build SQLite/WebAssembly avec module FTS5) chargé depuis le CDN jsDelivr. Aucune installation côté Infomaniak : le script et le .wasm sont chargés automatiquement par le client.
