#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

DEPLOY_SERVER=${DEPLOY_SERVER:-"cliu238@100.106.202.64"}
DEPLOY_PATH="/home/cliu238/calibration-pipeline"

echo "Deploying to $DEPLOY_SERVER:$DEPLOY_PATH"

# Create remote directory
ssh $DEPLOY_SERVER "mkdir -p $DEPLOY_PATH"

# Sync files (excluding unnecessary files)
rsync -avz --delete \
    --exclude '.git' \
    --exclude '.venv' \
    --exclude 'node_modules' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude 'logs/*' \
    --exclude '.DS_Store' \
    --exclude '.claude' \
    ./ $DEPLOY_SERVER:$DEPLOY_PATH/

# Create necessary directories and deploy
ssh $DEPLOY_SERVER "cd $DEPLOY_PATH && \
    mkdir -p logs data && \
    docker compose down --remove-orphans 2>/dev/null || true && \
    docker compose build && \
    docker compose up -d"

echo "Deployment complete!"
echo "Checking status..."
ssh $DEPLOY_SERVER "cd $DEPLOY_PATH && docker compose ps"
