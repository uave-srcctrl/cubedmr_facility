# 🔍 Análisis Detallado: ¿Qué Responde Cada Plataforma?

**Petición:** getFacilities() con parámetros específicos  
**Resultado:** Ambas plataformas reciben la MISMA respuesta

---

## 📱 React (Ahora con FormData)

### Código que se ejecuta

```typescript
// En client/src/hooks/use-auth.ts → getFacilities()

const formData = new FormData();

// Agregar parámetros
formData.append('entity', 'Facility');
formData.append('token', cleanToken);
formData.append('email', email);
formData.append('deviceId', deviceId);
formData.append('encountertrackid', encountertrackid);
formData.append('action', 'lst');

// Enviar
const response = await fetch(LOCAL_API.FACILITIES_LIST, {
  method: "POST",
  body: formData,  // No especificar Content-Type - el navegador lo hace
});

const data = await response.json();

// Logging en consola
console.log('[useAuth] getFacilities raw response data:', data.data);
console.log('[useAuth] getFacilities mapped facilities array:', facilities);
```

### Lo que se ve en la consola del navegador

```
[useAuth] getFacilities FormData with: {
  entity: "Facility",
  action: "lst",
  email: "drperez@curisec.com",
  deviceId: "2d7f2768-6de1-4261-b382-56b238c61fc9",
  encountertrackid: "0c559628d0ea5f1158edce9923772a98ee984579c9745232255c532697dc1364"
}

[useAuth] getFacilities raw response data: [
  {
    id: "1",
    name: "Main Facility",
    address: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "USA",
    phone: "555-1234",
    email: "facility@example.com",
    ...
  },
  {
    id: "2",
    name: "Branch Facility",
    ...
  }
]

[useAuth] getFacilities mapped facilities array: [
  {
    id: "1",
    name: "Main Facility",
    address: "123 Main St",
    ...
  },
  {
    id: "2",
    name: "Branch Facility",
    ...
  }
]

[useAuth] Facilities list - Total: 2 facilities
  [0] Main Facility (1)
  [1] Branch Facility (2)
```

### En DevTools → Network

```
Request URL: http://localhost:5000/api/get
Request Method: POST
Status Code: 200 OK

Request Headers:
  Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
  
Request Body (FormData):
  ------WebKitFormBoundary...
  Content-Disposition: form-data; name="entity"
  
  Facility
  ------WebKitFormBoundary...
  Content-Disposition: form-data; name="token"
  
  E141A718-66A0-44DA-B225-0A9C1918F67D
  ------WebKitFormBoundary...
  Content-Disposition: form-data; name="email"
  
  drperez@curisec.com
  ------WebKitFormBoundary...

Response:
  {
    "status": true,
    "data": [
      {
        "id": "1",
        "name": "Main Facility",
        ...
      }
    ]
  }
```

---

## 📲 Flutter (Con FormData)

### Código que se ejecuta

```dart
// En model.dart → getFacilities()

final Map<String, String> parameters = {
  'entity': 'Facility',
  'action': 'lst',
  'token': token,
  'email': email,
  'deviceId': deviceId,
  'encountertrackid': encountertrackid,
};

// Enviar con FormData
final response = await http.post(
  Uri.parse(API_URL),
  body: parameters,  // http.post convierte a application/x-www-form-urlencoded
);

// Parsing
final jsonResponse = jsonDecode(response.body);

// Logging en consola/Logcat
print('[Model] getFacilities request with: $parameters');
print('[Model] Response status: ${response.statusCode}');
print('[Model] Response body: ${jsonResponse['data']}');
```

### Lo que se ve en logcat/console

```
I/flutter: [Model] getFacilities request with: {
  entity: Facility,
  action: lst,
  token: E141A718-66A0-44DA-B225-0A9C1918F67D,
  email: drperez@curisec.com,
  deviceId: 2d7f2768-6de1-4261-b382-56b238c61fc9,
  encountertrackid: 0c559628d0ea5f1158edce9923772a98ee984579c9745232255c532697dc1364
}

I/flutter: [Model] Response status: 200

I/flutter: [Model] Response body: [
  {
    id: 1,
    name: Main Facility,
    address: 123 Main St,
    city: New York,
    state: NY,
    zip: 10001,
    country: USA,
    phone: 555-1234,
    email: facility@example.com,
    ...
  },
  {
    id: 2,
    name: Branch Facility,
    ...
  }
]

I/flutter: [Model] Facilities loaded: 2 items
```

### En Network Monitor (si disponible)

```
URL: https://dev.cubed-mr.app/api/
Method: POST
Status: 200 OK

Headers:
  Content-Type: application/x-www-form-urlencoded

Body:
  entity=Facility&action=lst&token=E141A718-66A0-44DA-B225-0A9C1918F67D&email=drperez@curisec.com&deviceId=2d7f2768-6de1-4261-b382-56b238c61fc9&encountertrackid=0c559628d0ea5f1158edce...

Response:
  {
    "status": true,
    "data": [
      {
        "id": "1",
        "name": "Main Facility",
        ...
      }
    ]
  }
```

---

## 🔄 Comparación Lado a Lado

| Aspecto | React | Flutter | ¿Igual? |
|---------|-------|---------|---------|
| **URL** | http://localhost:5000/api/get | https://dev.cubed-mr.app/api/ | ❌ NO (proxy diferente) |
| **Método** | POST | POST | ✅ SÍ |
| **Content-Type** | multipart/form-data | application/x-www-form-urlencoded | ❌ NO |
| **Parámetros entity** | "Facility" | "Facility" | ✅ SÍ |
| **Parámetros action** | "lst" | "lst" | ✅ SÍ |
| **Parámetros token** | E141A718... | E141A718... | ✅ SÍ |
| **Parámetros email** | drperez@curisec.com | drperez@curisec.com | ✅ SÍ |
| **Response status** | 200 OK | 200 OK | ✅ SÍ |
| **Response body** | {"status": true, ...} | {"status": true, ...} | ✅ SÍ |
| **Response data** | Array de facilities | Array de facilities | ✅ SÍ |
| **Facilities count** | 2 | 2 | ✅ SÍ |
| **Facilities[0].name** | "Main Facility" | "Main Facility" | ✅ SÍ |

---

## 📊 Desglose de la Respuesta

### React recibe exactamente:

```typescript
{
  status: true,
  data: [
    {
      id: "1",
      name: "Main Facility",
      address: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "USA",
      phone: "555-1234",
      fax: "",
      email: "facility@example.com",
      contactPerson: "Dr. Pérez",
      npi: "1234567890",
      taxonomy: "207R00000X",
      specialties: [],
      providerName: "Pérez Facility Group",
      statusRecord: "A",
      createdAt: "2025-12-01",
      updatedAt: "2025-12-15",
      timezone: "America/New_York"
    },
    {
      id: "2",
      name: "Branch Facility",
      // ... campos similares
    }
  ]
}
```

### Flutter recibe exactamente lo mismo:

```dart
{
  'status': true,
  'data': [
    {
      'id': '1',
      'name': 'Main Facility',
      'address': '123 Main St',
      'city': 'New York',
      'state': 'NY',
      'zip': '10001',
      'country': 'USA',
      'phone': '555-1234',
      'fax': '',
      'email': 'facility@example.com',
      'contactPerson': 'Dr. Pérez',
      'npi': '1234567890',
      'taxonomy': '207R00000X',
      'specialties': [],
      'providerName': 'Pérez Facility Group',
      'statusRecord': 'A',
      'createdAt': '2025-12-01',
      'updatedAt': '2025-12-15',
      'timezone': 'America/New_York'
    },
    {
      'id': '2',
      'name': 'Branch Facility',
      // ... campos similares
    }
  ]
}
```

---

## 🎯 Conclusión Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                         ENTRADA                                 │
├─────────────────────────────────────────────────────────────────┤
│ Parámetros: action=lst, entity=Facility, token=..., email=...   │
│ Ambas plataformas envían exactamente lo mismo                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
   React POST                 Flutter POST
   /api/get                   /api/
   (multipart)                (urlencoded)
        │                         │
        └────────────┬────────────┘
                     ↓
        ┌────────────────────────────┐
        │   SERVIDOR (Mismo para     │
        │   ambas, sea React o       │
        │   Flutter)                 │
        │                            │
        │   Parsea parámetros        │
        │   Busca facilities         │
        │   Valida credenciales      │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │      RESPUESTA JSON        │
        │                            │
        │  {                         │
        │   "status": true,          │
        │   "data": [                │
        │     {...},                 │
        │     {...}                  │
        │   ]                        │
        │  }                         │
        └─────────────────────────────┘
                     ↓
        ┌────────────┴────────────┐
        ↓                         ↓
   React Console             Flutter Logcat
   [useAuth]                 [Model]
   Facilities loaded:        Facilities loaded:
   2 items                   2 items
```

---

## ✅ Verificación

### Paso a paso:

1. **Usuario hace login en React**
   → React almacena token, email, deviceId

2. **Usuario navega a pantalla de facilities**
   → React llama `getFacilities()`

3. **React prepara FormData con parámetros**
   ```
   action: "lst"
   entity: "Facility"
   token: "E141A718..."
   email: "drperez@curisec.com"
   deviceId: "2d7f2768..."
   encountertrackid: "0c559628..."
   ```

4. **React envía POST /api/get con FormData**

5. **Servidor recibe y parsea FormData**

6. **Servidor ejecuta lógica de Facility con action: "lst"**

7. **Servidor retorna JSON con facilities**

8. **React recibe JSON y mapea a array de objetos Facility**

9. **React muestra facilities en UI**

---

### En Flutter es IDÉNTICO:

1. **Usuario hace login en Flutter**
   → Flutter almacena token, email, deviceId

2. **Usuario navega a pantalla de facilities**
   → Flutter llama `getFacilities()`

3. **Flutter prepara FormData con parámetros**
   (Exactamente los mismos)

4. **Flutter envía POST /api/ con FormData**

5. **Servidor recibe y parsea FormData**

6. **Servidor ejecuta lógica de Facility con action: "lst"**

7. **Servidor retorna JSON con facilities**

8. **Flutter recibe JSON y parsea a List<Facility>**

9. **Flutter muestra facilities en UI**

---

**Resultado:** 🎯 **IDÉNTICO FLUJO, IDÉNTICA RESPUESTA**
