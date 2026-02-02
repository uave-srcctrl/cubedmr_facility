// ============================================================
// EJEMPLOS DE IMPLEMENTACIÓN - Force Logout Endpoints
// BD: viglobal
// ============================================================

// ============================================================
// 1. EXPRESS.JS / NODE.JS EJEMPLOS
// ============================================================

/**
 * EJEMPLO 1: Endpoint básico de Force Logout en Express
 */
async function setupForceLogoutEndpoint(router, logoutService, authenticateToken, authorizeAdmin) {
    
    // POST /api/admin/force-logout
    // Body: { email: string, reason?: string }
    // Headers: Authorization: Bearer token
    
    router.post('/api/admin/force-logout', 
        authenticateToken,  // Verificar autenticación
        authorizeAdmin,     // Verificar que es admin
        async (req, res) => {
            try {
                const { email, reason } = req.body;
                const adminId = req.user?.id;
                
                // Validar input
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        error: 'Campo "email" es requerido'
                    });
                }
                
                // Validar que no sea el mismo usuario
                if (email === req.user?.email) {
                    return res.status(400).json({
                        success: false,
                        error: 'No puedes hacer logout de tu propia sesión'
                    });
                }
                
                // Ejecutar force logout
                const result = await logoutService.forceLogoutByEmail(
                    email,
                    reason || 'Force logout by admin',
                    adminId
                );
                
                if (result.success) {
                    res.json({
                        success: true,
                        message: result.message,
                        user: email
                    });
                    
                    // Opcional: Registrar en logs
                    console.log(`[FORCE_LOGOUT] User: ${email} | Admin: ${adminId} | Reason: ${reason}`);
                } else {
                    res.status(400).json({
                        success: false,
                        error: result.message
                    });
                }
                
            } catch (error) {
                console.error('[FORCE_LOGOUT_ERROR]:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error al procesar force logout'
                });
            }
        }
    );
}

/**
 * EJEMPLO 2: Endpoint para listar sesiones activas
 */
async function setupActiveSessionsEndpoint(router, logoutService, authenticateToken, authorizeAdmin) {
    
    // GET /api/admin/sessions
    // Headers: Authorization: Bearer token
    
    router.get('/api/admin/sessions',
        authenticateToken,
        authorizeAdmin,
        async (req, res) => {
            try {
                const sessions = await logoutService.getActiveSessionsUsers();
                
                res.json({
                    success: true,
                    count: sessions.length,
                    data: sessions.map(session => ({
                        userId: session.Id,
                        email: session.Email,
                        userName: session.UserName,
                        activeTokens: session.ActiveTokens
                    }))
                });
                
            } catch (error) {
                console.error('[SESSIONS_ERROR]:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error al obtener sesiones activas'
                });
            }
        }
    );
}

/**
 * EJEMPLO 3: Endpoint para ver historial de logout de un usuario
 */
async function setupLogoutHistoryEndpoint(router, logoutService, authenticateToken, authorizeAdmin) {
    
    // GET /api/admin/logout-history/:userId
    // Query: ?limit=20
    // Headers: Authorization: Bearer token
    
    router.get('/api/admin/logout-history/:userId',
        authenticateToken,
        authorizeAdmin,
        async (req, res) => {
            try {
                const { userId } = req.params;
                const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
                
                if (!userId || isNaN(parseInt(userId))) {
                    return res.status(400).json({
                        success: false,
                        error: 'userId inválido'
                    });
                }
                
                const history = await logoutService.getLogoutHistory(
                    parseInt(userId),
                    limit
                );
                
                res.json({
                    success: true,
                    userId: parseInt(userId),
                    count: history.length,
                    data: history.map(entry => ({
                        timestamp: entry.Timestamp,
                        action: entry.Action,
                        details: entry.Details
                    }))
                });
                
            } catch (error) {
                console.error('[HISTORY_ERROR]:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error al obtener historial'
                });
            }
        }
    );
}

/**
 * EJEMPLO 4: Endpoint para información de tokens de usuario
 */
async function setupUserTokensEndpoint(router, logoutService, authenticateToken, authorizeAdmin) {
    
    // GET /api/admin/user-tokens/:userId
    // Headers: Authorization: Bearer token
    
    router.get('/api/admin/user-tokens/:userId',
        authenticateToken,
        authorizeAdmin,
        async (req, res) => {
            try {
                const { userId } = req.params;
                
                if (!userId || isNaN(parseInt(userId))) {
                    return res.status(400).json({
                        success: false,
                        error: 'userId inválido'
                    });
                }
                
                const userIdNum = parseInt(userId);
                const [activeTokens, activeAuthTokens] = await Promise.all([
                    logoutService.getActiveTokenCount(userIdNum),
                    logoutService.getActiveAuthTokenCount(userIdNum)
                ]);
                
                res.json({
                    success: true,
                    data: {
                        userId: userIdNum,
                        activeTokens,
                        activeAuthTokens,
                        totalActive: activeTokens + activeAuthTokens
                    }
                });
                
            } catch (error) {
                console.error('[TOKENS_ERROR]:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error al obtener información de tokens'
                });
            }
        }
    );
}

// ============================================================
// 2. PHP EJEMPLOS
// ============================================================

/**
 * EJEMPLO 5: Ruta de Slim Framework para Force Logout
 */
/*
$app->post('/api/admin/force-logout', function ($request, $response) {
    // Verificar autenticación y autorización
    $user = $request->getAttribute('user');
    
    if (!$user || !in_array('admin', $user['roles'])) {
        return $response
            ->withStatus(403)
            ->withHeader('Content-Type', 'application/json')
            ->getBody()
            ->write(json_encode([
                'success' => false,
                'error' => 'No autorizado'
            ]));
    }
    
    // Obtener datos del request
    $data = $request->getParsedBody();
    $email = $data['email'] ?? null;
    $reason = $data['reason'] ?? null;
    
    // Validar input
    if (!$email) {
        return $response
            ->withStatus(400)
            ->withHeader('Content-Type', 'application/json')
            ->getBody()
            ->write(json_encode([
                'success' => false,
                'error' => 'Email requerido'
            ]));
    }
    
    // Crear servicio y ejecutar
    $logoutService = new ForceLogoutService($GLOBALS['db_connection']);
    $result = $logoutService->forceLogoutByEmail(
        $email,
        $reason,
        $user['id']
    );
    
    // Retornar resultado
    $statusCode = $result['success'] ? 200 : 400;
    return $response
        ->withStatus($statusCode)
        ->withHeader('Content-Type', 'application/json')
        ->getBody()
        ->write(json_encode($result));
});
*/

/**
 * EJEMPLO 6: Endpoint PHP para sesiones activas
 */
/*
$app->get('/api/admin/sessions', function ($request, $response) {
    // Verificar autenticación
    $user = $request->getAttribute('user');
    
    if (!$user || !in_array('admin', $user['roles'])) {
        return $response->withStatus(403);
    }
    
    // Obtener sesiones
    $logoutService = new ForceLogoutService($GLOBALS['db_connection']);
    $sessions = $logoutService->getActiveSessionsUsers();
    
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->getBody()
        ->write(json_encode([
            'success' => true,
            'count' => count($sessions),
            'data' => $sessions
        ]));
});
*/

// ============================================================
// 3. CLIENTE JAVASCRIPT / FETCH EXAMPLES
// ============================================================

/**
 * EJEMPLO 7: Llamar Force Logout desde cliente
 */
async function forceLogoutUser(email, reason = null) {
    try {
        const response = await fetch('/api/admin/force-logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                email,
                reason: reason || 'Admin forced logout'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✓ Logout forzado exitoso:', data.message);
            return true;
        } else {
            console.error('✗ Error en force logout:', data.error);
            return false;
        }
        
    } catch (error) {
        console.error('Error en request:', error);
        return false;
    }
}

/**
 * EJEMPLO 8: Obtener sesiones activas
 */
async function getActiveSessions() {
    try {
        const response = await fetch('/api/admin/sessions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Sesiones activas:', data.data);
            return data.data;
        } else {
            console.error('Error:', data.error);
            return [];
        }
        
    } catch (error) {
        console.error('Error en request:', error);
        return [];
    }
}

/**
 * EJEMPLO 9: Dashboard React component
 */
/*
import React, { useState, useEffect } from 'react';

export function AdminSessionsDashboard() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        loadSessions();
    }, []);
    
    const loadSessions = async () => {
        setLoading(true);
        const data = await getActiveSessions();
        setSessions(data);
        setLoading(false);
    };
    
    const handleForceLogout = async (email) => {
        if (confirm(`¿Realmente deseas forzar logout de ${email}?`)) {
            await forceLogoutUser(email, 'Admin forced logout');
            await loadSessions();
        }
    };
    
    return (
        <div className="sessions-dashboard">
            <h2>Sesiones Activas ({sessions.length})</h2>
            
            {loading ? (
                <p>Cargando...</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Tokens Activos</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map(session => (
                            <tr key={session.userId}>
                                <td>{session.userName}</td>
                                <td>{session.email}</td>
                                <td>{session.activeTokens}</td>
                                <td>
                                    <button 
                                        onClick={() => handleForceLogout(session.email)}
                                        className="btn-danger"
                                    >
                                        Force Logout
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
*/

// ============================================================
// 4. RATE LIMITING PARA FORCE LOGOUT
// ============================================================

/**
 * EJEMPLO 10: Middleware de Rate Limiting
 */
import rateLimit from 'express-rate-limit';

const forceLogoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,                  // máximo 10 intentos
    message: 'Demasiados intentos de force logout. Intenta más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // No aplicar límite a admins super (opcional)
        return req.user?.role === 'super_admin';
    },
    keyGenerator: (req) => {
        // Limitar por admin ID, no por IP
        return `${req.user?.id}`;
    }
});

// Usar en rutas
router.post('/api/admin/force-logout', forceLogoutLimiter, ...);

// ============================================================
// 5. LOGGING PARA AUDITORÍA
// ============================================================

/**
 * EJEMPLO 11: Logging de Force Logout
 */
import fs from 'fs';
import path from 'path';

class AuditLogger {
    private logPath: string;
    
    constructor() {
        this.logPath = path.join(__dirname, '../logs/force-logout.log');
    }
    
    log(adminId: number, email: string, reason: string, success: boolean, details?: string) {
        const timestamp = new Date().toISOString();
        const message = `[${timestamp}] Admin:${adminId} | User:${email} | Success:${success} | Reason:${reason} ${details ? '| Details:' + details : ''}\n`;
        
        fs.appendFileSync(this.logPath, message);
    }
}

// Usar en endpoint
router.post('/api/admin/force-logout', 
    authenticateToken,
    authorizeAdmin,
    async (req, res) => {
        const logger = new AuditLogger();
        
        try {
            const { email, reason } = req.body;
            const result = await logoutService.forceLogoutByEmail(email, reason, req.user.id);
            
            logger.log(req.user.id, email, reason, result.success, result.message);
            
            res.json(result);
        } catch (error) {
            logger.log(req.user.id, req.body.email, req.body.reason, false, error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================================
// 6. ESTADÍSTICAS DE LOGOUTS
// ============================================================

/**
 * EJEMPLO 12: Endpoint de estadísticas
 */
async function setupLogoutStatsEndpoint(router, pool, authenticateToken, authorizeAdmin) {
    router.get('/api/admin/logout-stats',
        authenticateToken,
        authorizeAdmin,
        async (req, res) => {
            try {
                const result = await pool.request().query(`
                    SELECT 
                        COUNT(*) as TotalLogouts,
                        COUNT(DISTINCT UserId) as UniquesUsers,
                        MAX(Timestamp) as LastLogout,
                        MIN(Timestamp) as FirstLogout
                    FROM dbo.UserTrail
                    WHERE Action = 'FORCE_LOGOUT'
                    AND Timestamp > DATEADD(DAY, -30, GETDATE())
                `);
                
                res.json({
                    success: true,
                    data: result.recordset[0]
                });
                
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        }
    );
}

// ============================================================
// FIN DE EJEMPLOS
// ============================================================
