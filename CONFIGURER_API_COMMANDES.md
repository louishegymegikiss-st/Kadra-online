# Configuration : Connecter les commandes Infomaniak → API locale → Interface vendeur

## Problème actuel

Les commandes créées depuis le site Infomaniak ne sont pas envoyées car `window.API_BASE = null` (mode statique).

## Solution : Configurer l'URL de l'API

### Option 1 : Utiliser ngrok (temporaire, pour tests)

1. **Démarrer ngrok** sur votre machine locale :
```bash
ngrok http 5055
```

2. **Copier l'URL HTTPS** (ex: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`)

3. **Modifier `index.html`** :
```html
<script>
    // Configuration API pour frontend hébergé
    window.API_BASE = 'https://xxxx-xx-xx-xx-xx.ngrok-free.app/api/client';
    window.API_KEY = null; // Ou votre clé API si configurée dans config.yaml
    window.R2_PUBLIC_URL = 'https://galerie.smarttrailerapp.com';
</script>
```

4. **Commit et push** :
```bash
cd "C:\Kadra by ST\Livrables\Phase 1\deploy_infomaniak"
git add index.html
git commit -m "Configuration API pour commandes Infomaniak"
git push origin main
```

### Option 2 : Serveur public permanent

Si vous avez un serveur public avec IP fixe ou domaine :

1. **Configurer le serveur** pour écouter sur `0.0.0.0:5055` (déjà fait normalement)

2. **Configurer le firewall** pour autoriser le port 5055

3. **Modifier `index.html`** avec l'URL publique :
```html
<script>
    window.API_BASE = 'https://votre-domaine.com/api/client';
    window.API_KEY = 'VOTRE_CLE_API'; // Si configurée
    window.R2_PUBLIC_URL = 'https://galerie.smarttrailerapp.com';
</script>
```

## Vérifications

### 1. CORS activé dans l'API

L'API doit avoir CORS activé (déjà fait dans `admin_api.py` et `ecommerce_api.py`) :
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Endpoint `/api/client/orders` accessible

Tester depuis le navigateur (console) :
```javascript
fetch('https://VOTRE-URL/api/client/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true })
})
```

### 3. Vérifier dans l'interface vendeur

Après une commande depuis Infomaniak :
1. Ouvrir l'interface vendeur : `http://localhost:5055/vendeur`
2. Vérifier que la commande apparaît dans la liste
3. Statut initial : `pending` (à régler)

## Flux complet

1. **Client sur Infomaniak** → Remplit le formulaire de commande
2. **Frontend** → Envoie `POST ${API_BASE}/orders` vers l'API locale
3. **API locale** → Stocke dans `ecommerce.db` (table `orders`)
4. **Interface vendeur** → Affiche les commandes via `GET /api/vendeur/orders`

## Dépannage

### Erreur CORS
- Vérifier que CORS est activé dans l'API
- Vérifier que l'URL dans `window.API_BASE` est correcte

### Erreur 401 (Unauthorized)
- Vérifier que `window.API_KEY` correspond à `api_key` dans `config.yaml`
- Ou désactiver l'API key dans `config.yaml` pour les tests

### Commande non visible dans vendeur
- Vérifier que l'API a bien créé la commande dans `ecommerce.db`
- Vérifier que l'interface vendeur charge bien depuis la même base de données
