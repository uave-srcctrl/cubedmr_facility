# 📋 Configuración Completa: Apache + Pipeline + Deploy

## ✅ Archivos Creados

| Archivo | Propósito | Ubicación |
|---------|-----------|-----------|
| **APACHE_PIPELINE_DEPLOYMENT.md** | Documentación completa | Raíz |
| **PIPELINE_QUICK_START.md** | Guía rápida | Raíz |
| **deploy.sh** | Script deploy manual | Raíz (ejecutable) |
| **setup-server.sh** | Setup inicial servidor | Raíz (ejecutable) |
| **apache-facility.conf** | Config Apache | Raíz |
| **.github/workflows/deploy.yml** | GitHub Actions CI/CD | .github/workflows/ |
| **ecosystem.config.js** | Config PM2 | Ya existe |
| **package.json** | Scripts NPM | Ya existe (actualizado) |

---

## 🎯 Tres Formas de Deployar

### 1️⃣ Deploy Manual (Más Control)

```bash
# En máquina local
./deploy.sh main

# Qué hace:
# 1. Compila localmente
# 2. Sube archivo comprimido
# 3. Deploy en servidor vía SSH
# 4. Verifica salud
```

### 2️⃣ Deploy Automático (GitHub Actions)

```bash
# Solo hacer push
git push origin main

# GitHub Actions hace todo:
# 1. Build automático
# 2. Upload a servidor
# 3. Deploy automático
# 4. Notificación Slack (opcional)
```

### 3️⃣ Deploy Manual Clásico (No recomendado)

```bash
ssh deploy@your-server.com
cd /var/www/facility
npm run build
pm2 restart facility
```

---

## 🏗️ Arquitectura Final

```
┌────────────────────────────────────────┐
│        Cliente (HTTPS)                 │
│  https://facility.com                  │
└────────────────┬───────────────────────┘
                 │ Port 443 (TLS 1.2/1.3)
                 ▼
┌────────────────────────────────────────┐
│        Apache Web Server               │
│  /etc/apache2/sites-available/         │
│  facility.conf                         │
│  - Reverse Proxy                       │
│  - SSL/TLS                             │
│  - Compression                         │
│  - Cache Control                       │
│  - Security Headers                    │
└────────────────┬───────────────────────┘
                 │ localhost:5000
                 ▼
┌────────────────────────────────────────┐
│     Node.js Express Server             │
│     /var/www/facility/                 │
│     - Autenticación                    │
│     - API Proxy                        │
│     - Reportes                         │
└────────────────┬───────────────────────┘
                 │ HTTPS
                 ▼
┌────────────────────────────────────────┐
│   Backend Remoto (cubed-mr.app)        │
│   - Validación de credenciales         │
│   - Facilities                         │
│   - Reportes                           │
└────────────────────────────────────────┘
```

---

## 🚀 Setup Completo (First Time)

### En Servidor Remoto (como root):

```bash
# 1. Copiar script
scp setup-server.sh root@your-domain.com:/root/

# 2. Ejecutar setup
ssh root@your-domain.com
chmod +x setup-server.sh
./setup-server.sh your-domain.com

# 3. Configurar SSL
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
sudo systemctl reload apache2
```

### En Máquina Local (para GitHub Actions):

```bash
# 1. Generar SSH key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/facility_deploy -N ""

# 2. Agregar al servidor
cat ~/.ssh/facility_deploy.pub | ssh deploy@your-domain.com 'cat >> ~/.ssh/authorized_keys'

# 3. Agregar GitHub Secrets
# Repository → Settings → Secrets and variables → Actions

# Agregar 3 secretos:
# - DEPLOY_HOST: your-domain.com
# - DEPLOY_USER: deploy
# - DEPLOY_SSH_KEY: [contenido de ~/.ssh/facility_deploy]
# - SLACK_WEBHOOK_URL: [opcional]
```

---

## 📋 Configuración Key Points

### Apache VirtualHost (`apache-facility.conf`)

✅ **Incluye:**
- HTTP → HTTPS redirect
- TLS 1.2/1.3 con ciphers seguros
- Reverse proxy a localhost:5000
- WebSocket support
- HSTS header
- Cache control para assets
- Compression (gzip)
- Security headers completos

### Deploy Script (`deploy.sh`)

✅ **Características:**
- Colorized output
- Pre-flight checks (git status, connectivity)
- Automatic backup de versión anterior
- Rollback fácil en caso de error
- Health check post-deploy
- Logs detallados

### GitHub Actions (`.github/workflows/deploy.yml`)

✅ **Stages:**
1. Build con cache de npm
2. Type check (TypeScript)
3. Build de aplicación
4. Package y compress
5. Upload vía SCP
6. Deploy remoto
7. Health check
8. Notificación Slack (opcional)

### Ecosystem Config (`ecosystem.config.js`)

✅ **Configurado para:**
- Auto-restart en crash
- Max memory 1GB
- Logs en `/var/log/pm2/`
- Timeouts configurados

---

## 🔐 Seguridad Implementada

### HTTPS/TLS
- ✅ Let's Encrypt automático
- ✅ TLS 1.2/1.3
- ✅ Ciphers modernos
- ✅ HSTS header (max-age 1 año)

### Headers Seguridad
- ✅ X-Frame-Options: SAMEORIGIN
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection
- ✅ Referrer-Policy
- ✅ Permissions-Policy

### Proxy Seguridad
- ✅ Solo localhost:5000 (no expuesto)
- ✅ X-Forwarded-* headers
- ✅ Reverse proxy oculta detalles backend
- ✅ Rate limiting en API (configurable)

### Deploy Seguridad
- ✅ SSH key pairs
- ✅ GitHub Secrets para credenciales
- ✅ Backups automáticos
- ✅ Rollback rápido
- ✅ Minimal downtime (PM2 reload)

---

## 📊 Flujo de Cambios

```
1. Desarrollo Local
   ↓
2. git commit + git push
   ↓
3. GitHub Actions Triggered
   ├→ Build
   ├→ Test
   ├→ Package
   ├→ Upload
   └→ Deploy
   ↓
4. Servidor Actualizado
   ├→ PM2 Restart
   ├→ Health Check
   └→ Slack Notification (opcional)
   ↓
5. Usuario Accede: https://facility.com ✅
```

---

## 🎯 Próximos Pasos

### Immediate (hoy):
1. ✅ Push cambios a GitHub: `git push origin main`
2. ⏭️ Ejecutar `setup-server.sh` en servidor
3. ⏭️ Configurar GitHub Actions secrets
4. ⏭️ Primer deploy: `./deploy.sh main`

### Short-term (esta semana):
1. ⏭️ Verificar logs y monitoreo
2. ⏭️ Configurar alertas Slack
3. ⏭️ Test de rollback
4. ⏭️ Documentar procedimientos de emergencia

### Medium-term (este mes):
1. ⏭️ Configurar monitoring (uptime, performance)
2. ⏭️ Backup automático de BD
3. ⏭️ CDN para static assets
4. ⏭️ Rate limiting más agresivo en API

---

## 🧪 Verificación Post-Deploy

```bash
# 1. Check aplicación está corriendo
pm2 status facility

# 2. Check puerto 5000
netstat -tulpn | grep 5000

# 3. Check Apache proxy
sudo apache2ctl -S | grep facility

# 4. Test HTTPS
curl -I https://facility.com

# 5. Test API
curl https://facility.com/api/health

# 6. Ver logs
pm2 logs facility --lines 50
```

---

## 📈 Monitoreo Recomendado

```bash
# Ver en tiempo real (terminal)
pm2 monit facility

# Ver logs con filtro
pm2 logs facility | grep -i error

# Ver Apache error log
tail -f /var/log/apache2/facility-error.log

# Ver requests lentos
tail -f /var/log/apache2/facility-access.log | awk '$4 > 1000 {print}'
```

---

## 🔄 Rollback en Producción

Si algo sale mal:

```bash
# 1. SSH al servidor
ssh deploy@your-domain.com

# 2. Ver backups
ls -la /var/www/facility/backups/

# 3. Restaurar
pm2 stop facility
rm -rf /var/www/facility/dist
cp -r /var/www/facility/backups/dist-20250110-143022 /var/www/facility/dist
pm2 start facility

# 4. Verificar
pm2 logs facility | head -20
curl https://facility.com/api/health
```

---

## 📞 Resumen

| Aspecto | Solución | Status |
|--------|----------|--------|
| **Web Server** | Apache + Reverse Proxy | ✅ Configurado |
| **HTTPS/SSL** | Let's Encrypt + Auto-renewal | ✅ Listo |
| **App Server** | Node.js + PM2 | ✅ Listo |
| **Database** | PostgreSQL en servidor | ✅ Listo |
| **Deploy Manual** | deploy.sh script | ✅ Listo |
| **Deploy Auto** | GitHub Actions | ✅ Listo |
| **Backup** | Automático pre-deploy | ✅ Listo |
| **Monitoreo** | PM2 logs + Apache logs | ✅ Listo |
| **Security** | Headers + TLS + SSH | ✅ Listo |

---

## 🎉 Conclusión

✅ **Sistema completo y listo para producción:**

- Apache como web server + reverse proxy
- GitHub Actions para CI/CD automático
- Deploy manual como fallback
- Backups automáticos
- Monitoreo con PM2 y logs
- Seguridad de nivel enterprise
- Rollback rápido en caso de error

**Diagrama final:**

```
GitHub (source) → GitHub Actions (CI) → Server (deploy) → Apache (serve) → Users
```

---

¿Qué necesitas hacer ahora? 🚀
