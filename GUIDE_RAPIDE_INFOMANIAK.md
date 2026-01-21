# Guide rapide - Déploiement Infomaniak

## ✅ Push GitHub effectué

Tous les fichiers sont sur `main` :
- `server.js` avec endpoint `/api/orders/snapshot`
- `package.json` avec `aws-sdk`
- Credentials R2 configurés

---

## 🚀 Déploiement en 3 étapes

### 1. Dans Manager Infomaniak > Git

**Déploiement automatique** :
```
Repository: https://github.com/louishegymegikiss-st/Kadra-online.git
Branche: main
Répertoire de déploiement: www/  (ou public_html/)
```

Cliquer sur **"Déployer"** → Les fichiers sont copiés.

---

### 2. Dans Manager Infomaniak > Node.js

**Créer une application Node.js** :

```
Répertoire source: www/deploy_infomaniak  (ou public_html/deploy_infomaniak)
Commande de construction: npm install
Commande de démarrage: npm start
Port: 3000  (ou celui indiqué par Infomaniak)
```

**OU** si Infomaniak ne permet pas de changer le répertoire source :

```
Répertoire source: (laissé par défaut)
Commande de construction: cd deploy_infomaniak && npm install
Commande de démarrage: cd deploy_infomaniak && npm start
```

---

### 3. Vérifier

1. **Test endpoint** :
   - Ouvrir : `https://votre-site.infomaniak.com/api/orders/snapshot`
   - Devrait retourner une erreur 400 (normal, besoin POST)

2. **Test commande** :
   - Ouvrir : `https://votre-site.infomaniak.com`
   - Passer une commande test
   - Vérifier les logs Node.js dans Manager Infomaniak

3. **Vérifier R2** :
   - Dashboard Cloudflare R2
   - Vérifier : `orders/{event_id}/pending_orders.json` créé

---

## 🔧 Si ça ne marche pas

### Option A : SSH manuel

```bash
ssh votre-utilisateur@votre-serveur.infomaniak.com
cd www/deploy_infomaniak  # ou public_html/deploy_infomaniak
git pull origin main
npm install
npm start
```

### Option B : PM2 (si SSH disponible)

```bash
npm install -g pm2
pm2 start server.js --name kadra-client
pm2 save
```

---

## 📋 Checklist

- [ ] Git déployé (Manager Infomaniak > Git > Déployer)
- [ ] Node.js configuré (Manager Infomaniak > Node.js)
- [ ] `npm install` exécuté (automatique ou manuel)
- [ ] Serveur démarré
- [ ] Test endpoint OK
- [ ] Test commande OK
- [ ] Vérification R2 OK

---

## ⚠️ Important

- **Credentials R2** : Déjà configurés dans `server.js` (lignes 53-56)
- **Frontend** : Déjà configuré pour envoyer vers `/api/orders/snapshot`
- **Port** : Utiliser celui indiqué par Infomaniak (généralement 3000 ou aléatoire)

---

## 📞 Si problème

1. Vérifier les **logs Node.js** dans Manager Infomaniak
2. Vérifier que `npm install` a bien installé `aws-sdk`
3. Vérifier que le port est correct
4. Vérifier les credentials R2 dans `server.js`
