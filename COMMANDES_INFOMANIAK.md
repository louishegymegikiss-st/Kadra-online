# Commandes Infomaniak - Configuration Node.js

## Commandes EXACTES à mettre dans Manager Infomaniak

### Commande de construction (Build) :
```
npm install
```

### Commande d'exécution (Start) :
```
npm start
```

**OU** directement :
```
node server.js
```

## Configuration complète Node.js

Dans Manager Infomaniak > Node.js :

```
Répertoire source: .          (un point = racine)
Commande de construction: npm install
Commande de démarrage: npm start
Port: 3000
```

## Explication

- **`npm install`** : Installe les dépendances (Express.js) depuis `package.json`
- **`npm start`** : Lance le serveur (défini dans `package.json` comme `node server.js`)
- **Port 3000** : Port par défaut (ou celui défini par Infomaniak via `process.env.PORT`)

## Alternative

Si `npm start` ne fonctionne pas, utilisez directement :
```
Commande de démarrage: node server.js
```
