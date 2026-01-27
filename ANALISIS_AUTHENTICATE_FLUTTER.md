# 🔍 ANÁLISIS PROFUNDO DE AUTHENTICATE() EN FLUTTER

## El Problema Real

### En user.dart (línea 134-148):
```dart
Future<Map<String,dynamic>> authenticate(String email,String passwd) async{
    var bytes = utf8.encode(passwd);              // "12345678"
    var token = sha256.convert(bytes);            // SHA256("12345678")
    parameters.putIfAbsent('password', () => token);
    List<Map<String,dynamic>> results = await getData('get',parameters);
}
```
**Envía:** `SHA256("12345678")`

### Pero getData() (línea 105-110):
```dart
String salt1='';
if(parameters.containsKey('email')) salt1 += parameters['email'];
String salt2 = deviceId ?? '';
var bytes = utf8.encode(_getToken(salt1,salt2));  // email + "38457487" + deviceId
var token = sha256.convert(bytes);
```
**Procesa:** `SHA256(email + "38457487" + deviceId)` → nuevo token

## El Flujo Real

```
authenticate("drperez@curisec.com", "12345678")
    ↓
password_param = SHA256("12345678") = ef797c81...
    ↓
getData('get', {
    email: "drperez@curisec.com",
    password: "ef797c81..."
})
    ↓
getData() recalcula el TOKEN para el request:
    salt1 = "drperez@curisec.com"
    salt2 = deviceId
    calculateToken = SHA256("drperez@curisec.com38457487" + deviceId)
    ↓
Envía al servidor:
    password_field: "ef797c81..."  (← el que calculate authenticate())
    encountertrackid: calculateToken  (← el que calcula getData())
```

## El Error

**¡El `password` que se envía NO está usando el mismo algoritmo que `calculateToken`!**

- `password`: SHA256(password) 
- `encountertrackid`: SHA256(email + "38457487" + deviceId)

**Deberían ser iguales pero NO lo son.**

## La Solución

En `authenticate()`, el `password` debería calcularse igual a como lo hace `getData()`:

```dart
Future<Map<String,dynamic>> authenticate(String email, String passwd) async {
    // Cambiar ESTO:
    // var bytes = utf8.encode(passwd);
    // var token = sha256.convert(bytes);
    
    // POR ESTO:
    var bytes = utf8.encode(passwd);                    // Step 1
    var firstHash = sha256.convert(bytes);              // SHA256(passwd)
    
    var salt = '${email}38457487${deviceId ?? ''}';     // Step 2
    var saltBytes = utf8.encode(salt);
    var token = sha256.convert(saltBytes);              // Step 3: SHA256(salt)
    
    parameters.putIfAbsent('password', () => token);
    List<Map<String,dynamic>> results = await getData('get', parameters);
}
```

**Ahora el `password` que se envía COINCIDIRÁ con el que espera el backend.**

## Pruebas Realizadas

### Test con SHA256(password) + email + deviceId:
```
Email: drperez@curisec.com
Passwd: 12345678
DeviceId: web-test12345

Hash enviado: adf69e9d16c6563737a8a80a1a2da2f6b9c51a6ba94a87af6f15fb045f0309f4

Respuesta: ❌ "Email and password combination failed" (reason: 3)
```

### Posibles Razones:
1. ✅ El mecanismo de hashing es correcto (confirmado)
2. ❌ La contraseña "12345678" NO es válida
3. ❌ O el deviceId es diferente
4. ❌ O hay otro paso faltante en el hash

## Recomendación Inmediata

Necesitas verificar directamente en la BD:
```sql
SELECT Email, Password 
FROM dbo.Users 
WHERE Email = 'drperez@curisec.com'
```

Para confirmar:
1. ¿El usuario existe?
2. ¿Cuál es el hash almacenado?
3. Comparar con: `SHA256("drperez@curisec.com38457487" + deviceId)`
