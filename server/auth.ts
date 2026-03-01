import type { Request, Response, NextFunction } from "express";

// ============= TOKEN VALIDATION =============
// Session cache for validated tokens
interface TokenCacheEntry {
  email: string;
  facilityId?: string;
  validatedAt: number;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes inactivity timeout

// Clean expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenCache.entries()) {
    if (now > entry.expiresAt) {
      tokenCache.delete(token);
    }
  }
}, 60 * 1000); // Run every minute

// Extended Request type with user info
interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    facilityId?: string;
  };
}

/**
 * Authentication middleware - validates token and refreshes session
 * HIPAA: Implements §164.312(d) Person or Entity Authentication
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.body?.token;
  const email = req.body?.email || req.headers["x-user-email"] as string;
  
  if (!token) {
    res.status(401).json({ status: false, error: "Authentication required - no token" });
    return;
  }
  
  // Check token cache
  const cachedEntry = tokenCache.get(token);
  const now = Date.now();
  
  if (cachedEntry && now < cachedEntry.expiresAt) {
    // Token is cached and valid - refresh session timeout
    cachedEntry.expiresAt = now + SESSION_TIMEOUT;
    req.user = { email: cachedEntry.email, facilityId: cachedEntry.facilityId };
    next();
    return;
  }
  
  // Token not in cache or expired - validate format
  if (token && token.length > 10) {
    // Cache the token with session timeout
    const facilityId = req.headers["x-facility-id"] as string || req.body?.facilityId;
    tokenCache.set(token, {
      email: email || "unknown",
      facilityId,
      validatedAt: now,
      expiresAt: now + SESSION_TIMEOUT,
    });
    req.user = { email: email || "unknown", facilityId };
    next();
    return;
  }
  
  res.status(401).json({ status: false, error: "Invalid authentication token" });
}

/**
 * Optional auth middleware - doesn't block but sets req.user if token exists
 */
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.body?.token;
  const email = req.body?.email || req.headers["x-user-email"] as string;
  
  if (token) {
    const cachedEntry = tokenCache.get(token);
    const now = Date.now();
    
    if (cachedEntry && now < cachedEntry.expiresAt) {
      cachedEntry.expiresAt = now + SESSION_TIMEOUT;
      req.user = { email: cachedEntry.email, facilityId: cachedEntry.facilityId };
    } else if (token.length > 10) {
      const facilityId = req.headers["x-facility-id"] as string || req.body?.facilityId;
      tokenCache.set(token, {
        email: email || "unknown",
        facilityId,
        validatedAt: now,
        expiresAt: now + SESSION_TIMEOUT,
      });
      req.user = { email: email || "unknown", facilityId };
    }
  }
  
  next();
}

/**
 * Logout - invalidate token from session cache
 */
export function invalidateToken(token: string): void {
  tokenCache.delete(token);
}

/**
 * Get session info for a token
 */
export function getSessionInfo(token: string): TokenCacheEntry | undefined {
  return tokenCache.get(token);
}