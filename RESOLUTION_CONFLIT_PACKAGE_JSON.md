# Résolution conflit package.json sur Infomaniak

## Problème

Git indique que `package.json` serait écrasé lors d'un `git pull`.

## Solution

### Option 1 : Accepter la version distante (recommandé)

```bash
cd deploy_infomaniak
git fetch origin
git checkout --theirs package.json
git add package.json
git commit -m "Accept version distante package.json"
git pull origin main
```

### Option 2 : Sauvegarder les changements locaux d'abord

```bash
cd deploy_infomaniak
# Sauvegarder la version locale
cp package.json package.json.local

# Accepter la version distante
git fetch origin
git checkout --theirs package.json
git add package.json
git commit -m "Merge package.json depuis origin"
git pull origin main

# Comparer si besoin
diff package.json package.json.local
```

### Option 3 : Forcer la version distante (si pas de changements importants)

```bash
cd deploy_infomaniak
git fetch origin
git reset --hard origin/main
```

⚠️ **Attention** : Cette commande supprime tous les changements locaux non commités.

## Vérification après résolution

```bash
# Vérifier que package.json contient @aws-sdk/client-s3
cat package.json | grep aws-sdk

# Devrait afficher :
# "@aws-sdk/client-s3": "^3.540.0"
```

## Installation après résolution

```bash
npm install
npm start
```

## Version attendue de package.json

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@aws-sdk/client-s3": "^3.540.0"
  }
}
```

**Important** : La version distante (GitHub) est la bonne, elle contient `@aws-sdk/client-s3` v3 (moderne).
