# Configuration Infomaniak - Valeurs EXACTES

## ⚠️ PROBLÈME : Répertoire source vide

Si le **répertoire source** est vide dans Infomaniak, les fichiers du repository ne seront pas trouvés !

## ✅ Configuration EXACTE à mettre

### Dans Manager Infomaniak > Git (déploiement automatique)

```
Repository: https://github.com/louishegymegikiss-st/Kadra-online.git
Branche: main
Répertoire source: .          ← METTEZ UN POINT ICI (OBLIGATOIRE)
Répertoire de déploiement: www/  (ou public_html/ selon votre config)
```

### Dans Manager Infomaniak > Node.js

```
Répertoire source: .          ← METTEZ UN POINT ICI (OBLIGATOIRE)
Commande de construction: npm install
Commande de démarrage: npm start
Port: 3000
```

## Explication

- `.` (point) = répertoire courant = racine du repository cloné
- Si vide = Infomaniak ne sait pas où chercher → fichiers introuvables
- `/` (slash) = aussi la racine (alternative)

## Vérification après configuration

Après avoir mis `.` dans le répertoire source, redéployez et vérifiez les logs. Vous devriez voir :

```
Fichiers dans /srv/customer/site/galerie.photolesgarennes.com:
  [FILE] index.html
  [FILE] package.json
  [FILE] server.js
  [DIR] static
  ...
```

Si vous ne voyez pas `index.html` dans la liste, le répertoire source n'est toujours pas correct.
