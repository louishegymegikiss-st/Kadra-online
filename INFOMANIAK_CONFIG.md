# Configuration Infomaniak - IMPORTANT

## ⚠️ Configuration du répertoire source

**IMPORTANT** : Infomaniak doit pointer vers la **racine du repository**, pas vers un sous-dossier.

### Dans Manager Infomaniak

#### Pour Git (déploiement automatique) :
- **Répertoire source** : `.` (point = racine)
- **OU** : Laissez vide (Infomaniak utilisera la racine par défaut)
- **PAS** : `deploy_infomaniak/` ou autre sous-dossier

#### Pour Node.js :
- **Répertoire source** : `.` (point = racine)
- **PAS** : `deploy_infomaniak/` ou autre sous-dossier

### Structure du repository

Le repository GitHub contient directement à la racine :
```
Kadra-online/          (racine du repo)
  index.html
  static/
  package.json
  server.js
  .gitignore
  README.md
```

**Tous les fichiers sont à la racine**, donc Infomaniak doit pointer vers `.` (racine).

## Exemple de configuration

### Git (déploiement automatique)
```
Repository: https://github.com/louishegymegikiss-st/Kadra-online.git
Branche: main
Répertoire source: .          ← RACINE (point)
Répertoire de déploiement: www/
```

### Node.js
```
Répertoire source: .          ← RACINE (point)
Commande de construction (build): npm install
OU
Commande de construction (build): (laisser vide - pas de build nécessaire)
Commande de démarrage: npm start
OU
Commande de démarrage: node server.js
Port: 3000 (par défaut si Infomaniak ne définit pas PORT)
```

**Note** : 
- **Commande de construction** : `npm install` (pour installer les dépendances Express) OU laisser vide (les fichiers sont déjà générés)
- **Commande de démarrage** : `npm start` ou `node server.js`
- **Port** : Le serveur utilise `process.env.PORT || 3000`
  - Si Infomaniak définit la variable d'environnement `PORT`, ce port sera utilisé
  - Sinon, le port par défaut est **3000**
  - Vous pouvez laisser le port vide dans la config Infomaniak, ou spécifier **3000** si demandé

## Vérification

Après configuration, vérifiez que les fichiers sont bien présents :
- `index.html` doit être accessible
- `static/` doit contenir les CSS/JS
- `package.json` doit être présent (si Node.js)

## Problème : index.html non trouvé

Si Infomaniak ne trouve pas `index.html`, vérifiez :

1. **Répertoire de déploiement** : Doit pointer vers la racine du repository (`.`)
2. **Structure** : Le fichier `index.html` doit être directement à la racine, pas dans un sous-dossier
3. **Permissions** : Vérifiez que les fichiers ont les bonnes permissions (644 pour fichiers, 755 pour dossiers)

### Solution : Vérifier le répertoire de déploiement

Dans Manager Infomaniak :
- **Répertoire de déploiement** : `www/` ou `public_html/` (selon votre config)
- **Répertoire source Git** : `.` (racine du repo)
- Les fichiers du repo doivent être copiés directement dans `www/` ou `public_html/`

Si le problème persiste, vérifiez que le déploiement Git copie bien tous les fichiers à la racine du répertoire de déploiement.
