-- ============================================================
-- FORCE LOGOUT - Consulta por EMAIL
-- BD: viglobal
-- ============================================================

-- ============================================================
-- OPCIÓN 1: Usar Stored Procedure (Recomendado)
-- ============================================================

-- Declarar variables de salida
DECLARE @Success BIT;
DECLARE @Message NVARCHAR(MAX);

-- Ejecutar stored procedure
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'usuario@email.com',  -- ← CAMBIAR AQUÍ: Email del usuario
    @Reason = 'Admin forced logout',
    @AdminId = 1,                   -- ← CAMBIAR AQUÍ: ID del admin (opcional)
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;

-- Ver resultados
SELECT 
    @Success as Success,
    @Message as Message;

-- ============================================================
-- OPCIÓN 2: Queries Directas (Sin usar SP)
-- ============================================================

/*
-- PASO 1: Obtener el UserId del email
DECLARE @Email NVARCHAR(255) = 'usuario@email.com';  -- ← CAMBIAR AQUÍ
DECLARE @UserId INT;

SELECT @UserId = Id 
FROM dbo.Users 
WHERE Email = @Email;

-- Verificar que existe
IF @UserId IS NULL
BEGIN
    PRINT 'ERROR: Usuario no encontrado: ' + @Email;
END
ELSE
BEGIN
    PRINT 'Usuario encontrado. ID: ' + CAST(@UserId AS NVARCHAR(10));
    
    -- PASO 2: Contar tokens activos ANTES
    SELECT 
        'ANTES' as Estado,
        COUNT(*) as Tokens,
        'UserTokens' as Tabla
    FROM dbo.UserTokens
    WHERE UserId = @UserId AND IsActive = 1
    
    UNION ALL
    
    SELECT 
        'ANTES',
        COUNT(*),
        'AuthTokens'
    FROM dbo.AuthTokens
    WHERE UserId = @UserId AND IsActive = 1;
    
    -- PASO 3: Iniciar transacción
    BEGIN TRANSACTION;
    
    TRY
        -- Invalidar UserTokens
        UPDATE dbo.UserTokens 
        SET IsActive = 0, ExpiresAt = GETDATE()
        WHERE UserId = @UserId AND IsActive = 1;
        
        -- Invalidar AuthTokens
        UPDATE dbo.AuthTokens 
        SET IsActive = 0, ExpiresAt = GETDATE()
        WHERE UserId = @UserId AND IsActive = 1;
        
        -- Registrar en auditoría
        INSERT INTO dbo.UserTrail (UserId, Action, Timestamp, Details)
        VALUES (@UserId, 'FORCE_LOGOUT', GETDATE(), 
                'Admin forced logout - Manual query');
        
        -- Confirmar
        COMMIT TRANSACTION;
        PRINT 'Force logout completado para: ' + @Email;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        PRINT 'ERROR: ' + ERROR_MESSAGE();
    END CATCH
    
    -- PASO 4: Verificar DESPUÉS
    SELECT 
        'DESPUÉS' as Estado,
        COUNT(*) as Tokens,
        'UserTokens' as Tabla
    FROM dbo.UserTokens
    WHERE UserId = @UserId AND IsActive = 1
    
    UNION ALL
    
    SELECT 
        'DESPUÉS',
        COUNT(*),
        'AuthTokens'
    FROM dbo.AuthTokens
    WHERE UserId = @UserId AND IsActive = 1;
END
*/

-- ============================================================
-- OPCIÓN 3: Ver información ANTES de hacer logout
-- ============================================================

/*
-- Listar usuario
SELECT TOP 10
    u.Id,
    u.Email,
    u.UserName,
    COUNT(ut.Id) as TokensActivos,
    MAX(ut.CreatedAt) as UltimoToken
FROM dbo.Users u
LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1
WHERE u.Email LIKE '%usuario@email.com%'
GROUP BY u.Id, u.Email, u.UserName;

-- Ver tokens del usuario
SELECT TOP 20
    Id,
    UserId,
    Token,
    IsActive,
    CreatedAt,
    ExpiresAt
FROM dbo.UserTokens
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com')
ORDER BY CreatedAt DESC;

-- Ver auth tokens
SELECT TOP 20
    Id,
    UserId,
    Token,
    IsActive,
    CreatedAt,
    ExpiresAt
FROM dbo.AuthTokens
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com')
ORDER BY CreatedAt DESC;
*/

-- ============================================================
-- OPCIÓN 4: Verificar que el logout fue exitoso
-- ============================================================

/*
-- Contar tokens activos después
SELECT 
    COUNT(*) as TokensActivos
FROM dbo.UserTokens
WHERE UserId = (SELECT Id FROM dbo.Users WHERE Email = 'usuario@email.com')
  AND IsActive = 1;

-- Debe retornar: 0

-- Ver historial de logouts
SELECT TOP 5
    u.Email,
    ut.Timestamp,
    ut.Action,
    ut.Details
FROM dbo.UserTrail ut
INNER JOIN dbo.Users u ON ut.UserId = u.Id
WHERE u.Email = 'usuario@email.com'
  AND ut.Action = 'FORCE_LOGOUT'
ORDER BY ut.Timestamp DESC;
*/

-- ============================================================
-- EJEMPLOS DE USO CON DIFERENTES EMAILS
-- ============================================================

/*

-- Ejemplo 1: Usuario específico
DECLARE @Success BIT, @Message NVARCHAR(MAX);
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'drperez@curisec.com',
    @Reason = 'Logout de emergencia',
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
SELECT @Success as Success, @Message as Message;


-- Ejemplo 2: Sin especificar razón
DECLARE @Success BIT, @Message NVARCHAR(MAX);
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'admin@site.com',
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
SELECT @Success as Success, @Message as Message;


-- Ejemplo 3: Con ID de admin
DECLARE @Success BIT, @Message NVARCHAR(MAX);
EXEC dbo.sp_ForceLogoutUser 
    @Email = 'usuario@site.com',
    @Reason = 'Cambio de contraseña',
    @AdminId = 5,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;
SELECT @Success as Success, @Message as Message;

*/

-- ============================================================
-- COMANDOS ÚTILES
-- ============================================================

/*

-- 1. VER TODOS LOS USUARIOS CON SESIONES ACTIVAS
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


-- 2. HACER LOGOUT A MÚLTIPLES USUARIOS
DECLARE @Success BIT, @Message NVARCHAR(MAX);

EXEC dbo.sp_ForceLogoutUser @Email = 'user1@email.com', @Reason = 'Batch logout', 
    @Success = @Success OUTPUT, @Message = @Message OUTPUT;
PRINT @Message;

EXEC dbo.sp_ForceLogoutUser @Email = 'user2@email.com', @Reason = 'Batch logout', 
    @Success = @Success OUTPUT, @Message = @Message OUTPUT;
PRINT @Message;

EXEC dbo.sp_ForceLogoutUser @Email = 'user3@email.com', @Reason = 'Batch logout', 
    @Success = @Success OUTPUT, @Message = @Message OUTPUT;
PRINT @Message;


-- 3. VER HISTORIAL DE LOGOUTS RECIENTES
SELECT TOP 20
    u.Email,
    ut.Timestamp,
    ut.Details
FROM dbo.UserTrail ut
INNER JOIN dbo.Users u ON ut.UserId = u.Id
WHERE ut.Action = 'FORCE_LOGOUT'
ORDER BY ut.Timestamp DESC;


-- 4. ESTADÍSTICAS DE LOGOUTS
SELECT 
    COUNT(*) as TotalLogouts,
    COUNT(DISTINCT UserId) as UniqueUsers,
    MIN(Timestamp) as PrimerLogout,
    MAX(Timestamp) as UltimoLogout
FROM dbo.UserTrail
WHERE Action = 'FORCE_LOGOUT' 
  AND Timestamp > DATEADD(DAY, -7, GETDATE());


-- 5. BUSCAR USUARIO POR PATRONES DE EMAIL
SELECT 
    Id,
    Email,
    UserName
FROM dbo.Users
WHERE Email LIKE '%@gmail.com%'
   OR Email LIKE '%@email.com%'
ORDER BY Email;

*/
