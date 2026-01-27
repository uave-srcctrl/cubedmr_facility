# 📋 Configuración Externa a BD - Resumen Completo

## 🌐 Variables de Entorno Requeridas

### Desarrollo (`.env`)
```env
# Base de datos local
DATABASE_URL=postgresql://user:password@localhost:5432/wounddatacenter

# Backend remoto (opcional, default es cubed-mr.app)
VITE_BACKEND_URL=https://cubed-mr.app

# Node environment
NODE_ENV=development
```

### Producción (`.env.production`)
```env
# Base de datos (PostgreSQL en servidor remoto o Neon serverless)
DATABASE_URL=postgresql://user:password@your-db-host:5432/wounddatacenter

# Backend remoto
VITE_BACKEND_URL=https://cubed-mr.app

# Node environment
NODE_ENV=production
```

---

## 🏗️ Configuraciones por Archivo

### 1. **drizzle.config.ts** - ORM PostgreSQL
```typescript
// Lee DATABASE_URL del environment
// Dialecto: PostgreSQL
// Migrations: ./migrations
// Schema: ./shared/schema.ts

Requiere:
✅ DATABASE_URL configurada
```

### 2. **vite.config.ts** - Build Frontend
```typescript
// Base path para assets
base: "/facility/public/"

// Root: client/
// Plugins: React, Tailwind, Runtime Error Modal

// Aliases disponibles:
@      → client/src
@shared → shared
@assets → attached_assets
```

### 3. **ecosystem.config.js** - PM2 Process Manager
```javascript
// App: wounddatacenter
// Script: dist/index.cjs
// Environment: NODE_ENV=production
// Max Memory: 1GB
// Logs: /var/log/pm2/wounddatacenter-{error,out}.log
```

### 4. **client/src/lib/api-config.ts** - API Endpoints
```typescript
// BACKEND_BASE_URL (default: https://cubed-mr.app)
// LOCAL_API_BASE: /api (tu proxy local)

Endpoints internos (proxy):
- POST /api/get           → Autenticación
- POST /api/logout        → Logout
- GET  /api/health        → Health check
- GET  /api/report        → Reportes
- POST /api/facility-wound-report → Reportes de heridas
```

---

## 🌍 Servidores Remotos

| Servidor | URL | Función |
|----------|-----|---------|
| **remoteWoundcareDB** | `https://cubed-mr.app` | Backend remoto (SQL Server) |
| **Backup Git** | `git://gitsafe:5418/backup.git` | Backup de repositorio |
| **Base de Datos Remota** | Variable en DATABASE_URL | PostgreSQL remoto |

---

## 📡 Flujo de Conexiones

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────┐
│  Nginx / Proxy Web      │ (tu-dominio.com)
│  (Puerto 443)           │
└──────┬──────────────────┘
       │ HTTP localhost
       ▼
┌──────────────────────────┐
│  Express Server          │ (Puerto 5000)
│  - Autentica             │
│  - Hashea passwords      │
│  - Reenvía a backend     │
└──────┬───────────────────┘
       │ HTTPS
       ▼
┌──────────────────────────┐
│  cubed-mr.app            │ (Backend remoto)
│  - Valida credenciales   │
│  - Retorna JWT + datos   │
│  - Maneja facilities     │
└──────────────────────────┘
       │ SQL
       ▼
┌──────────────────────────┐
│  SQL Server              │ (remoteWoundcareDB)
│  - Facilities tabla      │
│  - Users tabla           │
│  - Wound reports tabla   │
└──────────────────────────┘
```

---

## 🔑 Variables de Entorno por Componente

### Drizzle ORM (PostgreSQL local)
- **DATABASE_URL** - Requerida
- Formato: `postgresql://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]`

### Vite (Frontend Build)
- **VITE_BACKEND_URL** - Opcional (default: cubed-mr.app)
- **NODE_ENV** - development/production
- **VITE_API_BASE** - Path base para API calls

### Express Server
- **NODE_ENV** - Requerida (development/production)
- **DATABASE_URL** - Para futuras features de sesiones
- **PORT** - Opcional (default: 5000)

### PM2
- Hereda las variables del `.env.production`
- Configurable en `ecosystem.config.js`

---

## 📊 Configuración Actual del Proyecto

```yaml
Base Path (Frontend):
  /facility/public/

API Endpoints (Proxy Local):
  /api/get              → POST (Autenticación)
  /api/logout           → POST (Logout)
  /api/health           → GET (Health check)
  /api/report           → POST (Reportes)
  /api/facility-*       → GET/POST (Facility data)

Backend Remoto:
  https://cubed-mr.app/api/get              → Autenticación
  https://cubed-mr.app/api/reports/*        → Reportes
  https://cubed-mr.app/api/logout           → Logout

Base de Datos Local (PostgreSQL):
  Base: wounddatacenter
  Tablas: users (solo para auth futura)

Base de Datos Remota (SQL Server):
  Contenedor de facilities, usuarios, reportes
  Accesible por: https://cubed-mr.app
```

---

## ✅ Checklist: Configuración Externa

### Desarrollo Local
- [ ] PostgreSQL corriendo en localhost:5432
- [ ] DATABASE_URL=postgresql://localhost:5432/wounddatacenter
- [ ] npm run dev para frontend
- [ ] npm run dev para backend
- [ ] curl http://localhost:5000/api/health retorna 200

### Producción Remota
- [ ] PostgreSQL en servidor remoto (RDS, Neon, DigitalOcean, etc)
- [ ] DATABASE_URL en .env.production
- [ ] npm run build ejecutado
- [ ] npm run start:pm2 iniciado
- [ ] pm2 startup && pm2 save configurado
- [ ] Nginx como reverse proxy en puerto 443
- [ ] SSL/TLS certificados válidos
- [ ] Conectividad a cubed-mr.app verificada
- [ ] Logs de pm2 sin errores
- [ ] Login funciona (curl test)
- [ ] Reportes cargan correctamente

---

## 🔍 Cómo Verificar Configuración

### 1. Variables de Entorno
```bash
# Ver todas las variables
env | grep -i "database\|node\|vite\|backend"

# Ver archivo .env (solo en desarrollo)
cat .env

# Ver .env.production en servidor
cat /var/www/wounddatacenter/.env.production | head -10
```

### 2. Configuración de Drizzle
```bash
# En servidor remoto
echo $DATABASE_URL
psql -d postgres -c "SELECT datname FROM pg_database WHERE datname='wounddatacenter';"
```

### 3. Configuración de Vite
```bash
# Verificar build
grep -i "base\|backend" vite.config.ts

# Verificar valores en client
grep -i "VITE_\|BACKEND_URL" client/src/lib/api-config.ts
```

### 4. Configuración de PM2
```bash
# Ver configuración
cat ecosystem.config.js | head -30

# Ver procesos activos
pm2 status

# Ver env de proceso
pm2 show wounddatacenter
```

---

## 🚀 Deploy: Variables Necesarias

### Paso 1: En servidor remoto, crear .env.production

```bash
cat > /var/www/wounddatacenter/.env.production << 'EOF'
# PostgreSQL remoto (reemplaza con tu URL)
DATABASE_URL=postgresql://user:password@db-host:5432/wounddatacenter

# Backend remoto
VITE_BACKEND_URL=https://cubed-mr.app

# Environment
NODE_ENV=production
EOF

# Permisos
chmod 600 /var/www/wounddatacenter/.env.production
```

### Paso 2: Verificar conectividad
```bash
# Probar BD PostgreSQL
psql "$DATABASE_URL" -c "SELECT 1;"

# Probar backend remoto
curl https://cubed-mr.app/api/health
```

### Paso 3: Build y Deploy
```bash
npm run build
npm run start:pm2
pm2 startup && pm2 save
```

---

## 📞 Configuración Actualizada (10-01-2026)

✅ **Completada:**
- [x] Drizzle ORM configurado
- [x] Vite build configurado con base path
- [x] API endpoints mapeados
- [x] PM2 ecosystem.config.js creado
- [x] Scripts npm agregados

⏳ **Pendiente:**
- [ ] .env.production en servidor remoto
- [ ] Verificar DATABASE_URL en producción
- [ ] Test de autenticación en producción
- [ ] Monitoreo y alertas configuradas

---

¿Necesitas ayuda con alguna configuración específica? 🔧
