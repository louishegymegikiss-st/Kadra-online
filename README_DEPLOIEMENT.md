# Déploiement endpoint commandes - Node.js

## ✅ Configuration actuelle

**Tout est déjà configuré et prêt à déployer.**

### 1. Endpoint `/api/orders/snapshot`
- ✅ Implémenté dans `server.js` (lignes 32-141)
- ✅ Route : `POST /api/orders/snapshot`
- ✅ Logique : merge + upload atomique vers R2

### 2. Credentials R2
- ✅ Configurés en dur dans `server.js` (valeurs par défaut)
- ✅ Endpoint : `https://0ed22897e4a8686bd8c20227ad79d736.r2.cloudflarestorage.com`
- ✅ Bucket : `photos-kadra`
- ✅ Access Key et Secret Key : configurés

### 3. Dépendances
- ✅ `express` : serveur web
- ✅ `aws-sdk` : client R2/S3

### 4. Frontend
- ✅ `index.html` ligne 316 : `window.PUBLIC_API_URL = '/api/orders/snapshot'`
- ✅ `client_base.js` : envoie automatiquement vers cet endpoint

---

## 🚀 Déploiement

### Sur Infomaniak (Node.js)

1. **Installer les dépendances** :
```bash
cd deploy_infomaniak
npm install
```

2. **Démarrer le serveur** :
```bash
npm start
```

Ou avec PM2 (recommandé pour production) :
```bash
pm2 start server.js --name kadra-client
```

3. **Vérifier** :
- Le serveur écoute sur le port configuré (3000 par défaut)
- L'endpoint répond : `POST /api/orders/snapshot`

---

## 🧪 Test

### Test local
```bash
node test_endpoint.js http://localhost:3000
```

### Test manuel (curl)
```bash
curl -X POST http://localhost:3000/api/orders/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "BJ025",
    "orders": [{
      "order_id": "test-123",
      "event_id": "BJ025",
      "client_name": "Test",
      "client_email": "test@example.com",
      "items": [],
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

## 📋 Checklist déploiement

- [x] Endpoint créé dans `server.js`
- [x] Credentials R2 configurés
- [x] `aws-sdk` dans `package.json`
- [x] Frontend configuré (`PUBLIC_API_URL`)
- [ ] `npm install` exécuté
- [ ] Serveur démarré
- [ ] Test endpoint réussi
- [ ] Vérification R2 : snapshot créé dans `orders/{event_id}/pending_orders.json`

---

## 🔒 Sécurité (optionnel)

Pour plus de sécurité, utiliser des variables d'environnement au lieu de valeurs en dur :

```bash
export R2_ENDPOINT="https://..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
export R2_BUCKET_NAME="photos-kadra"
```

Le code dans `server.js` utilise déjà `process.env` avec fallback sur les valeurs par défaut.

---

## 🐛 Dépannage

### Erreur "AWS SDK non disponible"
```bash
npm install aws-sdk
```

### Erreur "Access Denied" R2
- Vérifier les credentials dans `server.js`
- Vérifier que le bucket `photos-kadra` existe

### Endpoint ne répond pas
- Vérifier que le serveur écoute : `netstat -an | grep 3000`
- Vérifier les logs serveur
- Vérifier que la route est bien `/api/orders/snapshot`

---

## ✅ Statut

**Tout est prêt pour le déploiement.** Il suffit d'exécuter `npm install` et `npm start` sur Infomaniak.
