# 📋 Copiar Tabla Facilities al Schema facility

## Descripción

Este procedimiento copia la tabla `Facilities` de `remoteWoundcareDB` al schema `facility` en la base de datos local `curisec` en SQL Server (`190.92.153.67:1433`).

---

## 📊 Opciones de Ejecución

Tienes dos formas de copiar la tabla:

### Opción 1: Ejecutar SQL Script Directamente (Recomendado)

**Requisitos:**
- SQL Server Management Studio (SSMS)
- Acceso a SQL Server en `190.92.153.67:1433`
- Credenciales: `curisec` / `curisec123`

**Pasos:**

1. **Abre SQL Server Management Studio**

2. **Conecta a la BD remota:**
   - Server name: `190.92.153.67,1433`
   - Authentication: SQL Server Authentication
   - Login: `curisec`
   - Password: `curisec123`
   - Database: `curisec`

3. **Abre el archivo SQL:**
   ```
   File → Open → copy-facilities-to-facility-schema.sql
   ```

4. **Ejecuta el script:**
   - Presiona `F5` o `Execute`
   - El script se ejecutará en pasos:
     1. Crea el schema `facility` si no existe
     2. Crea la tabla `facility.facilities` con estructura apropiada
     3. Crea servidor vinculado a `remoteWoundcareDB`
     4. Copia los datos de `Facilities`
     5. Crea índices para optimizar
     6. Verifica que todo se copió correctamente

5. **Revisa los resultados:**
   - Verá la estructura de la tabla
   - Listado de facilities copiados
   - Estadísticas (total, activos, inactivos)

### Opción 2: Ejecutar Script Node.js

**Requisitos:**
- Node.js 14+
- Paquete `mssql` instalado

**Pasos:**

1. **Instala las dependencias (si no las tienes):**
   ```bash
   npm install mssql
   ```

2. **Ejecuta el script:**
   ```bash
   node copy-facilities-to-facility-schema.js
   ```

3. **Verifica los resultados:**
   - Mostará la estructura de la tabla
   - Listará los facilities copiados
   - Mostrará estadísticas

**Ventajas del método Node.js:**
- ✅ Mejor manejo de errores
- ✅ Mensajes más claros y formatead
- ✅ Logging detallado de cada paso
- ✅ Fallback automático si algo falla

---

## 🔍 Qué Hace el Script

### Paso 1: Crear Schema
```sql
CREATE SCHEMA facility
```
Crea el schema `facility` si no existe (donde vivirá la tabla).

### Paso 2: Crear Tabla
```sql
CREATE TABLE [facility].[facilities] (
  [FacilityId] INT NOT NULL PRIMARY KEY,
  [FacilityName] VARCHAR(255) NOT NULL,
  [IsActive] BIT NOT NULL DEFAULT 1,
  [CreatedDate] DATETIME DEFAULT GETDATE(),
  [UpdatedDate] DATETIME DEFAULT GETDATE()
)
```

Crea la tabla con estructura apropiada.

### Paso 3: Crear Servidor Vinculado
```sql
EXEC sp_addlinkedserver @server = 'REMOTE_WOUNDCARE', ...
EXEC sp_addlinkedsrvlogin @rmtsrvname = 'REMOTE_WOUNDCARE', ...
```

Permite que SQL Server acceda a `remoteWoundcareDB` como si fuera local.

### Paso 4: Copiar Datos
```sql
INSERT INTO [facility].[facilities] (...)
SELECT * FROM [REMOTE_WOUNDCARE].[remoteWoundcareDB].[dbo].[Facilities]
WHERE NOT EXISTS (...)  -- Evita duplicados
```

Copia los datos sin crear duplicados.

### Paso 5: Crear Índices
```sql
CREATE INDEX IDX_facilities_IsActive ON [facility].[facilities](IsActive)
```

Mejora el rendimiento de búsquedas por estado activo.

---

## ✅ Verificación Post-Ejecución

Después de ejecutar, verifica que todo esté correcto:

**1. Verificar que la tabla existe:**
```sql
SELECT COUNT(*) FROM [facility].[facilities]
```

**2. Verificar estructura:**
```sql
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'facility' 
  AND TABLE_NAME = 'facilities'
```

**3. Ver datos copiados:**
```sql
SELECT 
  FacilityId,
  FacilityName,
  IsActive
FROM [facility].[facilities]
ORDER BY FacilityId
```

**4. Contar facilities activos e inactivos:**
```sql
SELECT 
  COUNT(*) AS Total,
  SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS Activos,
  SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END) AS Inactivos
FROM [facility].[facilities]
```

---

## 🆘 Solución de Problemas

### Problema: "Servidor vinculado no se puede crear"

**Causa:** Puede haber problemas de conectividad o permisos

**Solución:**
1. Verifica que `remoteWoundcareDB` está disponible
2. Prueba la conexión manualmente desde SSMS
3. Verifica los permisos del usuario `curisec`

### Problema: "La tabla ya existe"

**Causa:** La tabla `facility.facilities` ya existe

**Solución:**
- Si quieres actualizar los datos, comenta la línea de `CREATE TABLE`
- Si quieres comenzar de cero:
  ```sql
  DROP TABLE [facility].[facilities]
  -- Luego ejecuta el script nuevamente
  ```

### Problema: "Error de autenticación"

**Causa:** Credenciales incorrectas o usuario no tiene permisos

**Solución:**
1. Verifica usuario: `curisec`
2. Verifica contraseña: `curisec123`
3. Verifica que el usuario tiene permisos en la BD remota

### Problema: "No hay datos copiados"

**Causa:** La tabla `Facilities` está vacía o el servidor vinculado no funciona

**Solución:**
1. Verifica que existen datos en `remoteWoundcareDB.dbo.Facilities`
2. Prueba la conectividad al servidor remoto

---

## 📋 Estructura de la Tabla Copiada

| Columna | Tipo | Obligatorio | Descripción |
|---------|------|-------------|-------------|
| FacilityId | INT | ✅ | ID único de la instalación |
| FacilityName | VARCHAR(255) | ✅ | Nombre de la instalación |
| IsActive | BIT | ✅ | 1=Activo, 0=Inactivo |
| CreatedDate | DATETIME | ✅ | Fecha de creación |
| UpdatedDate | DATETIME | ✅ | Fecha de última actualización |

---

## 🔄 Ejecutar Periódicamente

Si necesitas sincronizar los datos periódicamente, puedes:

**Opción A: Ejecutar el script nuevamente**
- El script tiene validación de `NOT EXISTS` que previene duplicados
- Solo insertará facilities nuevos

**Opción B: Crear un procedimiento automático**
```sql
-- Crear trabajo SQL Agent que ejecute el sync cada día
EXEC sp_add_job @job_name = 'Sync_Facilities_Daily'
```

---

## 📞 Verificación de Conectividad

Antes de ejecutar, verifica que puedes conectarte a `remoteWoundcareDB`:

**Desde SQL Server Management Studio:**
```
Server name: 190.92.153.67,1433
Authentication: SQL Server Authentication
Login: curisec
Password: curisec123
Database: curisec
Test Connection → OK
```

**Desde Node.js:**
```bash
node -e "
const sql = require('mssql');
const config = {
  server: '190.92.153.67',
  port: 1433,
  database: 'curisec',
  authentication: {
    type: 'default',
    options: { userName: 'curisec', password: 'curisec123' }
  },
  options: { encrypt: false, trustServerCertificate: true }
};
new sql.ConnectionPool(config)
  .connect()
  .then(() => console.log('✅ Conexión exitosa'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

---

## ✨ Después de Copiar

Una vez que tengas la tabla `facility.facilities` copiada, puedes:

1. **Usar en queries locales:**
   ```sql
   SELECT * FROM [facility].[facilities]
   ```

2. **Crear relaciones con otras tablas:**
   ```sql
   ALTER TABLE [facility].[wound_encounters]
   ADD FOREIGN KEY (facility_id) 
   REFERENCES [facility].[facilities](FacilityId)
   ```

3. **Crear vistas para acceso más fácil:**
   ```sql
   CREATE VIEW [facility].[v_active_facilities] AS
   SELECT * FROM [facility].[facilities]
   WHERE IsActive = 1
   ```

---

**Estado:** ✅ Listo para ejecutar
**Última actualización:** 2025-01-20
**Versión:** 1.0

