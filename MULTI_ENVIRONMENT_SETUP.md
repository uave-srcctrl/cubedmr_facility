# WoundCare Multi-Environment Configuration Guide

## Overview

La aplicación React en `wounddatacenter/client` está configurada para funcionar con **dos entornos**:

1. **LOCAL** - Desarrollo local con APIs locales (Docker MSSQL + Express)
2. **REMOTE** - Producción con servidor remoto existente (cubed-mr.app)

## Configuración

### Archivo `.env.local`

La configuración se maneja a través de variables de entorno en `.env.local`:

```env
# Seleccionar entorno: 'local' | 'remote'
VITE_ENVIRONMENT=local

# URLs de backend
VITE_BACKEND_URL=http://localhost:5000              # Local (dev)
VITE_BACKEND_URL_REMOTE=https://cubed-mr.app        # Remote (prod)

# Configuración de la app
VITE_DEBUG_API=true
VITE_REQUEST_TIMEOUT=30000
```

## Entornos

### LOCAL Environment

**Cuando usar:**
- Desarrollo local
- Testing con base de datos Docker
- Pruebas de nuevas características

**Configuración:**
```env
VITE_ENVIRONMENT=local
VITE_BACKEND_URL=http://localhost:5000
```

**APIs disponibles:**
- Base: `http://localhost:5000/api`
- La aplicación accede vía `/facility/api` (Apache proxy)
- Base de datos: Docker MSSQL en `localhost:4433`
- Base de datos: `curisec`

**Verificar conectividad:**
```bash
# Desde el cliente (React)
# Ir a: http://localhost:5173/facility/api/test

# Desde terminal
curl http://localhost:5000/api/test
curl https://api-dev.local/dev/test-api.php
curl https://api-prod.local/prod/test-api.php
```

### REMOTE Environment

**Cuando usar:**
- Producción
- Testing contra servidor externo
- Validación de datos reales

**Configuración:**
```env
VITE_ENVIRONMENT=remote
VITE_BACKEND_URL_REMOTE=https://cubed-mr.app
```

**APIs disponibles:**
- Base: `https://cubed-mr.app/api`
- Base de datos: MSSQL remoto
- Base de datos: `curisec`

## Uso en Componentes

### Usando API_CONFIG en componentes React

```typescript
import { API_CONFIG, buildApiUrl } from '@/lib/api-config';

// Get current environment
console.log(API_CONFIG.ENVIRONMENT);  // 'local' or 'remote'
console.log(API_CONFIG.BACKEND_URL);  // Full backend URL
console.log(API_CONFIG.DEBUG);        // Debug logging enabled?

// Use endpoints
const loginUrl = API_CONFIG.LOGIN;    // Correcto endpoint según entorno
const reportUrl = API_CONFIG.REPORT;

// Build custom URLs
const customUrl = buildApiUrl('/custom-endpoint', {
  facilityId: '123',
  date: '2024-01-01'
});
```

### Ejemplo en hooks

```typescript
// hooks/use-auth.ts
import { API_CONFIG } from '@/lib/api-config';

export function useAuth() {
  const loginEndpoint = API_CONFIG.LOGIN;
  
  const login = async (credentials) => {
    const response = await fetch(loginEndpoint, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    return response.json();
  };
  
  return { login };
}
```

## Variables de Configuración

### En `api-config.ts`

| Variable | Propósito | Local | Remote |
|----------|-----------|-------|--------|
| `ENVIRONMENT` | Entorno actual | 'local' | 'remote' |
| `IS_LOCAL` | Flag boolean | true | false |
| `IS_REMOTE` | Flag boolean | false | true |
| `ACTIVE_BACKEND_URL` | URL del backend | localhost:5000 | cubed-mr.app |
| `ACTIVE_API_BASE` | Base path de API | /facility/api | /api |
| `DEBUG_API` | Logging de debug | basado en VITE_DEBUG_API | basado en VITE_DEBUG_API |

## Cambiar Entornos

### Método 1: Editar `.env.local`

```env
# Para LOCAL (desarrollo)
VITE_ENVIRONMENT=local

# Para REMOTE (producción)
VITE_ENVIRONMENT=remote
```

Luego reiniciar dev server:
```bash
npm run dev
```

### Método 2: Variables de entorno en terminal

```bash
# Linux/Mac
export VITE_ENVIRONMENT=local
npm run dev

# Windows PowerShell
$env:VITE_ENVIRONMENT="local"
npm run dev

# Windows CMD
set VITE_ENVIRONMENT=local
npm run dev
```

### Método 3: Build con entorno específico

```bash
# Producción remota
VITE_ENVIRONMENT=remote npm run build

# Desarrollo local
VITE_ENVIRONMENT=local npm run build
```

## Verificación de Conectividad

### Test LOCAL APIs

```bash
# PHP test routes
curl https://api-dev.local/test
curl https://api-prod.local/test

# Or desde Node server
curl http://localhost:5000/api/test
```

Respuesta esperada:
```json
{
  "status": true,
  "message": "Database connection successful",
  "environment": "LOCAL DEVELOPMENT",
  "server": "localhost:4433",
  "database": "curisec",
  "tables_count": 205
}
```

### Test REMOTE API

```bash
curl https://cubed-mr.app/api/test
```

## Troubleshooting

### "Cannot connect to localhost:5000"

**Solución:**
1. Verificar que Express server está corriendo
   ```bash
   cd wounddatacenter/server
   npm start
   ```

2. Verificar Apache proxy está configurado
   ```bash
   sudo apache2ctl configtest  # Should say "Syntax OK"
   ```

3. Verificar Docker MSSQL está corriendo
   ```bash
   docker ps | grep mssql
   ```

### "CORS errors"

**Solución:**
1. Para LOCAL: Express ya tiene CORS habilitado
2. Para REMOTE: Debe estar configurado en cubed-mr.app

### Debug logging

**Habilitar debug:**
```env
VITE_DEBUG_API=true
```

**Ver logs en navegador:**
```javascript
// En console del navegador
localStorage.setItem('debug', '*')
```

## Arquitectura de APIs

### LOCAL (Docker MSSQL)

```
React App (http://localhost:5173)
    ↓
Apache Proxy (/facility/api → localhost:5000)
    ↓
Express Server (localhost:5000)
    ↓
SQL Routes (/api/*)
    ↓
Docker MSSQL (localhost:4433)
    ↓
Database: curisec
```

### REMOTE (cubed-mr.app)

```
React App (http://localhost:5173)
    ↓
Direct HTTPS Request
    ↓
cubed-mr.app Backend (/api/*)
    ↓
Remote MSSQL
    ↓
Database: curisec
```

## Endpoints Disponibles

### Mismo en LOCAL y REMOTE

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/get` | POST | Get entity data |
| `/add` | POST | Add new record |
| `/upd` | POST | Update record |
| `/del` | POST | Delete record |
| `/lst` | POST | List records |
| `/report` | POST | Generate report |
| `/health` | GET | Health check |

### Ejemplo de uso

```typescript
// LOCAL
fetch('http://localhost:5000/api/get', {
  method: 'POST',
  body: JSON.stringify({ entity: 'Facility', id: '123' })
})

// REMOTE
fetch('https://cubed-mr.app/api/get', {
  method: 'POST',
  body: JSON.stringify({ entity: 'Facility', id: '123' })
})

// La aplicación maneja automáticamente según VITE_ENVIRONMENT
```

## Notas de Desarrollo

1. **No hardcodear URLs** - Usar siempre `API_CONFIG`
2. **Usar `buildApiUrl()`** - Para URLs con parámetros
3. **Testing** - Cambiar `VITE_ENVIRONMENT` en `.env.local`
4. **Production** - Asegurar `VITE_ENVIRONMENT=remote` en build
5. **Debug** - Habilitar `VITE_DEBUG_API=true` para ver requests/responses

## Deployment

### Para Producción (REMOTE)

1. Asegurar `.env.local` tiene:
   ```env
   VITE_ENVIRONMENT=remote
   VITE_BACKEND_URL_REMOTE=https://cubed-mr.app
   ```

2. Build:
   ```bash
   npm run build
   ```

3. Deploy dist/ a servidor web

### Para Desarrollo (LOCAL)

1. Asegurar `.env.local` tiene:
   ```env
   VITE_ENVIRONMENT=local
   VITE_BACKEND_URL=http://localhost:5000
   ```

2. Iniciar dev server:
   ```bash
   npm run dev
   ```

3. Acceder en: `http://localhost:5173`

