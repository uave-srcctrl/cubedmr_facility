# Testing Guide - Excel Import Feature

## 🧪 Cómo Probar la Importación de Excel

### Requisitos Previos

- ✅ Aplicación React ejecutándose en `localhost:5002`
- ✅ Servidor Node.js ejecutándose en `localhost:3001`
- ✅ Base de datos SQL Server disponible (`190.92.153.67:1433`)
- ✅ Usuario autenticado en la aplicación

---

## 🔍 Test 1: Descargar Plantilla

### Pasos

1. Abre la aplicación en `http://localhost:5002`
2. Inicia sesión con tus credenciales
3. Navega a: **Facilities** → **Import Excel**
4. Haz clic en el botón **"Descargar Plantilla"**
5. Se descargará un archivo llamado `wound_import_template.xlsx`

### Validaciones Esperadas

✅ El archivo descargado está en formato `.xlsx`  
✅ La primera fila contiene encabezados:
- Pt_Name
- Facility
- Provider
- Patient Name
- Wound Loc
- Etiology
- Width
- Height
- Depth
- SA(cm2)
- Exudate
- Tissue
- Treatment
- Frequency
- Progress
- Disposition
- Debridement
- Init SA
- Start Date
- DOS
- Days
- Healing %
- Healing Rate
- Healing Days
- PUSH_SCORE

✅ El archivo contiene 5 filas de datos de ejemplo  
✅ Los datos de ejemplo son válidos y completos

---

## 🔍 Test 2: Validación de Campos Requeridos

### Pasos

1. Descarga la plantilla (Test 1)
2. Abre en Excel o Google Sheets
3. Elimina la columna **"Pt_Name"**
4. Guarda como `test_missing_column.xlsx`
5. En la aplicación, sube este archivo
6. Haz clic en procesar

### Validaciones Esperadas

❌ La aplicación debe mostrar error:  
   `"Campo requerido faltante: patient_id"`

✅ No se permite continuar a la importación  
✅ El error se muestra claramente en la interfaz

---

## 🔍 Test 3: Validación de Tipos de Datos

### Pasos

1. Descarga la plantilla (Test 1)
2. En la columna **"SA(cm2)"**, cambia un valor a texto: `"XYZ"`
3. Guarda como `test_invalid_type.xlsx`
4. Sube el archivo

### Validaciones Esperadas

❌ Error esperado:  
   `"Campo 'surface' debe ser un número, recibido: XYZ"`

✅ Validación rechaza la fila  
✅ Muestra número de fila exacto del error

---

## 🔍 Test 4: Validación de PUSH Score

### Pasos

1. Descarga la plantilla (Test 1)
2. En la columna **"PUSH_SCORE"**, cambia un valor a: `25`
3. Guarda como `test_invalid_push.xlsx`
4. Sube el archivo

### Validaciones Esperadas

❌ Error esperado:  
   `"PUSH score inválido: 25 (debe ser 0-17)"`

✅ Validación rechaza cualquier valor fuera del rango 0-17

---

## 🔍 Test 5: Validación de Enumerados

### Pasos

1. Descarga la plantilla (Test 1)
2. En la columna **"Progress"**, cambia un valor a: `"Mejorando"` (en lugar de "Improving")
3. Guarda como `test_invalid_enum.xlsx`
4. Sube el archivo

### Validaciones Esperadas

❌ Error esperado:  
   `"Progreso inválido: 'Mejorando' (debe ser: Improving, Stable, Deteriorating)"`

✅ Solo acepta valores válidos en inglés

---

## 🔍 Test 6: Importación Exitosa (Caso Feliz)

### Pasos

1. Descarga la plantilla (Test 1)
2. El archivo ya contiene 5 filas válidas
3. Sube el archivo sin cambios
4. Haz clic en **"Procesar Archivo"**
5. Revisa el preview que aparece
6. Haz clic en **"Importar Datos"**

### Validaciones Esperadas

✅ El sistema muestra: `"Archivo procesado exitosamente"`  
✅ Muestra el número de filas encontradas (5 filas de ejemplo)  
✅ Preview muestra los datos correctamente  
✅ Aparece botón **"Importar Datos"**  
✅ Al hacer clic, aparece mensaje: `"Datos importados exitosamente"`  
✅ Muestra número de registros procesados (5)

### Verificación en BD

```sql
-- Ejecutar en SQL Server
SELECT TOP 5 * FROM facility.wound_encounters 
WHERE patient_id IN ('P001', 'P002', 'P003', 'P004', 'P005')
ORDER BY patient_id DESC
```

Verificar que se insertaron 5 registros con:
- `patient_id`: P001, P002, P003, P004, P005
- `facility_id`: 5
- `patient_name`: Juan Pérez, María García, Carlos López, Ana Martínez, Roberto Sánchez
- Todos los demás campos con datos válidos

---

## 🔍 Test 7: Remapeo de Columnas

### Verificación de Remapeo Automático

1. Completa Test 6 exitosamente
2. En SQL Server, ejecuta:

```sql
-- Verificar que los nombres internos fueron usados
SELECT 
  patient_id,      -- De Excel: Pt_Name
  facility_id,     -- De Excel: Facility
  location,        -- De Excel: Wound Loc
  surface,         -- De Excel: SA(cm2)
  dos,             -- De Excel: DOS
  push_score       -- De Excel: PUSH_SCORE
FROM facility.wound_encounters
WHERE patient_id = 'P001'
```

### Validaciones Esperadas

✅ Todos los campos con nombres internos están presentes  
✅ Los datos coinciden con lo que se vio en el Excel  
✅ El remapeo fue automático y transparente

---

## 🔍 Test 8: Archivo Vacío

### Pasos

1. Crea un archivo Excel vacío (sin datos, solo encabezados)
2. Sube el archivo

### Validaciones Esperadas

⚠️ Comportamiento esperado:  
   Puede mostrar "0 filas encontradas" o ignorar silenciosamente

---

## 🔍 Test 9: Autorización

### Pasos

1. Abre DevTools (F12)
2. Ve a Console
3. Ejecuta:
```javascript
localStorage.removeItem('token')
```
4. Intenta subir un archivo Excel
5. Haz clic en importar

### Validaciones Esperadas

❌ Error esperado:  
   `"No authentication token found. Please log in again."`

o

❌ Error desde servidor:  
   `"Unauthorized - No authentication token provided"`

✅ La operación se rechaza sin token válido

---

## 🔍 Test 10: Archivo Muy Grande

### Pasos

1. Descarga la plantilla (Test 1)
2. Duplica las filas cientos de veces para crear un archivo > 10 MB
3. Intenta subir

### Validaciones Esperadas

❌ Error durante selección del archivo:  
   `"File size exceeds 10 MB limit"`

o

✅ El sistema rechaza archivos > 10 MB

---

## 🔍 Test 11: Formato de Fechas

### Pasos

1. Descarga la plantilla (Test 1)
2. Cambia fecha en "DOS" de formato:
   - De: `2025-01-15` (correcto YYYY-MM-DD)
   - A: `01/15/2025` (incorrecto MM/DD/YYYY)
3. Sube el archivo

### Validaciones Esperadas

❌ Error esperado:  
   `"Fecha de servicio inválida: 01/15/2025 (formato esperado: YYYY-MM-DD)"`

✅ Solo acepta formato YYYY-MM-DD

---

## 🔍 Test 12: Validación de Orden de Fechas

### Pasos

1. Descarga la plantilla (Test 1)
2. En una fila, cambia:
   - Start Date: `2025-01-20`
   - DOS: `2025-01-15`
3. Sube el archivo

### Validaciones Esperadas

❌ Error esperado:  
   `"Fecha de inicio (2025-01-20) no puede ser posterior a fecha de servicio (2025-01-15)"`

✅ Valida que start_date <= dos

---

## 📊 Test 13: Análisis de Logs

### Pasos

1. Abre la terminal donde corre el servidor Node.js
2. Completa Test 6 (importación exitosa)
3. Revisa los logs

### Validaciones Esperadas

Debes ver logs similares a:
```
[/api/import-excel] Starting Excel import process
[/api/import-excel] Processing 5 rows from wound_import_template.xlsx
[/api/import-excel] Attempting to use stored procedure
[/api/import-excel] ✅ SP executed successfully
[/api/import-excel] Response: { status: 'success', insertedCount: 5, method: 'stored_procedure' }
```

---

## 🔍 Test 14: Fallback a Inserción Directa

### Pasos

1. Temporalmente: Renombra el SP en la BD (simula que no existe)
2. Completa Test 6
3. Revisa los logs

### Validaciones Esperadas

Debes ver logs similares a:
```
[/api/import-excel] ⚠️  SP not available or failed, falling back to direct insert
[/api/import-excel] Using direct insert method
[/api/import-excel] Direct insert completed. Success: 5, Errors: 0
```

✅ El fallback a inserción directa funciona  
✅ Los datos se insertan correctamente

---

## 🧼 Limpieza Después de Tests

Después de completar los tests, limpia los datos de prueba:

```sql
-- En SQL Server
DELETE FROM facility.wound_encounters 
WHERE patient_id IN ('P001', 'P002', 'P003', 'P004', 'P005')
```

---

## 📋 Checklist de Validación Final

- [ ] ✅ Test 1: Descarga de plantilla
- [ ] ✅ Test 2: Validación de campos requeridos
- [ ] ✅ Test 3: Validación de tipos de datos
- [ ] ✅ Test 4: Validación de PUSH score
- [ ] ✅ Test 5: Validación de enumerados
- [ ] ✅ Test 6: Importación exitosa
- [ ] ✅ Test 7: Remapeo de columnas
- [ ] ✅ Test 8: Archivo vacío
- [ ] ✅ Test 9: Autorización
- [ ] ✅ Test 10: Archivo muy grande
- [ ] ✅ Test 11: Formato de fechas
- [ ] ✅ Test 12: Validación de orden de fechas
- [ ] ✅ Test 13: Análisis de logs
- [ ] ✅ Test 14: Fallback a inserción directa

---

## 🚨 Si Encuentras Problemas

### Problema: "Error al procesar el archivo Excel"

**Soluciones:**
1. Verifica que el archivo esté en formato `.xlsx`
2. Verifica que tenga encabezados en la primera fila
3. Verifica que no haya celdas fusionadas
4. Abre DevTools (F12) → Console para ver error específico

### Problema: "Autorización fallida"

**Soluciones:**
1. Cierra sesión e inicia nuevamente
2. Verifica que el token sea válido
3. Mira los headers en DevTools → Network

### Problema: "Error de conexión a la BD"

**Soluciones:**
1. Verifica que el servidor SQL Server esté disponible
2. Verifica credenciales en `server/routes.ts`
3. Comprueba conectividad de red
4. Mira los logs del servidor

### Problema: "Campo X debe ser un número"

**Soluciones:**
1. Revisa el Excel que subiste
2. Busca el campo que da error
3. Asegúrate que contenga solo números
4. No incluyas símbolos de moneda ($, €, etc.)

---

## 📞 Documentación de Referencia

- `EXCEL_IMPORT_GUIDE.md` - Guía para usuarios
- `EXCEL_IMPORT_END_TO_END_FLOW.md` - Flujo técnico completo
- `EXCEL_IMPORT_TECHNICAL_REFERENCE.md` - Referencia para desarrolladores

---

**Última actualización:** 2025-01-18  
**Versión:** 2.0  
**Estado:** ✅ Listo para Testing

