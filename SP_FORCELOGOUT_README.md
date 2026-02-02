# Stored Procedure: Force Logout User

## 📋 Resumen

Sistema completo para forzar el logout de usuarios en la BD `viglobal`. Incluye:

- ✅ Stored Procedure: `sp_ForceLogoutUser` (por email)
- ✅ Stored Procedure: `sp_ForceLogoutUserId` (por ID)
- ✅ Funciones SQL: `fn_GetActiveTokenCount`, `fn_GetActiveAuthTokenCount`
- ✅ Servicio PHP: `ForceLogoutService`
- ✅ Servicio TypeScript/Node.js: `ForceLogoutService`
- ✅ Endpoints Express listos para usar

---

## 🚀 Instalación

### Paso 1: Crear Stored Procedures en BD

**Ejecutar en SQL Server Management Studio:**

```sql
-- Conectar a BD: viglobal
USE viglobal;
GO

-- Ejecutar el script
-- Archivo: sp_ForceLogoutUser.sql
```

O directamente:

```bash
# Desde cmd (en directorio del proyecto)
sqlcmd -S localhost,4433 -U sa -P 3232@lano -d viglobal -i sp_ForceLogoutUser.sql
```

**Verificación:**

```sql
-- Verificar que se crearon correctamente
SELECT ROUTINE_NAME, ROUTINE_TYPE 
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_SCHEMA = 'dbo' 
AND ROUTINE_NAME LIKE '%ForceLogout%' OR ROUTINE_NAME LIKE '%ActiveToken%';
```

### Paso 2: Implementar en PHP (Opcional)

**Copiar archivo:**
```
ForceLogoutService.php → /api/dev/services/
```

**Uso en PHP:**
```php
require_once 'ForceLogoutService.php';

$logoutService = new ForceLogoutService($conn);

// Force logout por email
$result = $logoutService->forceLogoutByEmail(
    'usuario@email.com',
    'Razón del logout',
    1  // Admin ID
);

if ($result['success']) {
    echo "Logout exitoso: " . $result['message'];
} else {
    echo "Error: " . $result['message'];
}
```

### Paso 3: Implementar en Node.js/Express (Opcional)

**Copiar archivo:**
```
ForceLogoutService.ts → /server/services/
```

**Compilar TypeScript:**
```bash
tsc ForceLogoutService.ts
```

**Usar en Express:**
```typescript
import ForceLogoutService from './services/ForceLogoutService';

const logoutService = new ForceLogoutService(pool);

app.post('/api/admin/force-logout', async (req, res) => {
    const { email, reason, adminId } = req.body;
    
    const result = await logoutService.forceLogoutByEmail(email, reason, adminId);
    
    res.json(result);
});
```

---

## 📚 API Reference

### Stored Procedure: `sp_ForceLogoutUser`

**Parámetros:**

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|------------|-------------|
| @Email | NVARCHAR(255) | ✅ | Email del usuario |
| @Reason | NVARCHAR(MAX) | ❌ | Razón del logout |
| @AdminId | INT | ❌ | ID del administrador |
| @Success | BIT OUTPUT | ✅ | Resultado (0=error, 1=éxito) |
| @Message | NVARCHAR(MAX) OUTPUT | ✅ | Mensaje de resultado |

**Ejemplo:**

```sql
DECLARE @Success BIT;
DECLARE @Message NVARCHAR(MAX);

EXEC dbo.sp_ForceLogoutUser 
    @Email = 'usuario@email.com',
    @Reason = 'Actividad sospechosa detectada',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;

SELECT @Success as Success, @Message as Message;
```

**Salida esperada:**

```
Success: 1
Message: Force logout completado para usuario@email.com | Tokens invalidados: 2 | Auth tokens invalidados: 1
```

---

### Stored Procedure: `sp_ForceLogoutUserId`

**Parámetros:**

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|------------|-------------|
| @UserId | INT | ✅ | ID del usuario |
| @Reason | NVARCHAR(MAX) | ❌ | Razón del logout |
| @AdminId | INT | ❌ | ID del administrador |
| @Success | BIT OUTPUT | ✅ | Resultado |
| @Message | NVARCHAR(MAX) OUTPUT | ✅ | Mensaje de resultado |

**Ejemplo:**

```sql
EXEC dbo.sp_ForceLogoutUserId 
    @UserId = 5,
    @Reason = 'Cambio de contraseña realizado',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
```

---

### Función: `fn_GetActiveTokenCount`

**Parámetro:**
- @UserId (INT)

**Retorna:** INT - Cantidad de tokens activos

**Ejemplo:**

```sql
SELECT dbo.fn_GetActiveTokenCount(5) as ActiveTokens;
-- Retorna: 2
```

---

### Función: `fn_GetActiveAuthTokenCount`

**Parámetro:**
- @UserId (INT)

**Retorna:** INT - Cantidad de auth tokens activos

**Ejemplo:**

```sql
SELECT dbo.fn_GetActiveAuthTokenCount(5) as ActiveAuthTokens;
-- Retorna: 1
```

---

## 🔧 Servicio PHP

### Clase: `ForceLogoutService`

#### Constructor

```php
$service = new ForceLogoutService($connection);
```

#### Métodos

##### `forceLogoutByEmail()`

```php
$result = $service->forceLogoutByEmail(
    'usuario@email.com',
    'Razón del logout',
    1  // adminId
);

// Retorna:
// [
//     'success' => true|false,
//     'message' => 'Descripción del resultado'
// ]
```

##### `forceLogoutByUserId()`

```php
$result = $service->forceLogoutByUserId(
    5,  // userId
    'Razón',
    1   // adminId
);
```

##### `getActiveTokenCount()`

```php
$count = $service->getActiveTokenCount(5);
// Retorna: int
```

##### `getActiveAuthTokenCount()`

```php
$count = $service->getActiveAuthTokenCount(5);
// Retorna: int
```

##### `getLogoutHistory()`

```php
$history = $service->getLogoutHistory(
    5,   // userId
    10   // limit
);

// Retorna array de:
// [
//     'Id' => int,
//     'Email' => string,
//     'Timestamp' => datetime,
//     'Action' => 'FORCE_LOGOUT',
//     'Details' => string
// ]
```

##### `getActiveSessionsUsers()`

```php
$sessions = $service->getActiveSessionsUsers();

// Retorna array de:
// [
//     'Id' => int,
//     'Email' => string,
//     'UserName' => string,
//     'ActiveTokens' => int
// ]
```

---

## 🔧 Servicio TypeScript/Node.js

### Clase: `ForceLogoutService`

#### Constructor

```typescript
import ForceLogoutService from './ForceLogoutService';

const service = new ForceLogoutService(pool);
```

#### Métodos (Async)

##### `forceLogoutByEmail()`

```typescript
const result = await service.forceLogoutByEmail(
    'usuario@email.com',
    'Razón del logout',
    1  // adminId
);

// Retorna:
// {
//     success: boolean,
//     message: string,
//     tokensInvalidated?: number
// }
```

##### `forceLogoutByUserId()`

```typescript
const result = await service.forceLogoutByUserId(5, 'Razón', 1);
```

##### `getActiveTokenCount()`

```typescript
const count = await service.getActiveTokenCount(5);
// Retorna: number
```

##### `getActiveSessionsUsers()`

```typescript
const sessions = await service.getActiveSessionsUsers();

// Retorna:
// [
//     {
//         Id: number,
//         Email: string,
//         UserName: string,
//         ActiveTokens: number
//     },
//     ...
// ]
```

---

## 🌐 Endpoints Express (Ejemplos)

### POST /api/admin/force-logout

**Request:**

```json
{
    "email": "usuario@email.com",
    "reason": "Actividad sospechosa",
    "adminId": 1
}
```

**Response (Success):**

```json
{
    "success": true,
    "message": "Force logout completado...",
    "user": {
        "id": 5,
        "email": "usuario@email.com"
    }
}
```

**Response (Error):**

```json
{
    "success": false,
    "message": "Usuario no encontrado"
}
```

---

### GET /api/admin/active-sessions

**Response:**

```json
{
    "success": true,
    "count": 3,
    "data": [
        {
            "Id": 1,
            "Email": "admin@email.com",
            "UserName": "admin",
            "ActiveTokens": 5
        },
        {
            "Id": 2,
            "Email": "user@email.com",
            "UserName": "user",
            "ActiveTokens": 2
        }
    ]
}
```

---

### GET /api/admin/logout-history/:userId

**Response:**

```json
{
    "success": true,
    "data": [
        {
            "Id": 5,
            "Email": "usuario@email.com",
            "Timestamp": "2026-02-01T14:30:00.000Z",
            "Action": "FORCE_LOGOUT",
            "Details": "Razón: Actividad sospechosa | Tokens: 2 | Auth tokens: 1"
        }
    ]
}
```

---

### GET /api/admin/user-tokens/:userId

**Response:**

```json
{
    "success": true,
    "data": {
        "userId": 5,
        "activeTokens": 2,
        "activeAuthTokens": 1
    }
}
```

---

## 🔍 Verificación

### Verificar que el logout fue exitoso

```sql
-- Contar tokens activos después del logout
SELECT COUNT(*) as ActiveTokens
FROM dbo.UserTokens 
WHERE UserId = 5 AND IsActive = 1;

-- Debe retornar: 0
```

### Ver historial de logouts

```sql
SELECT TOP 10
    u.Email,
    ut.Timestamp,
    ut.Details
FROM dbo.UserTrail ut
INNER JOIN dbo.Users u ON ut.UserId = u.Id
WHERE ut.Action = 'FORCE_LOGOUT'
ORDER BY ut.Timestamp DESC;
```

### Ver qué tokens se invalidaron

```sql
SELECT TOP 10
    ut.Id,
    ut.UserId,
    ut.Token,
    ut.IsActive,
    ut.ExpiresAt
FROM dbo.UserTokens ut
WHERE ut.UserId = 5
ORDER BY ut.ExpiresAt DESC;
```

---

## 📊 Diagrama de Flujo

```
┌─────────────────────┐
│  Solicitud Logout   │
│  (Email o ID)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  sp_ForceLogoutUser / UserId        │
│  (Stored Procedure)                 │
└──────────┬──────────────────────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ▼                                     ▼
    ┌────────────────┐           ┌──────────────────────┐
    │ Validar Usuario│           │ Validar Usuario      │
    │  (Existe?)     │           │ (Por ID / Email)     │
    └────────┬───────┘           └─────────┬────────────┘
             │                             │
        [NO] ├─► Error ─────────────────────┤ [NO]
             │                             │
        [SÍ] ▼                        [SÍ] ▼
    ┌─────────────────────────────────────────────┐
    │  Iniciar Transacción                        │
    └──────────┬──────────────────────────────────┘
               │
               ├─► Contar tokens activos
               │
               ├─► UPDATE UserTokens SET IsActive = 0
               │
               ├─► UPDATE AuthTokens SET IsActive = 0
               │
               ├─► INSERT en UserTrail (Auditoría)
               │
               ├─► COMMIT Transaction
               │
               ▼
    ┌─────────────────────────────────────────────┐
    │  Retornar: Success = 1, Message = Detalles  │
    └─────────────────────────────────────────────┘
```

---

## 🛡️ Seguridad

### Implementar en Backend

Asegúrate de:

1. ✅ **Autenticación**: Solo admins pueden forzar logout
2. ✅ **Auditoría**: Registrar quién ejecutó el logout (AdminId)
3. ✅ **Validación**: Verificar que el usuario existe
4. ✅ **Transacciones**: Atomic operations (éxito total o rollback)
5. ✅ **Logging**: Registrar en historial/logs

### Ejemplo con middleware de autorización

```typescript
app.post('/api/admin/force-logout', 
    authenticateToken,      // Verificar autenticación
    authorizeAdmin,         // Verificar permisos admin
    async (req, res) => {
        // ... implementación
    }
);
```

---

## 📝 Notas

- Los tokens se marcan como `IsActive = 0` (no se eliminan, se preserva historial)
- El campo `ExpiresAt` se establece al timestamp actual para forzar vencimiento inmediato
- Todos los cambios se registran en `UserTrail` para auditoría
- La transacción se revierte si hay cualquier error
- Es completamente reversible (en caso necesario, cambiar `IsActive = 1`)

---

## 🐛 Troubleshooting

### Error: "Stored procedure not found"

```sql
-- Verificar que se creó correctamente
SELECT * FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_NAME = 'sp_ForceLogoutUser';
```

### Error: "Connection failed"

```php
// Verificar credenciales
$connectionInfo = [
    "Database" => "viglobal",
    "UID" => "sa",
    "PWD" => "3232@lano",
    "TrustServerCertificate" => true,
];
```

### Error: "User does not have permission"

```sql
-- Otorgar permisos al usuario sa
GRANT EXECUTE ON dbo.sp_ForceLogoutUser TO [sa];
GRANT EXECUTE ON dbo.sp_ForceLogoutUserId TO [sa];
```

---

## 📞 Soporte

Para preguntas o problemas:

1. Revisar logs en `UserTrail`
2. Ejecutar queries de verificación
3. Consultar archivo `FORCE_LOGOUT_GUIDE.md`

---

## 📄 Archivos

- `sp_ForceLogoutUser.sql` - Stored Procedures y funciones
- `ForceLogoutService.php` - Servicio PHP
- `ForceLogoutService.ts` - Servicio TypeScript/Node.js
- `FORCE_LOGOUT_GUIDE.md` - Guía detallada
- `FORCE_LOGOUT_ANALYSIS.sql` - Análisis y queries adicionales
- `SP_FORCELOGOUT_README.md` - Este archivo

