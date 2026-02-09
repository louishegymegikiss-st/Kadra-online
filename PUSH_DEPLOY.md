# Push & déploiement Infomaniak

## Déploiement du front (client online)

Le dossier `deploy_infomaniak` contient le client web qui tourne sur Infomaniak. Il lit l’index des photos depuis R2 (`events/{eventId}/photos_index.db`).

### 1. Pousser les changements (Git)

Si ton déploiement Infomaniak se fait via Git (pull sur le serveur) :

```bash
cd "Livrables/Phase 1"
git add deploy_infomaniak/
git add python/processor_service/
git status
git commit -m "Deploy: index R2 mis à jour au move (rider_name, horse_name, etc.)"
git push origin main
```

Puis sur le serveur Infomaniak (SSH) :

```bash
cd /chemin/vers/site
git pull
npm install
pm2 restart kadra-client
```

### 2. Copie manuelle (sans Git)

Si tu déploies en copiant les fichiers :

- Copier tout le contenu de `deploy_infomaniak/` (surtout `static/`, `server.js`, `index.html`, `package.json`) vers le serveur.
- Sur le serveur : `npm install` puis redémarrer le serveur (ex. `pm2 restart kadra-client`).

---

## Côté processor (local) : index R2 à jour après un move

L’index Cloudflare (`photos_index.db`) est généré par le **processor** qui tourne en local. Pour que la recherche client online soit à jour après un **move/renommage** :

1. **Correction appliquée** : lors d’un move, le processor met maintenant à jour dans la base locale **rider_name, horse_name, rider_number, epreuve** (pas seulement dest_relpath/album). La FTS locale et l’index envoyé à R2 reflètent donc le nouveau nom (cavalier/cheval).

2. **Upload forcé** : après chaque move, le processor appelle `force_upload_photos_index(event_id)` pour envoyer tout de suite `photos_index.db` sur R2 (sans attendre le throttle).

3. **Throttle** : en fin de job (sans move), l’upload vers R2 est limité à une fois toutes les 90 secondes par événement (configurable dans `config.yaml` : `r2.photos_index_upload_interval_seconds`).

**À faire côté local** : redémarrer le processor après mise à jour du code pour que les changements (update_index_after_move + force_upload) soient actifs. Ensuite, un move de dossier met à jour la DB locale et envoie immédiatement l’index à R2.
