#!/bin/bash
set -e

# ============================================
# Initial Server Setup Script
# Run this on the remote server (once)
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "🖥️  Initial Server Setup for Facility App"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

DOMAIN="${1:-facility.com}"
DEPLOY_USER="deploy"

# ============================================
# Step 1: Update system
# ============================================
echo -e "${YELLOW}1. Updating system packages...${NC}"
apt update && apt upgrade -y

# ============================================
# Step 2: Install Node.js
# ============================================
echo -e "${YELLOW}2. Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# ============================================
# Step 3: Install PM2
# ============================================
echo -e "${YELLOW}3. Installing PM2...${NC}"
npm install -g pm2
pm2 startup
pm2 save

echo -e "${GREEN}✅ PM2 installed${NC}"

# ============================================
# Step 4: Install Apache
# ============================================
echo -e "${YELLOW}4. Installing Apache...${NC}"
apt install -y apache2 apache2-utils certbot python3-certbot-apache

# Enable required modules
a2enmod ssl
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod headers
a2enmod deflate
a2enmod expires

echo -e "${GREEN}✅ Apache installed${NC}"

# ============================================
# Step 5: Install PostgreSQL
# ============================================
echo -e "${YELLOW}5. Installing PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

echo -e "${GREEN}✅ PostgreSQL installed${NC}"

# ============================================
# Step 6: Create deploy user
# ============================================
echo -e "${YELLOW}6. Creating deploy user...${NC}"

if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash $DEPLOY_USER
    usermod -aG sudo $DEPLOY_USER
    echo -e "${GREEN}✅ User $DEPLOY_USER created${NC}"
else
    echo -e "${YELLOW}User $DEPLOY_USER already exists${NC}"
fi

# Setup SSH directory
mkdir -p /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
touch /home/$DEPLOY_USER/.ssh/authorized_keys
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys

# ============================================
# Step 7: Create application directory
# ============================================
echo -e "${YELLOW}7. Creating application directory...${NC}"

mkdir -p /var/www/facility
chown $DEPLOY_USER:$DEPLOY_USER /var/www/facility
chmod 755 /var/www/facility

mkdir -p /var/www/facility/backups
chown $DEPLOY_USER:$DEPLOY_USER /var/www/facility/backups
chmod 755 /var/www/facility/backups

mkdir -p /var/log/pm2
chown $DEPLOY_USER:$DEPLOY_USER /var/log/pm2
chmod 755 /var/log/pm2

echo -e "${GREEN}✅ Directory structure created${NC}"

# ============================================
# Step 8: Setup SSL with Let's Encrypt
# ============================================
echo -e "${YELLOW}8. Setting up SSL certificates...${NC}"

if command -v certbot &> /dev/null; then
    echo "Run this command to get SSL certificates:"
    echo "  sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN"
    echo ""
    echo "Then enable auto-renewal:"
    echo "  sudo systemctl enable certbot.timer"
    echo "  sudo systemctl start certbot.timer"
else
    echo -e "${RED}certbot not found, please install manually${NC}"
fi

# ============================================
# Step 9: Create .env.production template
# ============================================
echo -e "${YELLOW}9. Creating .env.production template...${NC}"

cat > /var/www/facility/.env.production.template << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/wounddatacenter

# Backend Configuration
VITE_BACKEND_URL=https://cubed-mr.app

# Environment
NODE_ENV=production
EOF

chown $DEPLOY_USER:$DEPLOY_USER /var/www/facility/.env.production.template
chmod 600 /var/www/facility/.env.production.template

echo -e "${GREEN}✅ .env.production template created${NC}"

# ============================================
# Step 10: Create PostgreSQL database
# ============================================
echo -e "${YELLOW}10. Setting up PostgreSQL database...${NC}"

sudo -u postgres psql << PSQL_SETUP
-- Create database
CREATE DATABASE IF NOT EXISTS wounddatacenter;

-- Create user
CREATE USER IF NOT EXISTS facility WITH PASSWORD 'change_me_please';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE wounddatacenter TO facility;
GRANT CONNECT ON DATABASE wounddatacenter TO facility;

-- Grant schema privileges
\c wounddatacenter
GRANT ALL PRIVILEGES ON SCHEMA public TO facility;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO facility;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO facility;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO facility;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO facility;
PSQL_SETUP

echo -e "${YELLOW}⚠️  IMPORTANT: Change the password in /var/www/facility/.env.production.template${NC}"
echo -e "${GREEN}✅ PostgreSQL configured${NC}"

# ============================================
# Step 11: Apache Configuration
# ============================================
echo -e "${YELLOW}11. Configuring Apache VirtualHost...${NC}"

if [ -f "./apache-facility.conf" ]; then
    cp ./apache-facility.conf /etc/apache2/sites-available/facility.conf
    echo -e "${GREEN}✅ Apache config copied${NC}"
else
    echo -e "${YELLOW}⚠️  apache-facility.conf not found in current directory${NC}"
    echo "Copy it manually to /etc/apache2/sites-available/facility.conf"
fi

# Enable site
a2ensite facility.conf 2>/dev/null || true

# Disable default site
a2dissite 000-default.conf 2>/dev/null || true

# Test config
apache2ctl configtest

# Restart Apache
systemctl restart apache2
echo -e "${GREEN}✅ Apache restarted${NC}"

# ============================================
# Step 12: Firewall
# ============================================
echo -e "${YELLOW}12. Configuring firewall...${NC}"

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${GREEN}✅ Firewall rules added${NC}"
else
    echo -e "${YELLOW}UFW not found, configure firewall manually${NC}"
fi

# ============================================
# Summary
# ============================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Server setup completed!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Setup SSH key for deploy user:"
echo "   ssh-keygen -t rsa -b 4096 -f ~/.ssh/facility_deploy -N \"\""
echo "   cat ~/.ssh/facility_deploy.pub | ssh root@$DOMAIN 'cat >> /home/$DEPLOY_USER/.ssh/authorized_keys'"
echo ""
echo "2. Update PostgreSQL password:"
echo "   Edit /var/www/facility/.env.production.template"
echo "   Copy to .env.production"
echo ""
echo "3. Setup SSL certificates:"
echo "   sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "4. Configure GitHub Actions secrets:"
echo "   DEPLOY_HOST: $DOMAIN"
echo "   DEPLOY_USER: $DEPLOY_USER"
echo "   DEPLOY_SSH_KEY: [contenido de ~/.ssh/facility_deploy]"
echo ""
echo "5. Test deployment:"
echo "   ./deploy.sh main"
echo ""
echo "Services running:"
systemctl status --no-pager apache2 postgresql | grep -E "active|inactive"
echo ""
echo -e "${GREEN}Server is ready for deployment! 🎉${NC}"
