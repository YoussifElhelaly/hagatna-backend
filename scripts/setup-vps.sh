#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Hagatna — Initial VPS Setup Script (Ubuntu 24.04)
# ══════════════════════════════════════════════════════════════════════════════
#
# Run this ONCE when setting up a fresh Ubuntu 24.04 VPS.
#
# Usage:
#   ssh root@your-vps-ip
#   curl -fsSL https://raw.githubusercontent.com/.../setup-vps.sh | bash
#   # OR upload and run:
#   chmod +x setup-vps.sh && sudo ./setup-vps.sh
#
# What it does:
#   1. Updates system packages
#   2. Installs Docker + Docker Compose
#   3. Installs Certbot for Let's Encrypt
#   4. Configures UFW firewall
#   5. Creates deploy user (optional)
#   6. Sets up automatic security updates
#
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

echo "═════════════════════════════════════════════════════════════════════════════"
echo "  Hagatna VPS Setup — Ubuntu 24.04"
echo "═════════════════════════════════════════════════════════════════════════════"
echo ""

# ─── Check root ──────────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run as root (use sudo)"
  exit 1
fi

# ─── Step 1: System Update ───────────────────────────────────────────────────
echo "→ Updating system packages..."
apt update && apt upgrade -y

# ─── Step 2: Install Docker ─────────────────────────────────────────────────
echo "→ Installing Docker..."
if ! command -v docker &> /dev/null; then
  # Install prerequisites
  apt install -y ca-certificates curl gnupg

  # Add Docker GPG key
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  # Add Docker repository
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  # Install Docker Engine + Compose plugin
  apt update
  apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  echo "Docker installed ✓"
else
  echo "Docker already installed ✓"
fi

# ─── Step 3: Install Certbot ────────────────────────────────────────────────
echo "→ Installing Certbot..."
apt install -y certbot

# ─── Step 4: Configure Firewall (UFW) ──────────────────────────────────────
echo "→ Configuring firewall..."
if command -v ufw &> /dev/null; then
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP (for Let's Encrypt + redirect)
  ufw allow 443/tcp   # HTTPS
  ufw --force enable
  echo "Firewall configured ✓"
else
  echo "UFW not found — configure your firewall manually:"
  echo "  Allow: 22/tcp, 80/tcp, 443/tcp"
fi

# ─── Step 5: Create Deploy User (optional) ──────────────────────────────────
echo ""
read -p "Create a 'deploy' user for SSH? (recommended) [y/N]: " CREATE_USER
if [[ "$CREATE_USER" =~ ^[Yy]$ ]]; then
  if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys 2>/dev/null || true
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
    echo "User 'deploy' created ✓"
    echo "  SSH in with: ssh deploy@YOUR_VPS_IP"
  else
    echo "User 'deploy' already exists ✓"
  fi
fi

# ─── Step 6: Set up Automatic Security Updates ──────────────────────────────
echo "→ Configuring automatic security updates..."
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# ─── Step 7: Set Timezone ───────────────────────────────────────────────────
echo ""
read -p "Set timezone? (default: UTC) [e.g., Asia/Aden]: " TIMEZONE
if [ -n "$TIMEZONE" ]; then
  timedatectl set-timezone "$TIMEZONE"
  echo "Timezone set to $TIMEZONE ✓"
fi

# ─── Step 8: Create Project Directory ───────────────────────────────────────
echo "→ Creating project directory..."
mkdir -p /opt/hagatna
echo "Project directory: /opt/hagatna ✓"

# ─── Step 9: Docker Post-Install ────────────────────────────────────────────
echo "→ Configuring Docker..."
# Allow Docker to start on boot
systemctl enable docker
systemctl start docker

# Log rotation for Docker containers
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
EOF
systemctl restart docker

echo ""
echo "═════════════════════════════════════════════════════════════════════════════"
echo "  VPS Setup Complete!"
echo "═════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "    1. Clone your repo: cd /opt/hagatna && git clone <repo-url> ."
echo "    2. Copy .env.example to .env and fill in values"
echo "    3. Set up DNS: api.hagatna.com → $(curl -s ifconfig.me)"
echo "    4. Get SSL certificate:"
echo "       docker compose --profile tools run --rm certbot certonly \\"
echo "         --webroot -w /var/www/certbot -d api.hagatna.com"
echo "    5. Deploy: ./deploy.sh"
echo ""
echo "  Server IP: $(curl -s ifconfig.me)"
echo ""
