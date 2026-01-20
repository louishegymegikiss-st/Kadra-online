# Connexion à l'API locale depuis Infomaniak

## Configuration actuelle

L'interface sur Infomaniak est configurée pour se connecter à :
```
https://eulalia-gastric-semaj.ngrok-free.dev/api/client
```

## Vérifications nécessaires

### 1. Ngrok actif

Vérifiez que ngrok est toujours actif et que l'URL n'a pas changé :
```bash
# Sur votre machine locale
ngrok http 5055
```

Si l'URL a changé, régénérez le HTML :
```bash
cd "C:\Kadra by ST\Livrables\Phase 1\python\scripts"
python generate_static_html.py --output "../../deploy_infomaniak" --api-url "https://NOUVELLE-URL-ngrok.io"
```

Puis commit et push :
```bash
cd "C:\Kadra by ST\Livrables\Phase 1\deploy_infomaniak"
git add index.html
git commit -m "Mise a jour URL ngrok"
git push
```

### 2. Serveur local actif

Vérifiez que le serveur local tourne sur le port 5055 :
```bash
# Vérifier que le serveur répond
curl http://localhost:5055/api/client/products
```

### 3. CORS configuré

Le serveur doit avoir CORS activé (déjà fait dans `ecommerce_api.py`) :
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permet toutes les origines
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. API Key (optionnel)

Si vous avez configuré une API key dans `config.yaml`, ajoutez-la dans `index.html` :
```html
<script>
    window.API_BASE = 'https://eulalia-gastric-semaj.ngrok-free.dev/api/client';
    window.API_KEY = 'VOTRE_CLE_API';
</script>
```

## Test de connexion

Ouvrez la console du navigateur sur Infomaniak et vérifiez :
1. Pas d'erreurs CORS
2. Les requêtes vers `/api/client/*` fonctionnent
3. Les photos se chargent via `/api/photo/*`

## Si ça ne fonctionne pas

1. **Vérifier ngrok** : L'URL doit être accessible publiquement
2. **Vérifier le serveur local** : Doit être actif sur le port 5055
3. **Vérifier CORS** : Les erreurs CORS apparaissent dans la console du navigateur
4. **Vérifier l'API key** : Si configurée, doit être présente dans les headers
