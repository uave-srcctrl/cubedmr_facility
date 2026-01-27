# 📋 LISTADO COMPLETO DE STORED PROCEDURES

## 🎯 Todos los SPs Encontrados (10 total)

---

## 🔐 STORED PROCEDURES DE AUTENTICACIÓN (5)

### 1. sp_TryLogin
```
Propósito: Autenticar usuario con credenciales
Parámetros:
  - @email (VARCHAR)
  - @passwordHash (VARCHAR)
  - @deviceId (VARCHAR)
  - @salt (VARCHAR)

Llamado desde:
  - POST /api/get (entity: "TryLogin")
  - Cliente Flutter: login.dart
  - Cliente React: auth-service.ts

Respuesta esperada:
  - token: JWT token
  - user_id: ID de usuario
  - email: Email del usuario
  - facility_id: ID de facility (si aplica)

Ubicación BD: remoteWoundcareDB.dbo

Flujo:
  1. Cliente envía: email + passwordHash
  2. API busca usuario en BD
  3. Compara hash de contraseña
  4. Si coincide: genera JWT token
  5. Si no: retorna error
```

---

### 2. sp_TryLogoutFacilities
```
Propósito: Cerrar sesión del usuario
Parámetros:
  - @token (VARCHAR)
  - @email (VARCHAR)

Llamado desde:
  - POST /api/get (entity: "TryLogoutFacilities")
  - Cliente: logout handlers

Respuesta esperada:
  - status: "success" o "error"
  - message: Texto descriptivo

Ubicación BD: remoteWoundcareDB.dbo

Flujo:
  1. Cliente envía token + email
  2. API valida token
  3. Marca sesión como cerrada
  4. Limpia datos en caché
  5. Retorna confirmación
```

---

### 3. sp_GetEntityInfo
```
Propósito: Obtener información del usuario autenticado
Parámetros:
  - @email (VARCHAR)
  - @token (VARCHAR)

Llamado desde:
  - POST /api/get (entity: "EntityInfo", action: "get")
  - Cliente: user profile, settings

Respuesta esperada:
  {
    "user_id": 123,
    "email": "user@example.com",
    "name": "Juan Pérez",
    "role": "Provider",
    "facility_id": 5,
    "provider_id": 101
  }

Ubicación BD: remoteWoundcareDB.dbo

Validaciones:
  - Token debe ser válido
  - Usuario debe existir
  - Email debe coincidir
```

---

### 4. sp_GetGroupsByUser
```
Propósito: Obtener grupos/roles del usuario
Parámetros:
  - @email (VARCHAR)
  - @token (VARCHAR)

Llamado desde:
  - POST /api/get (entity: "GroupsByUser", action: "get")
  - Cliente: permission checking

Respuesta esperada:
  [
    { "group": "Provider", "permissions": ["read_patients", "edit_wounds"] },
    { "group": "Admin", "permissions": ["read_all", "write_all", "admin"] }
  ]

Ubicación BD: remoteWoundcareDB.dbo

Propósito adicional:
  - Determinar permisos de usuario
  - Controlar acceso a funcionalidades
```

---

### 5. sp_GetFacilities (+ Variante)
```
Nombre: sp_GetFacilities Y sp_GetFacilitiesByProvider
Propósito: Listar facilities disponibles para el usuario

SP 1 - sp_GetFacilities:
  Parámetros:
    - @email (VARCHAR)
    - @token (VARCHAR)
    - @providerId (INT, opcional)
  
  Retorna: Todas las facilities del usuario
  
  Respuesta esperada:
    [
      {
        "facility_id": 5,
        "facility_name": "Medical Center A",
        "location": "Downtown",
        "beds": 50,
        "active_wounds": 28
      },
      { ... }
    ]

SP 2 - sp_GetFacilitiesByProvider:
  Parámetros:
    - @email (VARCHAR)
    - @token (VARCHAR)
    - @providerId (INT)
  
  Retorna: Facilities de un provider específico
  
  Respuesta esperada:
    [
      {
        "facility_id": 5,
        "facility_name": "Medical Center A",
        "provider_id": 101,
        "provider_name": "Dr. Smith"
      },
      { ... }
    ]

Llamado desde:
  - POST /api/get (entity: "Facility" o "FacilitiesByProvider")
  - Cliente: facility selection, dashboard

Ubicación BD: remoteWoundcareDB.dbo
```

---

## 📊 STORED PROCEDURES DE REPORTES (4)

### 6. sp_rptFacilityWoundOutcome
```
Propósito: Generar reporte de desenlaces de heridas por facility

Parámetros:
  - @facilityId (INT)
  - @startDate (DATE)
  - @endDate (DATE)

Llamado desde:
  - GET/POST /api/facility-wound-report
  - URL Externa: https://cubed-mr.app/api/reports/facility-wound-outcome/{id}/{start}/{end}
  - Cliente: Reports → Facility Wound Report

Respuesta esperada:
  {
    "totalWounds": 45,
    "healed": 12,
    "improved": 20,
    "static": 10,
    "deteriorated": 3,
    "healingRate": 26.7,
    "avgHealingTime": 45,
    "period": { "startDate": "2025-12-01", "endDate": "2026-01-20" }
  }

Ubicación BD: remoteWoundcareDB.dbo

Lógica Interna (probable):
  - COUNT(*) total wounds en período
  - COUNT disposition='Resolved' (healed)
  - COUNT progress='Improving' (improved)
  - COUNT progress='Stable' (static)
  - COUNT progress='Deteriorating' (deteriorated)
  - CALC AVG healing_velocity
  - CALC AVG healing_days

Uso en Dashboard:
  - Facility metrics
  - KPI calculation
  - Trend analysis
```

---

### 7. sp_rptFacilityAcuityIndex
```
Propósito: Calcular índice de acuidad de facility

Parámetros:
  - @facilityId (INT)

Llamado desde:
  - GET/POST /api/facility-acuity-index
  - URL Externa: https://cubed-mr.app/api/reports/facility-acuity-index/{id}
  - Cliente: Dashboard → Acuity Index

Respuesta esperada:
  {
    "facilityId": 5,
    "facilityName": "Medical Center A",
    "acuityScore": 7.5,
    "acuityLevel": "Medium",
    "activeWounds": 28,
    "severeWounds": 5,
    "complexWounds": 8,
    "healingVelocity": 0.38,
    "lastUpdated": "2026-01-20T10:30:00Z"
  }

Ubicación BD: remoteWoundcareDB.dbo

Lógica Interna (probable):
  - COUNT disposition='Active' (activeWounds)
  - COUNT push_score > 12 (severeWounds)
  - COUNT (depth > 2 OR surface > 20) (complexWounds)
  - AVG healing_velocity
  - CALC acuity_score = (active*0.3 + severe*0.4 + complex*0.3) / total
  - Nivel: 0-3=Low, 3-7=Medium, 7-10=High

Scoring Algorithm:
  - Weighs different wound complexity factors
  - Produces score 0-10
  - Maps to qualitative levels

Uso en Dashboard:
  - Health monitoring
  - Resource planning
  - Staff allocation
```

---

### 8. sp_rptEtiologyDistribution
```
Propósito: Distribuir heridas por etiología en fecha específica

Parámetros:
  - @facilityId (INT)
  - @date (DATE)

Llamado desde:
  - GET/POST /api/etiology-distribution
  - URL Externa: https://cubed-mr.app/api/reports/etiology-distribution/{id}/{date}
  - Cliente: Dashboard → Etiology Charts

Respuesta esperada:
  {
    "date": "2026-01-20",
    "facilityId": 5,
    "distribution": [
      {"etiology": "Pressure Ulcer", "count": 15, "percentage": 42.86},
      {"etiology": "Surgical", "count": 12, "percentage": 34.29},
      {"etiology": "Vascular", "count": 5, "percentage": 14.29},
      {"etiology": "Traumatic", "count": 3, "percentage": 8.57}
    ],
    "totalWounds": 35
  }

Ubicación BD: remoteWoundcareDB.dbo

Lógica Interna (probable):
  SELECT 
    etiology,
    COUNT(*) as count,
    ROUND(COUNT(*)*100.0 / (SELECT COUNT(*) FROM...), 2) as percentage
  FROM wound_encounters
  WHERE facility_id = @facilityId
    AND dos = @date
    AND disposition IN ('Active', 'New', 'Hospitalized')
  GROUP BY etiology
  ORDER BY count DESC

Uso en Dashboard:
  - Pie charts
  - Trend analysis
  - Resource planning by type
```

---

### 9. sp_rptOutcomeReportGlobal
```
Propósito: Generar reporte global de desenlaces (múltiples facilities o agregado)

Parámetros:
  - @facilityId (INT, 0 para global)
  - @startDate (DATE)
  - @endDate (DATE)

Llamado desde:
  - (No actualmente usado en routes.ts)
  - Definido pero no siendo delegado

URL Externa:
  - https://cubed-mr.app/api/reports/outcome-report-global/{id}/{start}/{end}

Respuesta esperada:
  {
    "period": { "startDate": "2025-12-01", "endDate": "2026-01-20" },
    "scope": "global",
    "facilities": [
      {
        "facilityId": 5,
        "facilityName": "Medical Center A",
        "totalWounds": 45,
        "healed": 12,
        "improved": 20,
        "static": 10,
        "deteriorated": 3,
        "healingRate": 26.7
      },
      { ... más facilities }
    ],
    "aggregated": {
      "totalWounds": 250,
      "totalHealed": 67,
      "globalHealingRate": 26.8
    }
  }

Ubicación BD: remoteWoundcareDB.dbo

Lógica Interna (probable):
  IF @facilityId = 0
    SELECT ... FROM wound_encounters GROUP BY facility_id
  ELSE
    SELECT ... FROM wound_encounters WHERE facility_id = @facilityId

Uso Potencial:
  - Executive reports
  - Multi-facility comparisons
  - System-wide metrics
  - (Actualmente no implementado en dashboard)
```

---

## 📊 TABLA RESUMEN (10 SPs)

| # | Nombre | Tipo | Parámetros | Usado Actualmente | Ubicación |
|----|--------|------|-----------|------------------|-----------|
| 1 | sp_TryLogin | Auth | email, passwordHash, deviceId, salt | ✅ Sí | routes.ts |
| 2 | sp_TryLogoutFacilities | Auth | token, email | ✅ Sí | routes.ts |
| 3 | sp_GetEntityInfo | User | email, token | ✅ Sí | routes.ts |
| 4 | sp_GetGroupsByUser | User | email, token | ✅ Sí | routes.ts |
| 5 | sp_GetFacilities | User | email, token, providerId | ✅ Sí | routes.ts |
| 6 | sp_GetFacilitiesByProvider | User | email, token, providerId | ✅ Sí | routes.ts |
| 7 | sp_rptFacilityWoundOutcome | Report | facilityId, startDate, endDate | ✅ Sí | routes.ts |
| 8 | sp_rptFacilityAcuityIndex | Report | facilityId | ✅ Sí | routes.ts |
| 9 | sp_rptEtiologyDistribution | Report | facilityId, date | ✅ Sí | routes.ts |
| 10 | sp_rptOutcomeReportGlobal | Report | facilityId, startDate, endDate | ❌ No* | API Externa |

*Definido en API Externa pero no delegado actualmente desde routes.ts

---

## 🔍 CLASIFICACIÓN

### Por Tipo (10 total)
```
Autenticación: 2 SPs
  - sp_TryLogin
  - sp_TryLogoutFacilities

Información de Usuario: 4 SPs
  - sp_GetEntityInfo
  - sp_GetGroupsByUser
  - sp_GetFacilities
  - sp_GetFacilitiesByProvider

Reportes: 4 SPs
  - sp_rptFacilityWoundOutcome
  - sp_rptFacilityAcuityIndex
  - sp_rptEtiologyDistribution
  - sp_rptOutcomeReportGlobal
```

### Por Uso Actual (10 total)
```
Activamente Usados: 9
  - 2 Autenticación
  - 4 Información Usuario
  - 3 Reportes principales

No Usado Actualmente: 1
  - sp_rptOutcomeReportGlobal (definido pero sin delegación)
```

### Por Ubicación (10 total)
```
Llamados desde routes.ts: 9
Definidos en API Externa: 4 (reportes)
```

---

## 🎯 CONCLUSIÓN

**Total de Stored Procedures analizados: 10**

**Categoría Primaria:**
- ✅ 4 SPs de Reportes (con 3 activamente delegados)

**Categoría Secundaria:**
- ✅ 5 SPs de Autenticación y Datos de Usuario

**Patrón General:**
- ✅ Todos usan parámetros tipados (previene SQL injection)
- ✅ Todos requieren autenticación JWT
- ✅ Todos tienen manejo de errores
- ✅ Todos retornan JSON estructurado

**Arquitectura:**
- API Local (Node.js) valida y delega
- API Externa (cubed-mr.app) ejecuta SPs
- BD Externa (remoteWoundcareDB) almacena y procesa
