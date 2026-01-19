# Comparación Visual: Flujos de Autenticación

## 🔐 Arquitectura y Flujo Lado a Lado

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FACILITY WEB (React + TypeScript)                       │
└─────────────────────────────────────────────────────────────────────────────┘

  USER BROWSER
     │
     │ 1. Ingresa email + password
     │
     ▼
  LOGIN.TSX (React Component)
     │
     │ 2. Valida con Zod schema
     │ 3. Genera o recupera deviceId
     │    deviceId = "web-abc123xyz" (random)
     │
     ▼
  FETCH API
     │
     │ 4. POST http://localhost:5000/api/get
     │ 5. Body JSON:
     │    {
     │      "action": "TryLoginFacilities",
     │      "email": "user@example.com",
     │      "password": "password123",
     │      "deviceId": "web-abc123xyz",
     │      "name": "user@example.com"
     │    }
     │
     ▼
  EXPRESS SERVER
  (routes.ts - /api/get endpoint)
     │
     │ 6. Recibe POST /api/get
     │ 7. Extrae parámetros
     │ 8. NO valida localmente
     │ 9. Reenvía a servidor remoto
     │
     ▼
  HTTPS REQUEST
     │
     │ 10. POST https://cubed-mr.app/api/get
     │ 11. Payload igual:
     │     {
     │       "action": "TryLoginFacilities",
     │       "email": "user@example.com",
     │       "password": "password123",
     │       "deviceId": "web-abc123xyz",
     │       "name": "user@example.com"
     │     }
     │
     ▼
  REMOTE DATABASE
  (cubed-mr.app)
     │
     │ 12. Valida credenciales
     │ 13. Si válido:
     │     - Genera JWT token
     │     - Retorna facilities
     │
     ▼
  RESPONSE
     │
     │ 14. {
     │       "status": true,
     │       "data": [{
     │         "status": 1,
     │         "token": "eyJhbGc...",
     │         "entityId": "facility-123",
     │         "entity": "TryLoginFacilities",
     │         "entityName": "Hospital ABC",
     │         "facilities": [...],
     │         "msg": "Success"
     │       }]
     │     }
     │
     ▼
  EXPRESS SERVER
     │
     │ 15. Recibe respuesta
     │ 16. Cachea facilities
     │ 17. Retorna al cliente
     │
     ▼
  LOGIN.TSX
     │
     │ 18. Parsea respuesta
     │ 19. Si status: 1
     │     - Guarda token en localStorage
     │     - Guarda facilityId
     │     - Guarda entityName
     │     - Redirige a dashboard
     │ 20. Si status: 0 y reason: 1 (sesión activa)
     │     - Cambia deviceId
     │     - Reintenta (hasta 3 veces)
     │
     ▼
  USER AUTHENTICATED ✓


┌─────────────────────────────────────────────────────────────────────────────┐
│                  FLUTTER APP (Dart + Flutter)                               │
└─────────────────────────────────────────────────────────────────────────────┘

  USER (Mobile Device)
     │
     │ 1. Ingresa email + password
     │
     ▼
  FLUTTER FORM WIDGET
     │
     │ 2. Valida entrada
     │
     ▼
  CSRMODEL INITIALIZATION
     │
     │ 3. Si primera vez:
     │    - Genera UUID v4
     │    - Guarda en SharedPreferences
     │
     │ 4. deviceId = UUID (persistente)
     │    deviceId = "550e8400-e29b-41d4-a716-446655440000"
     │
     ▼
  _GETTOKEN() FUNCTION
     │
     │ 5. Calcula SHA256 token:
     │    salt1 = "user@example.com"
     │    salt2 = "550e8400-e29b-41d4-a716-446655440000"
     │    salt = "user@example.com38457487550e8400-..."
     │    token = SHA256(salt)
     │    token = "a7f3d8e2c1b9f4a6d5e7c8b9f0a1d3e5f"
     │
     ▼
  FORMDATA BUILDER
     │
     │ 6. Crea FormData:
     │    email=user@example.com&
     │    password=password123&
     │    deviceId=550e8400...&
     │    encountertrackid=a7f3d8e2c1b9f4a6...&
     │    [otros_parámetros]
     │
     ▼
  DIO HTTP CLIENT
     │
     │ 7. POST https://dev.cubed-mr.app/api/[endpoint]
     │ 8. Headers:
     │    - Content-Type: application/x-www-form-urlencoded
     │    - Timeout: 5 segundos
     │
     ▼
  REMOTE SERVER
  (dev.cubed-mr.app)
     │
     │ 9. Recibe POST /api/[endpoint]
     │ 10. Parsea FormData
     │ 11. Valida credenciales
     │ 12. Si válido:
     │     - Genera JWT token
     │     - Retorna datos
     │
     ▼
  RESPONSE (JSON)
     │
     │ 13. {
     │       "data": [{
     │         "status": 1,
     │         "token": "eyJhbGc...",
     │         "entityId": "entity-123",
     │         "entity": "EntityType",
     │         "entityName": "Name",
     │         "facilities": [...],
     │         "msg": "Success"
     │       }]
     │     }
     │
     ▼
  CSRMODEL.GETDATA() / GEOBJECT()
     │
     │ 14. Parsea respuesta JSON
     │ 15. Retorna List<Map> o Map
     │
     ▼
  FLUTTER WIDGET
     │
     │ 16. Recibe respuesta
     │ 17. Si status: 1
     │     - Guarda token en SharedPreferences
     │     - Guarda entityId
     │     - Navega a home
     │ 18. Si status: 0
     │     - Muestra error
     │
     ▼
  USER AUTHENTICATED ✓
```

---

## 📊 Tabla Comparativa Detallada

| Componente | Facility Web | Flutter |
|-----------|--------------|---------|
| **Lenguaje** | TypeScript/React | Dart/Flutter |
| **HTTP Client** | Fetch API | Dio |
| **Base URL** | http://localhost:5000 | https://dev.cubed-mr.app |
| **Endpoint** | /api/get | /api/[variable] |
| **Método HTTP** | POST | POST |
| **Formato de envío** | JSON | FormData |
| **Content-Type** | application/json | application/x-www-form-urlencoded |
| **Parámetro de acción** | "action": "TryLoginFacilities" | Endpoint variable |
| **Email** | ✓ Enviado | ✓ Enviado |
| **Password** | ✓ Texto plano | ✓ Texto plano |
| **Device ID** | Generado random (web-xxx) | UUID persistente |
| **Device ID Storage** | localStorage | SharedPreferences |
| **Token generado** | NO | SÍ (SHA256 local) |
| **Token param** | N/A | encountertrackid |
| **Reintentos automáticos** | SÍ (sesión activa) | NO (documentado) |
| **Max reintentos** | 3 | N/A |
| **Cacheo local** | Facilities en servidor | N/A |
| **Frontal** | SÍ (Express) | NO (directo) |
| **Latencia** | Mayor (+ frontal) | Menor (directo) |
| **HTTPS obligatorio** | SÍ (comentado pero disponible) | SÍ |

---

## 🔀 Flujo de Decisión: Qué hacer ante error

### **Facility Web**

```
Respuesta recibida
    │
    ├─ status: 1
    │   └─ ✓ Autenticación exitosa
    │      └─ Guardar token
    │      └─ Redirigir a dashboard
    │
    ├─ status: 0
    │   ├─ reason: 1
    │   │   └─ ⚠️ Sesión activa
    │   │      └─ Cambiar deviceId
    │   │      └─ Retentar (max 3 veces)
    │   │
    │   ├─ reason: 2 o 3
    │   │   └─ ❌ Credenciales inválidas
    │   │      └─ Mostrar error
    │   │
    │   └─ [otro reason]
    │       └─ ❌ Error desconocido
    │          └─ Mostrar mensaje genérico
    │
    └─ [sin status]
        └─ ❌ Error de conexión
           └─ Mostrar error de red
```

### **Flutter**

```
Respuesta recibida
    │
    ├─ response.data.length > 0
    │   ├─ status: 1
    │   │   └─ ✓ Autenticación exitosa
    │   │      └─ Guardar token
    │   │      └─ Navegar a home
    │   │
    │   └─ status: 0
    │       └─ ❌ Autenticación fallida
    │          └─ Mostrar error (reason en response)
    │
    ├─ response.data.length = 0
    │   └─ ❌ Respuesta vacía
    │      └─ Mostrar error
    │
    └─ Excepción
        └─ ❌ Error de conexión
           └─ Mostrar error (DioError)
```

---

## ⚡ Velocidad y Latencia

```
FACILITY WEB
Client → Frontal (localhost:5000) → Remote (cubed-mr.app)
         ~1ms                         ~200-500ms (network)
         Total: ~201-501ms

FLUTTER
Client → Remote (dev.cubed-mr.app)
         ~200-500ms (network)
         Total: ~200-500ms

Ventaja: Flutter es ~1ms más rápido (sin frontal)
```

---

## 🔐 Seguridad: Resumen

```
FACILITY WEB
═══════════════════════════════════════════
Protecciones:
  ✓ HTTPS/SSL-TLS (comentado)
  ✓ Device ID para sesiones
  ✓ Rate limiting (20/15min)
  ✓ Helmet security headers

Riesgos:
  ⚠ Device ID aleatorio (puede colisionar)
  ⚠ Contraseña en texto plano
  ⚠ localStorage accesible a scripts


FLUTTER
═══════════════════════════════════════════
Protecciones:
  ✓ HTTPS/SSL-TLS (siempre)
  ✓ Device ID persistente (UUID)
  ✓ SHA256 local (encriptación débil)
  ✓ SharedPreferences (seguro del SO)
  ✓ Timeout de conexión

Riesgos:
  ⚠ SHA256 reproducible
  ⚠ Contraseña en texto plano
  ⚠ SharedPreferences accesible si device rooted
  ⚠ FormData no encriptado
```

---

## 📝 Resumen de Diferencias Clave

| # | Aspecto | Facility | Flutter | Impacto |
|---|---------|----------|---------|--------|
| 1 | Formato | JSON | FormData | Interoperabilidad reducida |
| 2 | Device ID | Random | UUID persistente | Diferente estrategia de sesión |
| 3 | Token local | NO | SÍ | Lógica diferente |
| 4 | Reintentos | Automático | Manual | UX diferente |
| 5 | Arquitectura | Frontal | Directo | Latencia diferente |
| 6 | HTTPS | Opcional | Obligatorio | Seguridad consistente en Flutter |
| 7 | Cacheo | Sí (facilities) | Desconocido | Experiencia diferente |
| 8 | Error codes | Distintos (0x119...) | Probablemente iguales | Debug más complejo |

---

## ✅ Recomendaciones

1. **Estandarizar formato** → JSON para ambas plataformas
2. **Unificar parámetros** → Mismos nombres y estructura
3. **Sincronizar device IDs** → UUID persistente en ambas
4. **Documentar Flutter** → Comportamiento de reintentos
5. **Revisar SHA256** → ¿Por qué lo genera Flutter?
6. **HTTPS siempre** → Re-habilitar en Facility production
7. **Error codes** → Documentar códigos para ambas plataformas
8. **Reintentos** → Hacer automáticos en ambas (sesiones activas)

---

*Análisis Visual Completo - Última actualización: 2024*
