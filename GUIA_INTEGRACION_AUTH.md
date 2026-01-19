# Guía de Integración: Unificar Autenticación Facility + Flutter

## 🎯 Objetivo

Crear un sistema de autenticación consistente entre Facility Web y Flutter Mobile que:
- ✅ Use el mismo formato (JSON)
- ✅ Use los mismos parámetros
- ✅ Tenga el mismo manejo de errores
- ✅ Soporte reintentos automáticos
- ✅ Almacene datos de forma consistente

---

## 📋 Plan de Integración

### **Fase 1: Análisis (Completado ✓)**

- ✓ Analizar flujo Facility Web
- ✓ Analizar flujo Flutter
- ✓ Identificar diferencias
- ✓ Documentar inconsistencias

### **Fase 2: Estandarización (Recomendado)**

- [ ] Definir formato estándar
- [ ] Crear especificación de API
- [ ] Documentar parámetros
- [ ] Definir códigos de error

### **Fase 3: Implementación**

- [ ] Actualizar Flutter para usar JSON
- [ ] Actualizar Facility para usar mismo formato
- [ ] Implementar reintentos automáticos
- [ ] Sincronizar manejo de errores

### **Fase 4: Testing**

- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Testing en ambas plataformas
- [ ] Validación de sesiones

### **Fase 5: Deployment**

- [ ] Release Flutter (nueva versión)
- [ ] Release Facility (nueva versión)
- [ ] Monitoreo
- [ ] Rollback plan

---

## 🔧 Especificación Estándar Propuesta

### **Endpoint Autenticación**

```
URL: https://cubed-mr.app/api/auth
Método: POST
Content-Type: application/json
```

### **Request Estándar**

```json
{
  "action": "TryLogin",
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "device-uuid-v4",
  "name": "user@example.com",
  "platform": "web|mobile"
}
```

**Parámetros:**
- `action` (string, requerido): Tipo de autenticación
  - `TryLogin`: Autenticación directa
  - `TryLoginFacilities`: Autenticación con facilities
- `email` (string, requerido): Email del usuario
- `password` (string, requerido): Contraseña
- `deviceId` (string, requerido): UUID del dispositivo (persistente)
- `name` (string, opcional): Nombre o display name
- `platform` (string, recomendado): "web" o "mobile"

### **Response Estándar - Exitoso**

```json
{
  "status": true,
  "data": [
    {
      "status": 1,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "entityId": "entity-id-123",
      "entity": "TryLogin",
      "entityName": "Usuario",
      "facilities": [
        {
          "id": "facility-1",
          "name": "Hospital ABC"
        }
      ],
      "msg": "Authentication successful",
      "reason": 0
    }
  ]
}
```

### **Response Estándar - Error**

```json
{
  "status": false,
  "data": [
    {
      "status": 0,
      "token": null,
      "entityId": null,
      "entity": "TryLogin",
      "entityName": null,
      "facilities": [],
      "msg": "Email and password combination failed",
      "reason": 2
    }
  ]
}
```

### **Códigos de Error Estándar**

| Reason | Status | Significado | Acción |
|--------|--------|------------|--------|
| 0 | 1 | ✓ Autenticación exitosa | Guardar token |
| 1 | 0 | ⚠️ Sesión activa | Reintentar con deviceId diferente |
| 2 | 0 | ❌ Credenciales inválidas | Mostrar error al usuario |
| 3 | 0 | ❌ Usuario no encontrado | Mostrar error específico |
| 4 | 0 | ❌ Cuenta bloqueada | Mostrar error específico |
| 5 | 0 | ⚠️ Too many attempts | Esperar y reintentar |

---

## 🛠️ Cambios Requeridos

### **1. Flutter - model.dart**

#### **Cambio 1: Usar JSON en lugar de FormData**

```dart
// ANTES
final formData = FormData.fromMap(parameters);
Response response = await dio.post(apiUrl+endpoint, data: formData);

// DESPUÉS
final jsonString = json.encode(parameters);
Response response = await dio.post(
  apiUrl+endpoint,
  data: jsonString,
  options: Options(contentType: Headers.jsonContentType)
);
```

#### **Cambio 2: Remover SHA256 local (opcional)**

```dart
// ANTES
var bytes = utf8.encode(_getToken(salt1,salt2));
var token = sha256.convert(bytes);
parameters.putIfAbsent('encountertrackid', () => token);

// DESPUÉS - Si no es necesario
// Remover la línea de encountertrackid
```

#### **Cambio 3: Agregar parámetro platform**

```dart
parameters.putIfAbsent('platform', () => 'mobile');
```

#### **Cambio 4: Implementar reintentos automáticos**

```dart
// Nuevo método: loginWithRetry
Future<Map<String,dynamic>> loginWithRetry({
  required String email,
  required String password,
  int maxRetries = 3
}) async {
  for (int retry = 0; retry < maxRetries; retry++) {
    Map<String,dynamic> params = {
      "action": "TryLogin",
      "email": email,
      "password": password,
      "deviceId": deviceId,
      "platform": "mobile"
    };
    
    Map<String,dynamic> response = await getObject("auth", params);
    
    // Si status 1: éxito
    if (response['data']?[0]?['status'] == 1) {
      return response;
    }
    
    // Si reason 1: sesión activa, reintentar
    if (response['data']?[0]?['reason'] == 1 && retry < maxRetries - 1) {
      deviceId = const Uuid().v4(); // Nuevo deviceId
      continue;
    }
    
    // Otro error: retornar
    return response;
  }
  
  return {"status": false, "error": "Max retries exceeded"};
}
```

---

### **2. Facility - client/src/pages/login.tsx**

#### **Cambio 1: Usar JSON estándar (ya lo hace)**

✓ Ya usa JSON - No requiere cambio

#### **Cambio 2: Agregar parámetro platform**

```typescript
// ANTES
body: JSON.stringify({
  action: entity,
  email: email,
  password: values.password,
  name: email,
  deviceId: deviceId,
}),

// DESPUÉS
body: JSON.stringify({
  action: entity,
  email: email,
  password: values.password,
  name: email,
  deviceId: deviceId,
  platform: "web"
}),
```

#### **Cambio 3: Unificar manejo de errores**

```typescript
// Crear función auxiliar
function getErrorMessage(reason: number, msg: string): string {
  switch(reason) {
    case 0: return "Authentication successful";
    case 1: return "Active session detected";
    case 2: return "Invalid email and password combination";
    case 3: return "User not found";
    case 4: return "Account is locked";
    case 5: return "Too many login attempts";
    default: return msg || "Unknown error";
  }
}
```

---

### **3. Servidor Express - server/routes.ts**

#### **Cambio: Agregar validación de formato**

```typescript
app.post("/api/get", loginLimiter, async (req, res) => {
  const { action, email, password, deviceId, platform, ...rest } = req.body;
  
  // Validar parámetros requeridos
  if (!email || !password || !deviceId) {
    return res.status(400).json({
      status: false,
      error: "Missing required parameters: email, password, deviceId"
    });
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: false,
      error: "Invalid email format"
    });
  }
  
  // Log de autenticación
  logLogin(`[/api/get] Email: ${email.substring(0,5)}***, Platform: ${platform}, Reason: OK`);
  
  // Resto del código...
});
```

---

## 📊 Matriz de Cambios

| Componente | Archivo | Cambio | Prioridad | Esfuerzo |
|-----------|---------|--------|-----------|----------|
| Flutter | model.dart | FormData → JSON | Alta | Bajo |
| Flutter | model.dart | Agregar reintentos | Alta | Medio |
| Flutter | model.dart | Agregar platform | Media | Muy bajo |
| Facility | login.tsx | Agregar platform | Media | Muy bajo |
| Facility | login.tsx | Unificar errores | Baja | Bajo |
| Server | routes.ts | Validar parámetros | Media | Bajo |

---

## 🧪 Plan de Testing

### **Caso de Prueba 1: Autenticación exitosa**

```
Entrada:
  email: "valid@example.com"
  password: "correctPassword"
  
Esperado:
  - status: true
  - data[0].status: 1
  - data[0].token: (no vacío)
```

### **Caso de Prueba 2: Credenciales inválidas**

```
Entrada:
  email: "valid@example.com"
  password: "wrongPassword"
  
Esperado:
  - status: false
  - data[0].status: 0
  - data[0].reason: 2
```

### **Caso de Prueba 3: Sesión activa (reintentos)**

```
Entrada:
  - Primer intento: deviceId = "uuid-1"
  
Esperado:
  - Respuesta: reason: 1
  - Flutter: Genera nuevo UUID
  - Segundo intento: deviceId = "uuid-2"
  - Resultado: status: 1 (éxito) o status: 0 (otra razón)
```

### **Caso de Prueba 4: Parámetros faltantes**

```
Entrada:
  email: "valid@example.com"
  password: "password"
  deviceId: (vacío)
  
Esperado:
  - status: false
  - error: "Missing required parameters"
```

### **Caso de Prueba 5: Rate limiting**

```
Entrada:
  - 21 solicitudes en 15 minutos desde misma IP
  
Esperado:
  - Solicitudes 1-20: Procesadas
  - Solicitud 21: Error 429 "Too many requests"
```

---

## 📈 Roadmap de Implementación

### **Semana 1**
- [ ] Crear especificación final
- [ ] Preparar cambios en Flutter
- [ ] Preparar cambios en Facility
- [ ] Crear tests

### **Semana 2**
- [ ] Implementar cambios Flutter
- [ ] Testing en Flutter
- [ ] Compilar APK/IPA

### **Semana 3**
- [ ] Implementar cambios Facility
- [ ] Testing en Facility
- [ ] Deploy a staging

### **Semana 4**
- [ ] Testing integrado (ambas plataformas)
- [ ] Validación de errores
- [ ] Optimizaciones finales

### **Semana 5**
- [ ] Beta release Flutter
- [ ] Beta release Facility
- [ ] Recolectar feedback

### **Semana 6**
- [ ] Release final Flutter
- [ ] Release final Facility
- [ ] Monitoreo y support

---

## 🚀 Ventajas de la Integración

### **Para Usuarios**
✅ Experiencia consistente en web y mobile
✅ Manejo uniforme de errores
✅ Reintentos automáticos confiables
✅ Mejor UX

### **Para Desarrollo**
✅ Código más mantenible
✅ Menos duplicación
✅ Debugging más fácil
✅ Estándares comunes

### **Para Operaciones**
✅ Monitoreo centralizado
✅ Logs consistentes
✅ Métricas unificadas
✅ Soporte más simple

---

## ⚠️ Riesgos Potenciales

| Riesgo | Mitigación |
|--------|-----------|
| Incompatibilidad con clientes antiguos | Mantener endpoint antiguo en paralelo |
| Fallos en producción | Testing exhaustivo antes de release |
| Device ID perdido en Flutter | Sincronización con servidor como respaldo |
| Sesiones rotas | Testing de transición |

---

## 📞 Contactos y Escalación

- **Lead Técnico**: [Especificar]
- **DevOps**: [Especificar]
- **QA**: [Especificar]
- **Support**: [Especificar]

---

## ✅ Checklist de Implementación

### Pre-Implementación
- [ ] Especificación aprobada
- [ ] Recursos asignados
- [ ] Timeline acordado
- [ ] Ambiente de staging listo

### Implementación
- [ ] Flutter actualizado
- [ ] Facility actualizado
- [ ] Servidor validado
- [ ] Tests pasando

### Post-Implementación
- [ ] Documentación actualizada
- [ ] Release notes preparados
- [ ] Team entrenado
- [ ] Monitoreo activo
- [ ] Soporte disponible

---

*Guía de Integración - Versión 1.0*
*Última actualización: 2024*
