# Análisis de Force Logout - BD viglobal

## Contexto
- **Servidor**: localhost,4433
- **Base de Datos**: viglobal
- **Conexión**: localWoundcareDB
- **Tabla Principal**: dbo.Users
- **Tablas Relacionadas**: dbo.UserTokens, dbo.AuthTokens, dbo.UserTrail

---

## 1. Estructura de la Tabla `Users`

```sql
-- Columnas esperadas:
- Id (INT) - Clave primaria
- Email (VARCHAR/NVARCHAR)
- UserName (VARCHAR/NVARCHAR)
- Password (VARCHAR/NVARCHAR) - Hash
- IsActive (BIT) - Flag de actividad
- CreatedAt (DATETIME)
- LastLogin (DATETIME)
- ... otras columnas específicas
```

**Para verificar estructura exacta, ejecutar:**
```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Users' 
ORDER BY ORDINAL_POSITION;
```

---

## 2. Estructura de la Tabla `UserTokens`

```sql
-- Columnas esperadas:
- Id (INT) - Clave primaria
- UserId (INT) - Clave foránea a Users.Id
- Token (VARCHAR/NVARCHAR) - JWT o similar
- ExpiresAt (DATETIME) - Cuándo expira
- CreatedAt (DATETIME)
- IsActive (BIT) - Flag de validez
- RefreshToken (VARCHAR/NVARCHAR) - Token de refresh
- DeviceInfo (VARCHAR/NVARCHAR) - Información del dispositivo
```

**Para verificar estructura exacta, ejecutar:**
```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'UserTokens' 
ORDER BY ORDINAL_POSITION;
```

---

## 3. Tabla `AuthTokens`

```sql
-- Tabla para autenticación
- Id (INT) - Clave primaria
- UserId (INT) - Clave foránea
- Token (VARCHAR/NVARCHAR)
- ExpiresAt (DATETIME)
- Purpose (VARCHAR) - 'LOGIN', 'REFRESH', etc.
```

---

## 4. Tabla `UserTrail`

```sql
-- Auditoría de acciones de usuario
- Id (INT) - Clave primaria
- UserId (INT) - Clave foránea
- Action (VARCHAR) - Tipo de acción
- Timestamp (DATETIME)
- Details (VARCHAR/TEXT)
- IPAddress (VARCHAR)
```

---

## 5. Opciones de Implementación de Force Logout

### **OPCIÓN 1: Eliminar Tokens (Más Agresivo)**

```sql
-- Buscar usuario
DECLARE @UserId INT = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com');

-- Eliminar todos sus tokens
DELETE FROM dbo.UserTokens WHERE UserId = @UserId;
DELETE FROM dbo.AuthTokens WHERE UserId = @UserId;

-- Verificar
SELECT COUNT(*) FROM dbo.UserTokens WHERE UserId = @UserId;
```

**Ventajas:**
- ✅ Fuerza logout inmediato
- ✅ Simple de implementar
- ✅ No requiere columnas adicionales

**Desventajas:**
- ❌ Pierde historial de sesiones
- ❌ No es reversible
- ❌ Puede afectar dispositivos legítimos

---

### **OPCIÓN 2: Marcar como Expirado (Más Seguro)**

```sql
-- Si existe columna ExpiresAt
DECLARE @UserId INT = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com');

UPDATE dbo.UserTokens 
SET ExpiresAt = GETDATE() - 1  -- Fecha pasada
WHERE UserId = @UserId;

-- Verificar
SELECT * FROM dbo.UserTokens WHERE UserId = @UserId;
```

**Ventajas:**
- ✅ Mantiene historial completo
- ✅ Respeta lógica de expiración existente
- ✅ Reversible (cambiar ExpiresAt)

**Desventajas:**
- ❌ Backend debe revisar ExpiresAt en cada request
- ❌ Requiere sincronización de relojes
- ❌ Tokens permanecen en BD

---

### **OPCIÓN 3: Marcar con Flag (RECOMENDADO)**

```sql
-- Si existe columna IsActive o similar
DECLARE @UserId INT = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com');

UPDATE dbo.UserTokens 
SET IsActive = 0  -- O: Status = 'INVALID'
WHERE UserId = @UserId;

-- Verificar
SELECT * FROM dbo.UserTokens WHERE UserId = @UserId AND IsActive = 1;
```

**Ventajas:**
- ✅ Muy flexible y reversible
- ✅ Mantiene historial completo
- ✅ Fácil de auditar
- ✅ No requiere cambios de fecha
- ✅ Permite reactivar si es necesario

**Desventajas:**
- ⚠️ Requiere verificación en backend: `WHERE IsActive = 1`

---

### **OPCIÓN 4: Usar Tabla Audit + Invalidar (Robusta)**

```sql
-- Registrar action en UserTrail
DECLARE @UserId INT = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com');

INSERT INTO dbo.UserTrail (UserId, Action, Timestamp, Details)
VALUES (@UserId, 'FORCE_LOGOUT', GETDATE(), 'Force logout realizado por administrador');

-- Luego invalidar tokens
UPDATE dbo.UserTokens 
SET IsActive = 0 
WHERE UserId = @UserId;

-- O si prefieres, eliminar:
-- DELETE FROM dbo.UserTokens WHERE UserId = @UserId;

-- Verificar
SELECT * FROM dbo.UserTrail WHERE UserId = @UserId ORDER BY Timestamp DESC;
```

**Ventajas:**
- ✅ Auditoría completa
- ✅ Rastreable para compliance
- ✅ Flexible con Opción 2 o 3
- ✅ Demuestra cuándo/quién hizo logout

**Desventajas:**
- ⚠️ Más pasos en la ejecución

---

## 6. Procedimiento Almacenado (Recomendado)

Para automatizar, crear un stored procedure:

```sql
CREATE PROCEDURE dbo.sp_ForceLogoutUser
    @Email NVARCHAR(255),
    @Reason NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UserId INT;
    DECLARE @Timestamp DATETIME = GETDATE();
    
    -- Obtener UserId
    SELECT @UserId = Id FROM dbo.Users WHERE Email = @Email;
    
    IF @UserId IS NULL
    BEGIN
        RAISERROR('Usuario no encontrado', 16, 1);
        RETURN;
    END
    
    BEGIN TRANSACTION;
    
    TRY
        -- Registrar en auditoría
        INSERT INTO dbo.UserTrail (UserId, Action, Timestamp, Details)
        VALUES (@UserId, 'FORCE_LOGOUT', @Timestamp, @Reason);
        
        -- Opción A: Eliminar tokens
        -- DELETE FROM dbo.UserTokens WHERE UserId = @UserId;
        -- DELETE FROM dbo.AuthTokens WHERE UserId = @UserId;
        
        -- Opción B: Marcar como inactivos (Recomendado)
        UPDATE dbo.UserTokens 
        SET IsActive = 0 
        WHERE UserId = @UserId;
        
        UPDATE dbo.AuthTokens 
        SET IsActive = 0 
        WHERE UserId = @UserId;
        
        COMMIT TRANSACTION;
        
        PRINT 'Force logout completado para: ' + @Email;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        PRINT 'Error: ' + ERROR_MESSAGE();
    END CATCH
END;
GO

-- Uso:
EXEC dbo.sp_ForceLogoutUser @Email = 'usuario@email.com', @Reason = 'Admin requested';
```

---

## 7. Implementación en Código Backend

### **PHP**

```php
class UserService {
    
    public function forceLogout($email) {
        $userId = $this->getUserIdByEmail($email);
        
        if (!$userId) {
            throw new Exception('Usuario no encontrado');
        }
        
        // Opción 1: Usar stored procedure
        $sql = "EXEC dbo.sp_ForceLogoutUser @Email = ?";
        
        // Opción 2: Queries directas
        $sql = "UPDATE dbo.UserTokens SET IsActive = 0 WHERE UserId = ?";
        sqlsrv_query($this->conn, $sql, [$userId]);
        
        $sql = "UPDATE dbo.AuthTokens SET IsActive = 0 WHERE UserId = ?";
        sqlsrv_query($this->conn, $sql, [$userId]);
        
        return true;
    }
    
    public function validateToken($token) {
        $sql = "SELECT * FROM dbo.UserTokens 
                WHERE Token = ? AND IsActive = 1 
                AND ExpiresAt > GETDATE()";
        
        return sqlsrv_query($this->conn, $sql, [$token]);
    }
}
```

### **Node.js / Express**

```typescript
app.post('/api/admin/force-logout', async (req, res) => {
    const { email } = req.body;
    
    try {
        // Opción 1: Usar stored procedure
        await pool.request()
            .input('Email', sql.NVarChar, email)
            .execute('sp_ForceLogoutUser');
        
        // Opción 2: Queries directas
        await pool.request()
            .input('Email', sql.NVarChar, email)
            .query(`
                UPDATE dbo.UserTokens 
                SET IsActive = 0 
                WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = @Email)
            `);
        
        res.json({ success: true, message: 'Usuario desconectado forzosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## 8. Verificación Post-Logout

```sql
-- Verificar que el usuario no tiene tokens activos
DECLARE @UserId INT = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com');

SELECT COUNT(*) as ActiveTokens 
FROM dbo.UserTokens 
WHERE UserId = @UserId AND IsActive = 1;

-- Si devuelve 0, el logout fue exitoso
```

---

## 9. Resumen de Recomendación

**Se recomienda OPCIÓN 3 o 4 por:**

1. ✅ **Opción 3**: Simple, reversible, mantiene historial
   - Ideal para: Casos normales de force logout
   - Query: `UPDATE dbo.UserTokens SET IsActive = 0 WHERE UserId = ?`

2. ✅ **Opción 4**: Auditoría completa + reversibilidad
   - Ideal para: Entornos regulados, compliance
   - Query: `EXEC sp_ForceLogoutUser @Email = ?`

**NO recomendada:**
- ❌ **Opción 1**: Demasiado agresiva, pierde historial
- ⚠️ **Opción 2**: Requiere sincronización de fechas

---

## 10. Próximos Pasos

1. **Ejecutar análisis SQL**: Verificar estructura exacta de tablas
2. **Identificar columnas**: Confirmar existencia de `IsActive`, `ExpiresAt`
3. **Crear stored procedure**: Implementar `sp_ForceLogoutUser`
4. **Actualizar backend**: Agregar validación de `IsActive = 1` en middleware
5. **Implementar endpoint**: `/api/admin/force-logout` o similar
6. **Auditar**: Registrar todos los force logouts en `UserTrail`

---

## 11. Archivos de Referencia

- `FORCE_LOGOUT_ANALYSIS.sql` - Queries SQL completas
- `analyze-force-logout.php` - Script PHP de análisis
- Este documento: Guía de implementación

