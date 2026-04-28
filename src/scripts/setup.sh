#!/bin/sh

# Charger le .env
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
else
  echo "Erreur : Fichier .env introuvable."
  exit 1
fi

# Variables par défaut
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@medusajs.com}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-supersecret}
APP_PORT=${APP_PORT:-9000}
# Exécution des migrations
npx medusa migrations run
if [ $? -ne 0 ]; then
  echo "Les migrations ont déjà été appliquées ou une erreur s'est produite. Poursuite..."
fi

# Création de l'utilisateur Medusa
npx medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD"
if [ $? -ne 0 ]; then
  echo "L'utilisateur avec l'email $ADMIN_EMAIL existe déjà ou une erreur s'est produite. Poursuite..."
fi

# Démarrage du serveur
APP_PORT=${APP_PORT:-9000}
STORE_NAME=${STORE_NAME:-sillage}
echo "Démarrage du serveur sur le port ${APP_PORT}"

# Utiliser 'start' en production, 'dev' en développement
if [ "$NODE_ENV" = "production" ]; then
  pm2 start --name medusa-"$STORE_NAME" "yarn run start"
else
  pm2 start --name medusa-"$STORE_NAME" "yarn run dev --port ${APP_PORT}"
fi

# Logs
pm2 logs