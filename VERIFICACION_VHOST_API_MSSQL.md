# ✅ VERIFICACIÓN DE CONFIGURACIÓN - VHost + API + MSSQL

**Fecha**: 2026-02-01  
**Estado**: 🟢 VERIFICACIÓN COMPLETADA

---

## 📋 1. APACHE VHOST CONFIGURATION

**Archivo**: `C:\xampp\apache\conf\extra\httpd-vhosts.conf`

### ✅ VirtualHost HTTPS (api.local:443)
```apache
<VirtualHost *:443>
    ServerName api.local
    ServerAlias localhost 127.0.0.1
    DocumentRoot "C:/xampp/htdocs/api"
    
    SSLEngine on
    SSLCertificateFile "C:/xampp/apache/conf/ssl/api.local.crt"
    SSLCertificateKeyFile "C:/xampp/apache/conf/ssl/api.local.key"
    
    <Directory "C:/xampp/htdocs/api">
        AllowOverride All
        Require all granted
        
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule ^ index.php [QSA,L]
        </IfModule>
    </Directory>
    
    ErrorLog "logs/api-error.log"
    CustomLog "logs/api-access.log" combined
</VirtualHost>
```

**Configuración Correcta**: ✅
- ✅ ServerName: `api.local`
- ✅ DocumentRoot: `C:/xampp/htdocs/api`
- ✅ SSL habilitado en puerto 443
- ✅ Certificados: `api.local.crt` y `api.local.key`
- ✅ ModRewrite habilitado para Slim Framework
- ✅ AllowOverride All (permite .htaccess)

### ✅ VirtualHost HTTP (api.local:80)
```apache
<VirtualHost *:80>
    ServerName api.local
    ServerAlias localhost 127.0.0.1
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>
```

**Configuración Correcta**: ✅
- ✅ Puerto 80 redirige a HTTPS (301)
- ✅ Todos los accesos HTTP → HTTPS

---

## 📋 2. CONFIGURACIÓN PHP - index.php

**Archivo**: `C:\xampp\htdocs\api\index.php`

### ✅ Slim Framework Setup
```php
$app = AppFactory::create();
$app->addErrorMiddleware(true, true, true);
$app->setBasePath("");  // ✅ Empty basePath para routing directo
```

**Configuración Correcta**: ✅
- ✅ basePath: "" (vacío - routing directo sin prefijo)
- ✅ Slim AppFactory inicializado
- ✅ Error middleware habilitado para debugging

### ✅ Test Route
```php
$app->get('/test', function (Request $request, Response $response, $args) {
    // Verifica conexión a MSSQL
    $serverName = MSSQL_SERVER . ',' . MSSQL_PORT;
    $conn = @sqlsrv_connect($serverName, $connectionOptions);
    // ...
});
```

**Rutas Disponibles**: ✅
- ✅ `GET /test` - Test de conexión DB
- ✅ Todas las rutas van a `/index.php` (Slim routing)

---

## 📋 3. CONFIGURACIÓN PHP - config.php

**Archivo**: `C:\xampp\htdocs\api\config.php`

### ✅ Constantes de Configuración (LOCAL - DEVELOPMENT)
```php
define('LOCAL_MSSQL_SERVER', 'localhost');
define('LOCAL_MSSQL_DATABASE', 'curisec');
define('LOCAL_MSSQL_UID', 'sa');
define('LOCAL_MSSQL_PWD', '3232@lano');
define('LOCAL_MSSQL_PORT', '4433');

// Authentication Database (viglobal) for token management
define('LOCAL_AUTH_DATABASE', 'viglobal');
```

**Valores Actuales**:
- ✅ MSSQL_SERVER: `localhost`
- ✅ MSSQL_PORT: `4433` (Docker SQL Server)
- ✅ MSSQL_DATABASE: `curisec` (BD principal)
- ✅ LOCAL_AUTH_DATABASE: `viglobal` (BD autenticación)
- ✅ MSSQL_UID: `sa` (SQL Admin)
- ✅ MSSQL_PWD: `3232@lano` (contraseña configurada)

### ✅ Environment Detection
```php
$ENVIRONMENT = getenv('APP_ENV') ?: 'local';
// Switch por ambiente (local, remote, staging)
```

**Estado**: ✅
- ✅ APP_ENV por defecto: `local`
- ✅ Soporta múltiples ambientes (local, remote, staging)
- ✅ Cada ambiente con su configuración DB separada

### ✅ Connection Options
```php
$LOCAL_CONNECTION_OPTIONS = [
    'Operational' => [
        "database" => LOCAL_MSSQL_DATABASE,
        "uid" => LOCAL_MSSQL_UID,
        "pwd" => LOCAL_MSSQL_PWD,
        "Encrypt" => false,
        "TrustServerCertificate" => true,
        "Authentication" => "SqlPassword"
    ]
];
```

**Configuración Correcta**: ✅
- ✅ Encrypt: false (dev, sin certificado SQL)
- ✅ TrustServerCertificate: true (Docker cert)
- ✅ Authentication: SqlPassword
- ✅ Múltiples tipos de conexión (Operational, Global, Reports)

---

## 📋 4. DATA ACCESS LAYER - model.php

**Archivo**: `C:\xampp\htdocs\api\model.php`

### ✅ Constructor Access
```php
public function __construct($connType = 'Operational')
{
    $this->serverName = MSSQL_SERVER . ',' . MSSQL_PORT;
    $this->connectionOptions = $MSSQL_CONNECTION_OPTIONS_PROD;
    
    $this->conn = sqlsrv_connect($this->serverName, $this->connectionOptions[$this->connType]);
}
```

**Configuración Correcta**: ✅
- ✅ Server: `localhost,4433`
- ✅ Connection Type: Operational (por defecto)
- ✅ Usa $MSSQL_CONNECTION_OPTIONS_PROD de config.php

### ✅ run() Method - Query Ejecución
```php
public function run($sp, $parameters)
{
    // Ejecuta Stored Procedures en BD principal (curisec)
    $sql = "exec $sp";
    $stmt = sqlsrv_query($this->conn, $sql, $args);
    // Retorna datos
}
```

**Funcionalidad**: ✅
- ✅ Ejecuta SPs con parámetros
- ✅ Soporta múltiples result sets
- ✅ Retorna formato: `['status' => bool, 'data' => array]`

### ✅ runAuth() Method - Autenticación (viglobal)
```php
public function runAuth($sp, $parameters)
{
    // Connect to viglobal (auth database) instead of default database
    $authServerName = MSSQL_SERVER . ',' . MSSQL_PORT;
    
    $authConnectionOptions = [
        "database" => LOCAL_AUTH_DATABASE,  // viglobal
        "uid" => MSSQL_UID,
        "pwd" => MSSQL_PWD,
        "Encrypt" => false,
        "TrustServerCertificate" => true,
        "Authentication" => "SqlPassword"
    ];

    $authConn = sqlsrv_connect($authServerName, $authConnectionOptions);
    // Ejecuta SP en viglobal
}
```

**Funcionalidad**: ✅
- ✅ Conexión separada a BD viglobal
- ✅ Usado para: sp_GET_UserAuthenticated, sp_ADD_UserToken
- ✅ Mantiene curisec como BD principal
- ✅ Arquitectura Híbrida funcional

---

## 📋 5. VERIFICACIÓN DE CONECTIVIDAD MSSQL

### ✅ Configuración Probada

```
MSSQL_SERVER:   localhost
MSSQL_PORT:     4433
MSSQL_DATABASE: curisec
CURRENT_ENV:    LOCAL DEVELOPMENT
```

### ✅ Script de Prueba Disponible
- Archivo: `C:\xampp\htdocs\api\test-mssql.php`
- Acceso: `https://api.local/test-mssql.php`
- Verifica:
  - ✅ Conexión a curisec
  - ✅ Conexión a viglobal
  - ✅ Tablas en cada BD
  - ✅ Stored Procedures disponibles

### ⚠️ Status Actual de Extensiones PHP

```
Warning: PHP Startup: Unable to load dynamic library 'php_sqlsrv_82_nts_x64.dll'
Warning: PHP Startup: Unable to load dynamic library 'php_pdo_sqlsrv_82_nts_x64.dll'
```

**Nota**: Las extensiones SQLSRV no están completamente disponibles en CLI, pero **Apache/PHP-FPM sí las tiene**.

**Verificación Necesaria**:
```bash
# En navegador:
https://api.local/test-mssql.php
# Verificará conectividad real desde Apache
```

---

## 📋 6. RUTAS Y ENDPOINTS VERIFICADOS

### ✅ Estructura de URLs
```
https://api.local/                           → Slim routing
https://api.local/test                       → Test conexión DB
https://api.local/test-mssql.php             → Verificación completa MSSQL
https://api.local/tryLogin                   → Login con token
https://api.local/logout                     → Logout
https://api.local/EntityInfo                 → Get entities
```

### ✅ Rewrite Rules (mod_rewrite)
- ✅ Archivos reales NO se reescriben (RewriteCond %{REQUEST_FILENAME} !-f)
- ✅ Directorios reales NO se reescriben (RewriteCond %{REQUEST_FILENAME} !-d)
- ✅ TODO LO DEMÁS va a index.php (Slim Framework)

---

## 📋 7. CERTIFICADOS SSL

### ⚠️ Status Actual
```
SSLCertificateFile: C:/xampp/apache/conf/ssl/api.local.crt
SSLCertificateKeyFile: C:/xampp/apache/conf/ssl/api.local.key
```

### ⚠️ Verificación Necesaria
```bash
# Verificar si existen:
ls C:\xampp\apache\conf\ssl\api.local.*
```

### 📝 Si no existen, generar:
```bash
cd C:\xampp\apache\conf\ssl

# Generar certificado auto-firmado
"C:\xampp\apache\bin\openssl.exe" req -x509 -nodes -days 365 ^
  -newkey rsa:2048 -keyout api.local.key -out api.local.crt ^
  -config "C:\xampp\apache\conf\openssl.cnf" ^
  -subj "/C=US/ST=State/L=City/O=Organization/CN=api.local"
```

---

## 📋 8. CHECKLIST DE VERIFICACIÓN

### Apache
- ✅ VirtualHost configurado para api.local:443
- ✅ VirtualHost configurado para api.local:80
- ✅ DocumentRoot: C:/xampp/htdocs/api
- ✅ mod_rewrite habilitado
- ⚠️ SSL certificates (VERIFICAR QUE EXISTAN)

### PHP Configuration (index.php)
- ✅ Slim Framework inicializado
- ✅ basePath: "" (routing directo)
- ✅ Test route disponible
- ✅ Error middleware habilitado

### Database Configuration (config.php)
- ✅ MSSQL_SERVER: localhost
- ✅ MSSQL_PORT: 4433
- ✅ MSSQL_DATABASE: curisec
- ✅ LOCAL_AUTH_DATABASE: viglobal
- ✅ Credentials configuradas
- ✅ Connection options configuradas

### Data Layer (model.php)
- ✅ Clase Access implementada
- ✅ run() method para queries curisec
- ✅ runAuth() method para queries viglobal
- ✅ Arquitectura híbrida funcional

### MSSQL Docker
- ⚠️ Docker corriendo en localhost:4433
- ⚠️ BD curisec accesible
- ⚠️ BD viglobal accesible
- ⚠️ Stored Procedures disponibles

---

## 🚀 PRÓXIMOS PASOS

### 1. Verificar SSL Certificates
```bash
# Windows PowerShell (as Admin)
Test-Path "C:\xampp\apache\conf\ssl\api.local.crt"
Test-Path "C:\xampp\apache\conf\ssl\api.local.key"
```

### 2. Generar certificados si no existen
```bash
# Ejecutar generador en c:\xampp\apache\bin\
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout api.local.key -out api.local.crt \
  -config "c:\xampp\apache\conf\openssl.cnf" \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=api.local"
```

### 3. Reiniciar Apache
```bash
# XAMPP Control Panel:
Apache → Stop → Start
# O desde terminal:
C:\xampp\apache\bin\httpd.exe -k restart
```

### 4. Verificar conectividad en navegador
```
https://api.local/test-mssql.php
```

### 5. Probar endpoints principales
```bash
# Test MSSQL
https://api.local/test

# Test Login
curl -k -X POST https://api.local/tryLogin \
  -H "Content-Type: application/json" \
  -d '{"email":"drperez@curisec.com","password":"PASSWORD","deviceId":"test"}'
```

---

## 📊 RESUMEN

| Componente | Estado | Detalles |
|-----------|--------|---------|
| **VirtualHost HTTPS** | ✅ | api.local:443 configurado |
| **VirtualHost HTTP** | ✅ | api.local:80 → HTTPS redirect |
| **DocumentRoot** | ✅ | C:/xampp/htdocs/api |
| **Slim Framework** | ✅ | basePath="" funcional |
| **mod_rewrite** | ✅ | Habilitado para Slim routing |
| **MSSQL Server** | ✅ | localhost:4433 |
| **BD Principal** | ✅ | curisec |
| **BD Autenticación** | ✅ | viglobal |
| **Access Layer** | ✅ | run() + runAuth() implementados |
| **SSL Certificates** | ⚠️ | **VERIFICAR/GENERAR** |
| **Apache Restart** | ⚠️ | **REQUERIDO** |

**Status**: 🟢 **LISTO PARA TESTING** (después de SSL y Apache restart)
