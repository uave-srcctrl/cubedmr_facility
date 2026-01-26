# ⚡ Referencia Rápida - Comandos y Scripts

## 🎯 Tareas Rápidas

### 1. Ejecutar Copia de Facilities (Excel Import No Relacionado)

**Opción A: Usar SQL Script**
```bash
# Desde línea de comandos (Windows)
sqlcmd -S 190.92.153.67,1433 -U curisec -P curisec123 -d curisec -i copy-facilities-to-facility-schema.sql

# O usar SSMS manualmente:
# 1. Abre SSMS
# 2. Conecta a: 190.92.153.67,1433
# 3. Abre archivo: copy-facilities-to-facility-schema.sql
# 4. Presiona F5
```

**Opción B: Usar Node.js**
```bash
# Instala dependencias
npm install mssql

# Ejecuta el script
node copy-facilities-to-facility-schema.js
```

### 2. Probar Excel Import (Verificación Rápida)

```sql
-- Verificar que tabla facility.facilities existe
SELECT COUNT(*) FROM [facility].[facilities]

-- Ver datos importados
SELECT TOP 10 * FROM [facility].[wound_encounters]

-- Estadísticas de importación
SELECT 
  COUNT(*) AS TotalWounds,
  COUNT(DISTINCT facility_id) AS Facilities,
  COUNT(DISTINCT patient_id) AS Patients
FROM [facility].[wound_encounters]
```

### 3. Conectar a BD Remota

```bash
# Desde línea de comandos
sqlcmd -S 190.92.153.67,1433 -U curisec -P curisec123 -d curisec

# Desde Node.js
node -e "
const sql = require('mssql');
new sql.ConnectionPool({
  server: '190.92.153.67',
  port: 1433,
  database: 'curisec',
  authentication: { type: 'default', options: { 
    userName: 'curisec', password: 'curisec123' 
  }},
  options: { encrypt: false, trustServerCertificate: true }
}).connect().then(() => console.log('✅ OK')).catch(e => console.error(e.message))
"
```

---

## 📋 Archivos Principales

### Excel Import

```bash
# Ver estructura del código
cat client/src/lib/excel-utils.ts

# Ver endpoint
grep -A 50 "POST /api/import-excel" server/routes.ts

# Ver test cases
cat EXCEL_IMPORT_TESTING_GUIDE.md
```

### Facilities Copy

```bash
# Ver SQL Script
cat copy-facilities-to-facility-schema.sql

# Ver Node.js Script
cat copy-facilities-to-facility-schema.js

# Ejecutar script
node copy-facilities-to-facility-schema.js
```

### Documentación

```bash
# Ver índice completo
cat PROJECT_INDEX.md

# Ver guía de Excel Import
cat EXCEL_IMPORT_GUIDE.md

# Ver instrucciones de copia
cat COPY_FACILITIES_INSTRUCTIONS.md
```

---

## 🔍 Búsquedas Útiles

```bash
# Buscar donde está el mapeo de columnas
grep -n "COLUMN_MAPPING" client/src/lib/excel-utils.ts

# Buscar donde está remapExcelColumns
grep -rn "remapExcelColumns" client/src/

# Buscar endpoint de importación
grep -n "import-excel" server/routes.ts

# Buscar referencias a facilities
grep -rn "facility.facilities" server/

# Buscar validaciones
grep -n "validateExcelData" client/src/lib/excel-utils.ts
```

---

## 📊 Verificar Estado

### Excel Import está listo si:

```bash
# 1. Archivo de utilidades existe
test -f client/src/lib/excel-utils.ts && echo "✅ excel-utils.ts existe"

# 2. Componente React existe
test -f client/src/pages/excel-import.tsx && echo "✅ excel-import.tsx existe"

# 3. Endpoint configurado
grep -q "POST /api/import-excel" server/routes.ts && echo "✅ Endpoint configurado"

# 4. Remapeo implementado
grep -q "remapExcelColumns" client/src/lib/excel-utils.ts && echo "✅ Remapeo implementado"
```

### Facilities Copy está listo si:

```bash
# 1. SQL Script existe
test -f copy-facilities-to-facility-schema.sql && echo "✅ SQL Script existe"

# 2. Node.js Script existe
test -f copy-facilities-to-facility-schema.js && echo "✅ Node.js Script existe"

# 3. Scripts tienen contenido
wc -l copy-facilities-to-facility-schema.sql && wc -l copy-facilities-to-facility-schema.js
```

---

## 🚀 Ejecutar Todo

```bash
# 1. Instalar dependencias necesarias
npm install mssql

# 2. Verificar conexión a BD
node -e "require('mssql').ConnectionPool({...}).connect().then(() => console.log('✅'))"

# 3. Ejecutar copia de facilities
node copy-facilities-to-facility-schema.js

# 4. Verificar que se copió
sqlcmd -S 190.92.153.67,1433 -U curisec -P curisec123 -d curisec -Q "SELECT COUNT(*) FROM facility.facilities"
```

---

## 📝 Archivos de Configuración

### Base de Datos

```
Servidor: 190.92.153.67
Puerto: 1433
BD Local: curisec
BD Remota: remoteWoundcareDB
Usuario: curisec
Contraseña: curisec123
```

### Tabla de Facilities

```
Schema: facility
Tabla: facilities
Campos: FacilityId, FacilityName, IsActive, CreatedDate, UpdatedDate
Índice: IDX_facilities_IsActive
```

### Tabla de Wounds

```
Schema: facility
Tabla: wound_encounters
Campos: 26 (con mapeo de columnas)
Campos requeridos: 9
```

---

## 🔐 Credenciales

```bash
# SQL Server
HOST=190.92.153.67
PORT=1433
DATABASE=curisec
USERNAME=curisec
PASSWORD=curisec123

# JWT Token (en localStorage del navegador)
localStorage.getItem('token')
```

---

## 🧪 Tests Rápidos

### Probar remapeo de columnas

```typescript
import { remapExcelColumns } from '@/lib/excel-utils';

const excelData = [
  {
    'Pt_Name': 'P001',
    'Facility': 5,
    'Wound Loc': 'Left leg',
    'SA(cm2)': 10.5,
    'DOS': '2025-01-15'
  }
];

const remapped = remapExcelColumns(excelData);
console.log(remapped[0]); // {patient_id: 'P001', facility_id: 5, ...}
```

### Probar validación

```typescript
import { validateExcelData } from '@/lib/excel-utils';

const result = validateExcelData(excelData);
if (result.isValid) {
  console.log('✅ Datos válidos');
  console.log(result.data); // Datos remapeados
} else {
  console.log('❌ Errores:');
  result.errors.forEach(e => console.log(e));
}
```

### Probar importación

```bash
curl -X POST http://localhost:3001/api/import-excel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "data": [...],
    "filename": "test.xlsx"
  }'
```

---

## 📈 Monitorear Progreso

```bash
# Ver cambios recientes
git log --oneline -10

# Ver archivos modificados
git status

# Ver diff de archivos
git diff client/src/lib/excel-utils.ts
```

---

## 🎯 Próximos Pasos

1. **Ejecutar Copia de Facilities**
   ```bash
   node copy-facilities-to-facility-schema.js
   ```

2. **Probar Excel Import**
   - Descargar plantilla
   - Rellenar datos
   - Importar

3. **Verificar Datos**
   ```sql
   SELECT COUNT(*) FROM facility.facilities
   SELECT COUNT(*) FROM facility.wound_encounters
   ```

4. **Integrar en Producción**
   - Deployar scripts
   - Crear backups
   - Monitorear

---

## 💡 Tips Útiles

**Limpiar datos de prueba:**
```sql
DELETE FROM [facility].[wound_encounters] WHERE patient_id LIKE 'P00[1-5]'
DELETE FROM [facility].[facilities] WHERE FacilityId IN (1,2,3,4,5)
```

**Ver logs del servidor:**
```bash
# Buscar errores en importación
grep "import-excel" server.log
grep "ERROR" server.log
```

**Aumentar timeout de conexión:**
```javascript
const config = {
  ...dbConfig,
  options: { connectTimeout: 60000 } // 60 segundos
}
```

**Ver tamaño de tablas:**
```sql
SELECT 
  OBJECT_NAME(i.object_id) AS TableName,
  CONVERT(DECIMAL(10,2), s.total_pages * 8 / 1024.0) AS MB
FROM sys.dm_db_partition_stats s
INNER JOIN sys.indexes i ON s.object_id = i.object_id
WHERE database_id = DB_ID()
```

---

## 🔗 Links Rápidos

**Documentación:**
- `PROJECT_INDEX.md` - Índice completo
- `EXCEL_IMPORT_GUIDE.md` - Guía de usuario
- `COPY_FACILITIES_INSTRUCTIONS.md` - Instrucciones
- `EXCEL_IMPORT_TECHNICAL_REFERENCE.md` - Referencia técnica

**Scripts:**
- `copy-facilities-to-facility-schema.sql` - SQL Script
- `copy-facilities-to-facility-schema.js` - Node.js Script
- `client/src/lib/excel-utils.ts` - Utilidades
- `server/routes.ts` - Endpoint API

---

**Actualizado:** 2025-01-20  
**Versión:** 1.0  
**Estado:** ✅ Listo

