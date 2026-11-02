#!/usr/bin/env bash
#
# One-time bootstrap for the Hostinger VPS that runs the RoomDesigner worker.
# Tested on Ubuntu 22.04/24.04. Run as root:
#
#   sudo bash deploy/vps-bootstrap.sh
#
# This installs Docker, enables unattended security updates, configures the
# firewall for SSH only, and creates the deploy directory. It never writes
# application secrets; copy deploy/.env.production.example there afterwards.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (sudo bash deploy/vps-bootstrap.sh)" >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script targets Debian/Ubuntu (apt-get not found)." >&2
  exit 1
fi

. /etc/os-release
case "${ID:-}" in
  ubuntu|debian) ;;
  *)
    echo "This script targets Debian/Ubuntu (detected: ${ID:-unknown})." >&2
    exit 1
    ;;
esac

echo "==> Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  fail2ban \
  gnupg \
  ufw \
  unattended-upgrades

echo "==> Installing Docker Engine and Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable
EOF
  apt-get update
  apt-get install -y --no-install-recommends \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
fi

systemctl enable --now docker

if [ -n "${SUDO_USER:-}" ] && id "$SUDO_USER" >/dev/null 2>&1; then
  usermod -aG docker "$SUDO_USER"
  echo "Added $SUDO_USER to the docker group (re-login to use docker without sudo)."
fi

echo "==> Configuring unattended security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades || true

echo "==> Configuring the firewall (SSH only; the worker has no inbound HTTP)"
ufw allow OpenSSH
ufw --force enable

echo "==> Configuring fail2ban"
systemctl enable --now fail2ban

echo "==> Creating the deploy directory"
install -d -m 0755 /opt/roomdesigner

cat <<'EOF'

Bootstrap complete.

Next steps:
  1. Copy docker-compose.prod.yml and deploy/.env.production.example to
     /opt/roomdesigner/ (as .env.production for the env file).
  2. Fill in the real values in .env.production (chmod 600).
  3. Copy deploy/rollback-worker.sh there if you want one-command rollbacks.
  4. Set the GitHub repository secrets listed in docs/runbook.md.
  5. Push to main/master and let the Deploy workflow run.
EOF
