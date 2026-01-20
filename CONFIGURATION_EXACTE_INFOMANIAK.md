# Configuration EXACTE Infomaniak

## ⚠️ IMPORTANT : Infomaniak cherche dans `/srv/customer/sites/galerie.photoslesgarennes`

## Configuration Git (déploiement automatique)

Dans Manager Infomaniak > Git :

```
Repository: https://github.com/louishegymegikiss-st/Kadra-online.git
Branche: main
Répertoire source: .          ← UN POINT (racine du repo)
Répertoire de déploiement: www/    ← www/ (obligatoire)
```

**OU** si Infomaniak utilise `public_html/` :

```
Répertoire de déploiement: public_html/    ← public_html/ (si www/ ne fonctionne pas)
```

## Configuration Node.js

Dans Manager Infomaniak > Node.js :

```
Répertoire source: www/          ← www/ (où sont les fichiers déployés)
Commande de construction: npm install
Commande de démarrage: npm start
Port: 3000
```

**OU** si les fichiers sont dans `public_html/` :

```
Répertoire source: public_html/    ← public_html/ (si www/ ne fonctionne pas)
```

## Explication

1. **Git clone** le repo dans `/srv/customer/sites/galerie.photoslesgarennes/`
2. **Git copie** les fichiers dans `www/` (répertoire de déploiement)
3. **Node.js** doit pointer vers `www/` (où sont les fichiers déployés)

## Si ça ne fonctionne toujours pas

Essayez dans Node.js :
- Répertoire source : `.` (point) au lieu de `www/`
- Le serveur cherchera automatiquement dans tous les emplacements
