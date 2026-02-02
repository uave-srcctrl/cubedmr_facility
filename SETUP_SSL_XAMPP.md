# Configuración de SSL Local en XAMPP para Desarrollo

## Resumen
Crear certificados SSL auto-firmados para desarrollo local y configurar XAMPP para servir HTTPS.

---

## Paso 1: Verificar que OpenSSL está disponible en XAMPP

```bash
C:\xampp\apache\bin\openssl.exe version
```

Debería mostrar algo como: `OpenSSL 3.0.x ...`

---

## Paso 2: Crear carpeta para certificados

```bash
mkdir C:\xampp\apache\conf\ssl
cd C:\xampp\apache\conf\ssl
```

---

## Paso 3: Generar certificados auto-firmados

### Para api-dev.local:
```bash
C:\xampp\apache\bin\openssl.exe req -x509 -nodes -days 365 -newkey rsa:2048 -keyout api-dev.local.key -out api-dev.local.crt -config C:\xampp\apache\conf\openssl.cnf -subj "/C=US/ST=State/L=City/O=Organization/CN=api-dev.local"
```

### Para api-prod.local:
```bash
C:\xampp\apache\bin\openssl.exe req -x509 -nodes -days 365 -newkey rsa:2048 -keyout api-prod.local.key -out api-prod.local.crt -config C:\xampp\apache\conf\openssl.cnf -subj "/C=US/ST=State/L=City/O=Organization/CN=api-prod.local"
```

### Para api.local:
```bash
C:\xampp\apache\bin\openssl.exe req -x509 -nodes -days 365 -newkey rsa:2048 -keyout api.local.key -out api.local.crt -config C:\xampp\apache\conf\openssl.cnf -subj "/C=US/ST=State/L=City/O=Organization/CN=api.local"
```

---

## Paso 4: Verificar los certificados creados

```bash
dir C:\xampp\apache\conf\ssl\
```

Deberían existir estos archivos:
```
api-dev.local.crt
api-dev.local.key
api-prod.local.crt
api-prod.local.key
api.local.crt
api.local.key
```

---

## Paso 5: Actualizar httpd-vhosts.conf para HTTPS

Abre: `C:\xampp\apache\conf\extra\httpd-vhosts.conf`

**Reemplaza la configuración anterior con:**

```apache
# ============================================================
# DEVELOPMENT API (HTTPS)
# ============================================================
<VirtualHost *:443>
    ServerName api-dev.local
    ServerAlias localhost
    DocumentRoot "C:/xampp/htdocs/api/dev"
    
    SSLEngine on
    SSLCertificateFile "C:/xampp/apache/conf/ssl/api-dev.local.crt"
    SSLCertificateKeyFile "C:/xampp/apache/conf/ssl/api-dev.local.key"
    
    <Directory "C:/xampp/htdocs/api/dev">
        AllowOverride All
        Require all granted
        
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule ^ index.php [QSA,L]
        </IfModule>
    </Directory>
    
    ErrorLog "logs/api-dev-error.log"
    CustomLog "logs/api-dev-access.log" combined
</VirtualHost>

# Redirect HTTP to HTTPS for dev
<VirtualHost *:80>
    ServerName api-dev.local
    ServerAlias localhost
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

# ============================================================
# PRODUCTION API (HTTPS)
# ============================================================
<VirtualHost *:443>
    ServerName api-prod.local
    DocumentRoot "C:/xampp/htdocs/api/prod"
    
    SSLEngine on
    SSLCertificateFile "C:/xampp/apache/conf/ssl/api-prod.local.crt"
    SSLCertificateKeyFile "C:/xampp/apache/conf/ssl/api-prod.local.key"
    
    <Directory "C:/xampp/htdocs/api/prod">
        AllowOverride All
        Require all granted
        
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule ^ index.php [QSA,L]
        </IfModule>
    </Directory>
    
    ErrorLog "logs/api-prod-error.log"
    CustomLog "logs/api-prod-access.log" combined
</VirtualHost>

# Redirect HTTP to HTTPS for prod
<VirtualHost *:80>
    ServerName api-prod.local
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

# ============================================================
# MAIN API ROUTER (HTTPS)
# ============================================================
<VirtualHost *:443>
    ServerName api.local
    DocumentRoot "C:/xampp/htdocs/api"
    
    SSLEngine on
    SSLCertificateFile "C:/xampp/apache/conf/ssl/api.local.crt"
    SSLCertificateKeyFile "C:/xampp/apache/conf/ssl/api.local.key"
    
    <Directory "C:/xampp/htdocs/api">
        AllowOverride All
        Require all granted
    </Directory>
    
    # Route /dev to dev folder
    Alias /dev "C:/xampp/htdocs/api/dev"
    <Directory "C:/xampp/htdocs/api/dev">
        AllowOverride All
        Require all granted
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule ^ index.php [QSA,L]
        </IfModule>
    </Directory>
    
    # Route /prod to prod folder
    Alias /prod "C:/xampp/htdocs/api/prod"
    <Directory "C:/xampp/htdocs/api/prod">
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

# Redirect HTTP to HTTPS for main api
<VirtualHost *:80>
    ServerName api.local
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>
```

---

## Paso 6: Habilitar módulos SSL en Apache

Abre: `C:\xampp\apache\conf\httpd.conf`

Busca y descomenta estas líneas (quita el `#` del inicio):

```apache
LoadModule ssl_module modules/mod_ssl.so
LoadModule socache_shmcb_module modules/mod_socache_shmcb.so
```

Busca también esta línea y asegúrate que no está comentada:

```apache
Include conf/extra/httpd-ssl.conf
Include conf/extra/httpd-vhosts.conf
```

---

## Paso 7: Reiniciar Apache

1. Abre **XAMPP Control Panel**
2. **Detén Apache** (click en Stop)
3. **Inicia Apache** (click en Start)

Verifica que Apache inicia sin errores. Si hay errores, revisa `C:\xampp\apache\logs\error.log`

---

## Paso 8: Confiar en el certificado local

### Para Firefox:

1. Accede a `https://api-dev.local/`
2. Haz clic en el aviso de seguridad
3. Clic en **"Advanced"**
4. Clic en **"Accept the Risk and Continue"**

El navegador recordará esta decisión.

### Para Chrome:

1. Accede a `https://api-dev.local/`
2. Clic en el icono de candado (no seguro)
3. Clic en **"Certificate is not valid"**
4. Clic en el botón de certificado
5. Ir a **Details** → **Copy to File** → Guardar certificado
6. En Chrome: **Settings** → **Security** → **Manage certificates** → **Authorities** → **Import**
7. Seleccionar el certificado guardado

### Alternativa (más fácil para Chrome):

1. En la URL, escribe: `chrome://flags/#allow-insecure-localhost`
2. Habilita **"Allow invalid certificates for resources loaded from localhost"**
3. Reinicia Chrome

---

## Paso 9: Verificar HTTPS funcionando

Accede a:
- `https://api-dev.local/` - Dev API
- `https://api-prod.local/` - Prod API
- `https://api.local/dev/` - Dev via api.local
- `https://api.local/prod/` - Prod via api.local

---

## Paso 10: Configurar cliente React para HTTPS

**Archivo**: `client/src/lib/api-config.ts`

```typescript
// Cambiar de HTTP a HTTPS
const DEV_API_BASE = process.env.NODE_ENV === 'development' 
  ? 'https://api-dev.local'  // Desarrollo local
  : 'https://api.production.com';  // Producción

const PROD_API_BASE = 'https://api-prod.local';

// O simplemente:
export const LOCAL_API = {
  BASE_URL: 'https://api-dev.local',
  FACILITIES_LIST: 'https://api-dev.local/get',
  // ... resto de endpoints
};
```

---

## Solucionar problemas

### Problema: "Apache won't start"
- Revisa: `C:\xampp\apache\logs\error.log`
- Verifica que los módulos SSL estén habilitados
- Verifica que los certificados existen

### Problema: "SSL_ERROR_RX_RECORD_TOO_LONG"
- Significa que estás accediendo con HTTP a un puerto HTTPS
- Verifica que estés usando `https://` no `http://`

### Problema: "ERR_CERT_AUTHORITY_INVALID"
- El navegador no confía en el certificado auto-firmado
- Sigue los pasos de "Confiar en el certificado" arriba

### Problema: Los certificados expiraron (después de 365 días)
Regenera los certificados:
```bash
cd C:\xampp\apache\conf\ssl
del api-dev.local.*
C:\xampp\apache\bin\openssl.exe req -x509 -nodes -days 365 -newkey rsa:2048 -keyout api-dev.local.key -out api-dev.local.crt -subj "/C=US/ST=State/L=City/O=Organization/CN=api-dev.local"
```

---

## Bonus: Script para generar y renovar certificados

Crea: `C:\xampp\renewSSL.bat`

```batch
@echo off
setlocal enabledelayedexpansion

echo Regenerating SSL certificates...
cd C:\xampp\apache\conf\ssl

echo Removing old certificates...
del /Q *.crt *.key

echo Generating new certificates...
C:\xampp\apache\bin\openssl.exe req -x509 -nodes -days 365 -newkey rsa:2048 -keyout api-dev.local.key -out api-dev.local.crt -subj "/C=US/ST=State/L=City/O=Organization/CN=api-dev.local"
C:\xampp\apache\bin\openssl.exe req -x509 -nodes -days 365 -newkey rsa:2048 -keyout api-prod.local.key -out api-prod.local.crt -subj "/C=US/ST=State/L=City/O=Organization/CN=api-prod.local"
C:\xampp\apache\bin\openssl.exe req -x509 -nodes -days 365 -newkey rsa:2048 -keyout api.local.key -out api.local.crt -subj "/C=US/ST=State/L=City/O=Organization/CN=api.local"

echo Certificates generated successfully!
echo Now restart Apache in XAMPP Control Panel.
pause
```

Ejecuta con doble clic cuando los certificados expiren.
