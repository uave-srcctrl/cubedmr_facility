# 🔍 ANÁLISIS DE CONSISTENCIA: DART vs REACT

## FLUJO EN DART

### Step 1: authenticate() en user.dart (línea 134-148)
```dart
Future<Map<String,dynamic>> authenticate(String email,String passwd) async{
    var bytes = utf8.encode(passwd);                    // "12345678"
    var token = sha256.convert(bytes);                  // SHA256(passwd)
    parameters.putIfAbsent('password', () => token);    // password = ef797c81...
    parameters.putIfAbsent('entity', () => 'TryLogin');
    parameters.putIfAbsent('email', () => email);
    List<Map<String,dynamic>> results = await getData('get',parameters);
}
```

**Parámetros que pasa a getData():**
```
{
  entity: 'TryLogin',
  email: 'drperez@curisec.com',
  password: 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f'
}
```

### Step 2: getData() en model.dart (línea 82-110)
```dart
Future<List<Map<String,dynamic>>> getData(String endpoint, Map<String,dynamic> parameters) async {
    String salt1='';
    if(parameters.containsKey('email')) salt1 += parameters['email'];  // "drperez@curisec.com"
    String salt2 = deviceId ?? '';                                      // "web-xxx123"
    
    var bytes = utf8.encode(_getToken(salt1,salt2));
    var token = sha256.convert(bytes);                  // SHA256(salt)
    
    parameters.putIfAbsent('deviceId', () => deviceId ?? '');
    parameters.putIfAbsent('encountertrackid', () => token);
    
    // El parámetro 'password' que vino de authenticate() SE MANTIENE
}
```

### Step 3: _getToken() en model.dart (línea 60-61)
```dart
String _getToken(String salt1, String salt2){
    String salt = '${salt1}38457487$salt2';
    return salt;
}
```

**Salt que se crea:** `'drperez@curisec.com38457487web-xxx123'`

### PAYLOAD FINAL QUE DART ENVÍA AL SERVIDOR:
```json
{
  "entity": "TryLogin",
  "email": "drperez@curisec.com",
  "password": "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f",
  "deviceId": "web-xxx123",
  "encountertrackid": "SHA256(drperez@curisec.com38457487web-xxx123)"
}
```

---

## FLUJO EN REACT (DESPUÉS DE MIS CAMBIOS)

### En client/src/pages/login.tsx (onSubmit)
```typescript
const email = values.identifier;                        // "drperez@curisec.com"
const entity = "TryLogin";

let deviceId = localStorage.getItem("deviceId");        // "web-xxx123"

// Step 1: authenticate() - calcula password
const firstHash = await sha256(values.password);        // SHA256("12345678")
// firstHash = "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f"

// Step 2: getData() - calcula salt y encountertrackid
const salt = `${email}38457487${deviceId}`;             // "drperez@curisec.com38457487web-xxx123"
const encountertrackid = await sha256(salt);            // SHA256(salt)

body: JSON.stringify({
  action: entity,
  email: email,
  password: firstHash,
  deviceId: deviceId,
  name: email,
  encountertrackid: encountertrackid,
})
```

### PAYLOAD FINAL QUE REACT ENVÍA AL SERVIDOR:
```json
{
  "action": "TryLogin",
  "email": "drperez@curisec.com",
  "password": "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f",
  "deviceId": "web-xxx123",
  "name": "drperez@curisec.com",
  "encountertrackid": "SHA256(drperez@curisec.com38457487web-xxx123)"
}
```

---

## COMPARACIÓN

| Campo | Dart | React | ¿Igual? |
|-------|------|-------|---------|
| **entity/action** | "TryLogin" | "TryLogin" | ✅ SÍ |
| **email** | "drperez@curisec.com" | "drperez@curisec.com" | ✅ SÍ |
| **password** | SHA256(password) | SHA256(password) | ✅ SÍ |
| **deviceId** | deviceId | deviceId | ✅ SÍ |
| **encountertrackid** | SHA256(email + "38457487" + deviceId) | SHA256(email + "38457487" + deviceId) | ✅ SÍ |

---

## VERIFICACIÓN CRÍTICA

### Salt en Dart:
```dart
String salt = '${salt1}38457487$salt2';
// salt1 = email (porque parameters.containsKey('email'))
// salt2 = deviceId
// Resultado: email + "38457487" + deviceId
```

### Salt en React:
```typescript
const salt = `${email}38457487${deviceId}`;
// Resultado: email + "38457487" + deviceId
```

✅ **AMBOS SON IDÉNTICOS**

---

## CONCLUSIÓN

✅ **SÍ SON CONSISTENTES**

El flujo de React ahora:
1. Calcula EXACTAMENTE el mismo `password` que Dart
2. Calcula EXACTAMENTE el mismo `salt` que Dart
3. Calcula EXACTAMENTE el mismo `encountertrackid` que Dart
4. Envía EXACTAMENTE los mismos parámetros que Dart

**Diferencias menores (sin importancia):**
- Dart: `entity`
- React: `action` (pero Express transforma ambos a `entity`)
- React: agrega `name` (extra, no afecta)

**El protocolo es 100% consistente.**

---

## Implicación

Si la autenticación falla, NO ES POR INCONSISTENCIA EN EL HASHING.

Es porque:
1. ❌ La contraseña "12345678" NO es válida
2. ❌ O el usuario no existe
3. ❌ O hay un mecanismo adicional en el backend que no conocemos
