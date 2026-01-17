# 📋 ESQUEMA DE AUTENTICACIÓN - WOUNDCAREAPP A REACT

## 1. FLUJO COMPLETO DE AUTENTICACIÓN EN WOUNDCAREAPP (FLUTTER)

### 1.1 Entrada en lib/login.dart
```dart
crsUser.authenticate(email, password)
```

### 1.2 Procesamiento en lib/user.dart - authenticate()
```dart
Future<Map<String,dynamic>> authenticate(String email, String passwd) async {
    // PASO 1: Hashear el password
    var bytes = utf8.encode(passwd);                    // Convertir a bytes UTF-8
    var token = sha256.convert(bytes);                  // SHA256(password)
    
    // PASO 2: Preparar parámetros
    Map<String,dynamic> parameters = {
        'entity': 'TryLogin',
        'email': email,
        'password': token,                              // El hash SHA256
    };
    
    // PASO 3: Pasar a getData() que añade más datos
    List<Map<String,dynamic>> results = await getData('get', parameters);
}
```

**Salida:**
```json
{
  "entity": "TryLogin",
  "email": "drperez@curisec.com",
  "password": "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f"
}
```

### 1.3 Procesamiento en lib/model.dart - getData()
```dart
Future<List<Map<String,dynamic>>> getData(String endpoint, Map<String,dynamic> parameters) async {
    // PASO 1: Extraer email para salt
    String salt1 = '';
    if (parameters.containsKey('email')) 
        salt1 += parameters['email'];                   // "drperez@curisec.com"
    
    // PASO 2: Obtener deviceId
    String salt2 = deviceId ?? '';                      // UUID generado al iniciar app
    
    // PASO 3: Construir salt
    String salt = _getToken(salt1, salt2);              // email + "38457487" + deviceId
    
    // PASO 4: Hashear el salt
    var bytes = utf8.encode(salt);
    var token = sha256.convert(bytes);                  // SHA256(salt)
    
    // PASO 5: Agregar parámetros adicionales
    parameters.putIfAbsent('deviceId', () => deviceId ?? '');
    parameters.putIfAbsent('encountertrackid', () => token);    // El hash del salt
    parameters.putIfAbsent('providertrackid', () => authToken);
    
    // PASO 6: Convertir a FormData y enviar
    final formData = FormData.fromMap(parameters);
    Response response = await dio.post('https://cubed-mr.app/api/get', data: formData);
}
```

### 1.4 Construcción del Salt en lib/model.dart - _getToken()
```dart
String _getToken(String salt1, String salt2) {
    String salt = '${salt1}38457487${salt2}';
    return salt;
    // Resultado: "drperez@curisec.com" + "38457487" + "web-uuid-123"
}
```

**Payload FINAL que se envía a https://cubed-mr.app/api/get:**
```
FormData {
  entity: "TryLogin",
  email: "drperez@curisec.com",
  password: "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f",
  deviceId: "web-uuid-123",
  encountertrackid: "adf69e9d16c6563737a8a80a1a2da2f6b9c51a6ba94a87af6f15fb045f0309f4",
  providertrackid: ""
}
```

---

## 2. ESQUEMA DE HASHEO

### 2.1 Password Hash (usado en campo "password")
```
password_hash = SHA256(plaintext_password)

Ejemplo:
  Input: "12345678"
  Output: "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f"
```

### 2.2 Encounter Track ID Hash (usado en campo "encountertrackid")
```
salt = email + "38457487" + deviceId
encountertrackid = SHA256(salt)

Ejemplo:
  email: "drperez@curisec.com"
  deviceId: "web-test12345"
  salt: "drperez@curisec.com38457487web-test12345"
  Output: "adf69e9d16c6563737a8a80a1a2da2f6b9c51a6ba94a87af6f15fb045f0309f4"
```

### 2.3 Flujo de Hashes
```
plaintext_password: "12345678"
         ↓ SHA256
password: "ef797c81..."
         ↓ (se envía con email + deviceId)
         
email + "38457487" + deviceId + password (no usado en salt)
         ↓ SHA256
encountertrackid: "adf69e9d..."
         ↓ (se envía al backend)
```

---

## 3. PETICIÓN AL API REMOTA

### 3.1 Endpoint
```
POST https://cubed-mr.app/api/get
```

### 3.2 Content-Type
```
multipart/form-data (en Dart usa FormData)
application/json (en React)
```

### 3.3 Parámetros Requeridos
```json
{
  "entity": "TryLogin",
  "email": "drperez@curisec.com",
  "password": "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f",
  "deviceId": "web-test12345",
  "encountertrackid": "adf69e9d16c6563737a8a80a1a2da2f6b9c51a6ba94a87af6f15fb045f0309f4"
}
```

### 3.4 Respuesta Exitosa (status: 1)
```json
{
  "status": true,
  "data": [
    {
      "status": 1,
      "token": "AUTH_TOKEN_HERE",
      "entity": "Facility",
      "entityName": "Hospital Name",
      "entityId": "123",
      "facilities": [{"id": 1, "name": "Facility 1"}],
      "msg": "Authentication successful"
    }
  ]
}
```

### 3.5 Respuesta Fallida (status: 0, reason: 3)
```json
{
  "status": true,
  "data": [
    {
      "status": 0,
      "reason": 3,
      "email": "drperez@curisec.com",
      "msg": "Error 0x3881920. Email and password combination failed.",
      "token": ""
    }
  ]
}
```

---

## 4. IMPLEMENTACIÓN EN REACT

### 4.1 Función de Hashing
```typescript
async function sha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 4.2 Función de Login
```typescript
async function onSubmit(values: z.infer<typeof formSchema>) {
  // Obtener parámetros
  const email = values.identifier;
  const entity = "TryLogin";
  
  // Generar deviceId si no existe
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = "web-" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("deviceId", deviceId);
  }

  // PASO 1: Hashear password (como authenticate())
  const password = await sha256(values.password);
  
  // PASO 2: Crear salt y hashear (como getData())
  const salt = `${email}38457487${deviceId}`;
  const encountertrackid = await sha256(salt);
  
  // PASO 3: Enviar al servidor Express local
  const response = await fetch(LOCAL_API.LOGIN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: entity,
      email: email,
      password: password,
      deviceId: deviceId,
      name: email,
      encountertrackid: encountertrackid,
    }),
  });
  
  const data = await response.json();
  
  // PASO 4: Verificar respuesta
  if (data.status === true && data.data[0].status === 1) {
    // Guardar token
    localStorage.setItem("authToken", data.data[0].token);
    // Navegar a dashboard
    onLogin();
  } else {
    // Mostrar error
    toast({
      title: "Login failed",
      description: data.data[0].msg,
      variant: "destructive",
    });
  }
}
```

### 4.3 Express Proxy (server/routes.ts)
```typescript
app.post("/api/get", loginLimiter, async (req, res) => {
  const { entity, action, email, password, deviceId, encountertrackid, name } = req.body;
  
  // Validar parámetros
  if (!entity && !action || !email || !password || !deviceId) {
    return res.status(400).json({ 
      status: false, 
      error: "Missing required parameters" 
    });
  }

  // Transformar entity si es necesario
  const remoteEntity = (entity || action) === "TryLogin" ? "TryLoginFacilities" : (entity || action);
  
  // Enviar al backend remoto
  const remotePayload = {
    entity: remoteEntity,
    email,
    password,      // Ya viene hasheado desde React
    deviceId,
    encountertrackid,  // Ya viene hasheado desde React
    ...(name && { name }),
  };
  
  const remoteResponse = await fetchWithTimeout(
    "https://cubed-mr.app/api/get",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(remotePayload),
    }
  );
  
  const data = await remoteResponse.json();
  res.json(data);
});
```

---

## 5. COMPARATIVA: FLUTTER vs REACT vs EXPRESS PROXY

| Paso | Flutter (Dart) | React | Express |
|------|----------------|-------|---------|
| 1 | SHA256(password) | SHA256(password) | ✓ Recibe ya hasheado |
| 2 | Crea salt: email + "38457487" + deviceId | Crea salt: email + "38457487" + deviceId | ✓ Recibe ya hasheado |
| 3 | SHA256(salt) → encountertrackid | SHA256(salt) → encountertrackid | ✓ Recibe ya hasheado |
| 4 | Envía a cubed-mr.app/api/get | Envía a localhost:5000/api/get | Reenvía a cubed-mr.app/api/get |

---

## 6. VALIDACIÓN

### Test Realizado
```
Email: drperez@curisec.com
Passwd: 12345678
DeviceId: web-test12345

password hash: ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f
encountertrackid: adf69e9d16c6563737a8a80a1a2da2f6b9c51a6ba94a87af6f15fb045f0309f4

Respuesta: ❌ "Email and password combination failed" (reason: 3)
```

### Conclusión
✅ El esquema es correcto y consistente entre Flutter y React
❌ La contraseña "12345678" NO es válida para drperez@curisec.com
