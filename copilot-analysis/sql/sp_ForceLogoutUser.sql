-- ============================================================
-- STORED PROCEDURE: sp_ForceLogoutUser
-- BD: viglobal
-- Propósito: Force logout de un usuario
-- Autor: Admin
-- Fecha: 2026-02-01
-- ============================================================

USE viglobal;
GO

-- Verificar si ya existe y eliminar
IF OBJECT_ID('dbo.sp_ForceLogoutUser', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ForceLogoutUser;
GO

-- ============================================================
-- CREAR STORED PROCEDURE
-- ============================================================
CREATE PROCEDURE dbo.sp_ForceLogoutUser
    @Email NVARCHAR(255),
    @Reason NVARCHAR(MAX) = NULL,
    @AdminId INT = NULL,
    @Success BIT OUTPUT,
    @Message NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UserId INT;
    DECLARE @Timestamp DATETIME = GETDATE();
    DECLARE @TokensDeleted INT = 0;
    DECLARE @AuthTokensDeleted INT = 0;
    
    -- Inicializar outputs
    SET @Success = 0;
    SET @Message = '';
    
    BEGIN TRY
        -- ====================================================
        -- 1. VALIDAR USUARIO EXISTE
        -- ====================================================
        SELECT @UserId = Id 
        FROM dbo.Users 
        WHERE Email = @Email;
        
        IF @UserId IS NULL
        BEGIN
            SET @Success = 0;
            SET @Message = 'Error: Usuario no encontrado (' + @Email + ')';
            RETURN;
        END
        
        -- ====================================================
        -- 2. INICIAR TRANSACCIÓN
        -- ====================================================
        BEGIN TRANSACTION;
        
        -- ====================================================
        -- 3. CONTAR TOKENS ANTES DE INVALIDAR
        -- ====================================================
        SELECT @TokensDeleted = COUNT(*) 
        FROM dbo.UserTokens 
        WHERE UserId = @UserId AND IsActive = 1;
        
        SELECT @AuthTokensDeleted = COUNT(*) 
        FROM dbo.AuthTokens 
        WHERE UserId = @UserId AND IsActive = 1;
        
        -- ====================================================
        -- 4. INVALIDAR TOKENS DE USUARIO
        -- ====================================================
        -- Opción A: Marcar como inactivos (RECOMENDADO - Reversible)
        UPDATE dbo.UserTokens 
        SET 
            IsActive = 0,
            ExpiresAt = @Timestamp
        WHERE UserId = @UserId AND IsActive = 1;
        
        UPDATE dbo.AuthTokens 
        SET 
            IsActive = 0,
            ExpiresAt = @Timestamp
        WHERE UserId = @UserId AND IsActive = 1;
        
        -- ====================================================
        -- 5. REGISTRAR EN AUDITORÍA
        -- ====================================================
        INSERT INTO dbo.UserTrail 
            (UserId, Action, Timestamp, Details)
        VALUES 
            (
                @UserId, 
                'FORCE_LOGOUT', 
                @Timestamp, 
                'Razón: ' + ISNULL(@Reason, 'Admin forced logout') + 
                ' | Tokens invalidados: ' + CAST(@TokensDeleted AS NVARCHAR(10)) + 
                ' | Auth tokens invalidados: ' + CAST(@AuthTokensDeleted AS NVARCHAR(10)) +
                CASE WHEN @AdminId IS NOT NULL THEN ' | AdminId: ' + CAST(@AdminId AS NVARCHAR(10)) ELSE '' END
            );
        
        -- ====================================================
        -- 6. CONFIRMAR TRANSACCIÓN
        -- ====================================================
        COMMIT TRANSACTION;
        
        -- ====================================================
        -- 7. ESTABLECER MENSAJES DE ÉXITO
        -- ====================================================
        SET @Success = 1;
        SET @Message = 'Force logout completado para ' + @Email + 
                       ' | Tokens invalidados: ' + CAST(@TokensDeleted AS NVARCHAR(10)) + 
                       ' | Auth tokens: ' + CAST(@AuthTokensDeleted AS NVARCHAR(10));
        
        RETURN;
        
    END TRY
    BEGIN CATCH
        -- ====================================================
        -- MANEJO DE ERRORES
        -- ====================================================
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SET @Success = 0;
        SET @Message = 'Error en force logout: ' + ERROR_MESSAGE() + 
                       ' | Línea: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        
        -- Registrar error en log (opcional)
        PRINT @Message;
        
        RETURN;
    END CATCH;
    
END;
GO

-- ============================================================
-- CREAR VERSIÓN ADICIONAL: sp_ForceLogoutUserId (por ID)
-- ============================================================
IF OBJECT_ID('dbo.sp_ForceLogoutUserId', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ForceLogoutUserId;
GO

CREATE PROCEDURE dbo.sp_ForceLogoutUserId
    @UserId INT,
    @Reason NVARCHAR(MAX) = NULL,
    @AdminId INT = NULL,
    @Success BIT OUTPUT,
    @Message NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Email NVARCHAR(255);
    DECLARE @Timestamp DATETIME = GETDATE();
    DECLARE @TokensDeleted INT = 0;
    DECLARE @AuthTokensDeleted INT = 0;
    
    SET @Success = 0;
    SET @Message = '';
    
    BEGIN TRY
        -- Obtener email del usuario
        SELECT @Email = Email 
        FROM dbo.Users 
        WHERE Id = @UserId;
        
        IF @Email IS NULL
        BEGIN
            SET @Success = 0;
            SET @Message = 'Error: Usuario con ID ' + CAST(@UserId AS NVARCHAR(10)) + ' no encontrado';
            RETURN;
        END
        
        BEGIN TRANSACTION;
        
        SELECT @TokensDeleted = COUNT(*) 
        FROM dbo.UserTokens 
        WHERE UserId = @UserId AND IsActive = 1;
        
        SELECT @AuthTokensDeleted = COUNT(*) 
        FROM dbo.AuthTokens 
        WHERE UserId = @UserId AND IsActive = 1;
        
        UPDATE dbo.UserTokens 
        SET IsActive = 0, ExpiresAt = @Timestamp
        WHERE UserId = @UserId AND IsActive = 1;
        
        UPDATE dbo.AuthTokens 
        SET IsActive = 0, ExpiresAt = @Timestamp
        WHERE UserId = @UserId AND IsActive = 1;
        
        INSERT INTO dbo.UserTrail 
            (UserId, Action, Timestamp, Details)
        VALUES 
            (@UserId, 'FORCE_LOGOUT', @Timestamp, 
             'Razón: ' + ISNULL(@Reason, 'Admin forced logout') + 
             ' | Tokens: ' + CAST(@TokensDeleted AS NVARCHAR(10)) + 
             ' | Auth tokens: ' + CAST(@AuthTokensDeleted AS NVARCHAR(10)));
        
        COMMIT TRANSACTION;
        
        SET @Success = 1;
        SET @Message = 'Force logout completado para ' + @Email + 
                       ' (ID: ' + CAST(@UserId AS NVARCHAR(10)) + ')';
        
        RETURN;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SET @Success = 0;
        SET @Message = 'Error: ' + ERROR_MESSAGE();
        RETURN;
    END CATCH;
    
END;
GO

-- ============================================================
-- CREAR FUNCIÓN: fn_GetActiveTokenCount
-- ============================================================
IF OBJECT_ID('dbo.fn_GetActiveTokenCount', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_GetActiveTokenCount;
GO

CREATE FUNCTION dbo.fn_GetActiveTokenCount
    (@UserId INT)
RETURNS INT
AS
BEGIN
    DECLARE @Count INT;
    
    SELECT @Count = COUNT(*) 
    FROM dbo.UserTokens 
    WHERE UserId = @UserId AND IsActive = 1;
    
    RETURN ISNULL(@Count, 0);
END;
GO

-- ============================================================
-- CREAR FUNCIÓN: fn_GetActiveAuthTokenCount
-- ============================================================
IF OBJECT_ID('dbo.fn_GetActiveAuthTokenCount', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_GetActiveAuthTokenCount;
GO

CREATE FUNCTION dbo.fn_GetActiveAuthTokenCount
    (@UserId INT)
RETURNS INT
AS
BEGIN
    DECLARE @Count INT;
    
    SELECT @Count = COUNT(*) 
    FROM dbo.AuthTokens 
    WHERE UserId = @UserId AND IsActive = 1;
    
    RETURN ISNULL(@Count, 0);
END;
GO

-- ============================================================
-- EJEMPLOS DE USO
-- ============================================================

/*
-- Ejemplo 1: Force logout por email
DECLARE @Success BIT;
DECLARE @Message NVARCHAR(MAX);

EXEC dbo.sp_ForceLogoutUser 
    @Email = 'usuario@email.com',
    @Reason = 'Usuario reportó actividad sospechosa',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;

SELECT @Success as Success, @Message as Message;
GO

-- Ejemplo 2: Force logout por ID de usuario
DECLARE @Success BIT;
DECLARE @Message NVARCHAR(MAX);

EXEC dbo.sp_ForceLogoutUserId 
    @UserId = 5,
    @Reason = 'Cambio de contraseña realizado',
    @AdminId = 1,
    @Success = @Success OUTPUT,
    @Message = @Message OUTPUT;

SELECT @Success as Success, @Message as Message;
GO

-- Ejemplo 3: Verificar tokens activos antes de logout
SELECT 
    Email,
    dbo.fn_GetActiveTokenCount(Id) as ActiveTokens,
    dbo.fn_GetActiveAuthTokenCount(Id) as ActiveAuthTokens
FROM dbo.Users
WHERE Email = 'usuario@email.com';
GO

-- Ejemplo 4: Ver historial de logouts forzados
SELECT TOP 20
    ut.UserTrail,
    u.Email,
    ut.Timestamp,
    ut.Action,
    ut.Details
FROM dbo.UserTrail ut
INNER JOIN dbo.Users u ON ut.UserId = u.Id
WHERE ut.Action = 'FORCE_LOGOUT'
ORDER BY ut.Timestamp DESC;
GO

-- Ejemplo 5: Verificar después del logout
SELECT COUNT(*) as RemainingActiveTokens
FROM dbo.UserTokens 
WHERE UserId = 5 AND IsActive = 1;
GO
*/

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
PRINT 'Stored Procedures y funciones creadas exitosamente:';
PRINT '  ✓ sp_ForceLogoutUser';
PRINT '  ✓ sp_ForceLogoutUserId';
PRINT '  ✓ fn_GetActiveTokenCount';
PRINT '  ✓ fn_GetActiveAuthTokenCount';
PRINT '';
PRINT 'Para probar, ejecutar los ejemplos de uso documentados arriba.';
GO
