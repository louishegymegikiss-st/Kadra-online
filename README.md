# Kadra Online - Interface Client

Site statique de l'interface client Kadra pour déploiement sur Infomaniak.

## Repository

**GitHub** : https://github.com/louishegymegikiss-st/Kadra-online.git

## Structure

```
deploy_infomaniak/
  index.html          # Page principale
  static/             # Assets (CSS, JS, images)
    css/
    js/
    logo/
    favicon.png
  package.json        # Configuration Node.js (si requis)
  server.js           # Serveur Express minimal (si requis)
  .gitignore
```

## Génération du site

Le site est généré depuis le projet principal avec le script :

```bash
cd "Livrables/Phase 1/python"
python scripts/generate_static_html.py \
  --api-url "https://votre-tunnel.ngrok.io" \
  --api-key "votre-cle-api" \
  --output "../deploy_infomaniak"
```

## Déploiement

### Sur Infomaniak

1. **Manager Infomaniak > Web > Git**
2. Connectez ce repository
3. Configurez le déploiement automatique vers votre répertoire web

### Configuration requise

- **Tunnel actif** : Le serveur local doit être actif avec ngrok/Cloudflare Tunnel
- **Clé API** : Configurée dans `config.yaml` du serveur local
- **URL API** : Mise à jour dans `index.html` (régénérer si le tunnel change)

## Mise à jour

1. Régénérer le site avec le script
2. Commit et push :
   ```bash
   git add .
   git commit -m "Mise à jour du site"
   git push origin main
   ```

3. Infomaniak déploiera automatiquement (si configuré)

## Notes

- Ce repository contient **uniquement** les fichiers nécessaires pour le site web
- Le code source du serveur reste dans le repository principal
- Les assets (CSS, JS) sont copiés automatiquement lors de la génération
