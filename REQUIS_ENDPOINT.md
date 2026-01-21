# Ce qu'il faut pour créer l'endpoint `/api/orders/snapshot`

## 1. Credentials R2 (à stocker côté serveur uniquement)

```javascript
const R2_CONFIG = {
  endpoint: 'https://0ed22897e4a8686bd8c20227ad79d736.r2.cloudflarestorage.com',
  accessKeyId: '6ed17ae409c1969b754af590ee6b2d84',
  secretAccessKey: '38725e098bc5d93f940f4bdcac31013da64fd4ddaeb2f348f87a7913e986f09b',
  bucketName: 'photos-kadra'
};
```

⚠️ **À stocker dans variables d'environnement, jamais dans le code source.**

---

## 2. Bibliothèque SDK

### Node.js
```bash
npm install aws-sdk
```

### PHP
```bash
composer require aws/aws-sdk-php
```

---

## 3. Endpoint à créer

**Route** : `POST /api/orders/snapshot`

**Logique** :
1. Recevoir `{event_id, orders[]}`
2. Lire `orders/{event_id}/pending_orders.json` depuis R2 (si existe)
3. Merger : ajouter nouvelles commandes (éviter doublons par `order_id`)
4. Incrémenter `snapshot_version`
5. Upload atomique :
   - `orders/{event_id}/pending_orders.tmp.json`
   - `orders/{event_id}/pending_orders.json`

---

## 4. Format requête (depuis frontend)

```json
{
  "event_id": "BJ025",
  "orders": [
    {
      "order_id": "order_xxxxx",
      "event_id": "BJ025",
      "client_name": "...",
      "client_email": "...",
      "items": [...],
      "created_at": "2026-01-21T10:30:00Z",
      "status": "pending",
      ...
    }
  ]
}
```

---

## 5. Format réponse

```json
{
  "message": "Snapshot v14 de 5 commande(s) créé",
  "event_id": "BJ025",
  "snapshot_version": 14,
  "new_orders": 1,
  "total_orders": 5
}
```

---

## 6. Code minimal (Node.js/Express)

Voir `ENDPOINT_INFOMANIAK_ORDERS.md` pour code complet.

**Points clés** :
- Merge intelligent (évite doublons)
- Upload atomique (.tmp puis final)
- Gestion erreurs
- Validation `event_id` et `orders[]`

---

## 7. Configuration frontend (déjà fait)

Dans `index.html` :
```javascript
window.PUBLIC_API_URL = '/api/orders/snapshot';
```

Le frontend envoie automatiquement vers cet endpoint.

---

## 8. Test rapide

```bash
curl -X POST https://coxiivgqpkz.preview.hosting-ik.com/api/orders/snapshot \
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

---

## Résumé

**Besoin minimum** :
1. ✅ Credentials R2 (déjà connus)
2. ✅ SDK AWS (à installer)
3. ✅ Endpoint `/api/orders/snapshot` (à créer)
4. ✅ Logique merge + upload atomique (code fourni dans `ENDPOINT_INFOMANIAK_ORDERS.md`)

**Tout le reste est déjà en place** (frontend, structure R2, sync serveur local).
