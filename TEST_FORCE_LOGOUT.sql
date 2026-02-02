-- ============================================================
-- TEST: Force Logout User
-- BD: viglobal
-- Ejecutar estos tests en SQL Server Management Studio
-- ============================================================

USE viglobal;
GO

-- ============================================================
-- TEST 1: Verificar que los SPs y funciones existen
-- ============================================================
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 1: Verificar objetos creados';
PRINT '═══════════════════════════════════════════════════════════';

SELECT 
    ROUTINE_NAME,
    ROUTINE_TYPE,
    CREATED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'dbo' 
  AND (ROUTINE_NAME LIKE '%ForceLogout%' 
       OR ROUTINE_NAME LIKE '%ActiveToken%')
ORDER BY ROUTINE_NAME;

-- ============================================================
-- TEST 2: Obtener estadísticas de usuarios y sesiones
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 2: Estadísticas actuales';
PRINT '═══════════════════════════════════════════════════════════';

SELECT 
    'Total Usuarios' as Metrica,
    COUNT(*) as Valor
FROM dbo.Users

UNION ALL

SELECT 
    'Total Tokens Activos',
    COUNT(*)
FROM dbo.UserTokens
WHERE IsActive = 1

UNION ALL

SELECT 
    'Usuarios con Sesiones',
    COUNT(DISTINCT UserId)
FROM dbo.UserTokens
WHERE IsActive = 1;

-- ============================================================
-- TEST 3: Listar usuarios con sesiones activas
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 3: Usuarios con sesiones activas (ANTES)';
PRINT '═══════════════════════════════════════════════════════════';

SELECT TOP 10
    u.Id,
    u.Email,
    u.UserName,
    COUNT(ut.Id) as TokensActivos,
    MAX(ut.ExpiresAt) as TokenExpira
FROM dbo.Users u
LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1
GROUP BY u.Id, u.Email, u.UserName
HAVING COUNT(ut.Id) > 0
ORDER BY COUNT(ut.Id) DESC;

-- ============================================================
-- TEST 4: Elegir un usuario y hacer force logout
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 4: Ejecutar Force Logout';
PRINT '═══════════════════════════════════════════════════════════';

-- OPCIÓN A: Logout por el primer usuario con sesiones
DECLARE @Email NVARCHAR(255);
DECLARE @Success BIT;
DECLARE @Message NVARCHAR(MAX);

-- Obtener un email de usuario con sesiones activas
SELECT TOP 1 @Email = u.Email
FROM dbo.Users u
INNER JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1;

IF @Email IS NOT NULL
BEGIN
    PRINT 'Ejecutando Force Logout para: ' + @Email;
    
    EXEC dbo.sp_ForceLogoutUser
        @Email = @Email,
        @Reason = 'TEST: Force Logout Automático',
        @AdminId = 1,
        @Success = @Success OUTPUT,
        @Message = @Message OUTPUT;
    
    PRINT 'Resultado:';
    PRINT '  Success: ' + CAST(@Success AS NVARCHAR(1));
    PRINT '  Message: ' + @Message;
END
ELSE
BEGIN
    PRINT 'INFO: No hay usuarios con sesiones activas. Saltando test.';
END

-- ============================================================
-- TEST 5: Verificar tokens después del logout
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 5: Verificar tokens después del logout';
PRINT '═══════════════════════════════════════════════════════════';

IF @Email IS NOT NULL
BEGIN
    SELECT 
        u.Email,
        COUNT(CASE WHEN ut.IsActive = 1 THEN 1 END) as TokensActivos,
        COUNT(CASE WHEN ut.IsActive = 0 THEN 1 END) as TokensInactivos,
        COUNT(*) as TokenesTotal
    FROM dbo.Users u
    LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId
    WHERE u.Email = @Email
    GROUP BY u.Email;
END

-- ============================================================
-- TEST 6: Ver historial de Force Logouts
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 6: Historial de Force Logouts (últimos 10)';
PRINT '═══════════════════════════════════════════════════════════';

SELECT TOP 10
    u.Email,
    ut.Timestamp,
    ut.Action,
    ut.Details
FROM dbo.UserTrail ut
INNER JOIN dbo.Users u ON ut.UserId = u.Id
WHERE ut.Action = 'FORCE_LOGOUT'
ORDER BY ut.Timestamp DESC;

-- ============================================================
-- TEST 7: Probar funciones de conteo
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 7: Probar funciones de conteo';
PRINT '═══════════════════════════════════════════════════════════';

-- Buscar un usuario
DECLARE @TestUserId INT;
SELECT TOP 1 @TestUserId = Id FROM dbo.Users;

IF @TestUserId IS NOT NULL
BEGIN
    SELECT 
        @TestUserId as UserId,
        dbo.fn_GetActiveTokenCount(@TestUserId) as TokensActivos,
        dbo.fn_GetActiveAuthTokenCount(@TestUserId) as AuthTokensActivos;
END

-- ============================================================
-- TEST 8: Probar logout por ID de usuario
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 8: Force Logout por ID de Usuario';
PRINT '═══════════════════════════════════════════════════════════';

-- Buscar segundo usuario con tokens
DECLARE @UserId2 INT;
DECLARE @Success2 BIT;
DECLARE @Message2 NVARCHAR(MAX);

SELECT TOP 1 @UserId2 = u.Id
FROM dbo.Users u
INNER JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1;

IF @UserId2 IS NOT NULL
BEGIN
    PRINT 'Ejecutando Force Logout para UserId: ' + CAST(@UserId2 AS NVARCHAR(10));
    
    EXEC dbo.sp_ForceLogoutUserId
        @UserId = @UserId2,
        @Reason = 'TEST: Force Logout por ID',
        @AdminId = 1,
        @Success = @Success2 OUTPUT,
        @Message = @Message2 OUTPUT;
    
    PRINT 'Resultado:';
    PRINT '  Success: ' + CAST(@Success2 AS NVARCHAR(1));
    PRINT '  Message: ' + @Message2;
END
ELSE
BEGIN
    PRINT 'INFO: No hay más usuarios con sesiones activas para el segundo test.';
END

-- ============================================================
-- TEST 9: Resumen final
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 9: Resumen Final';
PRINT '═══════════════════════════════════════════════════════════';

SELECT 
    'Total Tokens Activos' as Metrica,
    COUNT(*) as Valor
FROM dbo.UserTokens
WHERE IsActive = 1

UNION ALL

SELECT 
    'Total Tokens Inactivos',
    COUNT(*)
FROM dbo.UserTokens
WHERE IsActive = 0

UNION ALL

SELECT 
    'Total Force Logouts Registrados',
    COUNT(*)
FROM dbo.UserTrail
WHERE Action = 'FORCE_LOGOUT';

-- ============================================================
-- TEST 10: Limpiar (OPCIONAL - Solo si quieres revertir los tests)
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TEST 10: Revertir cambios de tests (COMENTADO)';
PRINT '═══════════════════════════════════════════════════════════';

/*
-- DESCOMENTAR SI QUIERES REVERTIR LOS CAMBIOS

-- 1. Reactivar los tokens que se invalidaron en tests
UPDATE dbo.UserTokens
SET IsActive = 1
WHERE UserId IN (
    SELECT UserId FROM dbo.UserTrail 
    WHERE Action = 'FORCE_LOGOUT' 
    AND Details LIKE '%TEST:%'
    AND Timestamp > DATEADD(HOUR, -1, GETDATE())
);

-- 2. Eliminar registros de test del UserTrail
DELETE FROM dbo.UserTrail
WHERE Action = 'FORCE_LOGOUT'
AND Details LIKE '%TEST:%'
AND Timestamp > DATEADD(HOUR, -1, GETDATE());

PRINT 'Tests revertidos correctamente.';

*/

-- ============================================================
-- FIN DE TESTS
-- ============================================================
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'TESTS COMPLETADOS';
PRINT '═══════════════════════════════════════════════════════════';
