# Reversión de Bcrypt

## 📋 Cambios Revertidos

Se ha revertido la implementación de bcrypt para volver a usar la encriptación original de TryLoginFacilities (SHA256/texto plano).

### Archivos Modificados

#### `server/routes.ts`

**1. Remoción de importación de bcrypt**
```diff
- import * as bcrypt from "bcrypt";
```

**2. Simplificación de verificación de contraseña**

**Antes (con bcrypt):**
```typescript
let passwordMatch = false;
try {
  if (user.password.startsWith("$2") || user.password.startsWith("$2a") || user.password.startsWith("$2b")) {
    passwordMatch = await bcrypt.compare(password, user.password);
  } else {
    passwordMatch = password === user.password || 
                   hashPasswordSHA256(password) === user.password;
  }
} catch (error) {
  // error handling
}
```

**Después (solo SHA256/texto plano):**
```typescript
const passwordMatch = password === user.password || 
                     hashPasswordSHA256(password) === user.password;
```

## ✅ Verificación

- ✅ Import de bcrypt removido
- ✅ Lógica de verificación simplificada
- ✅ Sin errores de compilación TypeScript
- ✅ Compatible con TryLoginFacilities original

## 🔐 Método de Encriptación Actual

- **Texto plano:** Comparación directa
- **SHA256:** Hash con crypto.createHash("sha256")
- **Sin salt:** Como en la implementación original

## ⚠️ Notas

- La encriptación SHA256 sin salt es más débil que bcrypt
- No hay rate limiting en el backend (solo 20 intentos/15min en el cliente)
- Para producción, considerar implementar salt o bcrypt en el futuro

## 📦 Dependencias

- `bcrypt` ya no es necesario (pero sigue instalado)
- Puede removerse de `package.json` si se desea

## 🚀 Próximos Pasos

```bash
npm run build
systemctl restart wounddatacenter
```

## Revertida por

Cambio solicitado por usuario - Reversión exitosa
