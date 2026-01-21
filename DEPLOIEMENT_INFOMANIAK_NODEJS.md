# Déploiement sur Infomaniak - Node.js

## ✅ Fichiers pushés sur GitHub

Tous les fichiers sont sur `origin/main` :
- ✅ `server.js` (endpoint `/api/orders/snapshot`)
- ✅ `package.json` (avec `aws-sdk`)
- ✅ `index.html` (frontend configuré)
- ✅ Credentials R2 configurés dans `server.js`

---

## 🚀 Étapes de déploiement sur Infomaniak

### 1. Se connecter en SSH à Infomaniak

```bash
ssh votre-utilisateur@votre-serveur.infomaniak.com
```

### 2. Cloner/Pull le repo GitHub

```bash
cd /chemin/vers/votre/site
git pull origin main
```

**OU** si c'est la première fois :
```bash
git clone https://github.com/louishegymegikiss-st/Kadra-online.git
cd Kadra-online
```

### 3. Installer les dépendances Node.js

```bash
cd deploy_infomaniak
npm install
```

### 4. Démarrer le serveur

#### Option A : Direct (test)
```bash
npm start
```

#### Option B : PM2 (production - recommandé)
```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer le serveur
pm2 start server.js --name kadra-client

# Sauvegarder la config PM2
pm2 save
pm2 startup  # Suivre les instructions affichées
```

#### Option C : systemd (service Linux)
Créer `/etc/systemd/system/kadra-client.service` :
```ini
[Unit]
Description=Kadra Client Online
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/chemin/vers/deploy_infomaniak
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Puis :
```bash
sudo systemctl enable kadra-client
sudo systemctl start kadra-client
```

---

## 🔧 Configuration Infomaniak

### Port et reverse proxy

Si Infomaniak utilise Nginx/Apache en reverse proxy :

**Nginx** (`/etc/nginx/sites-available/votre-site`) :
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

location /api/orders/snapshot {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Content-Type application/json;
}
```

**Apache** (`.htaccess` ou config vhost) :
```apache
ProxyPass /api/orders/snapshot http://localhost:3000/api/orders/snapshot
ProxyPassReverse /api/orders/snapshot http://localhost:3000/api/orders/snapshot
```

### Variable d'environnement PORT (optionnel)

Si Infomaniak impose un port spécifique :
```bash
export PORT=3000
npm start
```

Ou dans PM2 :
```bash
pm2 start server.js --name kadra-client --update-env -- PORT=3000
```

---

## ✅ Vérification

### 1. Test endpoint
```bash
curl -X POST http://localhost:3000/api/orders/snapshot \
  -H "Content-Type: application/json" \
  -d '{"event_id":"BJ025","orders":[{"order_id":"test","event_id":"BJ025","client_name":"Test","items":[]}]}'
```

### 2. Test depuis le frontend
- Ouvrir `https://votre-site.infomaniak.com`
- Passer une commande test
- Vérifier les logs serveur

### 3. Vérifier R2
- Se connecter au dashboard Cloudflare R2
- Vérifier : `orders/{event_id}/pending_orders.json` créé

---

## 📋 Checklist

- [ ] SSH connecté à Infomaniak
- [ ] `git pull` exécuté
- [ ] `npm install` exécuté
- [ ] Serveur démarré (PM2/systemd)
- [ ] Reverse proxy configuré (si nécessaire)
- [ ] Test endpoint réussi
- [ ] Test commande depuis frontend
- [ ] Vérification R2

---

## 🐛 Dépannage

### "Port 3000 already in use"
```bash
# Trouver le processus
lsof -i :3000
# Tuer le processus
kill -9 <PID>
```

### "AWS SDK non disponible"
```bash
cd deploy_infomaniak
npm install aws-sdk
```

### Logs PM2
```bash
pm2 logs kadra-client
```

### Redémarrer
```bash
pm2 restart kadra-client
```

---

## 📞 Support

Si problème, vérifier :
1. Logs serveur (`pm2 logs` ou `journalctl -u kadra-client`)
2. Logs Nginx/Apache
3. Connexion R2 (credentials dans `server.js`)
4. Port accessible (firewall Infomaniak)
