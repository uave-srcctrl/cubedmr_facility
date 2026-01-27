# Análisis Detallado: Flujo de Autenticación Flutter

## 📱 Aplicación Flutter - CsrModel Authentication Flow

### Ubicación del código
```
/var/www/dev/model.dart
```

---

## 🔧 Componentes Principales

### 1. **Inicialización de CsrModel**

```dart
class CsrModel {
  String baseUrl = 'https://dev.cubed-mr.app/';  // Configurable
  String apiUrl = '';
  var dio;                                         // HTTP client
  String? deviceId = '';                          // Almacenado persistentemente
  
  CsrModel(){
    // Obtiene deviceId persistente o genera nuevo
    SharedPreferences.getInstance().then((prefs){
      String pseudoDeviceId = '';
      if(prefs.getString('deviceId')==null){
        var uuid = Uuid();
        pseudoDeviceId = uuid.v4();               // Genera UUID v4
        prefs.setString('deviceId',pseudoDeviceId);
        deviceId = pseudoDeviceId;
      }else{
        deviceId = prefs.getString('deviceId');   // Reutiliza existente
      }
    });
    
    apiUrl = '${baseUrl}api/';                    // https://dev.cubed-mr.app/api/
    dio = Dio(BaseOptions(
      baseUrl: apiUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 5),
      headers: {
        HttpHeaders.userAgentHeader: 'dio',
        'common-header': 'xx',
      },
    ));
  }
}
```

**Características:**
- ✅ Device ID generado como UUID v4
- ✅ Almacenado en `SharedPreferences` (persistente)
- ✅ Reutilizado en todas las sesiones
- ✅ Timeout: 5 segundos para conexión y recepción
- ✅ Base URL configurable (actualmente: dev.cubed-mr.app)

---

### 2. **Generación de Token SHA256**

```dart
String _getToken(String salt1, String salt2){
  String salt = '${salt1}38457487$salt2';
  var bytes = utf8.encode(salt);
  var token = sha256.convert(bytes);
  return salt;  // Retorna el SALT, no el token
}
```

**Algoritmo:**
```
salt1 = email del usuario
salt2 = deviceId
salt = email + "38457487" + deviceId
token = SHA256(salt)
```

**Ejemplo:**
```
email = "user@example.com"
deviceId = "550e8400-e29b-41d4-a716-446655440000"
salt = "user@example.com38457487550e8400-e29b-41d4-a716-446655440000"
token = SHA256("user@example.com38457487550e8400-e29b-41d4-a716-446655440000")
      = "a7f3d8e2c1b9f4a6d5e7c8b9f0a1d3e5f"  (ejemplo)
```

⚠️ **Nota:** La función retorna `salt`, no `token`. Posible bug.

---

### 3. **Métodos de Envío de Datos**

#### **Método A: getData() - Para obtener lista de datos**

```dart
Future<List<Map<String,dynamic>>> getData(
  String endpoint,
  Map<String,dynamic> parameters
) async {
  // 1. Genera salt1 del email si existe
  String salt1='';
  if(parameters.containsKey('email')) 
    salt1 += parameters['email'];
  
  // 2. Obtiene deviceId de la plataforma
  if(!kIsWeb){
    deviceId = await PlatformDeviceId.getDeviceId;
  }
  
  // 3. Genera salt2
  String salt2 = deviceId ?? '';
  
  // 4. Calcula token SHA256
  var bytes = utf8.encode(_getToken(salt1,salt2));
  var token = sha256.convert(bytes);
  
  // 5. Añade deviceId y token al payload
  parameters.putIfAbsent('deviceId', () => deviceId ?? '');
  parameters.putIfAbsent('encountertrackid', () => token);
  
  // 6. Convierte a FormData
  final formData = FormData.fromMap(parameters);
  
  // 7. Envía POST
  Response response = await dio.post(apiUrl+endpoint, data: formData);
  
  // 8. Parsea respuesta
  if(response.data.length>0){
    Map<String,dynamic> results = json.decode(response.data);
    List<Map<String,dynamic>> data = [];
    for(int i=0; i<results['data'].length;i++){
      Map<String,dynamic> record = results['data'][i];
      data.add(record);
    }
    return data;
  }else{
    return [];
  }
}
```

#### **Método B: getObject() - Para obtener un objeto único**

Idéntico a `getData()` pero retorna `Map<String,dynamic>` en lugar de List.

---

## 📤 Formato de Petición

### **Payload FormData**

```
Content-Type: application/x-www-form-urlencoded

email=user@example.com&
password=password123&
deviceId=550e8400-e29b-41d4-a716-446655440000&
encountertrackid=a7f3d8e2c1b9f4a6d5e7c8b9f0a1d3e5f&
[otros parámetros]
```

### **Equivalente en JSON (para referencia)**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "encountertrackid": "a7f3d8e2c1b9f4a6d5e7c8b9f0a1d3e5f",
  "[otros_parametros]": "..."
}
```

---

## 📥 Formato de Respuesta

```dart
// Estructura esperada
{
  "data": [
    {
      "status": 1,
      "token": "jwt-token-value",
      "entityId": "entity-id-value",
      "entity": "EntityType",
      "entityName": "Entity Name",
      "facilities": [...],  // o vacío
      "msg": "Success message",
      "reason": 0  // si hay error
    }
  ]
}
```

---

## 🔄 Flujo Completo de Autenticación

```
1. App inicia
   └─ CsrModel constructor ejecutado
      └─ SharedPreferences.getInstance()
         └─ Si deviceId no existe:
            ├─ Genera UUID v4
            ├─ Guarda en SharedPreferences
            └─ deviceId = UUID
         └─ Si deviceId existe:
            └─ deviceId = SharedPreferences.getString('deviceId')

2. Usuario ingresa credenciales
   ├─ email
   ├─ password
   └─ otros parámetros

3. App llama getData() o getObject()
   ├─ Extrae email → salt1
   ├─ Obtiene deviceId → salt2
   ├─ Calcula: salt = email + "38457487" + deviceId
   ├─ token = SHA256(salt)
   ├─ Añade al payload:
   │  ├─ email
   │  ├─ password
   │  ├─ deviceId
   │  ├─ encountertrackid (token SHA256)
   │  └─ otros parámetros
   ├─ Convierte a FormData
   └─ POST https://dev.cubed-mr.app/api/[endpoint]

4. Servidor remoto recibe
   ├─ Parsea FormData
   ├─ Valida credenciales contra BD
   ├─ Si válido:
   │  ├─ Genera JWT token
   │  ├─ Retorna status: 1, token, facilities
   │  └─ App almacena token en SharedPreferences
   └─ Si inválido:
      ├─ Retorna status: 0, reason: 2
      └─ App muestra error

5. Autenticación completa
   ├─ Token almacenado
   ├─ DeviceId almacenado
   └─ Session iniciada
```

---

## 🛡️ Seguridad Flutter

### **Protecciones Implementadas**

✅ **HTTPS/SSL-TLS**
- Contraseña protegida en tránsito
- No transmitida en texto plano visible

✅ **SHA256 Local**
- Genera `encountertrackid` localmente
- No es hash de contraseña, es derivación de email+salt+deviceId

✅ **Device ID Persistente**
- UUID v4 generado una sola vez
- Almacenado en `SharedPreferences` (seguro del SO)
- Permite identificar dispositivo específico

✅ **Timeout de conexión**
- 5 segundos máximo de espera
- Evita desconexiones prolongadas

### **Vulnerabilidades Potenciales**

⚠️ **SHA256 Reproducible**
- Si alguien sabe: email + deviceId
- Puede reproducir el `encountertrackid`
- No es hash de contraseña (no encripta)

⚠️ **Contraseña en Texto Plano**
- Se envía como parámetro directo
- Protegida solo por HTTPS
- Sin encriptación adicional a nivel de aplicación

⚠️ **Token almacenado localmente**
- En `SharedPreferences` 
- Accesible a otras apps en dispositivo jailbreaked/rooted
- Sin encriptación adicional

⚠️ **FormData no encriptado**
- Todos los campos visibles en FormData
- Solo protegidos por HTTPS

---

## 🔌 Endpoints Soportados

Basado en `model.dart`, los métodos soportan cualquier endpoint:

```dart
// Ejemplo de uso
List<Map> users = await model.getData("usuarios", {
  "email": "user@example.com",
  "password": "password123"
});

// También soporta:
Map facility = await model.getObject("facilities/123", {...});
```

---

## 📝 Parámetros Especiales

### **Parámetros automáticamente añadidos**

| Parámetro | Fuente | Ejemplo |
|-----------|--------|---------|
| `deviceId` | `SharedPreferences` o `PlatformDeviceId` | `550e8400-e29b-41d4-a716-446655440000` |
| `encountertrackid` | SHA256(email + "38457487" + deviceId) | `a7f3d8e2c1b9f4a6d5e7c8b9f0a1d3e5f` |

### **Parámetros de entrada**

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|------------|
| `email` | SÍ | String | Email del usuario |
| `password` | SÍ | String | Contraseña en texto plano |
| `[otros]` | NO | Varios | Parámetros adicionales del endpoint |

---

## 🚀 Comparación: Flutter vs Facility Web

### **Flutter**
```
Ventajas:
✅ UUID persistente (más confiable)
✅ Directo al servidor remoto (menos latencia)
✅ SHA256 token generado localmente

Desventajas:
⚠️ Token SHA256 reproducible
⚠️ FormData en lugar de JSON (menos estándar)
⚠️ No hay documentación de reintentos
```

### **Facility Web**
```
Ventajas:
✅ JSON limpio (más estándar)
✅ Frontal recibe y cachea datos
✅ Reintentos automáticos en sesiones activas

Desventajas:
⚠️ Device ID aleatorio (puede colisionar)
⚠️ Una capa extra (frontal) de latencia
⚠️ No genera token local (depende del servidor)
```

---

## 🎯 Conclusiones

1. **Flutter genera token SHA256 local** - Desconocido por qué, posible duplicación de esfuerzo
2. **Ambas plataformas confían en HTTPS** - Sin encriptación adicional
3. **Device ID manejo diferente** - Flutter persistente, Facility aleatorio
4. **Formato diferente** - Flutter FormData, Facility JSON
5. **Ambas se conectan al mismo servidor remoto** - cubed-mr.app

---

*Análisis basado en: /var/www/dev/model.dart (512 líneas)*
*Última verificación: 2024*
