# ✅ CLIENTE REACT ACTUALIZADO - FLUJO DART REPLICADO

## Cambios Realizados

### En `client/src/pages/login.tsx`:

#### 1. Se agregó cálculo de `encountertrackid`
El cliente React ahora calcula AMBOS hashes como lo hace Dart:

```typescript
// Step 1: SHA256(password) - calculado en authenticate()
const firstHash = await sha256(values.password);

// Step 2: SHA256(email + "38457487" + deviceId) - calculado en getData()
const salt = `${email}38457487${deviceId}`;
const encountertrackid = await sha256(salt);
```

#### 2. El payload ahora incluye ambos hashes
```typescript
body: JSON.stringify({
  action: entity,
  email: email,
  password: firstHash,            // ← Step 1
  deviceId: deviceId,
  name: email,
  encountertrackid: encountertrackid,  // ← Step 2
})
```

#### 3. Reintentos también recalculan hashes
Cuando se reintenta con un nuevo deviceId, se recalcula `encountertrackid`:

```typescript
const newSalt = `${email}38457487${newDeviceId}`;
const newEncountertrackid = await sha256(newSalt);
```

## Flujo Ahora Es Idéntico a Dart

### Dart (lib/user.dart + lib/model.dart):
```dart
authenticate(email, passwd) {
    password = SHA256(passwd)
    getData() {
        encountertrackid = SHA256(email + "38457487" + deviceId)
    }
}
```

### React (client/src/pages/login.tsx):
```typescript
onSubmit(values) {
    password = SHA256(values.password)
    salt = email + "38457487" + deviceId
    encountertrackid = SHA256(salt)
    fetch with {password, encountertrackid, deviceId, ...}
}
```

## Test Realizado

Con `drperez@curisec.com` / `12345678` / `deviceId: web-test12345`:

```
password = ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f
encountertrackid = adf69e9d16c6563737a8a80a1a2da2f6b9c51a6ba94a87af6f15fb045f0309f4
```

**Resultado:** ❌ "Email and password combination failed" (reason: 3)

## Conclusión

✅ **El cliente React ahora envía exactamente lo que Dart envía**
❌ **La contraseña "12345678" sigue siendo inválida**

Próximas acciones:
1. Verificar si existen otras credenciales válidas
2. Contactar al administrador para resetear la contraseña de drperez@curisec.com
3. O verificar si el email es correcto
