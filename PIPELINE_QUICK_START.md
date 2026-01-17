# 🚀 Pipeline y Deploy - Guía Rápida

## 📋 Archivos Creados

1. **APACHE_PIPELINE_DEPLOYMENT.md** - Documentación completa (este documento)
2. **deploy.sh** - Script manual de deploy
3. **.github/workflows/deploy.yml** - GitHub Actions CI/CD pipeline
4. **apache-facility.conf** - Configuración Apache VirtualHost
5. **setup-server.sh** - Script de setup inicial del servidor
6. **PIPELINE_QUICK_START.md** - Guía rápida (este archivo)

---

## ⚡ Quick Start: 5 Minutos

### Opción A: Deploy Manual (sin GitHub Actions)

#### En máquina local:

```bash
# 1. Hacer cambios y commit
git add .
git commit -m "Update deployment config"
git push origin main

# 2. Dar permisos de ejecución al script
chmod +x deploy.sh

# 3. Ejecutar deploy
./deploy.sh main

# 4. Ver logs
ssh deploy@your-server.com "pm2 logs facility"
```

---

### Opción B: Deploy Automático (GitHub Actions)

#### Setup inicial (una sola vez):

```bash
# 1. En servidor remoto, como root:
chmod +x setup-server.sh
./setup-server.sh your-domain.com

# 2. Generar SSH key para deploy
ssh-keygen -t rsa -b 4096 -f ~/.ssh/facility_deploy -N ""

# 3. Agregar public key al servidor
cat ~/.ssh/facility_deploy.pub | ssh deploy@your-domain.com 'cat >> ~/.ssh/authorized_keys'

# 4. En GitHub, agregar secretos:
#    Settings → Secrets and variables → Actions
#    - DEPLOY_HOST: your-domain.com
#    - DEPLOY_USER: deploy
#    - DEPLOY_SSH_KEY: [contenido de ~/.ssh/facility_deploy]
#    - SLACK_WEBHOOK_URL: [opcional]

# 5. Hacer push a main
git add .
git commit -m "Add deployment pipeline"
git push origin main

# GitHub Actions hace el deploy automáticamente! 🎉
```

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│   Código Local  │
│   (git repo)    │
└────────┬────────┘
         │ git push
         ▼
┌─────────────────┐
│  GitHub Actions │ (CI/CD Pipeline)
│  - Build        │
│  - Test         │
│  - Package      │
└────────┬────────┘
         │ scp + ssh
         ▼
┌─────────────────┐
│  /var/www/      │
│  /facility/     │
│  (Servidor)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Node.js + PM2  │ (Puerto 5000)
│  Express Server │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Apache       │ (Puerto 443)
│  Reverse Proxy  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Cliente      │
│   (HTTPS)       │
└─────────────────┘
```

---

## 🔑 Variables de Entorno Importantes

### En `.env.production` (servidor):

```env
# Database
DATABASE_URL=postgresql://facility:password@localhost:5432/wounddatacenter

# Backend
VITE_BACKEND_URL=https://cubed-mr.app

# Runtime
NODE_ENV=production
```

### En GitHub Actions Secrets:

```
DEPLOY_HOST=your-domain.com
DEPLOY_USER=deploy
DEPLOY_SSH_KEY=<contenido privado>
SLACK_WEBHOOK_URL=<opcional>
VITE_BACKEND_URL=https://cubed-mr.app
```

---

## 📊 Flujo de Deploy

### Manual (deploy.sh):

```
1. npm run build      → Compila localmente
2. scp archivo        → Sube a servidor
3. pm2 stop           → Para aplicación anterior
4. tar -xzf           → Descomprime
5. npm install        → Instala dependencias
6. pm2 start          → Inicia con PM2
7. Verificación       → Prueba conectividad
```

### Automático (GitHub Actions):

```
1. git push main                  → Trigger
2. npm run build                  → Build en GitHub
3. npm run check                  → Type check
4. tar + scp                      → Upload
5. ssh + deploy script            → Remote commands
6. pm2 restart                    → Restart app
7. curl https://domain/health     → Health check
8. Slack notification (opcional)  → Notifica resultado
```

---

## 🆘 Troubleshooting

### Deploy falla en "Building"

```bash
# Revisar build localmente
npm run build

# Si falla:
npm run check
npm install
npm run build
```

### Deploy falla en "Uploading"

```bash
# Verificar SSH
ssh deploy@your-domain.com "echo OK"

# Verificar SSH key
ssh-add ~/.ssh/facility_deploy

# Agregar server al known_hosts
ssh-keyscan -H your-domain.com >> ~/.ssh/known_hosts
```

### Aplicación no inicia en servidor

```bash
# SSH al servidor
ssh deploy@your-domain.com

# Ver logs
pm2 logs facility

# Ver status
pm2 status

# Restart
pm2 restart facility
```

### Apache no sirve la aplicación

```bash
# En servidor
sudo apache2ctl configtest
sudo systemctl status apache2
tail -50 /var/log/apache2/facility-error.log
curl http://localhost:5000/api/health
```

### Certificado SSL vencido

```bash
# Auto-renewal debería estar configurado, pero si no:
sudo certbot renew --force-renewal
sudo systemctl reload apache2
```

---

## 🎯 Checklist Pre-Deploy

- [ ] Código compilado localmente sin errores (`npm run build`)
- [ ] TypeScript válido (`npm run check`)
- [ ] Cambios commiteados en git
- [ ] Rama main actualizada (`git push origin main`)
- [ ] Variables de entorno configuradas en servidor
- [ ] PostgreSQL está corriendo en servidor
- [ ] Apache está corriendo en servidor
- [ ] SSL certificados son válidos
- [ ] SSH key configurada para GitHub Actions (si usas CI/CD)

---

## 📈 Monitoreo

### Ver logs en tiempo real:

```bash
# SSH al servidor
ssh deploy@your-domain.com

# Ver logs de aplicación
pm2 logs facility

# Ver logs de Apache
tail -f /var/log/apache2/facility-error.log
tail -f /var/log/apache2/facility-access.log

# Ver métricas
pm2 monit facility

# Ver status
pm2 status
```

### Alertas útiles:

```bash
# Ver si la app se reinicia mucho
pm2 logs facility | grep -i "restart\|crash"

# Ver errores
pm2 logs facility | grep -i "error\|exception"

# Ver requests lentos
tail -f /var/log/apache2/facility-access.log | awk '{print $4}' | sort -n | tail
```

---

## 🔄 Rollback

Si algo sale mal después del deploy:

```bash
# En servidor
ssh deploy@your-domain.com

# Ver backups disponibles
ls -la /var/www/facility/backups/

# Restaurar backup
pm2 stop facility
rm -rf /var/www/facility/dist
cp -r /var/www/facility/backups/dist-20250110-143022 /var/www/facility/dist
pm2 start facility

# Verificar
pm2 logs facility | head -20
```

---

## 🚀 Deploy Completo Step-by-Step

### 1. Setup servidor (una sola vez):

```bash
# En máquina local, copiar script a servidor
scp setup-server.sh root@your-domain.com:/root/

# En servidor (como root)
ssh root@your-domain.com
chmod +x setup-server.sh
./setup-server.sh your-domain.com
```

### 2. Configurar GitHub (si usas Actions):

```bash
# En máquina local
ssh-keygen -t rsa -b 4096 -f ~/.ssh/facility_deploy -N ""
cat ~/.ssh/facility_deploy.pub | ssh deploy@your-domain.com 'cat >> ~/.ssh/authorized_keys'

# En GitHub:
# Settings → Secrets and variables → Actions → New secret
# DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY
```

### 3. Primer deploy:

```bash
# Opción A: Manual
./deploy.sh main

# Opción B: Automático (GitHub Actions)
git push origin main
# GitHub Actions hace el deploy automáticamente
```

### 4. Verificar:

```bash
# En navegador
https://your-domain.com

# O desde terminal
curl -I https://your-domain.com
curl https://your-domain.com/api/health
```

---

## 📞 Soporte

Si algo no funciona:

1. **Ver logs**: `pm2 logs facility`
2. **Ver status**: `pm2 status`
3. **Revisar Apache**: `sudo tail /var/log/apache2/facility-error.log`
4. **Revisar build**: `npm run build` localmente
5. **Verificar SSH**: `ssh deploy@your-domain.com "echo OK"`

---

## ✅ Estado Actual

✅ **Configuración completada:**
- Apache VirtualHost creado
- Deploy script creado
- GitHub Actions pipeline creado
- Server setup script creado
- Documentación completa

⏳ **Próximos pasos:**
1. Ejecutar `setup-server.sh` en servidor remoto
2. Configurar GitHub Actions secrets
3. Ejecutar primer deploy
4. Configurar monitoreo

---

¿Necesitas ayuda con algún paso? 🚀
