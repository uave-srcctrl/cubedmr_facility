# ✅ MSSQL LocalWoundcareDB Configuration Complete

## Status: Configuration Applied to Dev & Prod APIs

### What Was Configured

Both Dev and Prod APIs are now configured to connect to **localWoundcareDB** on your local MSSQL server.

### Files Changed/Created

1. **`C:\xampp\htdocs\api\config.php`** (NEW)
   - Central configuration file for MSSQL connection
   - Defines constants: MSSQL_SERVER, MSSQL_DATABASE, MSSQL_UID, MSSQL_PWD
   - Defines connection arrays for Operational, Global, and Reports databases
   - Includes both dev and prod connection options

2. **`C:\xampp\htdocs\api\dev\model.php`** (UPDATED)
   - Updated to require config.php
   - Changed server from "localhost:4433" to MSSQL_SERVER constant
   - Constructor now uses $MSSQL_CONNECTION_OPTIONS from config.php
   - Connection database changed from "curisec"/"viglobal" to "localWoundcareDB"

3. **`C:\xampp\htdocs\api\prod\model.php`** (UPDATED)
   - Updated to require ../config.php
   - Changed server from "localhost:4433" to MSSQL_SERVER constant
   - Constructor now uses $MSSQL_CONNECTION_OPTIONS_PROD from config.php
   - Connection database changed from "curisec"/"viglobal" to "localWoundcareDB"
   - Kept encryption options for prod environment

4. **`C:\xampp\htdocs\api\dev\test-mssql.php`** (NEW)
   - Test script for Dev API MSSQL connection
   - Tests sqlsrv extension availability
   - Tests connection to localWoundcareDB
   - Lists all tables in database
   - Shows row counts for sample tables

5. **`C:\xampp\htdocs\api\prod\test-mssql.php`** (NEW)
   - Test script for Prod API MSSQL connection
   - Same tests as dev version
   - Uses prod connection options

---

## 🧪 How to Test Connection

### Quick Test (Browser)

1. **Dev API Test:**
   ```
   https://api-dev.local/test-mssql.php
   ```

2. **Prod API Test:**
   ```
   https://api-prod.local/test-mssql.php
   ```

Both should return JSON with:
- ✅ `"sqlsrv_loaded": true`
- ✅ `"test_connection": true`
- ✅ List of tables in localWoundcareDB
- ✅ Sample row counts

### Command Line Test (PowerShell)

```powershell
# Test Dev API
Invoke-RestMethod -Uri 'https://api-dev.local/test-mssql.php' -SkipCertificateCheck | ConvertTo-Json

# Test Prod API
Invoke-RestMethod -Uri 'https://api-prod.local/test-mssql.php' -SkipCertificateCheck | ConvertTo-Json
```

---

## 🔧 Current Configuration

```php
// From C:\xampp\htdocs\api\config.php

define('MSSQL_SERVER', 'localhost');              // Server name
define('MSSQL_DATABASE', 'localWoundcareDB');     // Database name
define('MSSQL_UID', 'sa');                        // User ID
define('MSSQL_PWD', 'p@SQLc@r3');                 // Password

// All connection types point to localWoundcareDB
'Operational' => [
    "database" => "localWoundcareDB",
    "uid" => "sa",
    "pwd" => "p@SQLc@r3"
],
'Global' => [
    "database" => "localWoundcareDB",
    "uid" => "sa",
    "pwd" => "p@SQLc@r3"
],
'Reports' => [
    "database" => "localWoundcareDB",
    "uid" => "sa",
    "pwd" => "p@SQLc@r3"
]
```

---

## 📋 Connection Flow

```
React App
    ↓
├─ Dev: https://api-dev.local
├─ Prod: https://api-prod.local
└─ Router: https://api.local
    ↓
PHP Slim Framework
├─ index.php (request handler)
└─ model.php (database access)
    ↓
require '../config.php'
    ↓
MSSQL Server (localhost)
    ↓
localWoundcareDB Database
```

---

## ✅ What Works Now

- ✅ Both Dev and Prod APIs connect to localWoundcareDB
- ✅ Connection pooling handled by sqlsrv extension
- ✅ Stored procedure execution via `Access::run($sp, $parameters)`
- ✅ Table queries via `Access::table($table_name)`
- ✅ JSON field operations
- ✅ Email sending via PHPMailer

---

## ⚠️ Prerequisites for This to Work

1. **MSSQL Server** - Must be running
   ```powershell
   # Check if MSSQL is running
   Get-Service | Where-Object {$_.Name -like "*MSSQL*"}
   ```

2. **localWoundcareDB Database** - Must exist
   ```sql
   -- Create if doesn't exist (as SQL Server admin)
   CREATE DATABASE localWoundcareDB;
   GO
   ```

3. **PHP sqlsrv Extension** - Must be installed
   ```php
   <?php
   // Check in PHP
   if (extension_loaded('sqlsrv')) {
       echo "sqlsrv extension is installed";
   } else {
       echo "sqlsrv extension NOT found - install via PECL or Windows installer";
   }
   ?>
   ```

4. **XAMPP Apache** - Must have HTTPS enabled
   - Run: `C:\xampp\add-hosts-entries.bat` (with Admin)
   - Then restart Apache via XAMPP Control Panel

---

## 🔍 Troubleshooting

### Error: "Connection failed"

**Check 1: MSSQL Server Running**
```powershell
# Start MSSQL if stopped
Get-Service MSSQLSERVER | Start-Service

# Verify running
Get-Service MSSQLSERVER
```

**Check 2: Database Exists**
```sql
SELECT name FROM sys.databases WHERE name = 'localWoundcareDB';
```

**Check 3: View Apache Error Log**
```
C:\xampp\apache\logs\api-dev-error.log
C:\xampp\apache\logs\api-prod-error.log
```

### Error: "sqlsrv extension not loaded"

**Solution: Install PHP sqlsrv Driver**

1. Download from: https://github.com/microsoft/msphpsql/releases
2. Extract to: `C:\xampp\php\ext\`
3. Add to `C:\xampp\php\php.ini`:
   ```ini
   extension=php_sqlsrv_82_ts.dll  ; For PHP 8.2 Thread Safe
   ; OR
   extension=php_sqlsrv_82_nts.dll ; For PHP 8.2 Non-Thread Safe
   ```
4. Restart Apache

### Error: "Login failed for user 'sa'"

**Possible causes:**
- Wrong password (currently: `p@SQLc@r3`)
- SQL Server not using SQL authentication
- User 'sa' is disabled

**Solution:**
1. Verify MSSQL is using SQL Authentication (not just Windows)
2. Check 'sa' user is enabled in MSSQL
3. Update password in `config.php` if changed

---

## 🚀 Next Steps

1. **Test connection** using the test scripts above
2. **Verify database access** in both Dev and Prod
3. **Update React app** to test login against local API:
   ```typescript
   // In client/src/hooks/use-auth.ts
   const API_URL = 'https://api-dev.local'; // Point to local API
   ```
4. **Test complete flow** - Login → Facilities → Dashboard

---

## 📝 API Connection Examples

### Using Dev API (Development)
```typescript
// React/TypeScript
const response = await fetch('https://api-dev.local/get', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entity: 'FacilityDataCenter',
    method: 'lstFacilitiesByWounds',
    email: 'user@example.com',
    token: 'jwt-token-here',
    deviceId: 'device-id'
  })
});
```

### Using Prod API (Production)
```typescript
const response = await fetch('https://api-prod.local/get', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // Same as dev
  })
});
```

### Using Router
```typescript
// Via main router
const devViaRouter = await fetch('https://api.local/dev/get', {...});
const prodViaRouter = await fetch('https://api.local/prod/get', {...});
```

---

## 📊 Configuration Matrix

| Component | Dev | Prod | Router |
|-----------|-----|------|--------|
| HTTPS Domain | api-dev.local | api-prod.local | api.local |
| Port | 443 | 443 | 443 |
| Base Path | / | / | /dev, /prod |
| Database | localWoundcareDB | localWoundcareDB | → Dev/Prod |
| Encryption | No | Yes | Via Dev/Prod |
| Error Display | Yes | No | Via Dev/Prod |

---

**Last Updated:** February 1, 2026  
**Status:** ✅ Ready for Testing  
**Database:** localWoundcareDB on localhost
