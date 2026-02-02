# MEJORAS A IMPLEMENTAR - WoundCare Backend

**Fecha**: 2026-02-01  
**Sistema**: API PHP + SQL Server (viglobal + curisec)  
**Arquitectura Actual**: Híbrida (Auth en viglobal, Datos en curisec)

---

## 📊 TABLA RESUMEN DE MEJORAS

| Mejora | Seguridad | Rendimiento | Complejidad | Tiempo Est. | Estado |
|--------|-----------|-------------|-------------|------------|--------|
| **CRÍTICAS** | | | | | |
| JWT + refresh tokens | ⭐⭐⭐ | ⭐⭐⭐ | Media | 2-3h | ⏳ Pendiente |
| Rate limiting login | ⭐⭐⭐ | ⭐⭐ | Baja | 1h | ⏳ Pendiente |
| Mejorar hashing (Argon2) | ⭐⭐⭐ | ⭐ | Baja | 1-2h | ⏳ Pendiente |
| SSL/Encrypt BD | ⭐⭐⭐ | ⭐ | Media | 1-2h | ⏳ Pendiente |
| **IMPORTANTES** | | | | | |
| Redis caching tokens | ⭐⭐ | ⭐⭐⭐ | Media | 3-4h | ⏳ Pendiente |
| Audit logging | ⭐⭐⭐ | ⭐ | Baja | 2h | ⏳ Pendiente |
| Circuit breaker | ⭐⭐ | ⭐⭐ | Alta | 3-4h | ⏳ Pendiente |
| Índices en DB | ⭐ | ⭐⭐⭐ | Baja | 30min | ⏳ Pendiente |
| **OPTIMIZACIONES** | | | | | |
| Refactorizar código | ⭐ | ⭐⭐ | Alta | 1-2 días | ⏳ Pendiente |
| Connection pooling | ⭐ | ⭐⭐ | Media | 2-3h | ⏳ Pendiente |
| Replica viglobal | ⭐⭐ | ⭐⭐⭐ | Alta | 4-6h | ⏳ Pendiente |

---

## 🔴 PRIORIDAD ALTA (Esta semana)

### 1. Rate Limiting en Login
**Objetivo**: Prevenir brute force attacks

**Implementación**:
```php
// Archivo: c:\xampp\htdocs\api\prod\RateLimiter.php

class RateLimiter {
    private $conn;
    private $maxAttempts = 5;
    private $windowMinutes = 15;
    
    public function __construct($connection) {
        $this->conn = $connection;
    }
    
    public function isAllowed($email, $ipAddress) {
        $cutoffTime = date('Y-m-d H:i:s', strtotime("-{$this->windowMinutes} minutes"));
        
        $sql = "SELECT COUNT(*) as attempts FROM viglobal.LoginAttempts 
                WHERE email = ? AND ipAddress = ? AND attemptTime > ?
                AND success = 0";
        
        $stmt = sqlsrv_query($this->conn, $sql, [$email, $ipAddress, $cutoffTime]);
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        return $row['attempts'] < $this->maxAttempts;
    }
    
    public function recordAttempt($email, $ipAddress, $success) {
        $sql = "INSERT INTO viglobal.LoginAttempts (email, ipAddress, success, attemptTime) 
                VALUES (?, ?, ?, GETDATE())";
        
        sqlsrv_query($this->conn, $sql, [$email, $ipAddress, $success ? 1 : 0]);
    }
}
```

**Cambios en wec.php**:
```php
// En tryLogin()
$ipAddress = $_SERVER['REMOTE_ADDR'];
$rateLimiter = new RateLimiter($this->conn);

if (!$rateLimiter->isAllowed($arguments['email'], $ipAddress)) {
    return ['status' => false, 'error' => 'Too many login attempts. Try again later.'];
}

// Después de validar credenciales
$rateLimiter->recordAttempt($arguments['email'], $ipAddress, $results['status']);
```

**SQL para tabla LoginAttempts**:
```sql
CREATE TABLE viglobal.LoginAttempts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL,
    ipAddress NVARCHAR(45) NOT NULL,
    success BIT NOT NULL,
    attemptTime DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_login_attempts_email_ip ON viglobal.LoginAttempts(email, ipAddress, attemptTime);
```

**Archivos a crear/modificar**:
- ✅ Crear: `RateLimiter.php`
- ✅ Modificar: `wec.php` (método `tryLogin()`)
- ✅ Ejecutar: Script SQL para tabla

---

### 2. Mejorar Hashing de Password (Argon2)
**Objetivo**: Cambiar de SHA-256 a Argon2 (cryptográficamente más seguro)

**Implementación**:
```php
// Archivo: c:\xampp\htdocs\api\prod\PasswordHasher.php

class PasswordHasher {
    public static function hash($password) {
        // Argon2id con parámetros ajustados para seguridad
        return password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 2048,  // 2 MB
            'time_cost' => 4,       // 4 iteraciones
            'threads' => 3
        ]);
    }
    
    public static function verify($password, $hash) {
        return password_verify($password, $hash);
    }
    
    public static function needsRehash($hash) {
        return password_needs_rehash($hash, PASSWORD_ARGON2ID, [
            'memory_cost' => 2048,
            'time_cost' => 4,
            'threads' => 3
        ]);
    }
}
```

**Script de migración**:
```sql
-- Script: migrate_passwords_to_argon2.sql
-- Convertir hashes SHA-256 a Argon2 (se hace en PHP, DB solo almacena)

-- Primero crear columna temporal
ALTER TABLE viglobal.Users ADD passwordHashNew NVARCHAR(MAX) NULL;

-- Luego en PHP se hace rehashing gradual
-- Cuando user login → si passwordHashOld existe, rehash y actualizar
```

**Cambios en wec.php**:
```php
// En tryLogin(), cambiar validación de password:
// De: hash($password, 'sha256') == $dbHash
// A: PasswordHasher::verify($password, $dbHash)

$results = $this->runAuth('sp_GET_UserAuthenticated', $arguments);

if ($results['status'] && count($results['data']) > 0) {
    $user = $results['data'][0];
    
    // Validar password con Argon2
    if (!PasswordHasher::verify($arguments['password'], $user['passwordHash'])) {
        return ['status' => true, 'data' => []];
    }
    
    // Si necesita rehash, actualizar
    if (PasswordHasher::needsRehash($user['passwordHash'])) {
        $this->rehashPassword($user['email'], $arguments['password']);
    }
    
    // Continuar con generación de token...
}
```

**Archivos a crear/modificar**:
- ✅ Crear: `PasswordHasher.php`
- ✅ Modificar: `wec.php` (método `tryLogin()`)
- ✅ Ejecutar: Script de migración gradual

---

### 3. Agregar Índices en Base de Datos
**Objetivo**: Optimizar queries frecuentes

**SQL**:
```sql
-- Índices de autenticación
CREATE INDEX idx_users_email ON viglobal.Users(email);
CREATE INDEX idx_users_email_active ON viglobal.Users(email, currentAuthStatus);

-- Índices de tokens
CREATE INDEX idx_tokens_token ON viglobal.UserTokens(token);
CREATE INDEX idx_tokens_email ON viglobal.UserTokens(email);
CREATE INDEX idx_tokens_expiration ON viglobal.UserTokens(expirationTime);
CREATE INDEX idx_tokens_active ON viglobal.UserTokens(email, expirationTime) 
    WHERE isExpired = 0;

-- Índices de audit
CREATE INDEX idx_traceauth_email ON viglobal.traceAuth(email);
CREATE INDEX idx_traceauth_date ON viglobal.traceAuth(dateTrace);

-- Índices en curisec (datos clínicos)
CREATE INDEX idx_users_email_curisec ON curisec.Users(email);
CREATE INDEX idx_groupsbyuser ON curisec.GroupsByUser(userEmail);
CREATE INDEX idx_entities_active ON curisec.Entities(active);
```

**Verificar índices existentes**:
```sql
SELECT name FROM sys.indexes 
WHERE object_id = OBJECT_ID('viglobal.Users') 
AND name LIKE 'idx_%';
```

**Archivos a crear/modificar**:
- ✅ Ejecutar: Script SQL para crear índices

---

### 4. SSL/Encrypt Conexiones BD
**Objetivo**: Encriptar tráfico entre PHP y SQL Server

**Cambios en config.php**:
```php
// Cambiar de:
$LOCAL_CONNECTION_OPTIONS = [
    'Operational' => [
        "database" => LOCAL_MSSQL_DATABASE,
        "uid" => LOCAL_MSSQL_UID,
        "pwd" => LOCAL_MSSQL_PWD,
        "Encrypt" => false,  // ❌ INSEGURO
        "TrustServerCertificate" => true,
        "Authentication" => "SqlPassword"
    ],
];

// A:
$LOCAL_CONNECTION_OPTIONS = [
    'Operational' => [
        "database" => LOCAL_MSSQL_DATABASE,
        "uid" => LOCAL_MSSQL_UID,
        "pwd" => LOCAL_MSSQL_PWD,
        "Encrypt" => true,  // ✅ ENCRIPTADO
        "TrustServerCertificate" => false,  // Verificar certificado
        "Authentication" => "SqlPassword"
    ],
];

// Para producción: usar certificado válido
// Para desarrollo: generar self-signed cert
```

**Generar certificado self-signed (desarrollo)**:
```bash
# En Windows PowerShell
New-SelfSignedCertificate -CertStoreLocation Cert:\LocalMachine\My `
    -DnsName localhost -FriendlyName "MSSQLServer" `
    -NotAfter (Get-Date).AddYears(1)
```

**Archivos a crear/modificar**:
- ✅ Modificar: `config.php` (líneas de conexión)
- ✅ Ejecutar: Comando PowerShell para generar certificado

---

## 🟠 PRIORIDAD MEDIA (Próximas 2 semanas)

### 5. JWT + Refresh Tokens
**Objetivo**: Reemplazar tokens simples por JWT con expiración corta + refresh tokens

**Implementación**:
```php
// Archivo: c:\xampp\htdocs\api\prod\JWTService.php

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTService {
    private $secretKey = 'your-secret-key-from-env';  // Guardar en .env
    private $algorithm = 'HS256';
    private $accessTokenExpire = 900;      // 15 minutos
    private $refreshTokenExpire = 604800;  // 7 días
    
    public function generateAccessToken($email, $userId) {
        $payload = [
            'iss' => 'woundcare-api',
            'sub' => $userId,
            'email' => $email,
            'iat' => time(),
            'exp' => time() + $this->accessTokenExpire,
            'type' => 'access'
        ];
        
        return JWT::encode($payload, $this->secretKey, $this->algorithm);
    }
    
    public function generateRefreshToken($email, $userId) {
        $payload = [
            'iss' => 'woundcare-api',
            'sub' => $userId,
            'email' => $email,
            'iat' => time(),
            'exp' => time() + $this->refreshTokenExpire,
            'type' => 'refresh'
        ];
        
        $token = JWT::encode($payload, $this->secretKey, $this->algorithm);
        
        // Guardar en DB para poder revocar
        $this->storeRefreshToken($email, $token);
        
        return $token;
    }
    
    public function validateToken($token) {
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, $this->algorithm));
            return ['valid' => true, 'data' => $decoded];
        } catch (Exception $e) {
            return ['valid' => false, 'error' => $e->getMessage()];
        }
    }
    
    public function refreshAccessToken($refreshToken) {
        $validation = $this->validateToken($refreshToken);
        
        if (!$validation['valid']) {
            return ['status' => false, 'error' => 'Invalid refresh token'];
        }
        
        if ($validation['data']->type !== 'refresh') {
            return ['status' => false, 'error' => 'Token is not a refresh token'];
        }
        
        // Generar nuevo access token
        $newAccessToken = $this->generateAccessToken(
            $validation['data']->email,
            $validation['data']->sub
        );
        
        return ['status' => true, 'token' => $newAccessToken];
    }
    
    private function storeRefreshToken($email, $token) {
        // Guardar en viglobal.RefreshTokens para poder revocar
        $sql = "INSERT INTO viglobal.RefreshTokens (email, token, expirationTime) 
                VALUES (?, ?, DATEADD(second, ?, GETDATE()))";
        // Ejecutar query...
    }
}
```

**SQL para tabla RefreshTokens**:
```sql
CREATE TABLE viglobal.RefreshTokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL,
    token NVARCHAR(MAX) NOT NULL,
    expirationTime DATETIME2 NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    revokedAt DATETIME2 NULL,
    isRevoked BIT DEFAULT 0
);

CREATE INDEX idx_refresh_tokens_email ON viglobal.RefreshTokens(email, isRevoked);
CREATE INDEX idx_refresh_tokens_expiration ON viglobal.RefreshTokens(expirationTime);
```

**Cambios en wec.php**:
```php
// En tryLogin()
if ($results['status'] && count($results['data']) > 0) {
    $user = $results['data'][0];
    $userId = $user['id'];
    $email = $user['email'];
    
    $jwtService = new JWTService();
    
    // Generar tokens
    $accessToken = $jwtService->generateAccessToken($email, $userId);
    $refreshToken = $jwtService->generateRefreshToken($email, $userId);
    
    return [
        'status' => true,
        'data' => [
            [
                'status' => 1,
                'email' => $email,
                'accessToken' => $accessToken,      // 15 min, JWT
                'refreshToken' => $refreshToken,    // 7 días, DB
                'expiresIn' => 900,                 // segundos
                'tokenType' => 'Bearer'
            ]
        ]
    ];
}
```

**Nuevo endpoint: /api/refresh**
```php
public function refreshToken($data) {
    $allowedArgs = ['refreshToken' => 'required'];
    // ...validar args...
    
    $jwtService = new JWTService();
    return $jwtService->refreshAccessToken($data['refreshToken']);
}
```

**Cambios en frontend (login.tsx)**:
```typescript
// Guardar ambos tokens
localStorage.setItem('accessToken', dataItem.accessToken);
localStorage.setItem('refreshToken', dataItem.refreshToken);

// Configurar refresh automático
useEffect(() => {
    const interval = setInterval(async () => {
        const newToken = await api.post('/auth/refresh', {
            refreshToken: localStorage.getItem('refreshToken')
        });
        if (newToken) {
            localStorage.setItem('accessToken', newToken);
        }
    }, 14 * 60 * 1000);  // Cada 14 minutos
    
    return () => clearInterval(interval);
}, []);
```

**Archivos a crear/modificar**:
- ✅ Crear: `JWTService.php`
- ✅ Modificar: `wec.php` (métodos `tryLogin()` y agregar `refreshToken()`)
- ✅ Modificar: Frontend `login.tsx` para manejar refresh
- ✅ Ejecutar: Script SQL para tabla RefreshTokens

---

### 6. Audit Logging Completo
**Objetivo**: Registrar todas las acciones de seguridad

**SQL para tabla AuditLog**:
```sql
CREATE TABLE viglobal.AuditLog (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL,
    action NVARCHAR(100) NOT NULL,  -- login, logout, password_change, etc
    result NVARCHAR(50),             -- success, failed
    ipAddress NVARCHAR(45),
    userAgent NVARCHAR(500),
    details NVARCHAR(MAX),           -- JSON con info adicional
    timestamp DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_audit_email ON viglobal.AuditLog(email, timestamp DESC);
CREATE INDEX idx_audit_action ON viglobal.AuditLog(action, timestamp DESC);
```

**Clase AuditLogger**:
```php
// Archivo: c:\xampp\htdocs\api\prod\AuditLogger.php

class AuditLogger {
    private $conn;
    
    public function __construct($connection) {
        $this->conn = $connection;
    }
    
    public function log($email, $action, $result, $details = []) {
        $ipAddress = $_SERVER['REMOTE_ADDR'];
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $detailsJson = json_encode($details);
        
        $sql = "INSERT INTO viglobal.AuditLog 
                (email, action, result, ipAddress, userAgent, details) 
                VALUES (?, ?, ?, ?, ?, ?)";
        
        sqlsrv_query($this->conn, $sql, 
            [$email, $action, $result, $ipAddress, $userAgent, $detailsJson]);
    }
    
    public function getLog($email, $days = 30) {
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-$days days"));
        
        $sql = "SELECT * FROM viglobal.AuditLog 
                WHERE email = ? AND timestamp > ?
                ORDER BY timestamp DESC";
        
        $stmt = sqlsrv_query($this->conn, $sql, [$email, $cutoffDate]);
        $results = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $results[] = $row;
        }
        return $results;
    }
}
```

**Uso en wec.php**:
```php
$auditLogger = new AuditLogger($this->conn);

// En login exitoso
$auditLogger->log($email, 'login', 'success', [
    'method' => 'email_password',
    'device' => $arguments['deviceId']
]);

// En login fallido
$auditLogger->log($email, 'login', 'failed', [
    'reason' => 'invalid_password'
]);

// En logout
$auditLogger->log($email, 'logout', 'success');

// En cambio de password
$auditLogger->log($email, 'password_change', 'success');
```

**Endpoint para auditoría**:
```php
public function getAuditLog($data) {
    $email = $data['email'] ?? '';
    $auditLogger = new AuditLogger($this->conn);
    
    return ['status' => true, 'data' => $auditLogger->getLog($email)];
}
```

**Archivos a crear/modificar**:
- ✅ Crear: `AuditLogger.php`
- ✅ Modificar: `wec.php` (agregar logs en métodos de auth)
- ✅ Ejecutar: Script SQL para tabla AuditLog

---

### 7. Redis Caching para Tokens
**Objetivo**: Reducir queries BD frecuentes

**Instalación Redis** (Windows):
```bash
# Descargar: https://github.com/microsoftarchive/redis/releases
# O usar WSL:
wsl
sudo apt-get install redis-server
redis-server
```

**PHP Redis Extension**:
```bash
# En XAMPP PHP:
# Descargar php_redis.dll compatible con tu versión PHP
# Copiar a C:\xampp\php\ext\
# Agregar a php.ini: extension=php_redis.dll
```

**Clase TokenCache**:
```php
// Archivo: c:\xampp\htdocs\api\prod\TokenCache.php

class TokenCache {
    private $redis;
    private $dbConnection;
    private $cachePrefix = 'token:';
    private $cacheTTL = 3600;  // 1 hora
    
    public function __construct($dbConnection) {
        $this->redis = new Redis();
        $this->redis->connect('127.0.0.1', 6379);
        $this->dbConnection = $dbConnection;
    }
    
    public function getToken($email) {
        $cacheKey = $this->cachePrefix . $email;
        
        // Intentar desde Redis (muy rápido)
        $cached = $this->redis->get($cacheKey);
        if ($cached) {
            return json_decode($cached, true);
        }
        
        // Si no está, obtener de BD y cachear
        $token = $this->getFromDatabase($email);
        if ($token) {
            $this->redis->setex($cacheKey, $this->cacheTTL, json_encode($token));
        }
        
        return $token;
    }
    
    public function invalidateToken($email) {
        $cacheKey = $this->cachePrefix . $email;
        $this->redis->del($cacheKey);
    }
    
    private function getFromDatabase($email) {
        $sql = "SELECT token, expirationTime FROM viglobal.UserTokens 
                WHERE email = ? AND expirationTime > GETDATE() 
                ORDER BY expirationTime DESC";
        
        $stmt = sqlsrv_query($this->dbConnection, $sql, [$email]);
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        return $row;
    }
}
```

**Uso en wec.php**:
```php
$tokenCache = new TokenCache($this->conn);

// En lugar de query directa
$cachedToken = $tokenCache->getToken($email);

// Al logout
$tokenCache->invalidateToken($email);
```

**Archivos a crear/modificar**:
- ✅ Crear: `TokenCache.php`
- ✅ Instalar: Redis en servidor
- ✅ Modificar: `wec.php` para usar cache

---

## 🟡 PRIORIDAD BAJA (Después de 2 semanas)

### 8. Circuit Breaker Pattern
**Objetivo**: Fallback si viglobal está down

```php
// Archivo: c:\xampp\htdocs\api\prod\CircuitBreaker.php

class CircuitBreaker {
    private $state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    private $failureCount = 0;
    private $threshold = 5;
    private $timeout = 300;  // 5 minutos
    private $lastFailureTime;
    
    public function call($callable, $fallback = null) {
        if ($this->state === 'OPEN') {
            if (time() - $this->lastFailureTime > $this->timeout) {
                $this->state = 'HALF_OPEN';
            } else {
                if ($fallback) return $fallback();
                throw new Exception('Circuit breaker is OPEN');
            }
        }
        
        try {
            $result = $callable();
            $this->onSuccess();
            return $result;
        } catch (Exception $e) {
            $this->onFailure();
            if ($fallback) return $fallback();
            throw $e;
        }
    }
    
    private function onSuccess() {
        $this->state = 'CLOSED';
        $this->failureCount = 0;
    }
    
    private function onFailure() {
        $this->failureCount++;
        $this->lastFailureTime = time();
        
        if ($this->failureCount >= $this->threshold) {
            $this->state = 'OPEN';
        }
    }
}
```

**Uso en wec.php**:
```php
$circuitBreaker = new CircuitBreaker();

$result = $circuitBreaker->call(
    function() {
        return $this->runAuth('sp_GET_UserAuthenticated', $arguments);
    },
    function() {
        // Fallback: verificar en curisec como backup
        return $this->run('sp_GET_UserAuthenticated', $arguments);
    }
);
```

---

### 9. Refactorizar Código
**Objetivo**: Separar wec.php en múltiples clases

**Estructura propuesta**:
```
c:\xampp\htdocs\api\prod\Services\
├── AuthenticationService.php
├── TokenService.php
├── PasswordHasher.php
├── JWTService.php
├── TokenCache.php
├── AuditLogger.php
├── RateLimiter.php
└── CircuitBreaker.php

c:\xampp\htdocs\api\prod\Controllers\
├── AuthController.php
├── UserController.php
├── FacilityController.php
└── ...

c:\xampp\htdocs\api\prod\Models\
├── User.php
├── Token.php
├── Facility.php
└── ...
```

**AuthenticationService.php**:
```php
class AuthenticationService {
    private $tokenService;
    private $passwordHasher;
    private $auditLogger;
    private $rateLimiter;
    
    public function __construct(
        TokenService $tokenService,
        PasswordHasher $passwordHasher,
        AuditLogger $auditLogger,
        RateLimiter $rateLimiter
    ) {
        $this->tokenService = $tokenService;
        $this->passwordHasher = $passwordHasher;
        $this->auditLogger = $auditLogger;
        $this->rateLimiter = $rateLimiter;
    }
    
    public function authenticate($email, $password, $deviceId) {
        $ipAddress = $_SERVER['REMOTE_ADDR'];
        
        // Rate limiting
        if (!$this->rateLimiter->isAllowed($email, $ipAddress)) {
            $this->auditLogger->log($email, 'login', 'blocked_by_rate_limit');
            return ['status' => false, 'error' => 'Too many attempts'];
        }
        
        // Validar credenciales
        $user = $this->validateCredentials($email, $password);
        if (!$user) {
            $this->auditLogger->log($email, 'login', 'failed', ['reason' => 'invalid_credentials']);
            $this->rateLimiter->recordAttempt($email, $ipAddress, false);
            return ['status' => false, 'error' => 'Invalid credentials'];
        }
        
        // Generar token
        $token = $this->tokenService->generateToken($email, $user['id'], $deviceId);
        
        // Log exitoso
        $this->auditLogger->log($email, 'login', 'success', ['device' => $deviceId]);
        $this->rateLimiter->recordAttempt($email, $ipAddress, true);
        
        return [
            'status' => true,
            'data' => [
                'user_id' => $user['id'],
                'email' => $user['email'],
                'token' => $token,
                'message' => 'Login successful'
            ]
        ];
    }
    
    public function logout($email) {
        $this->tokenService->invalidateToken($email);
        $this->auditLogger->log($email, 'logout', 'success');
        return ['status' => true, 'message' => 'Logout successful'];
    }
    
    // ... más métodos
}
```

---

### 10. Connection Pooling
**Objetivo**: Reutilizar conexiones BD

**Opción 1: Usar Doctrine DBAL**
```php
// composer require doctrine/dbal
// En config.php

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;

$connectionParams = [
    'driver' => 'pdo_sqlsrv',
    'host' => 'localhost,4433',
    'dbname' => 'curisec',
    'user' => 'sa',
    'password' => '3232@lano',
    'driverOptions' => [
        'TrustServerCertificate' => true,
    ],
];

$connection = DriverManager::getConnection($connectionParams);
```

**Opción 2: Usar Pool Simple**
```php
// Archivo: c:\xampp\htdocs\api\prod\ConnectionPool.php

class ConnectionPool {
    private static $pool = [];
    private static $maxConnections = 10;
    private static $config;
    
    public static function getConnection() {
        // Si hay conexión disponible, usar
        if (count(self::$pool) > 0) {
            return array_pop(self::$pool);
        }
        
        // Si no hay pool lleno, crear nueva
        if (count(self::$pool) < self::$maxConnections) {
            return self::createConnection();
        }
        
        // Esperar conexión disponible (bloquear)
        while (count(self::$pool) === 0) {
            usleep(100000);  // 100ms
        }
        return array_pop(self::$pool);
    }
    
    public static function releaseConnection($conn) {
        array_push(self::$pool, $conn);
    }
    
    private static function createConnection() {
        $serverName = MSSQL_SERVER . ',' . MSSQL_PORT;
        return sqlsrv_connect($serverName, self::getConnectionOptions());
    }
}
```

---

### 11. Replicación de viglobal
**Objetivo**: Mejorar disponibilidad y rendimiento

**Configuración SQL Server Replication** (requiere Enterprise Edition):
```sql
-- En servidor master (viglobal)
EXEC sp_replicationdboption @dbname = N'viglobal', 
    @optname = N'publish', @value = N'true'

-- Crear publicación
EXEC sp_addpublication @publication = N'viglobal_pub', 
    @restriction_level_broadcast = 0

-- Agregar artículos (tablas a replicar)
EXEC sp_addarticle @publication = N'viglobal_pub', 
    @article = N'Users', @source_owner = N'dbo', 
    @source_object = N'Users'

EXEC sp_addarticle @publication = N'viglobal_pub', 
    @article = N'UserTokens', @source_owner = N'dbo', 
    @source_object = N'UserTokens'
```

**En PHP, usar réplica para lecturas**:
```php
class DatabaseRouter {
    public static function getReadConnection() {
        // Conectar a réplica (read-only)
        return sqlsrv_connect('replica-server,4433', $options);
    }
    
    public static function getWriteConnection() {
        // Conectar a master
        return sqlsrv_connect('master-server,4433', $options);
    }
}
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1 (Semana 1):
- [ ] Implementar Rate Limiting
- [ ] Mejorar Hashing (Argon2)
- [ ] Agregar Índices BD
- [ ] Activar SSL/Encrypt

### Fase 2 (Semana 2):
- [ ] JWT + Refresh Tokens
- [ ] Audit Logging
- [ ] Circuit Breaker
- [ ] Comenzar Refactoring

### Fase 3 (Semana 3+):
- [ ] Redis Caching
- [ ] Connection Pooling
- [ ] Completar Refactoring
- [ ] Replicación viglobal

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

**Passwords y Secretos**:
- No commitear `config.php` con credenciales reales
- Usar `.env` file: `require '.env.php';`
- En CI/CD: inyectar variables de entorno

**JWT Secret**:
- Generar aleatoriamente: `bin2hex(random_bytes(32))`
- Guardar en `.env` o environment variable
- Rotar cada 6 meses

**HTTPS Obligatorio**:
- En producción: HTTPS solo
- Agregar HSTS header

**CORS**:
- Configurar orígenes permitidos
- No usar `*` en producción

---

## 📚 REFERENCIAS

- [Firebase JWT PHP](https://github.com/firebase/php-jwt)
- [Password Hashing PHP](https://www.php.net/manual/en/function.password-hash.php)
- [SQL Server Security Best Practices](https://docs.microsoft.com/en-us/sql/relational-databases/security/security-center-for-sql-server-database-engine-and-azure-sql-database)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Redis Caching](https://redis.io/docs/)

---

**Última actualización**: 2026-02-01
**Responsable**: Equipo de Desarrollo WoundCare
**Estado**: En Planificación
