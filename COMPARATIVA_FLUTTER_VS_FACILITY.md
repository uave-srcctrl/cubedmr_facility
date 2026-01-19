# Análisis Comparativo: Autenticación Flutter vs Facility Web

## 📱 vs 🖥️ Comparación de Flujos de Autenticación

### 1. ARQUITECTURA GENERAL

#### **Facility (Web - React + TypeScript + Express)**
```
Cliente (React)
    ↓
    POST /api/get
    (localhost:5000)
    ↓
Servidor Express
    ↓
    POST https://cubed-mr.app/api/get
    (remoto)
    ↓
Base de datos remota
    ↓
Respuesta con token
```

#### **Flutter (Dart - Mobile)**
```
Cliente (Dart/Flutter)
    ↓
POST /api/ (endpoint variable)
    ↓
CsrModel.getData() o CsrModel.getObject()
    ↓
Dio HTTP client
    ↓
Base URL: https://dev.cubed-mr.app/ (configurable)
    ↓
Respuesta
```

---

## 🔐 PARÁMETROS DE AUTENTICACIÓN

### **Facility Web**
```json
{
  "action": "TryLoginFacilities",
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "web-abc123xyz",
  "name": "user@example.com"
}
```
**Método de envío:** JSON raw en body
**Encriptación:** No (protegida por HTTPS/SSL-TLS)
**Storage de token:** `localStorage`

### **Flutter App**
```
FormData {
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "device-uuid-123",
  "encountertrackid": "sha256(email + '38457487' + deviceId)"
}
```
**Método de envío:** `FormData` (form-urlencoded)
**Encriptación:** SHA256 token generado localmente
**Storage de token:** `SharedPreferences` (almacenamiento del sistema)
**Algoritmo de token:** 
- `salt1 = email`
- `salt2 = deviceId`
- `salt = email + '38457487' + deviceId`
- `token = SHA256(salt)`

---

## 📊 COMPARACIÓN DETALLADA

| Aspecto | Facility Web | Flutter App |
|---------|--------------|-------------|
| **Plataforma** | Web (React/TypeScript) | Mobile (Dart) |
| **Protocolo HTTP Client** | Fetch API | Dio |
| **Formato de envío** | JSON raw | FormData |
| **Autenticación directa** | NO (pass-through) | SÍ (genera token local) |
| **Token generado** | NO (recibido del servidor) | SÍ (SHA256 local) |
| **Parámetro de token** | N/A | `encountertrackid` |
| **Base URL** | localhost:5000 (frontal) | https://dev.cubed-mr.app/ (directo) |
| **Device ID formato** | `web-${random}` | UUID persistente + Platform |
| **Device ID almacenado** | `localStorage` | `SharedPreferences` |
| **Reintentos automáticos** | SÍ (hasta 3 veces en caso de sesión activa) | Desconocido (no visible en model.dart) |
| **Entidad de autenticación** | `TryLoginFacilities` | Desconocido (pasado como parámetro) |
| **Manejo de sesiones activas** | Cambia deviceId y reintenta | Desconocido |

---

## 🔄 FLUJO DE AUTENTICACIÓN DETALLADO

### **Facility Web - Paso a Paso**

1. **Cliente recolecta datos**
   - Email: `valores.identifier`
   - Contraseña: `valores.password`
   - Entity: `"TryLoginFacilities"`

2. **Genera Device ID si no existe**
   ```typescript
   let deviceId = localStorage.getItem("deviceId");
   if (!deviceId) {
     deviceId = "web-" + Math.random().toString(36).substr(2, 9);
     localStorage.setItem("deviceId", deviceId);
   }
   ```

3. **Envía a servidor Express local**
   ```typescript
   POST /api/get
   {
     action: "TryLoginFacilities",
     email: email,
     password: password,
     name: email,
     deviceId: deviceId
   }
   ```

4. **Servidor Express reenvía a cubed-mr.app**
   - NO realiza validación local
   - Simplemente reenvía el payload
   - Recibe respuesta remota
   - Cachea facilities en memoria

5. **Respuesta esperada**
   ```json
   {
     "status": true,
     "data": [
       {
         "status": 1,
         "token": "jwt-token-value",
         "entityId": "facility-id",
         "entity": "TryLoginFacilities",
         "entityName": "Facility Name",
         "facilities": [...],
         "msg": "Success"
       }
     ]
   }
   ```

6. **Manejo de sesión activa**
   - Si recibe `status: 0` y `reason: 1` (sesión activa)
   - Genera nuevo `deviceId`
   - Reintenta (máximo 3 veces)
   - Cada intento con deviceId diferente

7. **Almacenamiento de token**
   ```typescript
   localStorage.setItem("token", token);
   localStorage.setItem("facilityId", entityId);
   // ... otros datos
   ```

---

### **Flutter App - Paso a Paso**

1. **Constructor del modelo (CsrModel)**
   - Obtiene persistentemente el deviceId
   - Si no existe: genera UUID y lo guarda
   - Si existe: usa el almacenado
   ```dart
   if(prefs.getString('deviceId')==null){
     var uuid = Uuid();
     pseudoDeviceId = uuid.v4();
     prefs.setString('deviceId',pseudoDeviceId);
   }else{
     deviceId = prefs.getString('deviceId');
   }
   ```

2. **Configuración de Dio HTTP Client**
   ```dart
   dio = Dio(BaseOptions(
     baseUrl: 'https://dev.cubed-mr.app/api/',
     connectTimeout: Duration(seconds: 5),
     receiveTimeout: Duration(seconds: 5),
   ));
   ```

3. **Generación de token local**
   ```dart
   String _getToken(String salt1, String salt2){
     String salt = '${salt1}38457487$salt2';
     var bytes = utf8.encode(salt);
     var token = sha256.convert(bytes);  // SHA256
     return salt;
   }
   ```

4. **Envío de datos de autenticación**
   ```dart
   parameters = {
     "email": email,
     "password": password,
     "deviceId": deviceId,
     "encountertrackid": token
   };
   final formData = FormData.fromMap(parameters);
   Response response = await dio.post(endpoint, data: formData);
   ```

5. **Almacenamiento de dispositivo**
   - Device ID: `SharedPreferences` (persistente)
   - Session ID: Desconocido en model.dart
   - Token: Probable que en `SharedPreferences`

---

## 🎯 DIFERENCIAS CLAVE

### **1. Generación de Token**
- **Facility:** No genera token localmente, lo recibe del servidor
- **Flutter:** Genera token SHA256 localmente usando email + salt + deviceId

### **2. Formato de Envío**
- **Facility:** JSON limpio
- **Flutter:** FormData (form-urlencoded)

### **3. Flujo de Autenticación**
- **Facility:** Cliente → Servidor frontal → Servidor remoto
- **Flutter:** Cliente → Servidor remoto (directo)

### **4. Device ID**
- **Facility:** 
  - Formato: `web-${random}`
  - Cambia en cada reintento de sesión activa
  - Generado aleatoriamente
- **Flutter:**
  - Formato: UUID v4
  - PERSISTENTE (reutilizado siempre)
  - Solo se regenera si no existe

### **5. Reintentos**
- **Facility:** Automático si detecta sesión activa (reason: 1)
- **Flutter:** No documentado en model.dart

### **6. Base URL**
- **Facility:** localhost:5000 (desarrollo), servidor frontal (producción)
- **Flutter:** https://dev.cubed-mr.app/ o configurable en baseUrl

---

## ⚠️ INCONSISTENCIAS IDENTIFICADAS

### **Problema 1: Diferentes Rutas**
```
Facility Web:  POST /api/get
Flutter:       POST /api/ (endpoint variable)
```

### **Problema 2: Diferentes Métodos de Envío**
```
Facility Web:  JSON { action: "TryLoginFacilities", ... }
Flutter:       FormData { email, password, deviceId, encountertrackid }
```

### **Problema 3: Token Local**
- Facility NO valida token localmente
- Flutter genera token y lo envía

### **Problema 4: Device ID**
- Facility lo cambia en reintentos
- Flutter lo mantiene persistente

---

## 🔍 CASOS DE ERROR DOCUMENTADOS

### **Facility Web**
| Status | Reason | Código Error | Significado |
|--------|--------|--------------|------------|
| 0 | 1 | 0x1191372 | Sesión activa - reintentar con deviceId diferente |
| 0 | 2 | 0x1191372 | Credenciales inválidas |
| 0 | 3 | 0x3881920 | Credenciales inválidas (TryLoginFacilities) |

### **Flutter**
- No documentado en model.dart

---

## 📋 ANÁLISIS DE SEGURIDAD

### **Facility Web**
✅ HTTPS obligatorio (comentado pero disponible)
✅ Contraseña en texto plano + HTTPS
✅ Device ID conocido (puede ser reproducido)
⚠️ No hay token local para validación

### **Flutter**
✅ SHA256 token local (no es encriptación de contraseña)
⚠️ Contraseña en texto plano + HTTPS
⚠️ Token SHA256 puede ser reproducido con email + salt + deviceId conocidos
✅ Device ID persistente (más seguro que random)

---

## 🎓 CONCLUSIONES

### **Similitudes**
1. Ambos usan HTTPS/SSL-TLS para proteger contraseña
2. Ambos incluyen Device ID para sesiones
3. Ambos se conectan a https://cubed-mr.app/api/get (remoto)
4. Ambos esperan respuesta con token en payload

### **Diferencias Principales**
1. **Arquitectura:** Facility usa frontal, Flutter directo
2. **Token:** Flutter genera SHA256 local, Facility lo recibe
3. **Formato:** JSON vs FormData
4. **Device ID:** Random vs UUID persistente
5. **Reintentos:** Automático vs Manual (probablemente)

### **Recomendaciones**
1. ✅ Mantener HTTPS/SSL-TLS en ambas plataformas
2. 🔄 Estandarizar formato de envío (preferir JSON)
3. 🔄 Estandarizar parámetros (usar mismo "action"/"entity")
4. 🔄 Revisar por qué Flutter genera token SHA256 local
5. 🔄 Documentar manejo de errores en Flutter app
6. 📝 Sincronizar Device ID strategy entre plataformas

---

## 📌 ESTADO ACTUAL (Verificado)

**Facility Web:**
- ✅ Conecta a cubed-mr.app
- ✅ Envía TryLoginFacilities
- ✅ Recibe token remoto
- ⚠️ Credenciales de prueba inválidas en DB remota

**Flutter:**
- ✅ Conecta a dev.cubed-mr.app
- ✅ Genera token SHA256 local
- ⚠️ Parámetros y manejo no completamente documentados

---

*Última actualización: 2024*
*Análisis basado en: model.dart, login.tsx, routes.ts*
