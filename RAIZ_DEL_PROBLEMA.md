# 🔍 DIAGNÓSTICO RAÍZ DEL PROBLEMA

## Problema Detectado

```
providerId: undefined  ❌
practiceId: undefined  ❌
```

**Causa raíz:** API remota no está devolviendo el campo `ProviderId` en la respuesta de `EntityInfo`

---

## 🔗 Cadena de Problemas

### 1. **Login (TryLogin)** ✅
- Se conecta correctamente
- Devuelve token y otros datos

### 2. **EntityInfo Query** ❌
- Se envía correctamente al API remota
- **PERO API remota NO devuelve `ProviderId`**
- Por eso en línea 310 de use-auth.ts:
  ```typescript
  if (userData.entity === 'Provider' && userData.ProviderId) {
    localStorage.setItem("userEntityId", userData.ProviderId.toString());
  } else {
    localStorage.removeItem("userEntityId");
  }
  ```
  El `userData.ProviderId` está undefined → se borra `userEntityId`

### 3. **Facilities Query (FacilityDataCenter)** ❌
- Sin `userEntityId`, no hay `providerId`
- Se envía: `providerId: undefined, practiceId: undefined`
- API remota rechaza con "Unauthorized access"

---

## 📊 Diagrama del flujo

```
Login (TryLogin)
    ↓
[✅] Token guardado
[✅] grupos guardados
    ↓
EntityInfo Query
    ↓
[❌] API remota devuelve userData sin ProviderId
    ↓
userEntityId = borrado (undefined)
    ↓
getFacilities() con providerId: undefined
    ↓
[❌] Unauthorized access
```

---

## ✅ Solución

Necesito verificar que la API remota está retornando correctamente el campo `ProviderId`.

**Pasos a hacer:**

### 1. Haz login nuevamente y abre Console
### 2. Busca la línea:
```
[useAuth] EntityInfo response:
```

### 3. Copia el objeto completo que ves (el que empieza con `{status: true, data: [...]}`)

### 4. Pega aquí y dime:
- ¿Ves el campo `ProviderId`?
- ¿Qué valor tiene?
- ¿O solo ves campos como `email`, `ProviderName`, etc sin `ProviderId`?

---

## 🔧 Si ProviderId no viene:

Opciones:
1. **Cambiar el nombre del campo** - Quizás se llama `provider_id` o `ProviderID`
2. **Cambiar el SQL** - El SP en la BD remota no está retornando ese campo
3. **Hardcodear un valor** - Si drperez siempre es Provider ID 5, lo podemos forzar

Pero primero necesito ver exactamente qué devuelve EntityInfo.

---

## 📋 Checklist para diagnosticar

- [ ] ¿Ves `[useAuth] EntityInfo response:` en Console?
- [ ] ¿Ves un campo `ProviderId` con un valor?
- [ ] Si no lo ves, ¿ves otros campos como `ProviderName`, `entity`, etc?
- [ ] ¿El email es correcto (drperez@curisec.com)?
- [ ] ¿Dice `entity: 'Provider'`?

