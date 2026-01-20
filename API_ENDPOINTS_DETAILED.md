# Mapeo Detallado: Entidades → Stored Procedures → Base de Datos

## 1. Flujo de Autenticación (TryLogin)

### Llamada del Cliente
```typescript
// client/src/pages/login.tsx
const response = await fetch("/facility/api/get", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    entity: "TryLogin",
    email: "drperez@curisec.com",
    password: "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f",
    deviceId: "web-xxxxx",
    salt: "drperez@curisec.com38457487web-xxxxx"
  })
});
```

### Procesamiento en Servidor Node.js
```
Endpoint: POST /api/get
Router Handler: routes.ts línea 143

1. Valida entity === "TryLogin"
2. Valida email presente
3. Prepara payload:
   {
     entity: "TryLogin",
     email,
     password (hashed),
     deviceId,
     salt
   }
4. Envía a: https://cubed-mr.app/api/get
```

### Respuesta del Backend
```json
{
  "status": true,
  "data": [{
    "status": 1,
    "reason": null,
    "email": "drperez@curisec.com",
    "msg": "",
    "token": "25AFD453-EA2E-43FD-BE7A-03BEEC8701D6"
  }]
}
```

### SP Probable en DB Remota
```sql
EXEC sp_TryLogin 
  @email = 'drperez@curisec.com',
  @passwordHash = 'ef797c8...',
  @deviceId = 'web-xxxxx',
  @salt = 'drperez@curisec.com38457487web-xxxxx'
```

---

## 2. Obtener Información de Usuario (EntityInfo)

### Llamada del Cliente
```typescript
// client/src/hooks/use-auth.ts - loadUser()
const response = await fetch("/facility/api/get", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    entity: "EntityInfo",
    action: "get",
    email: "drperez@curisec.com",
    token: "25AFD453-EA2E-43FD-BE7A-03BEEC8701D6",
    deviceId: "web-xxxxx",
    encountertrackid: "adc2d8716..."
  })
});
```

### Procesamiento en Servidor Node.js
```
Endpoint: POST /api/get
Router Handler: routes.ts línea 244

1. Valida entity === "EntityInfo"
2. Valida token presente
3. Requiere token para acceso
4. Prepara payload y envía a backend remoto
```

### Respuesta Probable
```json
{
  "status": true,
  "data": [{
    "entityId": "5",
    "entityName": "Dr. Perez",
    "entity": "Facility",
    "email": "drperez@curisec.com"
  }]
}
```

---

## 3. Obtener Facilities (Facility + lst)

### Llamada del Cliente
```typescript
// client/src/hooks/use-auth.ts - getFacilities()
const response = await fetch("/facility/api/get", {
  method: "POST",
  body: JSON.stringify({
    entity: "Facility",      // Entidad
    action: "lst",           // Listar
    email: "drperez@curisec.com",
    token: "25AFD453...",
    providerId: "5",
    deviceId: "web-xxxxx"
  })
});
```

### Procesamiento en Servidor
```
Endpoint: POST /api/get
Router Handler: routes.ts línea 249

1. Valida entity === "Facility"
2. Valida token presente
3. Envía con acción "lst" al backend remoto
```

### Respuesta Probable
```json
{
  "status": true,
  "data": [
    {
      "id": "5",
      "name": "Facility Name",
      "patients": 150,
      "activePatients": 45
    }
  ]
}
```

### SP Probable
```sql
EXEC sp_GetFacilities
  @email = 'drperez@curisec.com',
  @token = '25AFD453...',
  @providerId = '5'
```

---

## 4. Reportes - Facility Wound Report

### Llamada del Cliente
```typescript
// client/src/hooks/use-auth.ts - getFacilityWoundOutcome()
const response = await fetch("/facility/api/report", {
  method: "POST",
  body: JSON.stringify({
    reportName: "rptFacilityWoundOutcome",
    facilityId: "5",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    email,
    token
  })
});
```

### Rutas Soportadas en Node.js
```typescript
// routes.ts línea 512-513
app.get("/api/facility-wound-report", handler);
app.post("/api/facility-wound-report", handler);
```

### Endpoint Remoto Llamado
```
POST https://cubed-mr.app/api/reports/facility-wound-outcome/{facilityId}/{startDate}/{endDate}
```

---

## 5. Reportes - Facility Acuity Index

### Llamada del Cliente
```typescript
const response = await fetch("/facility/api/facility-acuity-index", {
  method: "POST",
  body: JSON.stringify({
    facilityId: "5",
    email,
    token
  })
});
```

### Rutas Soportadas
```typescript
// routes.ts línea 438-439
app.get("/api/facility-acuity-index", handler);
app.post("/api/facility-acuity-index", handler);
```

### Endpoint Remoto
```
POST https://cubed-mr.app/api/reports/facility-acuity-index/{facilityId}
```

### SP Probable
```sql
EXEC sp_rptFacilityAcuityIndex
  @facilityId = '5',
  @email = 'drperez@curisec.com'
```

---

## 6. Dashboard - KPIs

### Llamada del Cliente
```typescript
// client/src/pages/dashboard.tsx
const response = await fetch("/facility/api/dashboard/kpis", {
  method: "POST",
  body: JSON.stringify({
    facilityId: "5",
    email,
    token
  })
});
```

### Rutas Soportadas
```typescript
// routes.ts línea 763-764
app.get("/api/dashboard/kpis", handler);
app.post("/api/dashboard/kpis", handler);
```

### Datos Obtenidos
- Total de heridas
- Heridas activas
- Promedio de cicatrización
- Otros KPIs

---

## 7. Todos los Reportes/Dashboards Disponibles

| ID | Nombre | Endpoint Local | Endpoint Remoto | SP Probable |
|:---|--------|---|---|---|
| 1 | Facility Wound Report | `/api/facility-wound-report` | `/api/reports/facility-wound-outcome/{fId}/{start}/{end}` | sp_rptFacilityWoundOutcome |
| 2 | Facility Acuity Index | `/api/facility-acuity-index` | `/api/reports/facility-acuity-index/{fId}` | sp_rptFacilityAcuityIndex |
| 3 | Etiology Distribution | `/api/etiology-distribution` | `/api/reports/etiology-distribution/{fId}/{date}` | sp_rptEtiologyDistribution |
| 4 | Outcome Report Global | (remoto directo) | `/api/reports/outcome-report-global/{fId}/{start}/{end}` | sp_rptOutcomeReportGlobal |
| 5 | Dashboard KPIs | `/api/dashboard/kpis` | (lógica local) | - |
| 6 | Dashboard Wound Etiology | `/api/dashboard/wound-etiology` | (lógica local) | - |
| 7 | Dashboard Wound Reduction | `/api/dashboard/wound-reduction` | (lógica local) | - |
| 8 | Dashboard Healing Status | `/api/dashboard/healing-status` | (lógica local) | - |
| 9 | Dashboard Wounds by Status | `/api/dashboard/wounds-by-status` | (lógica local) | - |

---

## 8. Parámetros Comunes en Todos los Requests

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|----------|-------------|
| `email` | string | Sí | Email del usuario autenticado |
| `token` | string | Sí (excepto TryLogin) | Token de autenticación |
| `deviceId` | string | Sí | ID del dispositivo (ej: "web-xxxxx") |
| `encountertrackid` | string | A veces | ID de seguimiento de encuentro |
| `facilityId` / `id` | string | Reportes | ID de la facility |
| `startDate` | string | Reportes | Fecha inicio (YYYY-MM-DD) |
| `endDate` | string | Reportes | Fecha fin (YYYY-MM-DD) |

---

## 9. Headers Utilizados

### Autenticación
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Respuesta Típica
```
Content-Type: application/json
```

---

## 10. Ciclo de Vida de una Solicitud

```
1. Cliente genera solicitud en React
   ↓
2. Envía POST a /facility/api/... (local)
   ↓
3. Express (Node.js) recibe en routes.ts
   ↓
4. Valida entidad y token
   ↓
5. Prepara payload para backend remoto
   ↓
6. Envía a https://cubed-mr.app/api/...
   ↓
7. Backend remoto ejecuta SP correspondiente
   ↓
8. SP consulta base de datos SQL
   ↓
9. Devuelve resultados JSON
   ↓
10. Node.js reenvía respuesta al cliente
   ↓
11. React renderiza datos en UI
```

---

Última actualización: 19 de enero de 2026
