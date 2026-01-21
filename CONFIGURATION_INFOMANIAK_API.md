# Configuration : Connecter Infomaniak → API locale

## Site Infomaniak
**URL** : https://coxiivgqpkz.preview.hosting-ik.com/

## Étapes de configuration

### 1. Exposer l'API locale sur Internet

#### Option A : Ngrok (recommandé pour tests)

```bash
# Sur votre machine locale
ngrok http 5055
```

**Copier l'URL HTTPS** affichée (ex: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`)

⚠️ **Important** : L'URL ngrok change à chaque redémarrage. Il faudra mettre à jour `index.html` si vous redémarrez ngrok.

#### Option B : Serveur public permanent

Si vous avez un serveur avec IP fixe ou domaine, configurez-le pour écouter sur `0.0.0.0:5055`.

### 2. Configurer index.html

Modifier `deploy_infomaniak/index.html` ligne 310 :

```html
<script>
    // Configuration API pour frontend hébergé
    window.API_BASE = 'https://VOTRE-URL-NGROK/api/client'; // ← Remplacer par votre URL ngrok
    window.API_KEY = null; // Pas de clé API configurée
    window.R2_PUBLIC_URL = 'https://galerie.smarttrailerapp.com';
</script>
```

**Exemple avec ngrok** :
```html
window.API_BASE = 'https://abcd-1234-5678-90ef.ngrok-free.app/api/client';
```

### 3. Vérifier CORS

L'API doit autoriser les requêtes depuis `https://coxiivgqpkz.preview.hosting-ik.com`.

Vérifier dans `admin_api.py` que CORS est configuré :
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ✅ Déjà configuré
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Tester la connexion

1. **Ouvrir le site Infomaniak** : https://coxiivgqpkz.preview.hosting-ik.com/
2. **Ouvrir la console du navigateur** (F12)
3. **Vérifier les erreurs** :
   - Pas d'erreur CORS
   - Les requêtes vers `/api/client/*` fonctionnent

### 5. Tester une commande

1. Ajouter des produits au panier
2. Remplir le formulaire de commande
3. Cliquer sur "Valider ma commande"
4. **Vérifier dans l'interface vendeur** (`http://localhost:5055/vendeur`) que la commande apparaît

## Script automatique

Utiliser le script pour configurer automatiquement :

```bash
cd "Livrables/Phase 1/python/scripts"
python configure_api_url.py "https://VOTRE-URL-NGROK/api/client"
```

## Dépannage

### Erreur CORS
- Vérifier que CORS est activé dans l'API
- Vérifier que l'URL dans `window.API_BASE` est correcte (sans slash final)

### Erreur 401 (Unauthorized)
- Si vous avez configuré une API key, ajouter `window.API_KEY = 'votre-cle'` dans `index.html`

### Commande non visible dans vendeur
- Vérifier que l'API locale est bien démarrée
- Vérifier que ngrok est actif
- Vérifier les logs de l'API pour voir si la commande a été reçue

### URL ngrok a changé
Si vous redémarrez ngrok, l'URL change. Il faut :
1. Mettre à jour `index.html` avec la nouvelle URL
2. Commit et push vers GitHub
3. Attendre le redéploiement Infomaniak (ou redéployer manuellement)

## Flux complet

```
Client sur Infomaniak
    ↓ (remplit formulaire)
Frontend JavaScript
    ↓ (POST /api/client/orders)
Ngrok / Serveur public
    ↓ (tunnel vers localhost:5055)
API locale (admin_api.py)
    ↓ (stocke dans ecommerce.db)
Interface vendeur (/vendeur)
    ↓ (affiche les commandes)
```
