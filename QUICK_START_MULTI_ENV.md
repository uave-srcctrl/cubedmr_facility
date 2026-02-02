# WoundCare - API Configuration Quick Start

## What's New?

La aplicación ahora soporta **múltiples entornos** para APIs:

- ✅ **LOCAL**: Desarrollo con Docker MSSQL + APIs locales
- ✅ **REMOTE**: Producción con servidor cubed-mr.app existente

## Quick Setup

### Para Desarrollo Local (Recomendado)

1. Editar `.env.local`:
```env
VITE_ENVIRONMENT=local
VITE_BACKEND_URL=http://localhost:5000
VITE_DEBUG_API=true
```

2. Iniciar servidores:
```bash
# Terminal 1: React app
cd wounddatacenter/client
npm run dev

# Terminal 2: Express server (si está instalado)
cd wounddatacenter/server
npm start

# Terminal 3: Docker MSSQL (si no está corriendo)
docker ps | grep mssql
```

3. Verificar en navegador:
- App: `http://localhost:5173`
- API Test: `https://api-dev.local/test`

### Para Producción (Remote)

1. Editar `.env.local`:
```env
VITE_ENVIRONMENT=remote
VITE_BACKEND_URL_REMOTE=https://cubed-mr.app
```

2. Build:
```bash
npm run build
```

3. Deploy `dist/` a servidor web

## API Endpoints

### Usar en componentes:

```typescript
import { API_CONFIG } from '@/lib/api-config';

// Endpoint correcto según entorno actual
const endpoint = API_CONFIG.LOGIN;  // Automático: local o remote

// Para custom endpoints
import { buildApiUrl } from '@/lib/api-config';
const url = buildApiUrl('/get', { entity: 'Facility', id: '123' });
```

## Environment Variables

| Variable | Default | Propósito |
|----------|---------|-----------|
| `VITE_ENVIRONMENT` | local | Seleccionar entorno |
| `VITE_BACKEND_URL` | http://localhost:5000 | Backend local |
| `VITE_BACKEND_URL_REMOTE` | https://cubed-mr.app | Backend remoto |
| `VITE_DEBUG_API` | true | Activar logs de debug |

## Verificar Conectividad

### APIs Locales

```bash
# Test PHPs (HTTPS)
curl https://api-dev.local/test
curl https://api-prod.local/test

# Response esperado:
# {"status":true,"message":"Database connection successful","server":"localhost:4433","database":"curisec","tables_count":205}
```

### API Remota

```bash
curl https://cubed-mr.app/api/test
```

## Troubleshooting

| Problema | Solución |
|----------|----------|
| "Cannot connect to localhost:5000" | Verificar que Express server está corriendo |
| "CORS errors" | Asegurar CORS está configurado en backend |
| "Wrong database" | Verificar `VITE_ENVIRONMENT` en `.env.local` |
| "No debug logs" | Cambiar `VITE_DEBUG_API=true` |

## Archivo de Configuración

Consulta `MULTI_ENVIRONMENT_SETUP.md` para documentación completa.

## Cambios Realizados

### 1. `.env.local` (NUEVO)
- Configuración centralizada de entornos
- Variables para LOCAL y REMOTE

### 2. `client/src/lib/api-config.ts` (ACTUALIZADO)
- Detección automática de entorno
- `API_CONFIG` con endpoints dinámicos
- `buildApiUrl()` para URLs personalizadas
- Debug logging integrado

### 3. `MULTI_ENVIRONMENT_SETUP.md` (NUEVO)
- Documentación completa de multi-entorno
- Guía de troubleshooting
- Ejemplos de uso

## Siguiente Paso

1. Verificar que las APIs locales están accesibles:
   ```bash
   curl https://api-dev.local/test
   curl https://api-prod.local/test
   ```

2. Cambiar `.env.local` a:
   ```env
   VITE_ENVIRONMENT=local
   ```

3. Reiniciar dev server y probar login

4. Si todo funciona, puedes cambiar a `VITE_ENVIRONMENT=remote` para testing contra producción

---

**Nota:** Las APIs locales usan Docker MSSQL en puerto 4433 con base de datos `curisec`.
Asegurar que el container está corriendo antes de usar `VITE_ENVIRONMENT=local`.
