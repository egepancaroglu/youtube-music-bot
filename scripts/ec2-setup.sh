#!/bin/bash
# EC2 Ubuntu setup script for Discord Music Bot
# Run: chmod +x ec2-setup.sh && ./ec2-setup.sh

set -e

echo "=== Updating system ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== Installing Docker ==="
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo usermod -aG docker $USER
echo "=== Docker installed ==="

echo "=== Installing Git ==="
sudo apt-get install -y git

echo ""
echo "========================================="
echo "  Setup complete! Next steps:"
echo "========================================="
echo ""
echo "  1. Log out and back in (for docker group):"
echo "     exit"
echo "     ssh -i your-key.pem ubuntu@your-ip"
echo ""
echo "  2. Clone your repo:"
echo "     git clone https://github.com/YOUR_USER/discord-music-bot.git"
echo "     cd discord-music-bot"
echo ""
echo "  3. Create .env file:"
echo "     nano .env"
echo "     (paste your env variables)"
echo ""
echo "  4. Start the bot:"
echo "     docker compose up -d --build"
echo ""
echo "  5. Check logs:"
echo "     docker compose logs -f"
echo ""
echo "  6. Stop the bot:"
echo "     docker compose down"
echo ""
echo "========================================="
