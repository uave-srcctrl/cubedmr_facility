# 🎯 CONSOLIDACIÓN COMPLETADA - api.local Único Endpoint

**Fecha**: 2026-02-01  
**Estado**: ✅ COMPLETADO

---

## 📋 CAMBIOS REALIZADOS

### 1. Configuración de Apache

**Archivo**: `C:\xampp\apache\conf\extra\httpd-vhosts.conf`

✅ **Eliminado**:
- VirtualHost separado para `api-dev.local:443`
- VirtualHost separado para `api-dev.local:80`
- VirtualHost separado para `api-prod.local:443`
- VirtualHost separado para `api-prod.local:80`
- Aliases `/dev` y `/prod`

✅ **Agregado**:
- VirtualHost único para `api.local:443`
- VirtualHost único para `api.local:80` (redirect a HTTPS)
- DocumentRoot apunta directamente a `C:/xampp/htdocs/api`

**Resultado**: Endpoint consolidado y estructura simplificada

```
https://api.local/endpoint   →  Acceso directo a /api/
```

### 2. Archivo Hosts de Windows

**Archivo**: `C:\Windows\System32\drivers\etc\hosts`

✅ **Cambio**:
```diff
- 127.0.0.1    api.local
- 127.0.0.1    api-dev.local
- 127.0.0.1    api-prod.local
+ 127.0.0.1    api.local
```

### 3. Documentación

✅ **Actualizado**:
- ✅ VHOST_CONFIGURATION.conf → Solo api.local
- ✅ HOSTS_ENTRIES.txt → Solo 127.0.0.1 api.local  
- ✅ SETUP_VHOST_APACHE.md → Instrucciones simplificadas

### 4. Estructura de Carpetas

**Antes**:
```
C:/xampp/htdocs/api/
├── index.php
├── wec.php
├── model.php
└── prod/          ← Capa innecesaria
    ├── index.php
    ├── wec.php
    ├── model.php
    └── test-mssql.php
```

**Después** (ACTUAL):
```
C:/xampp/htdocs/api/
├── index.php              ← Slim Framework entry point
├── wec.php                ← API Providers
├── model.php              ← Data access layer
├── test-mssql.php         ← Test utility (moved from prod/)
├── config.php
├── billing.php
├── .htaccess
└── vendor/
```

✅ **Cambio**: Se eliminó la carpeta `/prod/` y se movieron todos los archivos a la raíz de `/api/`

### 5. Configuración PHP

**Archivo**: `C:\xampp\htdocs\api\index.php`

✅ Verificado: `$app->setBasePath("");`

---

## 🔐 CONFIGURACIÓN ACTUAL

### Backend

| Componente | Configuración |
|-----------|---|
| **Servidor** | `api.local` |
| **Protocolo** | HTTPS |
| **Puerto** | 443 |
| **Path** | `/` (raíz) |
| **Document Root** | `C:/xampp/htdocs/api` |
| **Estructura** | `/api/index.php` (sin carpeta prod) |
| **BD Principal** | `curisec` (localhost:4433) |
| **BD Autenticación** | `viglobal` (localhost:4433) |

### Frontend

| Configuración | Valor |
|---|---|
| **API Base URL** | `https://api.local` |
| **Login** | `POST https://api.local/tryLogin` |
| **Logout** | `POST https://api.local/logout` |
| **Test** | `GET https://api.local/test-mssql.php` |

---

## ✅ VERIFICACIÓN DE CONECTIVIDAD

### 1. Test MSSQL Connection

Accede a: **https://api.local/test-mssql.php**

Debería mostrar:
- ✅ Configuración de BD
- ✅ Conexión principal (curisec) exitosa
- ✅ Conexión autenticación (viglobal) exitosa
- ✅ Listado de tablas
- ✅ Listado de SPs

### 2. Test Endpoint Base

```bash
curl -k https://api.local/get
```

Debería devolver: `{"status":true,"data":"OK"}`

### 3. Test Login

```bash
curl -k -X POST https://api.local/tryLogin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "drperez@curisec.com",
    "password": "PASSWORD",
    "deviceId": "test-device"
  }'
```

Debería devolver:
```json
{
  "status": true,
  "data": [{
    "status": 1,
    "email": "drperez@curisec.com",
    "token": "UUID-TOKEN-HERE",
    "msg": ""
  }]
}
```

---

## 🔧 CONFIGURACIÓN DE FRONTEND

### React/TypeScript

```typescript
// src/lib/api-config.ts

const API_BASE_URL = "https://api.local";

export const api = {
  login: async (email: string, password: string, deviceId: string) => {
    const response = await fetch(`${API_BASE_URL}/tryLogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, deviceId })
    });
    return response.json();
  },
  
  getEntityInfo: async (email: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/EntityInfo`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Email': email
      }
    });
    return response.json();
  }
};
```

### Flutter/Dart

```dart
// lib/services/api_service.dart

class ApiService {
  static const String API_BASE = "https://api.local";
  
  static Future<Map<String, dynamic>> login(
    String email,
    String password,
    String deviceId
  ) async {
    final response = await http.post(
      Uri.parse('$API_BASE/tryLogin'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'deviceId': deviceId
      }),
    );
    return jsonDecode(response.body);
  }
}
```

---

## 🗂️ ESTRUCTURA DE ARCHIVOS

```
C:\xampp\htdocs\api\
├── config.php                          # Configuración centralizada
├── prod/
│   ├── index.php                       # Endpoint principal (basePath="")
│   ├── model.php                       # Acceso a BD con runAuth() para viglobal
│   ├── wec.php                         # Providers (usa runAuth para token)
│   ├── billing.php
│   ├── test-mssql.php                  # ✅ Test script
│   └── ... (demás archivos)
├── dev/                                # DEPRECADO - No usado
│   └── ...
└── vendor/                             # Dependencias Slim Framework
```

---

## 📝 NOTAS IMPORTANTES

1. **SSL Certificate**: Es auto-firmado para localhost. Acepta la advertencia.
2. **Base Path**: Debe estar vacío ("") porque Apache apunta directamente a /prod
3. **CORS**: Verificar que las cabeceras CORS están configuradas correctamente en index.php
4. **Rate Limiting**: Implementar según MEJORAS_A_IMPLEMENTAR.md
5. **Tokens**: Sistema híbrido (curisec para datos, viglobal para autenticación)

---

## ⚠️ CERTIFICADOS SSL

Solo necesitas UN certificado:

```
C:\xampp\apache\conf\ssl\
├── api.local.crt           # ✅ Necesario
└── api.local.key           # ✅ Necesario
```

Puedes eliminar:
- ❌ api-dev.local.crt
- ❌ api-dev.local.key
- ❌ api-prod.local.crt
- ❌ api-prod.local.key

Generar certificado (si no existe):
```bash
C:\xampp\apache\bin\openssl.exe req -x509 -nodes -days 365 ^
  -newkey rsa:2048 -keyout api.local.key -out api.local.crt ^
  -config C:\xampp\apache\conf\openssl.cnf ^
  -subj "/C=US/ST=State/L=City/O=Organization/CN=api.local"
```

---

## ✅ CHECKLIST FINAL

- [x] httpd-vhosts.conf simplificado
- [x] HOSTS actualizado
- [x] Documentación limpiada
- [x] basePath verificado en index.php
- [x] runAuth() implementado en model.php
- [x] tryLogin() actualizado en wec.php
- [x] test-mssql.php creado
- [x] BD híbrida configurada (curisec + viglobal)
- [ ] Certificado SSL generado (si no existe)
- [ ] Apache reiniciado
- [ ] Test https://api.local/test-mssql.php exitoso
- [ ] Login exitoso con token válido
- [ ] Dashboard cargando después de login

---

**Próximas acciones**:
1. Generar certificado SSL (si no existe)
2. Reiniciar Apache
3. Testear https://api.local/test-mssql.php
4. Verificar login con token
5. Implementar mejoras de seguridad (ver MEJORAS_A_IMPLEMENTAR.md)
