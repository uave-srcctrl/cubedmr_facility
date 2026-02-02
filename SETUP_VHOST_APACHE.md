# Configuración de VHost en Apache para WoundCare API

## Paso 1: Agregar Vhosts a Apache

1. Abre: `C:\xampp\apache\conf\extra\httpd-vhosts.conf`

2. Copia el contenido de `VHOST_CONFIGURATION.conf` al final del archivo httpd-vhosts.conf

3. Guarda el archivo

## Paso 2: Actualizar archivo Hosts de Windows

1. Abre Notepad como Administrador

2. Abre: `C:\Windows\System32\drivers\etc\hosts`

3. Agrega esta línea al final:
```
127.0.0.1    api.local
```

4. Guarda el archivo

## Paso 3: Configurar basePath en cada index.php

**Archivo**: `C:\xampp\htdocs\api\prod\index.php`

Asegúrate que basePath esté vacío (para un único endpoint consolidado):
```php
$app = AppFactory::create();
$app->setBasePath("");  // Vacío porque api.local apunta directamente a /prod
```

## Paso 4: Reiniciar Apache

1. Abre XAMPP Control Panel
2. Detén Apache
3. Inicia Apache nuevamente

## Paso 5: Verificar configuración

Ahora puedes acceder a:

```
https://api.local/get              → WoundCare API
https://api.local/tryLogin         → Login endpoint
https://api.local/test-mssql.php   → Test MSSQL connection
```

## Configurar Cliente React/Flutter

En tu cliente, actualiza la URL de la API:

```typescript
const API_BASE = "https://api.local";

// Ejemplo de uso:
const response = await fetch(`${API_BASE}/tryLogin`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password, deviceId })
});
```

## Solucionar problemas comunes

### Problema: "Could not find host"
- Verificar que las entradas estén correctamente añadidas en `hosts`
- Ejecutar: `ipconfig /flushdns` en CMD (como Admin) para limpiar cache DNS

### Problema: Error 404 después de cambiar basePath
- Asegúrate que el basePath coincida con la ruta de acceso
- Ejemplo: si accedes a `http://api-dev.local/get`, basePath debe ser vacío ""

### Problema: Rewrite rules no funcionan
- Verifica que mod_rewrite está habilitado en Apache
- En `httpd.conf`, busca y descomenta: `LoadModule rewrite_module modules/mod_rewrite.so`

### Problema: Permiso denegado
- Verifica que la carpeta tiene permisos correctos
- Las líneas `<Directory>` en httpd-vhosts.conf tienen `Require all granted`
