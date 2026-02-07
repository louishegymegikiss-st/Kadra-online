# Architecture R2 (Cloudflare) – Données galerie online

Tout est stocké dans **un seul bucket R2**. Les clés (chemins) suivent cette structure.

---

## Racine du bucket

| Clé | Description | Format |
|-----|-------------|--------|
| `events_list.json` | Liste des événements (IDs utilisés partout). | `["BJ025", "BJ026"]` ou `{ "events": ["BJ025", "BJ026"] }` |
| `products_global.json` | Produits communs à tous les événements. | `{ "products": [ { "id", "name_fr", "price", "category", ... } ] }` |

---

## Par événement (remplacer `{eventId}` par ex. `BJ025`)

### Données métier (JSON)

| Clé | Description | Format |
|-----|-------------|--------|
| `events/{eventId}/products.json` | Produits spécifiques à l’événement. | `{ "products": [ ... ] }` |
| `events/{eventId}/config.json` | Config admin (objectif CA, etc.). | `{ "event_id", "turnover_objective", "updated_at" }` |
| `orders/{eventId}/pending_orders.json` | Commandes web (pending + complétées). | `{ "event_id", "snapshot_version", "generated_at", "count", "orders": [ ... ] }` |

### Photos (fichiers binaires)

| Clé | Description |
|-----|-------------|
| `events/{eventId}/photos/{fileId}/webp.webp` | Preview web (générée par le pipeline). |
| `events/{eventId}/photos/{fileId}/md.jpg` | Format MD / redimensionné (ex. 3000×2000). |
| `events/{eventId}/photos/{fileId}/hd.jpg` | Photo HD (upload manuel depuis l’admin). |

Index des photos (si utilisé par le front) :

| Clé | Description |
|-----|-------------|
| `events/{eventId}/photos_index.json` | Index des photos de l’événement (liste file_id, métadonnées). |

---

## Arborescence résumée

```
bucket R2
├── events_list.json
├── products_global.json
├── events/
│   └── {eventId}/                    (ex. BJ025, BJ026)
│       ├── products.json
│       ├── config.json
│       └── photos/
│           ├── photos_index.json     (optionnel)
│           └── {fileId}/             (ex. 6d1301bb...)
│               ├── webp.webp
│               ├── md.jpg
│               └── hd.jpg
└── orders/
    └── {eventId}/
        └── pending_orders.json
```

---

## Logique côté app

- **Produits affichés sur la borne** = fusion de `products_global.json` + `events/{eventId}/products.json` pour l’événement choisi (ou premier de `events_list.json` si « Tous »).
- **Commandes** = toujours par événement : `orders/{eventId}/pending_orders.json`.
- **Config admin** (objectif CA, etc.) = `events/{eventId}/config.json`.
- **Écritures JSON** : écriture atomique via un fichier `.tmp` (ex. `pending_orders.json.tmp`) puis renommage / écrasement du fichier final.
