/**
 * SERVICE: ForceLogoutService (TypeScript / Node.js)
 * Implementa force logout usando el stored procedure sp_ForceLogoutUser
 * BD: viglobal
 */

import sql from 'mssql';

interface ForceLogoutResult {
    success: boolean;
    message: string;
    tokensInvalidated?: number;
}

interface TokenCountResult {
    count: number;
}

interface ActiveSession {
    Id: number;
    Email: string;
    UserName: string;
    ActiveTokens: number;
}

interface LogoutHistoryEntry {
    Id: number;
    Email: string;
    Timestamp: Date;
    Action: string;
    Details: string;
}

class ForceLogoutService {
    private pool: sql.ConnectionPool;

    constructor(pool: sql.ConnectionPool) {
        this.pool = pool;
    }

    /**
     * Force logout de usuario por email
     */
    async forceLogoutByEmail(
        email: string,
        reason?: string,
        adminId?: number
    ): Promise<ForceLogoutResult> {
        try {
            const request = this.pool.request();
            request.input('Email', sql.NVarChar, email);
            request.input('Reason', sql.NVarChar, reason || null);
            request.input('AdminId', sql.Int, adminId || null);
            request.output('Success', sql.Bit);
            request.output('Message', sql.NVarChar(sql.MAX));

            await request.execute('sp_ForceLogoutUser');

            return {
                success: request.output.Success === 1,
                message: request.output.Message,
            };
        } catch (error: any) {
            console.error('Error in forceLogoutByEmail:', error);
            return {
                success: false,
                message: `Error: ${error.message}`,
            };
        }
    }

    /**
     * Force logout de usuario por ID
     */
    async forceLogoutByUserId(
        userId: number,
        reason?: string,
        adminId?: number
    ): Promise<ForceLogoutResult> {
        try {
            const request = this.pool.request();
            request.input('UserId', sql.Int, userId);
            request.input('Reason', sql.NVarChar, reason || null);
            request.input('AdminId', sql.Int, adminId || null);
            request.output('Success', sql.Bit);
            request.output('Message', sql.NVarChar(sql.MAX));

            await request.execute('sp_ForceLogoutUserId');

            return {
                success: request.output.Success === 1,
                message: request.output.Message,
            };
        } catch (error: any) {
            console.error('Error in forceLogoutByUserId:', error);
            return {
                success: false,
                message: `Error: ${error.message}`,
            };
        }
    }

    /**
     * Obtener cantidad de tokens activos
     */
    async getActiveTokenCount(userId: number): Promise<number> {
        try {
            const result = await this.pool
                .request()
                .input('UserId', sql.Int, userId)
                .query('SELECT dbo.fn_GetActiveTokenCount(@UserId) as Count');

            if (result.recordset && result.recordset.length > 0) {
                return result.recordset[0].Count || 0;
            }
            return 0;
        } catch (error) {
            console.error('Error in getActiveTokenCount:', error);
            return 0;
        }
    }

    /**
     * Obtener cantidad de auth tokens activos
     */
    async getActiveAuthTokenCount(userId: number): Promise<number> {
        try {
            const result = await this.pool
                .request()
                .input('UserId', sql.Int, userId)
                .query('SELECT dbo.fn_GetActiveAuthTokenCount(@UserId) as Count');

            if (result.recordset && result.recordset.length > 0) {
                return result.recordset[0].Count || 0;
            }
            return 0;
        } catch (error) {
            console.error('Error in getActiveAuthTokenCount:', error);
            return 0;
        }
    }

    /**
     * Obtener historial de force logouts
     */
    async getLogoutHistory(
        userId: number,
        limit: number = 10
    ): Promise<LogoutHistoryEntry[]> {
        try {
            const result = await this.pool
                .request()
                .input('UserId', sql.Int, userId)
                .input('Limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@Limit)
                        u.Id,
                        u.Email,
                        ut.Timestamp,
                        ut.Action,
                        ut.Details
                    FROM dbo.UserTrail ut
                    INNER JOIN dbo.Users u ON ut.UserId = u.Id
                    WHERE ut.UserId = @UserId AND ut.Action = 'FORCE_LOGOUT'
                    ORDER BY ut.Timestamp DESC
                `);

            return result.recordset || [];
        } catch (error) {
            console.error('Error in getLogoutHistory:', error);
            return [];
        }
    }

    /**
     * Obtener todas las sesiones activas
     */
    async getActiveSessionsUsers(): Promise<ActiveSession[]> {
        try {
            const result = await this.pool.request().query(`
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
            `);

            return result.recordset || [];
        } catch (error) {
            console.error('Error in getActiveSessionsUsers:', error);
            return [];
        }
    }

    /**
     * Obtener información de usuario
     */
    async getUserInfo(
        email: string
    ): Promise<{ id: number; email: string; userName: string } | null> {
        try {
            const result = await this.pool
                .request()
                .input('Email', sql.NVarChar, email)
                .query('SELECT Id, Email, UserName FROM dbo.Users WHERE Email = @Email');

            if (result.recordset && result.recordset.length > 0) {
                return result.recordset[0];
            }
            return null;
        } catch (error) {
            console.error('Error in getUserInfo:', error);
            return null;
        }
    }
}

export default ForceLogoutService;

// ============================================================
// EJEMPLO DE USO EN EXPRESS
// ============================================================
/*

import express, { Request, Response } from 'express';
import ForceLogoutService from './ForceLogoutService';

const router = express.Router();
const logoutService = new ForceLogoutService(pool);

// Endpoint: Force logout de usuario
router.post('/api/admin/force-logout', async (req: Request, res: Response) => {
    try {
        const { email, reason, adminId } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email es requerido',
            });
        }

        // Verificar que el usuario existe
        const userInfo = await logoutService.getUserInfo(email);
        if (!userInfo) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        // Ejecutar force logout
        const result = await logoutService.forceLogoutByEmail(email, reason, adminId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                user: {
                    id: userInfo.id,
                    email: userInfo.email,
                },
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.message,
            });
        }
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// Endpoint: Obtener sesiones activas
router.get('/api/admin/active-sessions', async (req: Request, res: Response) => {
    try {
        const sessions = await logoutService.getActiveSessionsUsers();
        res.json({
            success: true,
            data: sessions,
            count: sessions.length,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// Endpoint: Obtener historial de logouts de un usuario
router.get('/api/admin/logout-history/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        const history = await logoutService.getLogoutHistory(parseInt(userId), limit);
        res.json({
            success: true,
            data: history,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// Endpoint: Obtener info de tokens de usuario
router.get('/api/admin/user-tokens/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const userIdNum = parseInt(userId);

        const activeTokens = await logoutService.getActiveTokenCount(userIdNum);
        const activeAuthTokens = await logoutService.getActiveAuthTokenCount(userIdNum);

        res.json({
            success: true,
            data: {
                userId: userIdNum,
                activeTokens,
                activeAuthTokens,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;

*/
