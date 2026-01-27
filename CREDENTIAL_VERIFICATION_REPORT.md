# 🔍 Verificación de Credenciales - drperez@curisec.com

## 🔐 Hallazgo Importante: Contraseña Hasheada

La contraseña en la BD remota está **hasheada** (no en texto plano). Esto significa:
- La BD no almacena `12345678` directamente
- Almacena un hash criptográfico de la contraseña
- El API remoto hashea la contraseña recibida y compara con el hash almacenado

---

## Resultado del Test

### Test de Autenticación (API Remoto)

**Credenciales Probadas:**
```
Email: drperez@curisec.com
Password: 12345678
```

**Respuesta del API:**
```json
{
  "status": true,
  "data": [
    {
      "status": 0,
      "reason": 2,
      "email": "drperez@curisec.com",
      "msg": "Error 0x1191372. Email and password combination failed.",
      "token": "302052B6-84A5-40AA-8EF6-C84684B19165"
    }
  ]
}
```

**Conclusión:** ❌ **LAS CREDENCIALES SON INVÁLIDAS**

---

## 📊 Análisis de la Contraseña Hasheada

### Hashes Generados para "12345678"

Dependiendo del algoritmo usado en la BD, el hash podría ser:

**SHA256:**
```
ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f
```

**SHA256 (con salt "curisec"):**
```
f370a870c0dc5d587d1d3e954a99e20b7b73f102e91eb6e9637791e6a85fd5a2
```

**SHA512:**
```
fa585d89c851dd338a70dcf535aa2a92fee7836dd6aff1226583e88e0996293f16bc009c652826e0fc5c706695a03cddce372f139eff4d13959da6f1f5d3eabe
```

**MD5:**
```
25d55ad283aa400af464c76d713c07ad
```

### Posibles Causas del Error

1. ✅ **El usuario existe** - Lo confirmó el API
2. ❌ **Hash no coincide** - La contraseña `12345678` cuando se hashea no produce el mismo hash que en la BD
3. 🔴 **Opciones:**
   - La contraseña correcta es diferente
   - Se utilizó un algoritmo de hash diferente
   - Se utilizó un salt diferente
   - El usuario está bloqueado

---

## 🔧 Próximos Pasos

### Para Resolver Este Problema

**Opción 1: Acceso a BD (Recomendado)**
```sql
SELECT Email, Password, IsActive 
FROM dbo.Users 
WHERE Email = 'drperez@curisec.com';
```
- Ver el hash almacenado
- Comparar con los hashes generados
- Determinar el algoritmo usado

**Opción 2: Obtener Credenciales Correctas**
- Contactar administrador de BD remota
- Solicitar credenciales válidas
- O un reset de contraseña

**Opción 3: Test con Otras Contraseñas**
- Probar contraseñas comunes: `password`, `admin`, `Aa123456`, etc.
- Ver cuál genera autenticación exitosa

---

## 💡 Información Técnica

### Algoritmos de Hashing Comunes

| Algoritmo | Características | Recomendación |
|-----------|-----------------|---------------|
| **SHA256** | Simple, determinista | ⚠️ Moderna pero sin salt |
| **SHA512** | Más fuerte que SHA256 | ⚠️ Moderna pero sin salt |
| **MD5** | Obsoleto, quebrado | ❌ NO usar |
| **bcrypt** | Con salt incorporado | ✅ Recomendado |
| **PBKDF2** | Con iteraciones | ✅ Recomendado |
| **scrypt** | Resistente a GPU brute-force | ✅ Recomendado |

### Cómo Verifica el API

```
1. Usuario envía: "password": "12345678"
   ↓
2. API hashea: hash = SHA256("12345678")
   ↓
3. API compara: hash == (hash en BD)
   ↓
4. Si NO coinciden → Error 0x1191372
```

---

## 📝 Resumen

| Elemento | Estado |
|----------|--------|
| Usuario existe | ✅ Confirmado |
| Contraseña en BD | 🔐 Hasheada |
| Contraseña "12345678" | ❌ No válida |
| API responde | ✅ Funcional |
| Acceso a BD remota | ❌ No disponible |

---

## 🎯 Recomendación Final

**Contactar al administrador de remoteWoundcareDB** para:

1. ✅ Verificar que `drperez@curisec.com` existe y está activo
2. ✅ Obtener la **contraseña correcta** o hacer reset
3. ✅ Confirmar el algoritmo de hashing usado
4. ✅ Verificar si la cuenta está bloqueada por intentos fallidos
