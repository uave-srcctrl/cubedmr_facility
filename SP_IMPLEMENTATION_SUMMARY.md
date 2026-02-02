# 📋 Stored Procedure Force Logout - Resumen de Implementación

## 📦 Archivos Creados

```
wounddatacenter/
│
├─ 🔧 STORED PROCEDURES & SQL
│  ├─ sp_ForceLogoutUser.sql ..................... SP + Funciones SQL
│  ├─ TEST_FORCE_LOGOUT.sql ...................... Tests automatizados
│  └─ FORCE_LOGOUT_ANALYSIS.sql .................. Análisis detallado
│
├─ 🐘 PHP IMPLEMENTATION
│  ├─ ForceLogoutService.php ..................... Clase de servicio PHP
│  └─ analyze-force-logout.php ................... Script de análisis
│
├─ ⚙️ NODE.JS / TYPESCRIPT IMPLEMENTATION  
│  └─ ForceLogoutService.ts ...................... Clase de servicio TS
│
├─ 📖 DOCUMENTACIÓN
│  ├─ SP_FORCELOGOUT_README.md ................... Guía completa (LEER PRIMERO)
│  ├─ FORCE_LOGOUT_GUIDE.md ...................... Guía detallada
│  └─ SP_IMPLEMENTATION_SUMMARY.md ............... Este archivo
│
└─ 🗂️ ANÁLISIS PREVIOS
   ├─ FORCE_LOGOUT_ANALYSIS.sql ................. Queries de análisis
   └─ FORCE_LOGOUT_GUIDE.md ..................... Opciones de implementación
```

---

## 🎯 Lo Que Se Creó

### 1️⃣ **Stored Procedures (SQL)**

#### `sp_ForceLogoutUser` (por Email)
```sql
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'usuario@email.com',
    @Reason = 'Actividad sospechosa',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
```

**Qué hace:**
- ✅ Busca usuario por email
- ✅ Invalida todos sus tokens (UserTokens + AuthTokens)
- ✅ Registra en auditoría (UserTrail)
- ✅ Retorna éxito/error con detalles
- ✅ Transaccional (todo o nada)

---

#### `sp_ForceLogoutUserId` (por ID)
```sql
EXEC dbo.sp_ForceLogoutUserId 
    @UserId = 5,
    @Reason = 'Logout solicitado',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
```

**Qué hace:** Lo mismo que sp_ForceLogoutUser pero busca por ID

---

### 2️⃣ **Funciones SQL**

#### `fn_GetActiveTokenCount(@UserId)`
```sql
SELECT dbo.fn_GetActiveTokenCount(5) as ActiveTokens;
-- Retorna: 2
```

#### `fn_GetActiveAuthTokenCount(@UserId)`
```sql
SELECT dbo.fn_GetActiveAuthTokenCount(5) as ActiveAuthTokens;
-- Retorna: 1
```

---

### 3️⃣ **Clase PHP: ForceLogoutService**

```php
$service = new ForceLogoutService($conn);

// Force logout por email
$result = $service->forceLogoutByEmail(
    'usuario@email.com',
    'Razón del logout',
    1  // admin ID
);

// Obtener tokens activos
$count = $service->getActiveTokenCount($userId);

// Ver historial de logouts
$history = $service->getLogoutHistory($userId, 10);

// Listar todas las sesiones activas
$sessions = $service->getActiveSessionsUsers();
```

**Métodos disponibles:**
- `forceLogoutByEmail(email, reason, adminId)` → array
- `forceLogoutByUserId(userId, reason, adminId)` → array
- `getActiveTokenCount(userId)` → int
- `getActiveAuthTokenCount(userId)` → int
- `getLogoutHistory(userId, limit)` → array
- `getActiveSessionsUsers()` → array

---

### 4️⃣ **Clase TypeScript/Node.js: ForceLogoutService**

```typescript
const service = new ForceLogoutService(pool);

// Force logout por email
const result = await service.forceLogoutByEmail(
    'usuario@email.com',
    'Razón',
    1
);

// Obtener sesiones activas
const sessions = await service.getActiveSessionsUsers();

// Obtener historial
const history = await service.getLogoutHistory(userId, 10);
```

**Métodos disponibles:**
- `forceLogoutByEmail()` → Promise<ForceLogoutResult>
- `forceLogoutByUserId()` → Promise<ForceLogoutResult>
- `getActiveTokenCount()` → Promise<number>
- `getActiveAuthTokenCount()` → Promise<number>
- `getLogoutHistory()` → Promise<LogoutHistoryEntry[]>
- `getActiveSessionsUsers()` → Promise<ActiveSession[]>
- `getUserInfo()` → Promise<UserInfo | null>

---

## 🚀 Pasos para Implementar

### Paso 1: Crear los SPs en la BD

**Opción A: SQL Server Management Studio**
```
1. Conectar a: localhost,4433
2. Seleccionar BD: viglobal
3. Abrir archivo: sp_ForceLogoutUser.sql
4. Ejecutar (F5)
```

**Opción B: Línea de comandos**
```bash
cd c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter
sqlcmd -S localhost,4433 -U sa -P 3232@lano -d viglobal -i sp_ForceLogoutUser.sql
```

**Verificación:**
```sql
SELECT * FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_NAME LIKE '%ForceLogout%';
```

---

### Paso 2: Implementar en tu código

#### En PHP (dev/index.php o similar):

```php
require_once 'ForceLogoutService.php';

// En tu ruta de admin
$app->post('/admin/force-logout', function($request, $response) {
    $data = $request->getParsedBody();
    $email = $data['email'] ?? null;
    $reason = $data['reason'] ?? null;
    $adminId = $_SESSION['user_id'] ?? null;
    
    $logoutService = new ForceLogoutService($conn);
    $result = $logoutService->forceLogoutByEmail($email, $reason, $adminId);
    
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($result['success'] ? 200 : 400)
        ->getBody()
        ->write(json_encode($result));
});
```

#### En Node.js/Express (server/routes.ts):

```typescript
import ForceLogoutService from './services/ForceLogoutService';

const logoutService = new ForceLogoutService(pool);

router.post('/admin/force-logout', async (req, res) => {
    const { email, reason } = req.body;
    const adminId = req.user?.id; // De tu autenticación
    
    const result = await logoutService.forceLogoutByEmail(email, reason, adminId);
    
    res.status(result.success ? 200 : 400).json(result);
});
```

---

### Paso 3: Probar

**Ejecutar tests automatizados:**

```sql
-- En SQL Server Management Studio
-- Abrir archivo: TEST_FORCE_LOGOUT.sql
-- Ejecutar (F5)
```

**Probar manualmente:**

```bash
# PHP
php analyze-force-logout.php

# Node.js (después de compilar TS)
node ForceLogoutService.js
```

---

## 🔄 Diagrama de Flujo

```
┌─ Request: Force Logout ─┐
│  (email o id, reason)   │
└────────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │ Validar Usuario     │
    │ (¿Existe?)          │
    └────────┬────────────┘
             │
        ┌────┴────┐
        │          │
       [NO]      [SÍ]
        │          │
        ▼          ▼
    [Error] ┌──────────────────────┐
           │ Iniciar Transacción   │
           └────────┬─────────────┘
                    │
                    ├─► Contar tokens
                    │
                    ├─► UPDATE UserTokens SET IsActive=0
                    │
                    ├─► UPDATE AuthTokens SET IsActive=0
                    │
                    ├─► INSERT UserTrail (Auditoría)
                    │
                    ├─► COMMIT
                    │
                    ▼
         ┌──────────────────────┐
         │ Return Success = 1   │
         │ with Details         │
         └──────────────────────┘
```

---

## 📊 Casos de Uso

### 1. Force Logout Urgente (Seguridad)
```sql
-- Usuario comprometido
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'hacker@email.com',
    @Reason = 'Cuenta comprometida - Logout de emergencia',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
```

### 2. Logout por Cambio de Contraseña
```sql
-- Backend ejecuta automáticamente después de cambio de pwd
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'usuario@email.com',
    @Reason = 'Nueva contraseña configurada - Requiere nueva autenticación',
    @AdminId = NULL,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
```

### 3. Logout por Revocación de Permisos
```sql
-- Admin revocó permisos del usuario
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'ex-empleado@email.com',
    @Reason = 'Permisos revocados - Acceso denegado',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
```

### 4. Dashboard de Sesiones Activas
```typescript
// Mostrar en dashboard de admin
const sessions = await logoutService.getActiveSessionsUsers();

// Retorna:
// [
//   { Id: 1, Email: 'admin@site.com', UserName: 'admin', ActiveTokens: 3 },
//   { Id: 5, Email: 'user@site.com', UserName: 'user', ActiveTokens: 1 }
// ]
```

### 5. Ver Historial de Logouts
```typescript
const history = await logoutService.getLogoutHistory(5, 20);

// Retorna últimos 20 force logouts del usuario 5
```

---

## 🛡️ Seguridad

**Lo que está implementado:**

✅ Validación de usuario (¿existe?)
✅ Validación de transacción (todo o nada)
✅ Auditoría completa (UserTrail)
✅ Manejo de errores
✅ Permisos en SP (ajustar según necesidad)

**Lo que DEBES implementar en tu código:**

⚠️ **Autenticación** - Verificar que es un admin
⚠️ **Autorización** - Solo admins pueden forzar logout
⚠️ **Rate Limiting** - Limitar intentos por IP
⚠️ **Logging** - Registrar en logs de seguridad
⚠️ **Validación** - Validar inputs en backend

**Ejemplo con Express:**

```typescript
// Middleware de autenticación
app.use((req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
});

// Middleware de autorización (solo admins)
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// Endpoint protegido
router.post('/admin/force-logout', requireAdmin, async (req, res) => {
    // ... implementación segura
});
```

---

## ✅ Checklist de Implementación

- [ ] 1. Ejecutar `sp_ForceLogoutUser.sql` en BD
- [ ] 2. Verificar SPs con `INFORMATION_SCHEMA.ROUTINES`
- [ ] 3. Ejecutar `TEST_FORCE_LOGOUT.sql` para validar
- [ ] 4. Copiar `ForceLogoutService.php` o `.ts` a tu proyecto
- [ ] 5. Implementar endpoints en tu API
- [ ] 6. Agregar middlewares de autenticación/autorización
- [ ] 7. Agregar rate limiting
- [ ] 8. Configurar logging
- [ ] 9. Probar en desarrollo
- [ ] 10. Documentar en tu README

---

## 📚 Archivos de Referencia Rápida

| Archivo | Propósito | Cuándo usarlo |
|---------|-----------|---------------|
| `sp_ForceLogoutUser.sql` | Crear SPs en BD | Primera vez (una sola vez) |
| `TEST_FORCE_LOGOUT.sql` | Validar funcionamiento | Después de crear SPs |
| `ForceLogoutService.php` | Usar en PHP | Si usas PHP en backend |
| `ForceLogoutService.ts` | Usar en Node.js | Si usas Node.js/Express |
| `SP_FORCELOGOUT_README.md` | Documentación completa | Cuando necesites más detalles |
| `FORCE_LOGOUT_GUIDE.md` | Guía de opciones | Para entender alternativas |

---

## 🔍 Verificación Rápida

### ¿Se crearon los SPs?
```sql
SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_NAME LIKE '%ForceLogout%';
-- Debe retornar 2 filas: sp_ForceLogoutUser, sp_ForceLogoutUserId
```

### ¿Funciona el SP?
```sql
DECLARE @Success BIT;
DECLARE @Message NVARCHAR(MAX);
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'test@email.com',
    @Reason = 'Test',
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
SELECT @Success as Success, @Message as Message;
```

### ¿Se registró en auditoría?
```sql
SELECT * FROM dbo.UserTrail 
WHERE Action = 'FORCE_LOGOUT' 
ORDER BY Timestamp DESC 
LIMIT 1;
```

---

## 🆘 Troubleshooting

| Problema | Solución |
|----------|----------|
| SP no encontrado | Ejecutar `sp_ForceLogoutUser.sql` en BD |
| Error de permisos | Otorgar GRANT EXECUTE al usuario |
| Tokens no se invalidan | Revisar si `IsActive` es INT o BIT |
| No aparece en UserTrail | Verificar que tabla existe: `SELECT * FROM dbo.UserTrail` |
| Connection failed (PHP) | Revisar credenciales en `ForceLogoutService.php` |

---

## 📞 Próximos Pasos

1. **Ejecutar SPs en BD** (`sp_ForceLogoutUser.sql`)
2. **Probar con TEST** (`TEST_FORCE_LOGOUT.sql`)
3. **Implementar en PHP o Node.js** (según tu stack)
4. **Agregar seguridad** (autenticación, autorización)
5. **Integrar en tu dashboard admin**
6. **Documentar en tu README**

---

**¡Listo para usar!** ✅

