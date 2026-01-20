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
Port: Laissé par défaut (Infomaniak gère automatiquement via variable d'environnement PORT)
```

**Note** : 
- **Commande de construction** : `npm install` (pour installer les dépendances Express) OU laisser vide (les fichiers sont déjà générés)
- **Commande de démarrage** : `npm start` ou `node server.js`
- Le serveur utilise `process.env.PORT || 3000`, donc Infomaniak définira automatiquement le port via la variable d'environnement `PORT`

## Vérification

Après configuration, vérifiez que les fichiers sont bien présents :
- `index.html` doit être accessible
- `static/` doit contenir les CSS/JS
- `package.json` doit être présent (si Node.js)
