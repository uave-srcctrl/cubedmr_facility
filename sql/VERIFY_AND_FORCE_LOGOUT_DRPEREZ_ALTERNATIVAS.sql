-- ============================================================
-- VERIFICAR Y FORZAR LOGOUT: drperez@curisec.com
-- VERSIONES ALTERNATIVAS
-- ============================================================

-- ============================================================
-- VERSIÓN 1: SIMPLE (Una sola query)
-- ============================================================

/*
-- Verificar si está loggeado y forzar logout si es necesario
DECLARE @Success BIT, @Message NVARCHAR(MAX);

-- Verificar primero
IF EXISTS (
    SELECT 1 FROM dbo.UserTokens ut
    INNER JOIN dbo.Users u ON ut.UserId = u.Id
    WHERE u.Email = 'drperez@curisec.com' AND ut.IsActive = 1
)
BEGIN
    PRINT 'Usuario está loggeado. Ejecutando force logout...';
    
    EXEC dbo.sp_ForceLogoutUser 
        @Email = 'drperez@curisec.com',
        @Reason = 'Force logout automático',
        @Success = @Success OUTPUT,
        @Message = @Message OUTPUT;
    
    SELECT 'Logout ejecutado' as Accion, @Success as Éxito, @Message as Mensaje;
END
ELSE
BEGIN
    PRINT 'Usuario NO está loggeado. No se requiere logout.';
END
*/

-- ============================================================
-- VERSIÓN 2: CON DETALLES COMPLETOS
-- ============================================================

/*
DECLARE @Email NVARCHAR(255) = 'drperez@curisec.com';
DECLARE @UserId INT;

-- Obtener usuario
SELECT @UserId = Id FROM dbo.Users WHERE Email = @Email;

IF @UserId IS NULL
BEGIN
    SELECT 'Error' as Resultado, 'Usuario no encontrado' as Detalles;
END
ELSE
BEGIN
    -- Ver información actual
    PRINT 'INFORMACIÓN DEL USUARIO:';
    SELECT 
        u.Id,
        u.Email,
        u.UserName,
        COUNT(ut.Id) as TokensActivos,
        COUNT(DISTINCT ut.DeviceInfo) as Dispositivos
    FROM dbo.Users u
    LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1
    WHERE u.Id = @UserId
    GROUP BY u.Id, u.Email, u.UserName;
    
    PRINT '';
    PRINT 'TOKENS ACTIVOS:';
    SELECT TOP 10
        Token,
        CreatedAt,
        ExpiresAt,
        DeviceInfo
    FROM dbo.UserTokens
    WHERE UserId = @UserId AND IsActive = 1
    ORDER BY CreatedAt DESC;
    
    -- Ejecutar logout
    PRINT '';
    PRINT 'EJECUTANDO FORCE LOGOUT...';
    
    DECLARE @Success BIT, @Message NVARCHAR(MAX);
    EXEC dbo.sp_ForceLogoutUser 
        @Email = @Email,
        @Reason = 'Logout forzado por administrador',
        @Success = @Success OUTPUT,
        @Message = @Message OUTPUT;
    
    SELECT 
        CASE WHEN @Success = 1 THEN 'ÉXITO' ELSE 'ERROR' END as Resultado,
        @Message as Detalles;
    
    -- Verificar después
    PRINT '';
    PRINT 'VERIFICACIÓN POST-LOGOUT:';
    SELECT 
        COUNT(*) as TokensRestantes
    FROM dbo.UserTokens
    WHERE UserId = @UserId AND IsActive = 1;
END
*/

-- ============================================================
-- VERSIÓN 3: CON TRANSACCIÓN MANUAL
-- ============================================================

/*
BEGIN TRANSACTION;

DECLARE @Email NVARCHAR(255) = 'drperez@curisec.com';
DECLARE @UserId INT;
DECLARE @TokensCount INT = 0;

SELECT @UserId = Id FROM dbo.Users WHERE Email = @Email;

IF @UserId IS NOT NULL
BEGIN
    -- Contar y eliminar tokens
    SELECT @TokensCount = COUNT(*) 
    FROM dbo.UserTokens 
    WHERE UserId = @UserId AND IsActive = 1;
    
    IF @TokensCount > 0
    BEGIN
        UPDATE dbo.UserTokens 
        SET IsActive = 0, ExpiresAt = GETDATE()
        WHERE UserId = @UserId AND IsActive = 1;
        
        UPDATE dbo.AuthTokens 
        SET IsActive = 0, ExpiresAt = GETDATE()
        WHERE UserId = @UserId AND IsActive = 1;
        
        INSERT INTO dbo.UserTrail (UserId, Action, Timestamp, Details)
        VALUES (@UserId, 'FORCE_LOGOUT', GETDATE(), 
                'Logout manual - ' + CAST(@TokensCount AS NVARCHAR(10)) + ' tokens invalidados');
        
        PRINT 'Force logout ejecutado: ' + CAST(@TokensCount AS NVARCHAR(10)) + ' tokens invalidados';
    END
    ELSE
    BEGIN
        PRINT 'Usuario no tiene sesiones activas';
    END
END
ELSE
BEGIN
    PRINT 'Usuario no encontrado';
END

COMMIT TRANSACTION;
*/

-- ============================================================
-- VERSIÓN 4: SOLO VERIFICAR (Sin hacer logout)
-- ============================================================

/*
SELECT 
    u.Email,
    u.UserName,
    COUNT(ut.Id) as TokensActivos,
    MAX(ut.CreatedAt) as UltimoLogin,
    CASE 
        WHEN COUNT(ut.Id) = 0 THEN 'NO LOGGEADO'
        WHEN COUNT(ut.Id) = 1 THEN 'UNA SESIÓN'
        ELSE CAST(COUNT(ut.Id) AS NVARCHAR(10)) + ' SESIONES'
    END as Estado
FROM dbo.Users u
LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1
WHERE u.Email = 'drperez@curisec.com'
GROUP BY u.Id, u.Email, u.UserName;
*/

-- ============================================================
-- VERSIÓN 5: VERIFICAR MÚLTIPLES USUARIOS A LA VEZ
-- ============================================================

/*
-- Verificar varios usuarios específicos
SELECT 
    u.Email,
    COUNT(ut.Id) as TokensActivos,
    COUNT(DISTINCT ut.DeviceInfo) as Dispositivos,
    MAX(ut.CreatedAt) as UltimoAcceso,
    CASE 
        WHEN COUNT(ut.Id) = 0 THEN '✓ OK - No loggeado'
        ELSE '⚠️ LOGGEADO - Necesita logout'
    END as Estado
FROM dbo.Users u
LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1
WHERE u.Email IN (
    'drperez@curisec.com',
    'admin@email.com',
    'otro_usuario@email.com'
)
GROUP BY u.Id, u.Email
ORDER BY COUNT(ut.Id) DESC;
*/

-- ============================================================
-- VERSIÓN 6: HACER LOGOUT Y MOSTRAR TODO EN UNA SOLA QUERY
-- ============================================================

/*
DECLARE @Email NVARCHAR(255) = 'drperez@curisec.com';

-- Tabla temporal para guardar resultados
DECLARE @Results TABLE (
    Estado NVARCHAR(50),
    Accion NVARCHAR(255),
    Detalles NVARCHAR(MAX)
);

DECLARE @Success BIT, @Message NVARCHAR(MAX), @UserId INT;

SELECT @UserId = Id FROM dbo.Users WHERE Email = @Email;

IF @UserId IS NULL
BEGIN
    INSERT INTO @Results VALUES ('ERROR', 'Verificación', 'Usuario no encontrado');
END
ELSE
BEGIN
    -- Verificar antes
    IF EXISTS (SELECT 1 FROM dbo.UserTokens WHERE UserId = @UserId AND IsActive = 1)
    BEGIN
        INSERT INTO @Results VALUES ('LOGGEADO', 'Estado Inicial', 
            'Se encontraron ' + CAST((SELECT COUNT(*) FROM dbo.UserTokens WHERE UserId = @UserId AND IsActive = 1) AS NVARCHAR(10)) + ' sesiones activas');
        
        -- Ejecutar logout
        EXEC dbo.sp_ForceLogoutUser 
            @Email = @Email,
            @Reason = 'Logout automático forzado',
            @Success = @Success OUTPUT,
            @Message = @Message OUTPUT;
        
        INSERT INTO @Results VALUES (CASE WHEN @Success=1 THEN 'ÉXITO' ELSE 'ERROR' END, 'Force Logout', @Message);
    END
    ELSE
    BEGIN
        INSERT INTO @Results VALUES ('OK', 'Estado Inicial', 'Usuario no tiene sesiones activas');
    END
END

SELECT * FROM @Results;
*/

-- ============================================================
-- VERSIÓN 7: SCRIPT EJECUTABLE DIRECTO
-- ============================================================

PRINT '╔════════════════════════════════════════════════════════════╗';
PRINT '║     VERIFICAR Y FORZAR LOGOUT: drperez@curisec.com        ║';
PRINT '╚════════════════════════════════════════════════════════════╝';
PRINT '';

-- PASO 1: Verificar
PRINT 'PASO 1: Verificando sesiones activas...';
DECLARE @Email NVARCHAR(255) = 'drperez@curisec.com';
DECLARE @UserId INT = (SELECT Id FROM dbo.Users WHERE Email = @Email);
DECLARE @ActiveTokens INT;

IF @UserId IS NULL
BEGIN
    PRINT '❌ Usuario no encontrado';
END
ELSE
BEGIN
    SELECT @ActiveTokens = COUNT(*) 
    FROM dbo.UserTokens 
    WHERE UserId = @UserId AND IsActive = 1;
    
    PRINT 'Usuario ID: ' + CAST(@UserId AS NVARCHAR(10));
    PRINT 'Sesiones activas: ' + CAST(@ActiveTokens AS NVARCHAR(10));
    PRINT '';
    
    IF @ActiveTokens = 0
    BEGIN
        PRINT '✅ Usuario NO está loggeado - No se requiere logout';
    END
    ELSE
    BEGIN
        PRINT '⚠️ Usuario ESTÁ loggeado - Ejecutando force logout...';
        PRINT '';
        
        DECLARE @Success BIT, @Message NVARCHAR(MAX);
        EXEC dbo.sp_ForceLogoutUser 
            @Email = @Email,
            @Reason = 'Logout automático forzado',
            @Success = @Success OUTPUT,
            @Message = @Message OUTPUT;
        
        PRINT CASE WHEN @Success = 1 THEN '✅' ELSE '❌' END + ' ' + @Message;
    END
END

PRINT '';
PRINT '╚════════════════════════════════════════════════════════════╝';
