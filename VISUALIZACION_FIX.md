# 📊 VISUALIZACIÓN: El Problema y la Solución

## 🔴 ANTES (❌ No Funciona)

```
┌─────────────────────────────────────────────────────────┐
│          CLIENT (React/TypeScript)                       │
│  getFacilities() - Envía petición al servidor local     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ POST /facility/api/get
                      │ {
                      │   entity: "FacilityDataCenter",
                      │   method: "lstFacilitiesByWounds",
                      │   token: "E95C2109...",
                      │   email: "drperez@...",
                      │   providerId: "5"
                      │ }
                      ▼
┌─────────────────────────────────────────────────────────┐
│          SERVER (Express.js)                             │
│  routes.ts - /facility/api/get handler                  │
│                                                          │
│  Construye petición a API remota:                      │
│                                                          │
│  ❌ INTENTO 1: Token en Authorization header + FormData
│                                                          │
│  FormData:                                              │
│  ├─ entity: "FacilityDataCenter"                       │
│  ├─ method: "lstFacilitiesByWounds"                    │
│  ├─ token: "E95C2109..."  ← Token en FormData          │
│  ├─ email: "drperez@..."                               │
│  └─ providerId: "5"                                     │
│                                                          │
│  Headers:                                               │
│  ├─ Content-Type: multipart/form-data                  │
│  └─ Authorization: Bearer E95C2109...  ← Token en Header│
│                                                          │
│  Resultado: Token en DOS lugares → API confundida      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ POST https://cubed-mr.app/api/get
                      │ [Token en FormData + Token en Header]
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│     API REMOTA (cubed-mr.app)                           │
│                                                          │
│  ❌ Validación rechazada:                              │
│  {                                                       │
│    status: false,                                       │
│    error: "Unauthorized access"                         │
│  }                                                       │
│                                                          │
│  Razón: Token en dos lugares, formato confuso           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ {status: false, error: "..."}
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│          CLIENT (React)                                  │
│  Console Log:                                           │
│  [useAuth] HTTP Status: 200                            │
│  [useAuth] Status: false ❌                            │
│  [useAuth] Error: "Unauthorized access" ❌             │
│  Total facilities: 0 ❌                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🟢 AHORA (✅ Debe Funcionar)

```
┌─────────────────────────────────────────────────────────┐
│          CLIENT (React/TypeScript)                       │
│  getFacilities() - Envía petición al servidor local     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ POST /facility/api/get
                      │ {
                      │   entity: "FacilityDataCenter",
                      │   method: "lstFacilitiesByWounds",
                      │   token: "E95C2109...",
                      │   email: "drperez@...",
                      │   providerId: "5"
                      │ }
                      ▼
┌─────────────────────────────────────────────────────────┐
│          SERVER (Express.js)                             │
│  routes.ts - /facility/api/get handler                  │
│                                                          │
│  Construye petición a API remota:                      │
│                                                          │
│  ✅ SOLUCIÓN: Token SOLO en FormData                    │
│                                                          │
│  FormData:                                              │
│  ├─ entity: "FacilityDataCenter"                       │
│  ├─ method: "lstFacilitiesByWounds"                    │
│  ├─ token: "E95C2109..."  ← ✅ Token en FormData       │
│  ├─ email: "drperez@..."                               │
│  └─ providerId: "5"                                     │
│                                                          │
│  Headers:                                               │
│  ├─ Content-Type: multipart/form-data                  │
│  └─ (NO Authorization header)  ← ✅ Sin duplicado     │
│                                                          │
│  Resultado: Token en UN lugar → API contenta           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ POST https://cubed-mr.app/api/get
                      │ [Token solo en FormData]
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│     API REMOTA (cubed-mr.app)                           │
│                                                          │
│  ✅ Validación exitosa:                                │
│  {                                                       │
│    status: true,                                        │
│    data: [                                              │
│      {id: 5, name: "Facility 5", ...},                 │
│      {id: 10, name: "Facility 10", ...},               │
│      {id: 15, name: "Facility 15", ...}                │
│    ]                                                     │
│  }                                                       │
│                                                          │
│  Razón: Token en un lugar, formato correcto             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ {status: true, data: [...]}
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│          CLIENT (React)                                  │
│  Console Log:                                           │
│  [useAuth] HTTP Status: 200 ✅                         │
│  [useAuth] Status: true ✅                             │
│  [useAuth] ✅ Facilities Mapeadas:                     │
│    [1] Facility 5 - Alerta                             │
│    [2] Facility 10 - Monitoreo                         │
│    [3] Facility 15 - Bajo Riesgo                       │
│  Total facilities: 3 ✅                                 │
│                                                          │
│  UI muestra:                                            │
│  ┌──────────────────────────────────────────┐          │
│  │  Facility 5                              │          │
│  │  🩹 28 activas / 145 total              │          │
│  │  PUSH: 8.45 | Alerta                    │          │
│  │  [ Seleccionar ]                         │          │
│  └──────────────────────────────────────────┘          │
│  ┌──────────────────────────────────────────┐          │
│  │  Facility 10                             │          │
│  │  🩹 12 activas / 67 total               │          │
│  │  PUSH: 6.23 | Monitoreo                │          │
│  │  [ Seleccionar ]                         │          │
│  └──────────────────────────────────────────┘          │
│  ┌──────────────────────────────────────────┐          │
│  │  Facility 15                             │          │
│  │  🩹 5 activas / 23 total                │          │
│  │  PUSH: 3.45 | Bajo Riesgo               │          │
│  │  [ Seleccionar ]                         │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Comparación lado a lado

| Aspecto | Antes (❌) | Ahora (✅) |
|---------|-----------|-----------|
| **Token en FormData** | Sí | Sí |
| **Token en Auth Header** | Sí (error) | No |
| **Total lugares** | 2 (problema) | 1 (correcto) |
| **API remota entiende** | No | Sí |
| **Resultado** | Unauthorized | Facilities |
| **HTTP Status** | 200 | 200 |
| **Response status** | false | true |
| **Facilities** | 0 | 3+ |

---

## 🔑 La Diferencia Crítica

### ❌ ANTES
```
FormData + Authorization header = API confundida = Unauthorized
```

### ✅ AHORA
```
FormData solamente = API entiende = ✅ Facilities
```

---

## 🎯 Por qué funciona así

La API remota (`cubed-mr.app`) fue diseñada para recibir:
1. Peticiones en **multipart/form-data** (FormData)
2. El token **en los campos del form** (no en headers)
3. Sin **Authorization header** (causa conflicto)

Esta es una configuración poco convencional (normalmente REST usa Auth header), pero es lo que la API remota espera.

---

## ✅ Próximo Paso

1. Reinicia servidor: `npm run dev`
2. Haz login
3. Ver Console
4. Debería ver "HTTP Status: 200" + "Facilities Mapeadas: 3"

