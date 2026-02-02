# Force Logout por Email - Guía Rápida

## 🎯 4 Formas de Hacer Force Logout

### ✅ OPCIÓN 1: Usar Stored Procedure (RECOMENDADO)

**Lo más simple y seguro:**

```sql
DECLARE @Success BIT;
DECLARE @Message NVARCHAR(MAX);

EXEC dbo.sp_ForceLogoutUser 
    @Email = 'usuario@email.com',      -- Email del usuario
    @Reason = 'Razón del logout',      -- Razón (opcional)
    @AdminId = 1,                      -- ID del admin (opcional)
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;

SELECT @Success as Success, @Message as Message;
```

**Resultado esperado:**
```
Success: 1
Message: Force logout completado para usuario@email.com | Tokens invalidados: 2 | Auth tokens invalidados: 1
```

**Ventajas:**
- ✅ Validación automática
- ✅ Transacciones atómicas
- ✅ Auditoría automática
- ✅ Manejo de errores
- ✅ Más seguro

---

### OPCIÓN 2: Queries Directas (SQL Puro)

**Si prefieres control total:**

```sql
-- PASO 1: Obtener el UserId
DECLARE @UserId INT;
SELECT @UserId = Id 
FROM dbo.Users 
WHERE Email = 'usuario@email.com';

-- PASO 2: Verificar que existe
IF @UserId IS NULL
BEGIN
    PRINT 'ERROR: Usuario no encontrado';
END
ELSE
BEGIN
    -- PASO 3: Invalidar tokens
    BEGIN TRANSACTION;
    
    UPDATE dbo.UserTokens 
    SET IsActive = 0, ExpiresAt = GETDATE()
    WHERE UserId = @UserId AND IsActive = 1;
    
    UPDATE dbo.AuthTokens 
    SET IsActive = 0, ExpiresAt = GETDATE()
    WHERE UserId = @UserId AND IsActive = 1;
    
    -- PASO 4: Registrar en auditoría
    INSERT INTO dbo.UserTrail (UserId, Action, Timestamp, Details)
    VALUES (@UserId, 'FORCE_LOGOUT', GETDATE(), 'Admin forced logout');
    
    COMMIT TRANSACTION;
    PRINT 'Force logout completado';
END
```

**Ventajas:**
- ✅ Control total
- ✅ Sin dependencias de SP

**Desventajas:**
- ❌ Más líneas de código
- ❌ Más probabilidad de errores

---

### OPCIÓN 3: Ver Información ANTES de Logout

**Para verificar antes de actuar:**

```sql
-- Ver usuario y sus tokens activos
SELECT 
    u.Id,
    u.Email,
    u.UserName,
    COUNT(ut.Id) as TokensActivos,
    MAX(ut.CreatedAt) as UltimoLogin
FROM dbo.Users u
LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1
WHERE u.Email = 'usuario@email.com'
GROUP BY u.Id, u.Email, u.UserName;

-- Ver detalles de los tokens
SELECT TOP 10
    Token,
    IsActive,
    CreatedAt,
    ExpiresAt,
    'UserTokens' as Tabla
FROM dbo.UserTokens
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com')

UNION ALL

SELECT TOP 10
    Token,
    IsActive,
    CreatedAt,
    ExpiresAt,
    'AuthTokens'
FROM dbo.AuthTokens
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com');
```

---

### OPCIÓN 4: Verificar DESPUÉS del Logout

**Para confirmar que fue exitoso:**

```sql
-- Contar tokens activos (debe ser 0)
SELECT 
    COUNT(*) as TokensActivos
FROM dbo.UserTokens
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com')
  AND IsActive = 1;

-- Ver historial de logouts
SELECT TOP 10
    Timestamp,
    Action,
    Details
FROM dbo.UserTrail
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com')
  AND Action = 'FORCE_LOGOUT'
ORDER BY Timestamp DESC;
```

---

## 📋 Ejemplos Listos para Copiar

### Ejemplo 1: Usuario específico con razón
```sql
DECLARE @Success BIT, @Message NVARCHAR(MAX);
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'drperez@curisec.com',
    @Reason = 'Cuenta comprometida - Logout de emergencia',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
SELECT @Success, @Message;
```

### Ejemplo 2: Sin especificar razón
```sql
DECLARE @Success BIT, @Message NVARCHAR(MAX);
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'admin@site.com',
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
SELECT @Success, @Message;
```

### Ejemplo 3: Cambio de contraseña
```sql
DECLARE @Success BIT, @Message NVARCHAR(MAX);
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'usuario@email.com',
    @Reason = 'Nueva contraseña configurada - Requiere nueva autenticación',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
SELECT @Success, @Message;
```

### Ejemplo 4: Múltiples usuarios
```sql
DECLARE @Success BIT, @Message NVARCHAR(MAX);

-- Usuario 1
EXEC dbo.sp_ForceLogoutUser @Email = 'user1@email.com', @Reason = 'Batch logout',
    @Success = @Success OUTPUT, @Message = @Message OUTPUT;
PRINT 'User 1: ' + @Message;

-- Usuario 2
EXEC dbo.sp_ForceLogoutUser @Email = 'user2@email.com', @Reason = 'Batch logout',
    @Success = @Success OUTPUT, @Message = @Message OUTPUT;
PRINT 'User 2: ' + @Message;

-- Usuario 3
EXEC dbo.sp_ForceLogoutUser @Email = 'user3@email.com', @Reason = 'Batch logout',
    @Success = @Success OUTPUT, @Message = @Message OUTPUT;
PRINT 'User 3: ' + @Message;
```

---

## 🔍 Comandos Útiles

### Ver todos los usuarios con sesiones activas
```sql
SELECT 
    u.Id,
    u.Email,
    u.UserName,
    COUNT(ut.Id) as TokensActivos
FROM dbo.Users u
LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1
GROUP BY u.Id, u.Email, u.UserName
HAVING COUNT(ut.Id) > 0
ORDER BY COUNT(ut.Id) DESC;
```

### Ver historial de force logouts (últimos 7 días)
```sql
SELECT 
    u.Email,
    ut.Timestamp,
    ut.Details,
    COUNT(*) as Logouts
FROM dbo.UserTrail ut
INNER JOIN dbo.Users u ON ut.UserId = u.Id
WHERE ut.Action = 'FORCE_LOGOUT'
  AND ut.Timestamp > DATEADD(DAY, -7, GETDATE())
GROUP BY u.Email, ut.Timestamp, ut.Details
ORDER BY ut.Timestamp DESC;
```

### Buscar usuario por email (con patrones)
```sql
SELECT 
    Id,
    Email,
    UserName
FROM dbo.Users
WHERE Email LIKE '%gmail%' 
   OR Email LIKE '%hotmail%'
   OR Email LIKE '%empresa%'
ORDER BY Email;
```

### Ver estadísticas de logouts
```sql
SELECT 
    'Total Logouts' as Metrica,
    COUNT(*) as Valor,
    DATEADD(DAY, -7, GETDATE()) as DesdeHace
FROM dbo.UserTrail
WHERE Action = 'FORCE_LOGOUT' 
  AND Timestamp > DATEADD(DAY, -7, GETDATE());
```

---

## ⚠️ Casos Especiales

### ¿Qué pasa si el email no existe?
```sql
DECLARE @Success BIT, @Message NVARCHAR(MAX);
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'inexistente@email.com',
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;

-- Retorna:
-- Success: 0
-- Message: Error: Usuario no encontrado (inexistente@email.com)
```

### ¿Qué pasa si el usuario no tiene sesiones?
```sql
-- El SP sigue funcionando, retorna:
-- Message: Force logout completado | Tokens invalidados: 0
```

### ¿Es reversible?
✅ Sí, se puede reactivar manualmente:
```sql
UPDATE dbo.UserTokens 
SET IsActive = 1 
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com')
  AND IsActive = 0;
```

---

## 🚀 Paso a Paso Completo

**1. Abre SQL Server Management Studio**

**2. Conecta a:**
```
Server: localhost,4433
Database: viglobal
User: sa
Password: 3232@lano
```

**3. Ejecuta esta query:**
```sql
DECLARE @Success BIT;
DECLARE @Message NVARCHAR(MAX);

EXEC dbo.sp_ForceLogoutUser 
    @Email = 'usuario@email.com',  -- ← CAMBIAR AQUÍ
    @Reason = 'Admin forced logout',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;

SELECT @Success as Success, @Message as Message;
```

**4. Presiona F5 o ejecuta**

**5. Ver resultado en ventana de resultados**

---

## ✅ Verificación

**Verificar que funcionó:**
```sql
-- Debe retornar 0 (sin tokens activos)
SELECT COUNT(*) as TokensActivos
FROM dbo.UserTokens
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com')
  AND IsActive = 1;
```

**Ver registro en auditoría:**
```sql
-- Debe mostrar el logout registrado
SELECT * FROM dbo.UserTrail 
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com')
  AND Action = 'FORCE_LOGOUT'
ORDER BY Timestamp DESC;
```

---

## 📞 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "Stored procedure not found" | SP no existe | Ejecutar `sp_ForceLogoutUser.sql` en BD |
| "Invalid object name 'dbo.Users'" | Tabla no existe | Verificar que está en BD viglobal |
| Success=0, Message="Usuario no encontrado" | Email incorrecto | Verificar ortografía del email |
| No cambia nada | Ya tiene IsActive=0 | Normal, ya estaba desconectado |

---

## 💾 Archivo Completo

Todos estos ejemplos están en: `FORCE_LOGOUT_QUERY_BY_EMAIL.sql`

Puedes copiar y pegar directamente en SQL Server Management Studio.

