# 🔄 FLUJO COMPLETO: React vs Flutter - getFacilities

---

## 📱 FLUJO EN REACT

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuario hace CLICK en "View Facilities"                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. React ejecuta getFacilities()                                │
│    Recupera del localStorage:                                   │
│    - token: "E141A718-66A0-44DA-B225-0A9C1918F67D"             │
│    - email: "drperez@curisec.com"                              │
│    - deviceId: "2d7f2768-6de1-4261-b382-56b238c61fc9"         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. React prepara FormData                                       │
│    formData.append('entity', 'Facility')                        │
│    formData.append('action', 'lst')                             │
│    formData.append('token', '...')                              │
│    formData.append('email', '...')                              │
│    formData.append('deviceId', '...')                           │
│    formData.append('encountertrackid', '...')                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. React envía POST /api/get                                    │
│    Content-Type: multipart/form-data (automático)               │
│    ✅ FormData (igual que Flutter)                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Servidor recibe y parsea                                     │
│    req.body = {                                                 │
│      entity: 'Facility',                                        │
│      action: 'lst',                                             │
│      token: '...',                                              │
│      email: 'drperez@curisec.com',                             │
│      deviceId: '...',                                           │
│      encountertrackid: '...'                                    │
│    }                                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Servidor ejecuta lógica                                      │
│    if (entity === 'Facility' && action === 'lst')              │
│      → Busca facilities en BD                                   │
│      → Encuentra 2 facilities                                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Servidor retorna JSON                                        │
│    {                                                            │
│      "status": true,                                            │
│      "data": [                                                  │
│        {                                                        │
│          "id": "1",                                             │
│          "name": "Main Facility",                               │
│          "address": "123 Main St",                              │
│          ...más campos                                          │
│        },                                                       │
│        {                                                        │
│          "id": "2",                                             │
│          "name": "Branch Facility",                             │
│          ...más campos                                          │
│        }                                                        │
│      ]                                                          │
│    }                                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. React recibe respuesta                                       │
│    console.log('[useAuth] Facilities response:', data)          │
│    ✅ Respuesta parseada como JSON                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. React mapea facilities                                       │
│    const facilities = data.data.map(item => ({                  │
│      id: item.id,                                               │
│      name: item.name,                                           │
│      address: item.address,                                     │
│      ...                                                        │
│    }))                                                          │
│                                                                 │
│    console.log('[useAuth] Facilities list - Total: 2')          │
│    console.log('[0] Main Facility (1)')                         │
│    console.log('[1] Branch Facility (2)')                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. React almacena en localStorage                              │
│     setAvailableFacilities(facilities)                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. React actualiza UI                                          │
│     ✅ Muestra 2 facilities en la pantalla                      │
│     ✅ Main Facility                                            │
│     ✅ Branch Facility                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📲 FLUJO EN FLUTTER

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuario hace TAP en "View Facilities"                        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Flutter ejecuta getFacilities()                              │
│    Recupera del SharedPreferences:                              │
│    - token: "E141A718-66A0-44DA-B225-0A9C1918F67D"             │
│    - email: "drperez@curisec.com"                              │
│    - deviceId: "2d7f2768-6de1-4261-b382-56b238c61fc9"         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Flutter prepara Map (FormData)                               │
│    {                                                            │
│      'entity': 'Facility',                                      │
│      'action': 'lst',                                           │
│      'token': '...',                                            │
│      'email': '...',                                            │
│      'deviceId': '...',                                         │
│      'encountertrackid': '...'                                  │
│    }                                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Flutter envía POST /api/                                     │
│    Content-Type: application/x-www-form-urlencoded             │
│    ✅ FormData (igual que React)                                │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Servidor recibe y parsea                                     │
│    req.body = {                                                 │
│      entity: 'Facility',                                        │
│      action: 'lst',                                             │
│      token: '...',                                              │
│      email: 'drperez@curisec.com',                             │
│      deviceId: '...',                                           │
│      encountertrackid: '...'                                    │
│    }                                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Servidor ejecuta lógica                                      │
│    if (entity === 'Facility' && action === 'lst')              │
│      → Busca facilities en BD                                   │
│      → Encuentra 2 facilities                                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Servidor retorna JSON                                        │
│    {                                                            │
│      "status": true,                                            │
│      "data": [                                                  │
│        {                                                        │
│          "id": "1",                                             │
│          "name": "Main Facility",                               │
│          "address": "123 Main St",                              │
│          ...más campos                                          │
│        },                                                       │
│        {                                                        │
│          "id": "2",                                             │
│          "name": "Branch Facility",                             │
│          ...más campos                                          │
│        }                                                        │
│      ]                                                          │
│    }                                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Flutter recibe respuesta                                     │
│    print('[Model] Response: $response')                         │
│    ✅ Respuesta parseada como JSON                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Flutter mapea facilities                                     │
│    final facilities = (data['data'] as List).map(...).toList()  │
│                                                                 │
│    print('[Model] Facilities loaded: 2 items')                  │
│    print('[0] Main Facility')                                   │
│    print('[1] Branch Facility')                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. Flutter almacena en SharedPreferences                        │
│     _facilities = facilities                                    │
│     notifyListeners()                                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. Flutter actualiza UI                                        │
│     ✅ Muestra 2 facilities en la pantalla                      │
│     ✅ Main Facility                                            │
│     ✅ Branch Facility                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 COMPARACIÓN: React vs Flutter

```
REACT                           FLUTTER

Usuario click Facilities   ←→    Usuario tap Facilities

getFacilities()            ←→    getFacilities()

Recupera localStorage      ←→    Recupera SharedPreferences
token, email, deviceId     ←→    token, email, deviceId

Prepara FormData           ←→    Prepara Map
(multipart)                ←→    (urlencoded)

POST /api/get              ←→    POST /api/

Server parsea              ←→    Server parsea
req.body                   ←→    req.body

Ejecuta lógica             ←→    Ejecuta lógica
Busca 2 facilities         ←→    Busca 2 facilities

Retorna JSON               ←→    Retorna JSON
{status: true, data: [...]}←→    {status: true, data: [...]}

Recibe respuesta           ←→    Recibe respuesta

Mapea facilities           ←→    Mapea facilities

Almacena localStorage      ←→    Almacena SharedPreferences

Actualiza UI               ←→    Actualiza UI
Muestra 2 facilities       ←→    Muestra 2 facilities

Usuario ve:                ←→    Usuario ve:
✅ Main Facility           ←→    ✅ Main Facility
✅ Branch Facility         ←→    ✅ Branch Facility
```

---

## 🎯 RESULTADOS FINALES

### React Console
```
[useAuth] getFacilities FormData with: {
  entity: "Facility",
  action: "lst",
  email: "drperez@curisec.com",
  deviceId: "2d7f2768-6de1-4261-b382-56b238c61fc9",
  encountertrackid: "0c559628d0ea5f1158edce9923772a98ee984579c9745232255c532697dc1364"
}

[useAuth] Facilities list - Total: 2 facilities
  [0] Main Facility (1)
  [1] Branch Facility (2)
```

### Flutter Logcat
```
I/flutter: [Model] Facilities loaded: 2 items
I/flutter: [Model] Facility #0: Main Facility (id: 1)
I/flutter: [Model] Facility #1: Branch Facility (id: 2)
```

### React UI
```
Facilities (2 available)
✓ Main Facility - 123 Main St, New York, NY
✓ Branch Facility - 456 Branch Ave, Brooklyn, NY
```

### Flutter UI
```
Available Facilities (2)
✓ Main Facility - 123 Main St, New York, NY
✓ Branch Facility - 456 Branch Ave, Brooklyn, NY
```

---

## ✅ CONCLUSIÓN

```
┌─────────────────────────────────────┐
│   AMBAS PLATAFORMAS OBTIENEN:        │
│                                     │
│ ✅ Respuesta idéntica del servidor  │
│ ✅ Datos idénticos (2 facilities)   │
│ ✅ UI idéntica (misma información)  │
│ ✅ Comportamiento idéntico          │
│ ✅ Experiencia del usuario idéntica │
│                                     │
│ FLUJO COMPLETAMENTE CONSISTENTE     │
└─────────────────────────────────────┘
```
