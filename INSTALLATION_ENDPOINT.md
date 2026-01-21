# Installation endpoint commandes Infomaniak

## Choix : Node.js ou PHP

Deux implémentations disponibles :

### Option 1 : Node.js (Express) - Recommandé

**Fichier** : `server.js` (déjà configuré)

**Installation** :
```bash
cd deploy_infomaniak
npm install
npm start
```

**Avantages** :
- ✅ Déjà implémenté et testé
- ✅ Gestion CORS automatique
- ✅ Logs détaillés

---

### Option 2 : PHP (Apache/Nginx)

**Fichier** : `api/orders/snapshot.php`

**Installation** :
```bash
cd deploy_infomaniak
composer install
```

**Configuration Apache** :
- `.htaccess` déjà créé pour routing
- Vérifier que `mod_rewrite` est activé

**Configuration Nginx** :
```nginx
location /api/orders/snapshot {
    try_files $uri $uri/ /api/orders/snapshot.php?$query_string;
}
```

---

## Configuration credentials R2

### Node.js (variables d'environnement)

Créer `.env` :
```bash
R2_ENDPOINT=https://0ed22897e4a8686bd8c20227ad79d736.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=6ed17ae409c1969b754af590ee6b2d84
R2_SECRET_ACCESS_KEY=38725e098bc5d93f940f4bdcac31013da64fd4ddaeb2f348f87a7913e986f09b
R2_BUCKET_NAME=photos-kadra
```

Ou utiliser `dotenv` :
```bash
npm install dotenv
```

### PHP (variables d'environnement)

Dans `.htaccess` ou `php.ini` :
```apache
SetEnv R2_ENDPOINT "https://0ed22897e4a8686bd8c20227ad79d736.r2.cloudflarestorage.com"
SetEnv R2_ACCESS_KEY_ID "6ed17ae409c1969b754af590ee6b2d84"
SetEnv R2_SECRET_ACCESS_KEY "38725e098bc5d93f940f4bdcac31013da64fd4ddaeb2f348f87a7913e986f09b"
SetEnv R2_BUCKET_NAME "photos-kadra"
```

---

## Test de l'endpoint

### Test manuel (curl)

```bash
curl -X POST https://coxiivgqpkz.preview.hosting-ik.com/api/orders/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "BJ025",
    "orders": [{
      "order_id": "test-123",
      "event_id": "BJ025",
      "client_name": "Test User",
      "client_email": "test@example.com",
      "client_phone": "0612345678",
      "items": [],
      "total": 0,
      "created_at": "2026-01-21T10:30:00Z",
      "status": "pending"
    }]
  }'
```

**Réponse attendue** :
```json
{
  "message": "Snapshot v1 de 1 commande(s) créé",
  "event_id": "BJ025",
  "snapshot_version": 1,
  "new_orders": 1,
  "total_orders": 1
}
```

---

## Vérification

1. ✅ Endpoint répond (200 OK)
2. ✅ Snapshot créé dans R2 : `orders/{event_id}/pending_orders.json`
3. ✅ Frontend envoie vers `/api/orders/snapshot` (déjà configuré)
4. ✅ Serveur local synchronise depuis R2 (polling 30s)

---

## Dépannage

### Erreur "AWS SDK non disponible"
- **Node.js** : `npm install aws-sdk`
- **PHP** : `composer install`

### Erreur "NoSuchKey" ou "Access Denied"
- Vérifier credentials R2
- Vérifier nom du bucket (`photos-kadra`)

### Erreur CORS
- Vérifier headers dans `server.js` ou `snapshot.php`
- Vérifier configuration serveur (Apache/Nginx)

### Endpoint ne répond pas
- Vérifier que le serveur écoute sur le bon port
- Vérifier routing (`.htaccess` pour Apache)
- Vérifier logs serveur
