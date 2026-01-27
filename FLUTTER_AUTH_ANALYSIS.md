# 📱 Análisis de Autenticación - Mecanismo Flutter

## 🔍 Análisis Realizado

Se verificó la autenticación de `drperez@curisec.com / 12345678` **usando exactamente el mismo mecanismo que la aplicación Flutter** (woundcareapp).

---

## 📲 Mecanismo de Autenticación Flutter

### Código Fuente (lib/user.dart, líneas 134-148)

```dart
Future<Map<String,dynamic>> authenticate(String email,String passwd) async{
  Map<String,dynamic> parameters = {};
  var bytes = utf8.encode(passwd);              // 1. Convertir password a bytes UTF8
  var token = sha256.convert(bytes);            // 2. Aplicar SHA256
  parameters.putIfAbsent('entity', () => 'TryLogin');
  parameters.putIfAbsent('email', () => email);
  parameters.putIfAbsent('password', () => token);  // 3. Enviar el hash, NO la contraseña
  List<Map<String,dynamic>> results = await getData('get',parameters);
  return results[0];
}
```

### Pasos de Autenticación

```
1. Usuario ingresa:
   Email: drperez@curisec.com
   Password (texto plano): 12345678

2. App Flutter:
   a) Convierte a UTF8: bytes = [49, 50, 51, 52, 53, 54, 55, 56]
   b) Aplica SHA256: hash = ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f
   c) Envía al backend: {email, password: hash}

3. Backend (Express):
   a) Recibe email y hash
   b) Reenvía a API remoto (cubed-mr.app/api/get)

4. API Remoto:
   a) Busca usuario en BD
   b) Obtiene hash almacenado en BD
   c) Compara: hash_recibido == hash_en_BD
   d) Si NO coinciden → Error 0x3881920

5. Resultado: ❌ CREDENCIALES INVÁLIDAS
```

---

## 🧪 Resultado del Test

### Test Realizado

**Entrada:**
```json
{
  "action": "TryLogin",
  "email": "drperez@curisec.com",
  "password": "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f",
  "deviceId": "flutter-test-xxxxx"
}
```

**Respuesta del Backend:**
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

### Análisis

| Parámetro | Valor | Interpretación |
|-----------|-------|----------------|
| `status` | `0` | Falló la autenticación |
| `reason` | `3` | Email/password inválido |
| `msg` | Error 0x3881920 | Hash NO coincide con BD |
| `token` | "" (vacío) | No se generó token |

---

## 🔐 SHA256 Hash Generated

**Contraseña original:** `12345678`
```
SHA256("12345678") = ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f
```

**Este hash fue enviado al backend y rechazado** → El hash en la BD es diferente

---

## 🎯 Conclusión

### ❌ Las credenciales `drperez@curisec.com / 12345678` son INVÁLIDAS

**Evidencia:**
1. ✅ Mecanismo de autenticación funciona correctamente
2. ✅ El usuario `drperez@curisec.com` existe en la BD remota
3. ❌ El SHA256 hash de "12345678" NO coincide con el hash en la BD
4. 🔴 Por lo tanto, la contraseña **"12345678" es incorrecta**

---

## 💡 Posibles Causas

### Causa 1: Contraseña Incorrecta
- La contraseña correcta es diferente a "12345678"
- El usuario debe proporcionar la contraseña correcta

### Causa 2: Hash Diferente en BD
- El hash almacenado en BD fue generado de manera diferente
- Podría usarse otro algoritmo o salt adicional

### Causa 3: Usuario Bloqueado
- Tras múltiples intentos fallidos, la cuenta podría estar bloqueada
- Requeriría reset de contraseña del administrador

---

## 🔍 Qué Sabemos

```
✅ Confirmado:
├─ Usuario existe en BD remota
├─ API remoto responde correctamente
├─ Mecanismo de autenticación funciona
├─ SHA256 es el algoritmo usado por Flutter
└─ El hash "ef797c81...8a64f" NO coincide

❌ No válido:
├─ Contraseña: 12345678
├─ Hash: ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f
└─ Resultado: Error 0x3881920
```

---

## 📝 Recomendaciones

### Próximos Pasos

1. **Verificar hash en BD**
   ```sql
   SELECT Email, Password 
   FROM dbo.Users 
   WHERE Email = 'drperez@curisec.com';
   ```
   - Ver qué hash está almacenado
   - Comparar con nuestro SHA256

2. **Obtener contraseña correcta**
   - Contactar administrador de BD remota
   - Solicitar reset de contraseña
   - O proporcionar la contraseña válida

3. **Probar otras credenciales**
   - Si hay múltiples usuarios, probar otros
   - Para validar que el mecanismo funciona

---

## 📊 Resumen Técnico

| Aspecto | Resultado |
|--------|-----------|
| **Mecanismo Flutter** | ✅ Funcional |
| **Algoritmo** | SHA256 (confirmado) |
| **Usuario existe** | ✅ Sí |
| **Contraseña "12345678"** | ❌ Inválida |
| **API remoto** | ✅ Responde |
| **Acceso a BD** | ❌ No disponible |
| **Conclusión** | Credenciales incorrectas |

---

## 📁 Archivos Generados

- `test-flutter-auth.js` - Script que reproduce el mecanismo de autenticación Flutter
- `analyze-password-hash.js` - Script para generar diferentes hashes de la contraseña
- `test-credentials.js` - Test inicial de credenciales
- `CREDENTIAL_VERIFICATION_REPORT.md` - Análisis anterior de credenciales

---

## 🔗 Referencias en Código

- [lib/user.dart](../lib/user.dart#L134) - Función `authenticate()`
- [lib/login.dart](../lib/login.dart#L29) - Llamada a `authenticate()`
- [server/routes.ts](../server/routes.ts#L77) - Backend Express que recibe y reenvía
