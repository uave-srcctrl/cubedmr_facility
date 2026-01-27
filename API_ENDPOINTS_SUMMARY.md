# API Endpoints y Stored Procedures Usados desde la API Externa

## Resumen Ejecutivo

El cliente (wounddatacenter/client) se comunica con el backend externo (cubed-mr.app) a través del servidor local Node.js en `/api/get` que actúa como proxy. El servidor traduce las entidades y acciones del cliente a llamadas al backend remoto.

---

## 📍 Endpoints Locales (Expuestos por Node.js)

### Autenticación
- **POST** `/api/get` - Login (entity: "TryLogin")
- **POST** `/api/logout` - Logout (entity: "TryLogoutFacilities")
- **GET** `/api/health` - Health check

### Datos de Usuario
- **POST** `/api/get` - Obtener información de entidad (entity: "EntityInfo")
- **POST** `/api/get` - Obtener grupos del usuario (entity: "GroupsByUser")
- **POST** `/api/get` - Obtener lista de facilities (entity: "Facility" o "FacilitiesByProvider")

### Reportes y Dashboards
- **GET/POST** `/api/facility-wound-report` - Reporte de heridas por facility
- **GET/POST** `/api/facility-acuity-index` - Índice de acuidad de facility
- **GET/POST** `/api/etiology-distribution` - Distribución de etiología
- **GET/POST** `/api/dashboard/kpis` - KPIs del dashboard
- **GET/POST** `/api/dashboard/wound-etiology` - Etiología de heridas en dashboard
- **GET/POST** `/api/dashboard/wound-reduction` - Reducción de heridas en dashboard
- **GET/POST** `/api/dashboard/healing-status` - Estado de cicatrización en dashboard
- **GET/POST** `/api/dashboard/wounds-by-status` - Heridas por estado en dashboard
- **POST** `/api/report` - Endpoint genérico para reportes

---

## 🔧 Entidades/Acciones del Backend Remoto (cubed-mr.app)

### Autenticación
| Entidad | Acción | Descripción |
|---------|--------|-------------|
| TryLogin | - | Autenticar usuario con email y contraseña |
| TryLogoutFacilities | - | Cerrar sesión del usuario |

### Información de Usuario
| Entidad | Acción | Descripción |
|---------|--------|-------------|
| EntityInfo | get | Obtener información de la entidad del usuario |
| GroupsByUser | get | Obtener grupos del usuario |
| Facility | lst | Listar facilities del usuario |
| FacilitiesByProvider | lst | Listar facilities por provider |

---

## 📊 Stored Procedures (SPs) en el Backend Remoto

El backend remoto no expone directamente stored procedures. En su lugar, utiliza entidades y acciones que probablemente mapean internamente a SPs en la BD externa. Los siguientes son los probables SPs basados en los reportes:

### SPs Probables
| Nombre Probable | Entidad | Acción | Parámetros |
|-----------------|---------|--------|-----------|
| sp_TryLogin | TryLogin | - | email, passwordHash, deviceId, salt |
| sp_GetEntityInfo | EntityInfo | get | email, token |
| sp_GetGroupsByUser | GroupsByUser | get | email, token |
| sp_GetFacilities | Facility | lst | email, token, providerId (opcional) |
| sp_GetFacilitiesByProvider | FacilitiesByProvider | lst | email, token, providerId |
| sp_rptFacilityWoundOutcome | (interno) | - | facilityId, startDate, endDate |
| sp_rptFacilityAcuityIndex | (interno) | - | facilityId |
| sp_rptOutcomeReportGlobal | (interno) | - | facilityId, startDate, endDate |
| sp_rptEtiologyDistribution | (interno) | - | facilityId, date |

---

## 🌐 Endpoints del Backend Remoto Llamados

### Formato Base
```
https://cubed-mr.app/api/...
```

### Endpoints Actuales
| Método | Endpoint | Propósito |
|--------|----------|----------|
| POST | `/api/get` | Procesar entidades y acciones (login, datos usuario, facilities) |
| POST | `/api/reports/facility-wound-outcome/{facilityId}/{startDate}/{endDate}` | Reporte de desenlaces de heridas |
| POST | `/api/reports/facility-acuity-index/{facilityId}` | Índice de acuidad de facility |
| POST | `/api/reports/outcome-report-global/{facilityId}/{startDate}/{endDate}` | Reporte global de desenlaces |
| POST | `/api/reports/etiology-distribution/{facilityId}/{date}` | Distribución de etiología |

---

## 📝 Estructura de Payloads (Ejemplo)

### Login
```json
{
  "entity": "TryLogin",
  "email": "user@example.com",
  "password": "hashedPassword",
  "deviceId": "web-xxxxx",
  "salt": "email+38457487+deviceId"
}
```

### Obtener Facilities
```json
{
  "entity": "Facility",
  "action": "lst",
  "email": "user@example.com",
  "token": "xxxxx-xxxxx",
  "providerId": "5",
  "deviceId": "web-xxxxx"
}
```

### Obtener EntityInfo
```json
{
  "entity": "EntityInfo",
  "action": "get",
  "email": "user@example.com",
  "token": "xxxxx-xxxxx",
  "deviceId": "web-xxxxx"
}
```

---

## 🔄 Flujo de Comunicación

```
Cliente (Browser)
    ↓
/facility/api/get (Node.js)
    ↓
https://cubed-mr.app/api/get (Backend Remoto)
    ↓
Base de Datos Externa (con SPs)
```

---

## ⚠️ Notas Importantes

1. **Rate Limiting**: El servidor implementa rate limiting para TryLogin:
   - Máximo 20 intentos fallidos
   - Ventana de 15 minutos
   - Se limpia al login exitoso

2. **Authentication**: 
   - Token requerido para todas las llamadas excepto TryLogin
   - El token se incluye en headers Authorization

3. **Timeout**: Las llamadas al backend remoto tienen timeout de 5 segundos

4. **Logging**: Las llamadas se registran en `/tmp/wounddatacenter-login.log`

---

## 🔗 Relación Cliente-Servidor

### Archivos Clave
- **Cliente**: `client/src/lib/api-config.ts` - Define endpoints locales
- **Cliente**: `client/src/hooks/use-auth.ts` - Llama a endpoints
- **Servidor**: `server/routes.ts` - Define rutas y lógica de proxy
- **Servidor**: `server/index.ts` - Configuración del servidor Express

---

Última actualización: 19 de enero de 2026
