# 🚀 Apache + Reverse Proxy + CI/CD Pipeline

Configuración completa para desplegar en servidor remoto con Apache como reverse proxy.

## 📋 Estructura Final

```
/var/www/facility/
├── app/                           # Aplicación compilada
│   ├── dist/
│   │   ├── index.cjs              # Server compilado
│   │   └── client/
│   │       └── facility/public/   # Frontend assets
│   ├── package.json
│   ├── .env.production
│   ├── ecosystem.config.js
│   └── node_modules/
├── shared/                        # Shared code
└── migrations/                    # BD migrations

Apache VirtualHost:
facility.com:80 → localhost:5000 (proxy inverso)
```

---

## 🔧 1. Configuración Apache VirtualHost

**Archivo:** `/etc/apache2/sites-available/facility.conf`

```apache
# HTTP → HTTPS Redirect
<VirtualHost *:80>
    ServerName facility.com
    ServerAlias www.facility.com
    
    # Redirect HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

# HTTPS VirtualHost
<VirtualHost *:443>
    ServerName facility.com
    ServerAlias www.facility.com
    ServerAdmin admin@facility.com
    
    # SSL Certificates (Let's Encrypt)
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/facility.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/facility.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/facility.com/chain.pem
    
    # SSL Configuration
    SSLProtocol TLSv1.2 TLSv1.3
    SSLCipherSuite HIGH:!aNULL:!MD5
    SSLHonorCipherOrder on
    
    # Logging
    ErrorLog /var/log/apache2/facility-error.log
    CustomLog /var/log/apache2/facility-access.log combined
    
    # Document Root (for static files if needed)
    DocumentRoot /var/www/facility
    
    # ===== REVERSE PROXY CONFIGURATION =====
    
    # Enable Proxy modules
    ProxyPreserveHost On
    ProxyPassReverse / http://127.0.0.1:5000/
    ProxyPassReverse /facility/public/ http://127.0.0.1:5000/facility/public/
    
    # Main proxy rule - forward all requests to Node.js app on port 5000
    ProxyPass / http://127.0.0.1:5000/
    
    # WebSocket support (if needed)
    ProxyPass /ws ws://127.0.0.1:5000/ws
    ProxyPassReverse /ws ws://127.0.0.1:5000/ws
    
    # Headers for proxy
    RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s
    RequestHeader set X-Forwarded-Proto https
    RequestHeader set X-Forwarded-Host %{HTTP_HOST}s
    
    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>
    
    # Cache control for static assets
    <LocationMatch "^/facility/public/">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </LocationMatch>
    
    # Security Headers
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</VirtualHost>
```

**Instalación:**

```bash
# 1. Crear archivo
sudo tee /etc/apache2/sites-available/facility.conf > /dev/null << 'EOF'
# [Contenido del archivo de arriba]
EOF

# 2. Habilitar módulos requeridos
sudo a2enmod ssl
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod deflate
sudo a2enmod headers

# 3. Habilitar sitio
sudo a2ensite facility.conf

# 4. Deshabilitar default (opcional)
sudo a2dissite 000-default.conf

# 5. Verificar configuración
sudo apache2ctl configtest
# Debería decir: Syntax OK

# 6. Recargar Apache
sudo systemctl reload apache2

# 7. Verificar estado
sudo systemctl status apache2
```

---

## 🔐 2. Certificados SSL (Let's Encrypt)

```bash
# Instalar certbot
sudo apt update
sudo apt install -y certbot python3-certbot-apache

# Obtener certificado
sudo certbot certonly --apache -d facility.com -d www.facility.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renovación
sudo certbot renew --dry-run

# Ver certificados activos
sudo certbot certificates
```

---

## 📦 3. Script de Deploy (`deploy.sh`)

**Ubicación:** `/home/deploy/facility-deploy.sh`

```bash
#!/bin/bash
set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
DEPLOY_USER="deploy"
DEPLOY_HOST="your-server.com"
DEPLOY_PATH="/var/www/facility"
APP_NAME="wounddatacenter"
BRANCH="${1:-main}"

echo -e "${YELLOW}🚀 Iniciando deploy de $APP_NAME en $DEPLOY_HOST...${NC}"

# 1. Build local
echo -e "${YELLOW}📦 Compilando aplicación...${NC}"
npm run check
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build falló${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build exitoso${NC}"

# 2. Preparar archivos para deploy
echo -e "${YELLOW}📋 Preparando archivos...${NC}"
mkdir -p deploy-package
cp -r dist/ deploy-package/
cp -r migrations/ deploy-package/
cp package.json package-lock.json ecosystem.config.js deploy-package/
cp .env.production deploy-package/.env 2>/dev/null || true

# 3. Comprimir
echo -e "${YELLOW}📦 Comprimiendo...${NC}"
tar -czf facility-deploy.tar.gz deploy-package/
rm -rf deploy-package

# 4. Transferir a servidor
echo -e "${YELLOW}📤 Transfiriendo a servidor...${NC}"
scp facility-deploy.tar.gz $DEPLOY_USER@$DEPLOY_HOST:/tmp/

# 5. Descomprimir y actualizar en servidor
echo -e "${YELLOW}🔧 Actualizando en servidor...${NC}"
ssh $DEPLOY_USER@$DEPLOY_HOST << 'REMOTE_COMMANDS'
set -e
cd $DEPLOY_PATH

echo "Deteniendo aplicación..."
pm2 stop facility 2>/dev/null || true

echo "Backup de versión anterior..."
mkdir -p backups
cp -r dist backups/dist-$(date +%Y%m%d-%H%M%S) || true

echo "Extrayendo archivos nuevos..."
tar -xzf /tmp/facility-deploy.tar.gz -C .
mv deploy-package/* .
rm -rf deploy-package /tmp/facility-deploy.tar.gz

echo "Instalando dependencias..."
npm install --production

echo "Iniciando aplicación..."
pm2 start ecosystem.config.js
pm2 save

echo "Verificando..."
sleep 2
pm2 status facility

REMOTE_COMMANDS

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deploy completado exitosamente${NC}"
    rm facility-deploy.tar.gz
else
    echo -e "${RED}❌ Deploy falló${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Aplicación lista en https://facility.com${NC}"
```

**Uso:**
```bash
chmod +x /home/deploy/facility-deploy.sh
./facility-deploy.sh main
```

---

## 🔄 4. GitHub Actions Pipeline

**Ubicación:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v3
      
      - name: 📦 Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: 🔍 Install dependencies
        run: npm install --production=false
      
      - name: ✅ Check TypeScript
        run: npm run check
      
      - name: 🔨 Build application
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: 📦 Create deployment package
        run: |
          mkdir -p deploy-package
          cp -r dist/ deploy-package/
          cp -r migrations/ deploy-package/
          cp package.json package-lock.json ecosystem.config.js deploy-package/
          tar -czf facility-deploy.tar.gz deploy-package/
      
      - name: 📤 Deploy to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          source: "facility-deploy.tar.gz"
          target: "/tmp/"
      
      - name: 🚀 Run deploy script on server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /var/www/facility
            pm2 stop facility 2>/dev/null || true
            mkdir -p backups
            cp -r dist backups/dist-$(date +%Y%m%d-%H%M%S) || true
            tar -xzf /tmp/facility-deploy.tar.gz -C .
            mv deploy-package/* .
            rm -rf deploy-package /tmp/facility-deploy.tar.gz
            npm install --production
            pm2 start ecosystem.config.js
            pm2 save
            echo "✅ Deploy completado"
      
      - name: 📊 Notify Slack (optional)
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ Deploy a producción completado",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deploy Exitoso*\nAplicación: facility.com\nCommit: ${{ github.sha }}\nAutor: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

**Configurar secretos en GitHub:**
```
Settings → Secrets and variables → Actions

DEPLOY_HOST: your-server.com
DEPLOY_USER: deploy
DEPLOY_SSH_KEY: [contenido de /home/deploy/.ssh/id_rsa]
SLACK_WEBHOOK: [opcional, para notificaciones]
```

---

## 👤 5. Usuario Deploy (Setup en Servidor)

```bash
# En servidor remoto, ejecutar como root:

# 1. Crear usuario deploy
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# 2. Crear directorio de aplicación
sudo mkdir -p /var/www/facility
sudo chown deploy:deploy /var/www/facility
sudo chmod 755 /var/www/facility

# 3. Configurar SSH para GitHub Actions
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh

# 4. Copiar public key (generar en máquina local si no existe)
# En máquina local:
ssh-keygen -t rsa -b 4096 -f ~/.ssh/facility_deploy -N ""
cat ~/.ssh/facility_deploy.pub | ssh deploy@your-server.com 'cat >> ~/.ssh/authorized_keys'

# 5. En servidor, agregar permisos de PM2
sudo setfacl -m u:deploy:rw /var/lib/pm2/rpc.socket /var/lib/pm2/pub.socket
sudo setfacl -d -m u:deploy:rw /var/lib/pm2/rpc.socket /var/lib/pm2/pub.socket

# 6. Verificar
ssh deploy@your-server.com "ls -la /var/www/facility"
```

---

## 📋 6. Checklist Pre-Deploy

### En Servidor Remoto

```bash
# 1. Apache configurado
sudo apache2ctl configtest          # Syntax OK

# 2. SSL certificados
sudo certbot certificates           # Debe mostrar facility.com

# 3. Módulos habilitados
sudo apache2ctl -M | grep proxy     # proxy_module y proxy_http_module

# 4. Directorio de aplicación
ls -la /var/www/facility            # Debe existir y ser accesible

# 5. Node.js y PM2
node --version                      # v20+
npm --version                       # v10+
pm2 --version                       # Debe estar instalado globalmente

# 6. PostgreSQL (si es local)
psql --version                      # PostgreSQL está instalado

# 7. Puerto 5000 disponible
netstat -tulpn | grep 5000          # No debe estar en uso
```

### En Máquina Local

```bash
# 1. Build compila sin errores
npm run build

# 2. TypeScript válido
npm run check

# 3. SSH key configurada
ssh deploy@your-server.com "echo OK"

# 4. Git remote correcto
git remote -v

# 5. Rama main actualizada
git status
```

---

## 🚀 7. Process de Deploy Completo

### Manual (via script)

```bash
# En máquina local:

# 1. Asegurar cambios están en git
git add .
git commit -m "Update deployment config"
git push origin main

# 2. Ejecutar deploy
./deploy.sh main

# 3. Verificar en servidor
ssh user@your-server.com "pm2 logs facility | head -20"

# 4. Test en navegador
curl -I https://facility.com
```

### Automático (GitHub Actions)

```bash
# Simplemente hacer push a main:
git add .
git commit -m "New feature"
git push origin main

# GitHub Actions ejecuta automáticamente:
# 1. Build
# 2. Tests (si los hay)
# 3. Upload a servidor
# 4. Deploy y restart
# 5. Notificación en Slack (opcional)
```

---

## 📊 8. Monitoreo Post-Deploy

```bash
# Ver status de aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs facility --lines 50

# Ver logs de Apache
tail -50 /var/log/apache2/facility-error.log
tail -50 /var/log/apache2/facility-access.log

# Verificar puerto 5000
netstat -tulpn | grep 5000

# Verificar proxy Apache
sudo apache2ctl -S | grep facility

# Test de conectividad
curl -v https://facility.com
curl -v https://facility.com/api/health
```

---

## 🔄 9. Rollback en Caso de Error

```bash
# Si deploy falla:

# 1. Ver qué versión anterior hay
ls -la /var/www/facility/backups/

# 2. Restaurar versión anterior
pm2 stop facility
rm -rf /var/www/facility/dist
cp -r /var/www/facility/backups/dist-20250110-143022 /var/www/facility/dist
pm2 start facility

# 3. Verificar
pm2 logs facility | head -20

# 4. Investigar error
pm2 logs facility | grep -i error
```

---

## 📝 10. Variables de Entorno en Servidor

```bash
# Crear .env.production en servidor
sudo -u deploy tee /var/www/facility/.env.production > /dev/null << 'EOF'
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wounddatacenter

# Backend remoto
VITE_BACKEND_URL=https://cubed-mr.app

# Environment
NODE_ENV=production
EOF

# Permisos
sudo chmod 600 /var/www/facility/.env.production
```

---

## ✅ Resumen

| Paso | Herramienta | Archivo |
|------|-------------|---------|
| 1. Código | Git | repository |
| 2. Build | npm | package.json |
| 3. CI/CD | GitHub Actions | .github/workflows/deploy.yml |
| 4. Deploy | Bash Script | deploy.sh (manual) o GitHub Actions |
| 5. Web Server | Apache | /etc/apache2/sites-available/facility.conf |
| 6. App Server | Node.js + PM2 | ecosystem.config.js |
| 7. Database | PostgreSQL | DATABASE_URL |
| 8. Proxy | Apache Reverse | ProxyPass / http://127.0.0.1:5000/ |
| 9. HTTPS | Let's Encrypt | certbot |

---

¿Necesitas ayuda con algún paso específico? 🚀
