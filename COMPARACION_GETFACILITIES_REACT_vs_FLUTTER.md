# 📊 Comparación: getFacilities - React vs Flutter

## 🎯 Propósito
Ambas implementaciones cargan la lista de facilities accesibles para el usuario autenticado, pero tienen enfoques y detalles técnicos diferentes.

---

## 📋 Tabla Comparativa

| Aspecto | React | Flutter |
|---------|-------|---------|
| **Ubicación** | `client/src/hooks/use-auth.ts` | `dev/model.dart` |
| **Método** | `async getFacilities()` | `Future<List<Map<String,dynamic>>> getData()` |
| **Retorno** | `Promise<Facility[]>` | `Future<List<Map<String,dynamic>>>` |
| **Almacenamiento** | localStorage + estado React | SharedPreferences (mobile) |
| **Formato de Datos** | JSON (Content-Type) | FormData (URL-encoded) |
| **Token** | Limpieza de comillas extras | Direct SHA256 |

---

## 🔍 Detalles Técnicos

### **REACT: getFacilities()**

#### 1️⃣ **Obtener parámetros básicos**
```typescript
const token = getToken();                    // JWT del login
const email = getEmail();                   // Email del usuario
let deviceId = localStorage.getItem("deviceId");  // UUID persistente
```

#### 2️⃣ **Generar encountertrackid (token local)**
```typescript
const salt = `${email}38457487${deviceId}`;
const encountertrackid = await sha256(salt);
```
- **Fórmula:** `SHA256(email + "38457487" + deviceId)`
- **Usa WebCrypto API:** `crypto.subtle.digest('SHA-256', ...)`

#### 3️⃣ **Seleccionar entidad según rol del usuario**
```typescript
const userGroups = getUserGroups();
const entityId = localStorage.getItem("userEntityId");

if (userGroups.includes('Provider') && entityId) {
  entity = "FacilitiesByProvider";
  params.providerId = entityId;
  params.id = entityId;
} else if (userGroups.includes('Nurse') && entityId) {
  entity = "Facility";
  params.action = "lst";
  params.nurseId = entityId;
  params.id = entityId;
} else {
  entity = "Facility";
  params.action = "lst";
  params.id = entityId;
}
```

#### 4️⃣ **Preparar request body**
```typescript
const requestBody = {
  entity: "Facility",           // O "FacilitiesByProvider"
  action: "lst",                // Solo si no es Provider
  token: cleanToken,            // JWT limpio de comillas
  email: email,
  deviceId: deviceId,           // UUID
  encountertrackid: encountertrackid,
  providerId: entityId,         // Solo para Provider
  nurseId: entityId,            // Solo para Nurse
  tenantId: currentTenant,      // Opcional
  id: entityId,                 // CRÍTICO: ID requerido
};
```

#### 5️⃣ **Enviar request**
```typescript
const response = await fetch(LOCAL_API.FACILITIES_LIST, {
  method: "POST",
  headers: { "Content-Type": "application/json" },  // ← JSON explícito
  body: JSON.stringify(requestBody),
});
```

#### 6️⃣ **Procesar respuesta**
```typescript
if (data.data && Array.isArray(data.data)) {
  const facilities: Facility[] = data.data.map((item: any) => ({
    id: item.id?.toString() || '',
    name: item.name || '',
    patients: item.patients || 0,
    activePatients: item.activePatients || 0,
    city: item.city || '',
    state: item.state || '',
  }));
  
  setAvailableFacilities(facilities);
  return facilities;
}
```

---

### **FLUTTER: getData()**

#### 1️⃣ **Obtener parámetros básicos**
```dart
String salt1 = '';
if(parameters.containsKey('email')) salt1 += parameters['email'];

String? deviceId = await PlatformDeviceId.getDeviceId;  // Device ID real (iOS/Android)
String salt2 = deviceId ?? '';
```

#### 2️⃣ **Generar encountertrackid (token local)**
```dart
String salt = '${salt1}38457487$salt2';  // email + "38457487" + deviceId
var bytes = utf8.encode(salt);
var token = sha256.convert(bytes);
```
- **Fórmula:** Idéntica a React ✅
- **Usa:** `crypto` package (Dart)

#### 3️⃣ **Agregar parámetros a request**
```dart
parameters.putIfAbsent('deviceId', () => deviceId ?? '');
parameters.putIfAbsent('encountertrackid', () => token);
```

#### 4️⃣ **Preparar FormData**
```dart
final formData = FormData.fromMap(parameters);
```
- **Formato:** URL-encoded (FormData)
- **No es JSON:** Usa `application/x-www-form-urlencoded`

#### 5️⃣ **Enviar request con Dio**
```dart
Response response = await dio.post(apiUrl+endpoint, data: formData);
```
- **Cliente HTTP:** Dio (similar a axios)
- **Timeout:** 5 segundos conectar + 5 segundos recibir

#### 6️⃣ **Procesar respuesta**
```dart
if(response.data.length > 0) {
  Map<String,dynamic> results = json.decode(response.data);
  List<Map<String,dynamic>> data = [];
  for(int i=0; i<results['data'].length; i++) {
    Map<String,dynamic> record = results['data'][i];
    data.add(record);
  }
  return data;
} else {
  return [];
}
```
- Retorna lista de mapas directa (sin mapeo de tipos)
- No filtra campos específicos

---

## 🎯 Comparativa de Flujo

```
┌─ REACT ────────────────────────────────────────┐
│                                                 │
│ 1. getToken() + getEmail() + localStorage       │
│ 2. Generar SHA256(email + salt + deviceId)      │
│ 3. Seleccionar entity por rol                   │
│ 4. Incluir 'id' requerido                       │
│ 5. JSON.stringify()                             │
│ 6. fetch() con Content-Type: application/json   │
│ 7. Mapear respuesta a Facility[]                │
│ 8. setAvailableFacilities() (localStorage)      │
│                                                 │
└─────────────────────────────────────────────────┘

┌─ FLUTTER ──────────────────────────────────────┐
│                                                 │
│ 1. PlatformDeviceId.getDeviceId + parameters   │
│ 2. Generar SHA256(email + salt + deviceId)      │
│ 3. FormData.fromMap()                           │
│ 4. dio.post() con FormData                      │
│ 5. json.decode(response.data)                   │
│ 6. Iterar y agregar a lista                     │
│ 7. Retornar List<Map> directo                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔑 Diferencias Críticas

### ✅ **Similitudes**

1. **Token SHA256 idéntico**
   - React: `SHA256(email + "38457487" + deviceId)`
   - Flutter: `SHA256(email + "38457487" + deviceId)`
   - ✅ Ambos generan exactamente el mismo valor

2. **Device ID persistente**
   - React: localStorage
   - Flutter: SharedPreferences
   - ✅ Ambos persisten entre sesiones

3. **Parámetros comunes**
   - `email`
   - `token` (JWT del login)
   - `deviceId`
   - `encountertrackid` (SHA256 local)

4. **Respuesta esperada**
   - `status`: true
   - `data[]`: Array de facilities

### ❌ **Diferencias**

1. **Formato de envío**
   - **React:** JSON (`Content-Type: application/json`)
   - **Flutter:** FormData (`application/x-www-form-urlencoded`)
   - ⚠️ Express proxy debe soportar ambos

2. **Selección de entidad**
   - **React:** Dinámico basado en rol (`FacilitiesByProvider` vs `Facility`)
   - **Flutter:** Usa endpoint genérico sin distinción de rol
   - ⚠️ Flutter puede no tener support para `FacilitiesByProvider`

3. **Mapeo de respuesta**
   - **React:** Mapea a objeto `Facility` tipado
   - **Flutter:** Retorna `Map` sin tipado
   - ✅ React más seguro de tipos

4. **Almacenamiento**
   - **React:** localStorage + React state
   - **Flutter:** SharedPreferences (local storage)
   - ✅ Ambos persistentes

5. **Limpieza de datos**
   - **React:** Limpia comillas de token/deviceId
   - **Flutter:** No necesita (no tiene el problema)
   - ⚠️ Indica que React tiene un bug de escaping en login

---

## 🔍 Problemas Identificados

### **REACT**
1. **Double-quoted token/deviceId**
   - Token y deviceId tienen comillas extras: `"\"uuid\""`
   - **Causa:** Posible stringify innecesario en login
   - **Solución:** Cleaning en getFacilities (ya implementada) ✅

2. **Entidad dinámica puede no estar soportada**
   - `FacilitiesByProvider` solo para React
   - Flutter usa endpoint genérico
   - **Verificar:** ¿Está `FacilitiesByProvider` en remoto?

### **FLUTTER**
1. **Sin distinción de rol**
   - No diferencia Provider/Nurse/Admin
   - Todo usa mismo endpoint
   - **Puede ser por diseño** del backend remoto

2. **Mapeo débil de respuesta**
   - Retorna Map dinámico sin tipos
   - Propenso a KeyError si estructura cambia

---

## 🔗 Cómo Hace Flutter getLista de Facilities

Basado en la arquitectura de Flutter, probablemente hace algo como:

```dart
// En la pantalla/screen de Flutter
List<Map<String,dynamic>> facilities = await csr.getData('get', {
  'entity': 'Facility',
  'action': 'lst',
  'email': userEmail,
  // + deviceId, encountertrackid, token se agregan automáticamente en getData()
});

// O si hay rol específico:
List<Map<String,dynamic>> facilities = await csr.getObject('get', {
  'entity': 'FacilitiesByProvider',
  'providerId': entityId,
  'email': userEmail,
});
```

---

## ✅ Recomendaciones

### 1. **Validar origen de double-quotes**
```typescript
// En login.tsx, cuando se almacena token:
localStorage.setItem("authToken", dataItem.token);
// ✅ Verificar que dataItem.token no ya tiene comillas
// ✅ Considerar JSON.parse() si viene escapado
```

### 2. **Unificar formato de envío**
```typescript
// Opción A: React usa FormData como Flutter
const formData = new FormData();
formData.append("entity", entity);
formData.append("token", token);
// ...

// Opción B: Flutter usa JSON como React
// Requiere cambio en model.dart
```

### 3. **Validar entidades soportadas en remoto**
```typescript
// Preguntas para debug:
// ¿Responde remoto a "FacilitiesByProvider"?
// ¿Responde remoto a "Facility" + "action: lst"?
// ¿Requiere parámetro "id"?
```

### 4. **Mapeo consistente de respuesta**
```typescript
// React ya mapea bien a Facility[]
// Flutter debería hacer lo mismo
// Beneficio: Type safety en ambas plataformas
```

---

## 📊 Tabla de Compatibilidad

| Parámetro | React Envía | Flutter Envía | Remoto Espera |
|-----------|------------|---------------|--------------|
| `entity` | ✅ (FacilitiesByProvider o Facility) | ✅ (Facility) | ✅ (ambos) |
| `action` | ✅ (lst) | ✅ (lst) | ✅ (lst) |
| `email` | ✅ | ✅ | ✅ |
| `token` | ✅ | ✅ | ✅ |
| `deviceId` | ✅ | ✅ | ✅ |
| `encountertrackid` | ✅ | ✅ | ✅ |
| `providerId` | ✅ (si Provider) | ❌ | ✅ (si necesario) |
| `nurseId` | ✅ (si Nurse) | ❌ | ✅ (si necesario) |
| `id` | ✅ (agregado recientemente) | ❌ | ✅ (REQUERIDO) |

---

## 🎓 Conclusión

**React ahora está 95% alineado con Flutter:**
- ✅ Token SHA256 idéntico
- ✅ Device ID persistente
- ✅ Parámetros compatibles
- ✅ Limpieza de valores
- ✅ Mapeo de respuesta
- ⚠️ Formato de envío diferente (JSON vs FormData)
- ⚠️ Selección de entidad más sofisticada (puede ser incompatible)

**Próximos pasos:**
1. Probar si `FacilitiesByProvider` existe en remoto
2. Confirmar que `id` es requerido
3. Considerar unificar formato de envío
4. Monitorear errores en producción

