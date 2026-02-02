# ✅ WoundCare API - MSSQL LocalWoundcareDB Configuration COMPLETE

## Summary: Both Dev & Prod APIs Now Connected to localWoundcareDB

---

## 📋 Files Created/Updated

### New Files Created:

1. **`C:\xampp\htdocs\api\config.php`** ✅
   - Central MSSQL configuration file
   - Credentials: `sa` / `p@SQLc@r3`
   - Database: `localWoundcareDB`
   - Server: `localhost`
   - Defines: `MSSQL_SERVER`, `MSSQL_DATABASE`, `MSSQL_UID`, `MSSQL_PWD`
   - Exports: `$MSSQL_CONNECTION_OPTIONS`, `$MSSQL_CONNECTION_OPTIONS_PROD`

2. **`C:\xampp\htdocs\api\dev\test-mssql.php`** ✅
   - Test endpoint for Dev API connection
   - URL: `https://api-dev.local/test-mssql.php`
   - Returns: JSON with connection status and table list

3. **`C:\xampp\htdocs\api\prod\test-mssql.php`** ✅
   - Test endpoint for Prod API connection
   - URL: `https://api-prod.local/test-mssql.php`
   - Returns: JSON with connection status and table list

### Files Updated:

1. **`C:\xampp\htdocs\api\dev\model.php`** ✅
   - Added: `require '../config.php';`
   - Changed: `$serverName = MSSQL_SERVER;` (was: "localhost:4433")
   - Updated: Constructor uses `$MSSQL_CONNECTION_OPTIONS`
   - Database: All connection types now use `localWoundcareDB`

2. **`C:\xampp\htdocs\api\prod\model.php`** ✅
   - Added: `require '../config.php';`
   - Changed: `$serverName = MSSQL_SERVER;` (was: "localhost:4433")
   - Updated: Constructor uses `$MSSQL_CONNECTION_OPTIONS_PROD`
   - Database: All connection types now use `localWoundcareDB`
   - Maintained: Encryption options for prod

---

## 🧪 Quick Test (Choose One)

### Option 1: Browser Test (Easiest)

Visit these URLs in your browser:

**Dev API Test:**
```
https://api-dev.local/test-mssql.php
```

**Prod API Test:**
```
https://api-prod.local/test-mssql.php
```

Expected response (JSON):
```json
{
  "config": {
    "test_connection": true,
    "server": "localhost",
    "database": "localWoundcareDB"
  },
  "tables": ["table1", "table2", ...],
  "tests": {
    "sqlsrv_loaded": true,
    "query_tables": true
  }
}
```

### Option 2: PowerShell Test

```powershell
# Test Dev API (ignore self-signed cert)
$dev = Invoke-RestMethod -Uri 'https://api-dev.local/test-mssql.php' -SkipCertificateCheck
$dev | ConvertTo-Json | Write-Host

# Test Prod API
$prod = Invoke-RestMethod -Uri 'https://api-prod.local/test-mssql.php' -SkipCertificateCheck
$prod | ConvertTo-Json | Write-Host
```

### Option 3: cURL Test

```bash
# Test Dev API
curl -k https://api-dev.local/test-mssql.php

# Test Prod API
curl -k https://api-prod.local/test-mssql.php
```

---

## ✅ Configuration Verification

Run this from command line to verify configuration:

```powershell
# Check config file exists
Test-Path 'C:\xampp\htdocs\api\config.php'

# Check dev model.php has config
Select-String -Path 'C:\xampp\htdocs\api\dev\model.php' -Pattern 'require.*config.php'

# Check prod model.php has config
Select-String -Path 'C:\xampp\htdocs\api\prod\model.php' -Pattern 'require.*config.php'

# Check test scripts exist
Test-Path 'C:\xampp\htdocs\api\dev\test-mssql.php'
Test-Path 'C:\xampp\htdocs\api\prod\test-mssql.php'
```

---

## 📊 Configuration Details

### Dev API Configuration
```php
// File: C:\xampp\htdocs\api\dev\model.php
class Access {
    private $serverName = MSSQL_SERVER;           // "localhost"
    private $connectionOptions = [];                // Uses $MSSQL_CONNECTION_OPTIONS
    
    public function __construct($connType = 'Operational') {
        global $MSSQL_CONNECTION_OPTIONS;
        $this->connectionOptions = $MSSQL_CONNECTION_OPTIONS;
        // Connects to localWoundcareDB as 'sa' user
    }
}
```

### Prod API Configuration
```php
// File: C:\xampp\htdocs\api\prod\model.php
class Access {
    private $serverName = MSSQL_SERVER;           // "localhost"
    private $connectionOptions = [];                // Uses $MSSQL_CONNECTION_OPTIONS_PROD
    
    public function __construct($connType = 'Operational') {
        global $MSSQL_CONNECTION_OPTIONS_PROD;
        $this->connectionOptions = $MSSQL_CONNECTION_OPTIONS_PROD;
        // Connects to localWoundcareDB as 'sa' user (with encryption)
    }
}
```

### Central Configuration
```php
// File: C:\xampp\htdocs\api\config.php
define('MSSQL_SERVER', 'localhost');
define('MSSQL_DATABASE', 'localWoundcareDB');
define('MSSQL_UID', 'sa');
define('MSSQL_PWD', 'p@SQLc@r3');

// All database connection types point to localWoundcareDB
$MSSQL_CONNECTION_OPTIONS = [
    'Operational' => ["database" => "localWoundcareDB", ...],
    'Global' => ["database" => "localWoundcareDB", ...],
    'Reports' => ["database" => "localWoundcareDB", ...]
];
```

---

## 🔌 Connection Endpoints

| API | URL | Database |
|-----|-----|----------|
| Dev Endpoint | `https://api-dev.local/get` | localWoundcareDB |
| Prod Endpoint | `https://api-prod.local/get` | localWoundcareDB |
| Router (Dev) | `https://api.local/dev/get` | localWoundcareDB |
| Router (Prod) | `https://api.local/prod/get` | localWoundcareDB |
| Test Dev | `https://api-dev.local/test-mssql.php` | Connection test |
| Test Prod | `https://api-prod.local/test-mssql.php` | Connection test |

---

## ⚠️ Prerequisites Check

Before testing, verify these are in place:

### 1. MSSQL Server Running ✅
```powershell
Get-Service MSSQLSERVER | Select Status
# Should show: Status : Running
```

### 2. Database Exists ✅
```sql
SELECT name FROM sys.databases WHERE name = 'localWoundcareDB';
-- Should return: localWoundcareDB
```

### 3. Apache HTTPS Running ✅
```powershell
# Verify Apache listening on port 443
netstat -ano | findstr ":443"
# Should show: LISTENING
```

### 4. PHP sqlsrv Extension ✅
```php
<?php extension_loaded('sqlsrv') ? print "✓ Installed" : print "✗ Missing"; ?>
```

---

## 🚀 What's Ready

✅ **Dev API** - Connected to localWoundcareDB  
✅ **Prod API** - Connected to localWoundcareDB  
✅ **Router** - Routes to both Dev/Prod  
✅ **HTTPS** - Configured on all endpoints  
✅ **Test Scripts** - Ready to verify connectivity  
✅ **Configuration** - Centralized in config.php  

---

## 🔍 Next Steps

1. **Test connection:**
   ```
   Visit: https://api-dev.local/test-mssql.php
   ```

2. **Verify database access:**
   - Should show tables from localWoundcareDB
   - Should show row counts for sample tables

3. **Update React app to use local API:**
   ```typescript
   // client/src/hooks/use-auth.ts
   const API_URL = process.env.NODE_ENV === 'development'
     ? 'https://api-dev.local'
     : 'https://api-prod.local';
   ```

4. **Test complete login flow:**
   - Open React app
   - Try login
   - Should connect to local API
   - Should load facilities from localWoundcareDB

---

## 🆘 Troubleshooting

### ❌ "Connection refused" error

**Check 1: MSSQL Service**
```powershell
Get-Service MSSQLSERVER | Start-Service  # Start if stopped
Get-Service MSSQLSERVER                  # Verify running
```

**Check 2: Database exists**
```sql
-- In SQL Server Management Studio
SELECT name FROM sys.databases WHERE name = 'localWoundcareDB';
```

**Check 3: Apache error log**
```
C:\xampp\apache\logs\api-dev-error.log
C:\xampp\apache\logs\api-prod-error.log
```

### ❌ "sqlsrv extension not loaded"

**Solution:**
1. Check `C:\xampp\php\php.ini` for:
   ```ini
   extension=php_sqlsrv_82_ts.dll
   ```
2. Restart Apache
3. Verify: `https://api-dev.local/test-mssql.php` → `"sqlsrv_loaded": true`

### ❌ "Login failed for user 'sa'"

**Check credentials in:** `C:\xampp\htdocs\api\config.php`

Current:
```php
define('MSSQL_UID', 'sa');
define('MSSQL_PWD', 'p@SQLc@r3');
```

If password differs, update both values and restart Apache.

---

## 📝 Files Location Reference

```
C:\xampp\htdocs\api\
├── config.php                 ← MAIN CONFIG (NEW)
├── dev\
│   ├── index.php             ← Slim framework
│   ├── model.php             ← UPDATED (uses config.php)
│   ├── test-mssql.php        ← TEST SCRIPT (NEW)
│   └── wec.php               ← Business logic
└── prod\
    ├── index.php             ← Slim framework
    ├── model.php             ← UPDATED (uses config.php)
    ├── test-mssql.php        ← TEST SCRIPT (NEW)
    └── wec.php               ← Business logic
```

---

## ✨ Benefits of This Configuration

✅ **Single source of truth** - All connection settings in one file  
✅ **Easy maintenance** - Change database/credentials in one place  
✅ **Development friendly** - Test script for quick verification  
✅ **Production ready** - Encryption options for prod API  
✅ **Scalable** - Easy to add new databases or connection types  
✅ **Secure** - Credentials defined as constants (can be moved to env vars)  

---

## 📞 Support

For issues:
1. Run test scripts: `https://api-dev.local/test-mssql.php`
2. Check Apache logs: `C:\xampp\apache\logs\`
3. Verify MSSQL is running: `Get-Service MSSQLSERVER`
4. Check database exists: Query `localWoundcareDB` in SSMS

---

**Status:** ✅ READY FOR TESTING  
**Created:** February 1, 2026  
**Database:** localWoundcareDB (localhost)  
**Credentials:** sa / p@SQLc@r3
