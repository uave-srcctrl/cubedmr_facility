# WoundCare Multi-Environment Configuration - Implementation Summary

## What Was Done

Se configuró la aplicación React en `wounddatacenter/client` para **soportar dos entornos de API**:

1. **LOCAL** - Desarrollo con Docker MSSQL y APIs locales
2. **REMOTE** - Producción con servidor cubed-mr.app existente

## Files Modified/Created

### 1. `.env.local` ✅ CREATED
**Propósito:** Centralizar configuración de entornos

```env
VITE_ENVIRONMENT=local                           # Entorno activo
VITE_BACKEND_URL=http://localhost:5000          # Backend local
VITE_BACKEND_URL_REMOTE=https://cubed-mr.app    # Backend remoto
VITE_DEBUG_API=true                             # Logs de debug
```

### 2. `client/src/lib/api-config.ts` ✅ UPDATED
**Propósito:** Configuración dinámica de APIs

**Nuevas exportaciones:**
- `API_CONFIG` - Objeto con endpoints dinámicos
- `buildApiUrl()` - Función helper para URLs personalizadas
- `ENVIRONMENT`, `IS_LOCAL`, `IS_REMOTE` - Flags de control

**Cambios:**
- Detección automática de `VITE_ENVIRONMENT`
- Soporte para LOCAL y REMOTE en paralelo
- Debug logging integrado

### 3. `MULTI_ENVIRONMENT_SETUP.md` ✅ CREATED
**Propósito:** Documentación completa

Incluye:
- Guía de configuración
- Ejemplos de uso en componentes
- Troubleshooting
- Arquitectura de APIs
- Instrucciones de deployment

### 4. `QUICK_START_MULTI_ENV.md` ✅ CREATED
**Propósito:** Quick reference para desarrollo

Incluye:
- Setup rápido
- Comandos para verificar
- Troubleshooting rápido

## Architecture

### LOCAL Environment (Development)

```
React App (localhost:5173)
    ↓
`.env.local`: VITE_ENVIRONMENT=local
    ↓
API_CONFIG → http://localhost:5000/api
    ↓
Express Server (si está instalado)
    ↓
Docker MSSQL (localhost:4433)
    ↓
Database: curisec
```

### REMOTE Environment (Production)

```
React App (localhost:5173)
    ↓
`.env.local`: VITE_ENVIRONMENT=remote
    ↓
API_CONFIG → https://cubed-mr.app/api
    ↓
External Backend Server
    ↓
Remote MSSQL
    ↓
Database: curisec
```

## How To Use

### 1. Switch Environments

**Para LOCAL (Desarrollo):**
```env
# .env.local
VITE_ENVIRONMENT=local
VITE_BACKEND_URL=http://localhost:5000
VITE_DEBUG_API=true
```

**Para REMOTE (Producción):**
```env
# .env.local
VITE_ENVIRONMENT=remote
VITE_BACKEND_URL_REMOTE=https://cubed-mr.app
VITE_DEBUG_API=false
```

Luego reiniciar dev server:
```bash
npm run dev
```

### 2. Use in Components

```typescript
// ✅ CORRECTO - Usar API_CONFIG
import { API_CONFIG, buildApiUrl } from '@/lib/api-config';

// Endpoint automático según entorno
const loginUrl = API_CONFIG.LOGIN;
const reportUrl = API_CONFIG.REPORT;

// Custom URL con parámetros
const url = buildApiUrl('/get', {
  entity: 'Facility',
  id: '123'
});

// Verificar entorno actual
if (API_CONFIG.IS_LOCAL) {
  console.log('Running in LOCAL mode');
}
```

### 3. Verify Connectivity

**Local APIs:**
```bash
curl https://api-dev.local/test
curl https://api-prod.local/test

# Respuesta esperada:
# {"status":true,"message":"Database connection successful",...}
```

**Remote API:**
```bash
curl https://cubed-mr.app/api/test
```

## Configuration Summary

| Aspect | LOCAL | REMOTE |
|--------|-------|--------|
| **Entorno** | Desarrollo | Producción |
| **Backend** | http://localhost:5000 | https://cubed-mr.app |
| **API Base** | /facility/api | /api |
| **Database** | Docker (localhost:4433) | Remote MSSQL |
| **Database Name** | curisec | curisec |
| **Usar cuando** | Desarrollo local | Production/testing remoto |

## API Endpoints Available

Mismo en LOCAL y REMOTE:
- `POST /get` - Get entity data
- `POST /add` - Add new record
- `POST /upd` - Update record
- `POST /del` - Delete record
- `POST /lst` - List records
- `POST /report` - Generate report
- `GET /health` - Health check

Ejemplo:
```typescript
// Automáticamente usa el entorno correcto
const response = await fetch(API_CONFIG.GET, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ entity: 'Facility', id: '123' })
});
```

## Migration Guide

### From Hardcoded URLs

**❌ ANTES (No hacer esto):**
```typescript
const url = 'https://cubed-mr.app/api/get';  // Hardcoded!
fetch(url, ...);
```

**✅ AHORA (Hacer esto):**
```typescript
import { API_CONFIG } from '@/lib/api-config';
fetch(API_CONFIG.GET, ...);  // Automático según entorno
```

## Troubleshooting

### "Cannot connect to localhost:5000"

**Causas:**
- Express server no está corriendo
- Port 5000 está ocupado
- Apache proxy no está configurado

**Solución:**
```bash
# Iniciar Express server
cd wounddatacenter/server
npm start

# O verificar puerto
lsof -i :5000
```

### "CORS errors"

**Para LOCAL:**
- Express ya tiene CORS configurado ✅

**Para REMOTE:**
- Debe estar configurado en cubed-mr.app
- Verificar que el header CORS está presente

### "Wrong database/Wrong endpoint"

**Solución:**
1. Verificar `.env.local` tiene entorno correcto
2. Reiniciar dev server: `npm run dev`
3. Verificar en console: `API_CONFIG.ENVIRONMENT`

### "Debug logs not showing"

**Solución:**
```env
# En .env.local
VITE_DEBUG_API=true
```

Luego en navegador console:
```javascript
// Filter debug logs
localStorage.setItem('debug', '*')
```

## Deployment

### Production Build (REMOTE)

```bash
# 1. Asegurar .env.local tiene:
#    VITE_ENVIRONMENT=remote
#    VITE_BACKEND_URL_REMOTE=https://cubed-mr.app

# 2. Build
npm run build

# 3. Deploy dist/ a servidor web
```

### Development Build (LOCAL)

```bash
# 1. Asegurar .env.local tiene:
#    VITE_ENVIRONMENT=local
#    VITE_BACKEND_URL=http://localhost:5000

# 2. Dev server
npm run dev

# 3. Acceder en http://localhost:5173
```

## Files Structure

```
wounddatacenter/
├── .env.local                                    ← NEW: Multi-env config
├── MULTI_ENVIRONMENT_SETUP.md                   ← NEW: Full documentation
├── QUICK_START_MULTI_ENV.md                     ← NEW: Quick reference
└── client/src/lib/
    └── api-config.ts                            ← UPDATED: Dynamic endpoints
```

## Next Steps

1. **Verificar conectividad:**
   ```bash
   curl https://api-dev.local/test
   curl https://api-prod.local/test
   ```

2. **Cambiar `.env.local` a LOCAL mode:**
   ```env
   VITE_ENVIRONMENT=local
   ```

3. **Reiniciar dev server:**
   ```bash
   npm run dev
   ```

4. **Probar login y funcionalidad**

5. **Si todo funciona, actualizar código:**
   - Reemplazar URLs hardcodeadas con `API_CONFIG`
   - Usar `buildApiUrl()` para URLs dinámicas

## Important Notes

⚠️ **Docker MSSQL Requirements:**
- Container debe estar corriendo: `docker ps | grep mssql`
- Puerto 4433 debe ser accesible
- Database `curisec` debe existir

⚠️ **Network Configuration:**
- LOCAL: Require Express server en localhost:5000
- LOCAL: Require Apache proxy (/facility/* → localhost:5000)
- REMOTE: Require internet connectivity a cubed-mr.app

⚠️ **No Hardcode URLs:**
- ✅ Use `API_CONFIG` en todo el código
- ❌ Never use hardcoded URLs like `https://cubed-mr.app/api/...`

## Summary

✅ La aplicación ahora puede:
- Alternar entre LOCAL y REMOTE entornos
- Usar la base de datos Docker MSSQL localmente
- Conectar a cubed-mr.app en producción
- Mantener todo centralizado en `.env.local`
- Debuggear fácilmente con logs automáticos

**Próximo paso:** Cambiar `VITE_ENVIRONMENT=local` en `.env.local` y probar la aplicación con las APIs locales.

