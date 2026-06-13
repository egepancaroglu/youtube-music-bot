#!/bin/bash
# Quick deploy/update script - run on EC2
# Usage: ./scripts/deploy.sh

set -e

echo "=== Pulling latest changes ==="
git pull origin main

echo "=== Rebuilding and restarting ==="
docker compose up -d --build

echo "=== Done! Checking status ==="
docker compose ps
echo ""
echo "Run 'docker compose logs -f' to watch logs"
