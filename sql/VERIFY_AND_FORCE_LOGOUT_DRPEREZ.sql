-- ============================================================
-- VERIFICAR Y FORZAR LOGOUT: drperez@curisec.com
-- BD: viglobal
-- ============================================================

-- ============================================================
-- PASO 1: VERIFICAR SI EL USUARIO ESTÁ LOGGEADO
-- ============================================================

PRINT '═══════════════════════════════════════════════════════════';
PRINT 'PASO 1: Verificar si drperez@curisec.com está loggeado';
PRINT '═══════════════════════════════════════════════════════════';

DECLARE @Email NVARCHAR(255) = 'drperez@curisec.com';
DECLARE @UserId INT;
DECLARE @TokensActivos INT = 0;
DECLARE @AuthTokensActivos INT = 0;

-- Obtener UserId
SELECT @UserId = Id 
FROM dbo.Users 
WHERE Email = @Email;

IF @UserId IS NULL
BEGIN
    PRINT 'ERROR: Usuario no encontrado: ' + @Email;
END
ELSE
BEGIN
    PRINT 'Usuario encontrado. ID: ' + CAST(@UserId AS NVARCHAR(10));
    
    -- Contar tokens activos
    SELECT @TokensActivos = COUNT(*) 
    FROM dbo.UserTokens
    WHERE UserId = @UserId AND IsActive = 1;
    
    SELECT @AuthTokensActivos = COUNT(*) 
    FROM dbo.AuthTokens
    WHERE UserId = @UserId AND IsActive = 1;
    
    PRINT '';
    PRINT 'Estado de sesión:';
    PRINT '  • UserTokens activos: ' + CAST(@TokensActivos AS NVARCHAR(10));
    PRINT '  • AuthTokens activos: ' + CAST(@AuthTokensActivos AS NVARCHAR(10));
    PRINT '';
    
    -- ============================================================
    -- PASO 2: DECIDIR SI HACER LOGOUT
    -- ============================================================
    
    IF @TokensActivos = 0 AND @AuthTokensActivos = 0
    BEGIN
        PRINT 'ℹ️  RESULTADO: Usuario NO está loggeado (sin sesiones activas)';
        PRINT '';
        PRINT 'No se requiere force logout.';
    END
    ELSE
    BEGIN
        PRINT '⚠️  RESULTADO: Usuario ESTÁ loggeado (' + CAST(@TokensActivos + @AuthTokensActivos AS NVARCHAR(10)) + ' sesiones activas)';
        PRINT '';
        PRINT '═══════════════════════════════════════════════════════════';
        PRINT 'PASO 2: Ejecutando Force Logout';
        PRINT '═══════════════════════════════════════════════════════════';
        PRINT '';
        
        -- ============================================================
        -- PASO 3: FORZAR LOGOUT USANDO STORED PROCEDURE
        -- ============================================================
        
        DECLARE @Success BIT;
        DECLARE @Message NVARCHAR(MAX);
        
        EXEC dbo.sp_ForceLogoutUser 
            @Email = @Email,
            @Reason = 'Logout automático forzado - Verificación de sesión',
            @AdminId = 1,
            @Success = @Success OUTPUT,
            @Message = @Message OUTPUT;
        
        PRINT 'Resultado del Force Logout:';
        PRINT '  • Éxito: ' + CASE WHEN @Success = 1 THEN 'SÍ ✓' ELSE 'NO ✗' END;
        PRINT '  • Mensaje: ' + @Message;
        PRINT '';
        
        -- ============================================================
        -- PASO 4: VERIFICAR DESPUÉS DEL LOGOUT
        -- ============================================================
        
        PRINT '═══════════════════════════════════════════════════════════';
        PRINT 'PASO 3: Verificar después del Logout';
        PRINT '═══════════════════════════════════════════════════════════';
        PRINT '';
        
        DECLARE @TokensActivosDespues INT = 0;
        DECLARE @AuthTokensActivosDespues INT = 0;
        
        SELECT @TokensActivosDespues = COUNT(*) 
        FROM dbo.UserTokens
        WHERE UserId = @UserId AND IsActive = 1;
        
        SELECT @AuthTokensActivosDespues = COUNT(*) 
        FROM dbo.AuthTokens
        WHERE UserId = @UserId AND IsActive = 1;
        
        PRINT 'Sesiones activas después del logout:';
        PRINT '  • UserTokens activos: ' + CAST(@TokensActivosDespues AS NVARCHAR(10));
        PRINT '  • AuthTokens activos: ' + CAST(@AuthTokensActivosDespues AS NVARCHAR(10));
        PRINT '';
        
        IF @TokensActivosDespues = 0 AND @AuthTokensActivosDespues = 0
        BEGIN
            PRINT '✅ CONFIRMADO: Logout exitoso - Usuario desconectado completamente';
        END
        ELSE
        BEGIN
            PRINT '❌ ADVERTENCIA: Aún hay sesiones activas';
        END
        
    END
    
    -- ============================================================
    -- PASO 5: MOSTRAR HISTORIAL DE LOGOUTS
    -- ============================================================
    
    PRINT '';
    PRINT '═══════════════════════════════════════════════════════════';
    PRINT 'HISTORIAL DE FORCE LOGOUTS RECIENTES';
    PRINT '═══════════════════════════════════════════════════════════';
    PRINT '';
    
    SELECT TOP 10
        'Historial' as Tipo,
        ut.Timestamp,
        ut.Action,
        ut.Details
    FROM dbo.UserTrail ut
    WHERE ut.UserId = @UserId
      AND ut.Action = 'FORCE_LOGOUT'
    ORDER BY ut.Timestamp DESC;
    
END

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT 'FIN DE VERIFICACIÓN';
PRINT '═══════════════════════════════════════════════════════════';
