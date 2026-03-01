<?php
/**
 * SERVICE: ForceLogoutService
 * Implementa force logout usando el stored procedure sp_ForceLogoutUser
 * BD: viglobal
 */

class ForceLogoutService {
    
    private $conn;
    
    /**
     * Constructor
     * @param resource $connection - Conexión MSSQL activa
     */
    public function __construct($connection) {
        $this->conn = $connection;
    }
    
    /**
     * Force logout de usuario por email
     * 
     * @param string $email - Email del usuario
     * @param string|null $reason - Razón del force logout
     * @param int|null $adminId - ID del admin que ejecutó el logout
     * 
     * @return array ['success' => bool, 'message' => string]
     */
    public function forceLogoutByEmail($email, $reason = null, $adminId = null) {
        try {
            // Preparar parámetros de salida
            $success = 0;
            $message = '';
            
            // Query para ejecutar stored procedure
            $sql = "
                DECLARE @Success BIT;
                DECLARE @Message NVARCHAR(MAX);
                
                EXEC dbo.sp_ForceLogoutUser 
                    @Email = ?,
                    @Reason = ?,
                    @AdminId = ?,
                    @Success = @Success OUTPUT,
                    @Message = @Message OUTPUT;
                
                SELECT @Success as Success, @Message as Message;
            ";
            
            // Ejecutar query
            $stmt = sqlsrv_query($this->conn, $sql, [
                $email,
                $reason,
                $adminId
            ]);
            
            if ($stmt === false) {
                return [
                    'success' => false,
                    'message' => 'Error en query: ' . print_r(sqlsrv_errors(), true)
                ];
            }
            
            // Obtener resultados
            if ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $success = $row['Success'];
                $message = $row['Message'];
            }
            
            return [
                'success' => (bool)$success,
                'message' => $message
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Excepción: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Force logout de usuario por ID
     * 
     * @param int $userId - ID del usuario
     * @param string|null $reason - Razón del force logout
     * @param int|null $adminId - ID del admin que ejecutó el logout
     * 
     * @return array ['success' => bool, 'message' => string]
     */
    public function forceLogoutByUserId($userId, $reason = null, $adminId = null) {
        try {
            $success = 0;
            $message = '';
            
            $sql = "
                DECLARE @Success BIT;
                DECLARE @Message NVARCHAR(MAX);
                
                EXEC dbo.sp_ForceLogoutUserId 
                    @UserId = ?,
                    @Reason = ?,
                    @AdminId = ?,
                    @Success = @Success OUTPUT,
                    @Message = @Message OUTPUT;
                
                SELECT @Success as Success, @Message as Message;
            ";
            
            $stmt = sqlsrv_query($this->conn, $sql, [
                $userId,
                $reason,
                $adminId
            ]);
            
            if ($stmt === false) {
                return [
                    'success' => false,
                    'message' => 'Error en query: ' . print_r(sqlsrv_errors(), true)
                ];
            }
            
            if ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $success = $row['Success'];
                $message = $row['Message'];
            }
            
            return [
                'success' => (bool)$success,
                'message' => $message
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Excepción: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Obtener cantidad de tokens activos de un usuario
     * 
     * @param int $userId - ID del usuario
     * 
     * @return int - Cantidad de tokens activos
     */
    public function getActiveTokenCount($userId) {
        try {
            $sql = "SELECT dbo.fn_GetActiveTokenCount(?) as Count";
            $stmt = sqlsrv_query($this->conn, $sql, [$userId]);
            
            if ($stmt === false) {
                return 0;
            }
            
            if ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                return (int)$row['Count'];
            }
            
            return 0;
            
        } catch (Exception $e) {
            return 0;
        }
    }
    
    /**
     * Obtener cantidad de auth tokens activos
     * 
     * @param int $userId - ID del usuario
     * 
     * @return int - Cantidad de auth tokens activos
     */
    public function getActiveAuthTokenCount($userId) {
        try {
            $sql = "SELECT dbo.fn_GetActiveAuthTokenCount(?) as Count";
            $stmt = sqlsrv_query($this->conn, $sql, [$userId]);
            
            if ($stmt === false) {
                return 0;
            }
            
            if ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                return (int)$row['Count'];
            }
            
            return 0;
            
        } catch (Exception $e) {
            return 0;
        }
    }
    
    /**
     * Obtener historial de force logouts de un usuario
     * 
     * @param int $userId - ID del usuario
     * @param int $limit - Número máximo de registros (default: 10)
     * 
     * @return array - Historial de logouts
     */
    public function getLogoutHistory($userId, $limit = 10) {
        try {
            $sql = "
                SELECT TOP ? 
                    u.Id,
                    u.Email,
                    ut.Timestamp,
                    ut.Action,
                    ut.Details
                FROM dbo.UserTrail ut
                INNER JOIN dbo.Users u ON ut.UserId = u.Id
                WHERE ut.UserId = ? AND ut.Action = 'FORCE_LOGOUT'
                ORDER BY ut.Timestamp DESC
            ";
            
            $stmt = sqlsrv_query($this->conn, $sql, [$limit, $userId]);
            
            if ($stmt === false) {
                return [];
            }
            
            $history = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $history[] = $row;
            }
            
            return $history;
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Obtener todas las sesiones activas
     * 
     * @return array - Lista de usuarios con sesiones activas
     */
    public function getActiveSessionsUsers() {
        try {
            $sql = "
                SELECT 
                    u.Id,
                    u.Email,
                    u.UserName,
                    COUNT(ut.Id) as ActiveTokens
                FROM dbo.Users u
                LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1
                GROUP BY u.Id, u.Email, u.UserName
                HAVING COUNT(ut.Id) > 0
                ORDER BY COUNT(ut.Id) DESC
            ";
            
            $stmt = sqlsrv_query($this->conn, $sql);
            
            if ($stmt === false) {
                return [];
            }
            
            $sessions = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $sessions[] = $row;
            }
            
            return $sessions;
            
        } catch (Exception $e) {
            return [];
        }
    }
}

// ============================================================
// EJEMPLO DE USO
// ============================================================
/*

// Conectar a BD
$serverName = "localhost,4433";
$database = "viglobal";
$uid = "sa";
$pwd = "3232@lano";

$connectionInfo = array(
    "Database" => $database,
    "UID" => $uid,
    "PWD" => $pwd,
    "TrustServerCertificate" => true,
    "Encrypt" => true,
);

$conn = sqlsrv_connect($serverName, $connectionInfo);
if ($conn === false) {
    die("Connection failed: " . print_r(sqlsrv_errors(), true));
}

// Crear servicio
$logoutService = new ForceLogoutService($conn);

// 1. Force logout por email
$result = $logoutService->forceLogoutByEmail(
    'usuario@email.com',
    'Usuario reportó acceso no autorizado',
    1  // Admin ID
);

echo "Logout por Email:\n";
echo "Success: " . ($result['success'] ? 'true' : 'false') . "\n";
echo "Message: " . $result['message'] . "\n\n";

// 2. Force logout por ID
$result = $logoutService->forceLogoutByUserId(
    5,
    'Cambio de contraseña detectado',
    1
);

echo "Logout por ID:\n";
echo "Success: " . ($result['success'] ? 'true' : 'false') . "\n";
echo "Message: " . $result['message'] . "\n\n";

// 3. Obtener tokens activos
$tokenCount = $logoutService->getActiveTokenCount(5);
echo "Tokens activos para UserId 5: " . $tokenCount . "\n\n";

// 4. Obtener historial de logouts
$history = $logoutService->getLogoutHistory(5, 5);
echo "Últimos logouts forzados:\n";
foreach ($history as $entry) {
    echo "  - " . $entry['Timestamp'] . ": " . $entry['Details'] . "\n";
}
echo "\n";

// 5. Obtener todas las sesiones activas
$activeSessions = $logoutService->getActiveSessionsUsers();
echo "Sesiones activas por usuario:\n";
foreach ($activeSessions as $session) {
    echo "  - " . $session['Email'] . ": " . $session['ActiveTokens'] . " tokens\n";
}

// Cerrar conexión
sqlsrv_close($conn);

*/

?>
