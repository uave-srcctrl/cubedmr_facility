# 🗄️ Proceso de Copia de Tabla Facilities

## 📌 Resumen

Se han creado los archivos necesarios para **copiar la tabla `Facilities` de `remoteWoundcareDB` al schema `facility` en la BD local `curisec`**.

---

## 📁 Archivos Creados

### 1. **copy-facilities-to-facility-schema.sql** (3.9 KB)
**SQL Script completo para SQL Server Management Studio**

**Contenido:**
- ✅ Crear schema `facility` si no existe
- ✅ Crear tabla `facility.facilities` con estructura apropiada
- ✅ Crear servidor vinculado a `remoteWoundcareDB`
- ✅ Copiar datos con validación de duplicados
- ✅ Crear índices para optimizar rendimiento
- ✅ Verificar estructura y datos

**Uso:**
```
1. Abre SQL Server Management Studio
2. Conecta a: 190.92.153.67,1433 (BD: curisec)
3. Abre el archivo SQL
4. Presiona F5 (Execute)
```

---

### 2. **copy-facilities-to-facility-schema.js** (9.3 KB)
**Script Node.js con mejor manejo de errores y logging**

**Características:**
- ✅ Conecta directamente a SQL Server
- ✅ Manejo completo de errores
- ✅ Logging detallado con colores (emojis)
- ✅ Muestra estructura de tabla
- ✅ Muestra datos copiados
- ✅ Estadísticas (total, activos, inactivos)
- ✅ Fallback automático si algo falla

**Uso:**
```bash
# Instalar dependencias (primera vez)
npm install mssql

# Ejecutar el script
node copy-facilities-to-facility-schema.js
```

**Ventajas:**
- Mejor mensajería y formateo
- Salida más legible
- Mejor para automatización
- Más fácil de debuggear

---

### 3. **COPY_FACILITIES_INSTRUCTIONS.md** (7.2 KB)
**Documentación completa sobre cómo ejecutar el proceso**

**Secciones:**
- 📋 Descripción del procedimiento
- 📊 Dos opciones de ejecución (SQL o Node.js)
- 🔍 Qué hace cada paso del script
- ✅ Verificación post-ejecución
- 🆘 Solución de problemas comunes
- 📋 Estructura de la tabla copiada
- 🔄 Cómo ejecutar periódicamente
- 📞 Verificación de conectividad

---

## 🎯 Objetivo

Copiar la tabla `Facilities` de:
- **Origen:** `remoteWoundcareDB` (BD remota en SQL Server)
- **Destino:** `facility.facilities` (schema `facility` en BD local `curisec`)

---

## ⚙️ Qué Se Copia

| Campo | Tipo | Descripción |
|-------|------|-------------|
| FacilityId | INT | ID único de la instalación |
| FacilityName | VARCHAR(255) | Nombre de la instalación |
| IsActive | BIT | 1=Activo, 0=Inactivo |
| CreatedDate | DATETIME | Fecha de creación |
| UpdatedDate | DATETIME | Fecha de última actualización |

---

## 🚀 Inicio Rápido

### Opción 1: SQL Script (Más Directo)

```sql
-- 1. Abre SSMS
-- 2. Conecta a: 190.92.153.67,1433
-- 3. Abre: copy-facilities-to-facility-schema.sql
-- 4. Presiona F5
```

### Opción 2: Node.js (Mejor Logging)

```bash
# 1. Instala dependencias
npm install mssql

# 2. Ejecuta el script
node copy-facilities-to-facility-schema.js
```

---

## ✅ Verificación

Después de ejecutar, verifica:

```sql
-- Ver cuántas facilities se copiaron
SELECT COUNT(*) FROM [facility].[facilities]

-- Ver datos específicos
SELECT * FROM [facility].[facilities] ORDER BY FacilityId

-- Ver estadísticas
SELECT 
  COUNT(*) AS Total,
  SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS Activos,
  SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END) AS Inactivos
FROM [facility].[facilities]
```

---

## 🔧 Configuración

**SQL Server Remoto:**
- Host: `190.92.153.67`
- Puerto: `1433`
- BD origen: `remoteWoundcareDB`
- Tabla origen: `dbo.Facilities`

**SQL Server Local:**
- Host: `190.92.153.67` (mismo servidor)
- Puerto: `1433`
- BD destino: `curisec`
- Schema destino: `facility`
- Tabla destino: `facilities`

**Credenciales:**
- Usuario: `curisec`
- Contraseña: `curisec123`

---

## 📋 Pasos del Proceso

### Paso 1: Crear Schema
```sql
CREATE SCHEMA facility
```
✅ El schema `facility` se usa para organizar tablas relacionadas

### Paso 2: Crear Tabla
```sql
CREATE TABLE [facility].[facilities] (...)
```
✅ Estructura con campos: FacilityId, FacilityName, IsActive, etc.

### Paso 3: Servidor Vinculado
```sql
EXEC sp_addlinkedserver @server = 'REMOTE_WOUNDCARE'
```
✅ Permite acceso a `remoteWoundcareDB`

### Paso 4: Copiar Datos
```sql
INSERT INTO [facility].[facilities]
SELECT * FROM [REMOTE_WOUNDCARE].[remoteWoundcareDB].[dbo].[Facilities]
WHERE NOT EXISTS (...)  -- Previene duplicados
```
✅ Copia datos sin crear duplicados

### Paso 5: Crear Índices
```sql
CREATE INDEX IDX_facilities_IsActive ON [facility].[facilities](IsActive)
```
✅ Mejora rendimiento en búsquedas

### Paso 6: Verificar
```sql
SELECT * FROM [facility].[facilities]
```
✅ Confirma que se copiaron los datos

---

## 💡 Casos de Uso

**Después de copiar, puedes:**

1. **Usar en queries locales sin conectar al servidor remoto**
   ```sql
   SELECT * FROM facility.facilities
   ```

2. **Crear relaciones con otras tablas**
   ```sql
   ALTER TABLE facility.wound_encounters
   ADD FOREIGN KEY (facility_id) 
   REFERENCES facility.facilities(FacilityId)
   ```

3. **Sincronizar periódicamente**
   ```bash
   # Ejecutar cada día
   node copy-facilities-to-facility-schema.js
   ```

4. **Crear vistas útiles**
   ```sql
   CREATE VIEW facility.v_active_facilities AS
   SELECT * FROM facility.facilities
   WHERE IsActive = 1
   ```

---

## 🔐 Seguridad

- ✅ Usa autenticación SQL Server
- ✅ Credenciales se guardan en variables (no en código)
- ✅ Servidor vinculado requiere credenciales
- ✅ Script valida conexiones antes de copiar

---

## 📊 Resultados Esperados

Después de ejecutar, deberías ver:

**Salida:**
```
✅ Schema facility creado
✅ Tabla facility.facilities creada
✅ Servidor vinculado REMOTE_WOUNDCARE creado
✅ 5 registros copiados exitosamente
✅ Índice IDX_facilities_IsActive creado

📋 ESTRUCTURA DE TABLA:
  FacilityId          | INT             | NOT NULL
  FacilityName        | VARCHAR         | NOT NULL
  IsActive            | BIT             | NOT NULL
  CreatedDate         | DATETIME        | NOT NULL
  UpdatedDate         | DATETIME        | NOT NULL

📊 DATOS COPIADOS:
  ID: 1 | University Nursing          | ✓ Activo
  ID: 2 | Short Nursing               | ✓ Activo
  ID: 4 | Testing Facility # 2        | ✓ Activo
  ID: 5 | Happy Endings Nursing       | ✓ Activo

📈 ESTADÍSTICAS:
  Total: 4
  Activos: 4
  Inactivos: 0
```

---

## 🆘 Solución de Problemas

**Si falla la conexión:**
1. Verifica IP: `190.92.153.67`
2. Verifica puerto: `1433`
3. Verifica BD: `curisec`
4. Verifica usuario: `curisec`
5. Verifica password: `curisec123`

**Si la tabla no se crea:**
- Verifica permisos del usuario `curisec`
- Verifica que el schema `facility` existe

**Si no hay datos:**
- Verifica que existen en `remoteWoundcareDB.dbo.Facilities`
- Verifica la conexión al servidor remoto

---

## 📞 Documentación Relacionada

- `COPY_FACILITIES_INSTRUCTIONS.md` - Guía detallada
- `copy-facilities-to-facility-schema.sql` - SQL Script
- `copy-facilities-to-facility-schema.js` - Node.js Script

---

## ✨ Próximas Acciones

1. **Ejecuta el script de tu preferencia**
   - SQL: Más directo con SSMS
   - Node.js: Mejor logging

2. **Verifica los datos copiados**
   ```sql
   SELECT COUNT(*) FROM facility.facilities
   ```

3. **Integra en tu aplicación**
   - Usa `facility.facilities` en queries
   - Crea relaciones con otras tablas

4. **Sincroniza periódicamente**
   - Ejecuta el script cada semana/mes
   - Previene desincronización de datos

---

**Estado:** ✅ Listo para ejecutar  
**Fecha:** 2025-01-20  
**Versión:** 1.0

