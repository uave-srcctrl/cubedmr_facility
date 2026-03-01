-- ============================================================
-- ANÁLISIS FORCE LOGOUT - BD viglobal (localWoundcareDB)
-- ============================================================

-- ============================================================
-- 1. ESTRUCTURA DE LA TABLA Users
-- ============================================================
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    ORDINAL_POSITION
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Users'
ORDER BY ORDINAL_POSITION;
GO

-- ============================================================
-- 2. ESTRUCTURA DE LA TABLA UserTokens (Para sesiones)
-- ============================================================
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    ORDINAL_POSITION
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'UserTokens'
ORDER BY ORDINAL_POSITION;
GO

-- ============================================================
-- 3. ESTRUCTURA DE LA TABLA AuthTokens
-- ============================================================
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    ORDINAL_POSITION
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'AuthTokens'
ORDER BY ORDINAL_POSITION;
GO

-- ============================================================
-- 4. MUESTRA DE DATOS: Tabla Users (Primeras 10 filas)
-- ============================================================
SELECT TOP 10 * FROM dbo.Users;
GO

-- ============================================================
-- 5. MUESTRA DE DATOS: Tabla UserTokens (Primeras 10 filas)
-- ============================================================
SELECT TOP 10 * FROM dbo.UserTokens;
GO

-- ============================================================
-- 6. MUESTRA DE DATOS: Tabla AuthTokens (Primeras 10 filas)
-- ============================================================
SELECT TOP 10 * FROM dbo.AuthTokens;
GO

-- ============================================================
-- 7. USUARIOS CON SESIONES ACTIVAS
-- ============================================================
SELECT 
    u.*, 
    ut.* 
FROM dbo.Users u
LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId
WHERE ut.Id IS NOT NULL
ORDER BY u.Id;
GO

-- ============================================================
-- 8. CONTAR SESIONES POR USUARIO
-- ============================================================
SELECT 
    u.Id,
    u.Email,
    u.UserName,
    COUNT(ut.Id) as TokenCount
FROM dbo.Users u
LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId
GROUP BY u.Id, u.Email, u.UserName
HAVING COUNT(ut.Id) > 0
ORDER BY TokenCount DESC;
GO

-- ============================================================
-- 9. ESTRATEGIAS DE FORCE LOGOUT - OPCIÓN A
-- Invalidar tokens eliminándolos
-- ============================================================
/*
-- Buscar usuario específico
SELECT * FROM dbo.Users WHERE Email = 'usuario@email.com';

-- Obtener su ID
DECLARE @UserId INT = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com');

-- Eliminar todos sus tokens activos (Force Logout)
DELETE FROM dbo.UserTokens WHERE UserId = @UserId;
DELETE FROM dbo.AuthTokens WHERE UserId = @UserId;

-- Verificar que se eliminaron
SELECT COUNT(*) as TokensRemaining FROM dbo.UserTokens WHERE UserId = @UserId;
*/
GO

-- ============================================================
-- 10. ESTRATEGIAS DE FORCE LOGOUT - OPCIÓN B
-- Marcar tokens como expirados (si existe columna ExpiresAt)
-- ============================================================
/*
DECLARE @UserId INT = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com');

-- Forzar expiración de todos los tokens
UPDATE dbo.UserTokens 
SET ExpiresAt = GETDATE() - 1  -- Expirado hace 1 día
WHERE UserId = @UserId;

-- Verificar cambios
SELECT * FROM dbo.UserTokens WHERE UserId = @UserId;
*/
GO

-- ============================================================
-- 11. ÍNDICES Y CONSTRAINTS EN Users
-- ============================================================
SELECT 
    i.name AS IndexName,
    ic.column_id AS ColumnOrder,
    c.name AS ColumnName,
    i.type_desc AS IndexType
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE OBJECT_NAME(i.object_id) = 'Users'
ORDER BY i.name, ic.column_id;
GO

-- ============================================================
-- 12. ÍNDICES Y CONSTRAINTS EN UserTokens
-- ============================================================
SELECT 
    i.name AS IndexName,
    ic.column_id AS ColumnOrder,
    c.name AS ColumnName,
    i.type_desc AS IndexType
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE OBJECT_NAME(i.object_id) = 'UserTokens'
ORDER BY i.name, ic.column_id;
GO

-- ============================================================
-- 13. RELACIONES ENTRE TABLAS (Foreign Keys)
-- ============================================================
SELECT 
    OBJECT_NAME(fk.parent_object_id) AS TableName,
    c1.name AS ColumnName,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
    c2.name AS ReferencedColumn,
    fk.name AS ForeignKeyName
FROM sys.foreign_keys fk
INNER JOIN sys.columns c1 ON fk.parent_object_id = c1.object_id AND fk.parent_column_id = c1.column_id
INNER JOIN sys.columns c2 ON fk.referenced_object_id = c2.object_id AND fk.referenced_column_id = c2.column_id
WHERE OBJECT_NAME(fk.parent_object_id) IN ('Users', 'UserTokens', 'AuthTokens')
ORDER BY TableName;
GO

-- ============================================================
-- RESUMEN: OPCIONES DE IMPLEMENTACIÓN
-- ============================================================
/*
OPCIÓN 1: ELIMINAR TOKENS (Más agresivo)
---------
DELETE FROM dbo.UserTokens WHERE UserId = @UserId;
DELETE FROM dbo.AuthTokens WHERE UserId = @UserId;

✓ Pro: Fuerza logout inmediato
✗ Con: Pierde historial de sesiones

OPCIÓN 2: MARCAR COMO EXPIRADO (Más seguro)
---------
UPDATE dbo.UserTokens 
SET ExpiresAt = GETDATE() - 1 
WHERE UserId = @UserId;

✓ Pro: Mantiene historial, respeta lógica de expiración
✗ Con: Backend debe revisar ExpiresAt en cada request

OPCIÓN 3: MARCAR CON FLAG DE INVALIDACIÓN (Recomendado)
---------
-- Si existe columna IsActive o IsValid:
UPDATE dbo.UserTokens 
SET IsActive = 0 
WHERE UserId = @UserId;

✓ Pro: Flexible, reversible, mantiene historial
✗ Con: Requiere verificación en backend

OPCIÓN 4: USAR TABLA AUDIT/TRAIL
---------
-- Registrar logout forzado en UserTrail
INSERT INTO dbo.UserTrail (UserId, Action, Timestamp, Details)
VALUES (@UserId, 'FORCE_LOGOUT', GETDATE(), 'Sesiones invalidadas');

-- Luego aplicar una de las opciones anteriores

RECOMENDACIÓN:
===============
1. Ejecutar Query #1-3 para entender estructura completa
2. Ejecutar Query #7 para ver datos actuales
3. Ejecutar Query #11-12 para entender índices
4. Implementar Opción 3 o 4 (más robustas)
5. Ejecutar Query #13 para verificar relaciones
*/
