-- ============================================================
-- VERIFICAR Y LIMPIAR SESIONES EN BD curisec
-- ============================================================
-- Ejecuta estas queries en SQL Server Management Studio
-- conectándote a la BD: curisec (localhost,4433)

-- ============================================================
-- 1. LISTAR TODAS LAS TABLAS EN LA BD
-- ============================================================
SELECT 
    TABLE_NAME,
    TABLE_SCHEMA
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_SCHEMA, TABLE_NAME;
GO

-- ============================================================
-- 2. BUSCAR TABLAS CON COLUMNA 'email'
-- ============================================================
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME IN ('email', 'EmailAddress', 'Email')
ORDER BY TABLE_NAME;
GO

-- ============================================================
-- 3. BUSCAR TABLAS RELACIONADAS CON USUARIOS/SESIONES
-- ============================================================
SELECT 
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%user%' 
    OR TABLE_NAME LIKE '%session%'
    OR TABLE_NAME LIKE '%device%'
    OR TABLE_NAME LIKE '%auth%'
    OR TABLE_NAME LIKE '%login%'
    OR TABLE_NAME LIKE '%credential%')
ORDER BY TABLE_NAME;
GO

-- ============================================================
-- 4. BUSCAR SESIONES DE drperez@curisec.com EN TODAS LAS TABLAS
-- ============================================================
-- Buscar en tabla 'users'
SELECT 'users' as TableName, COUNT(*) as Records 
FROM users WHERE email = 'drperez@curisec.com' OR email LIKE 'drperez%';
GO

-- Buscar en tabla 'user_sessions'
IF OBJECT_ID('user_sessions', 'U') IS NOT NULL
BEGIN
    SELECT TOP 10 * FROM user_sessions WHERE email = 'drperez@curisec.com' OR email LIKE 'drperez%';
END
GO

-- Buscar en tabla 'user_devices'
IF OBJECT_ID('user_devices', 'U') IS NOT NULL
BEGIN
    SELECT TOP 10 * FROM user_devices WHERE email = 'drperez@curisec.com' OR email LIKE 'drperez%';
END
GO

-- Buscar en tabla 'user_authentication'
IF OBJECT_ID('user_authentication', 'U') IS NOT NULL
BEGIN
    SELECT TOP 10 * FROM user_authentication WHERE email = 'drperez@curisec.com' OR email LIKE 'drperez%';
END
GO

-- Buscar en tabla 'user_logins'
IF OBJECT_ID('user_logins', 'U') IS NOT NULL
BEGIN
    SELECT TOP 10 * FROM user_logins WHERE email = 'drperez@curisec.com' OR email LIKE 'drperez%';
END
GO

-- ============================================================
-- 5. VER ESTRUCTURA DE TABLA 'users'
-- ============================================================
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users'
ORDER BY ORDINAL_POSITION;
GO

-- ============================================================
-- 6. LISTAR TODOS LOS USUARIOS EN BD
-- ============================================================
SELECT 
    email,
    COUNT(*) as count
FROM users
GROUP BY email
ORDER BY email;
GO

-- ============================================================
-- 7. LIMPIAR SESIONES DE drperez@curisec.com
-- ============================================================
-- OPCIÓN A: Eliminar registros completamente
/*
DELETE FROM user_sessions WHERE email = 'drperez@curisec.com';
DELETE FROM user_devices WHERE email = 'drperez@curisec.com';
DELETE FROM user_authentication WHERE email = 'drperez@curisec.com';
*/

-- OPCIÓN B: Marcar como logout (si tienes columna de estado)
/*
UPDATE user_sessions 
SET status = 'inactive', logout_date = GETDATE()
WHERE email = 'drperez@curisec.com';

UPDATE user_devices 
SET is_active = 0
WHERE email = 'drperez@curisec.com';
*/

-- ============================================================
-- 8. VERIFICAR DESPUÉS DE LIMPIAR
-- ============================================================
/*
SELECT COUNT(*) FROM user_sessions WHERE email = 'drperez@curisec.com';
SELECT COUNT(*) FROM user_devices WHERE email = 'drperez@curisec.com';
SELECT COUNT(*) FROM user_authentication WHERE email = 'drperez@curisec.com';
*/
