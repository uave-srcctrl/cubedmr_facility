# 📊 Guía de Importación Excel - WoundCare Analytics

## ✨ Actualización: Nombres Amigables de Columnas (v2.0)

A partir de esta versión, **ya no necesitas usar nombres técnicos** para los encabezados. El sistema ahora acepta **nombres amigables para el usuario** y los convierte automáticamente a los nombres internos de la base de datos.

**Ejemplo**: En lugar de `patient_id`, usa `Pt_Name`. En lugar de `surface`, usa `SA(cm2)`.

---

## Descripción General

La funcionalidad de importación Excel permite cargar datos de heridas desde archivos Excel (.xlsx, .xls) directamente a la base de datos `facility.wound_encounters`. Esta herramienta es útil para:

- **Migración de datos históricos** desde sistemas legacy
- **Carga masiva** de datos recopilados manualmente
- **Actualización periódica** de datos desde fuentes externas
- **Backup y restauración** de datos

---

## 📋 Formato del Archivo Excel

### Estructura Requerida - Nombres Amigables

La primera fila debe contener los **nombres exactos** de las columnas amigables para el usuario. El sistema las remapeará automáticamente a nombres internos:

### Mapeo de Columnas: Nombres Amigables → Nombres Internos

| Nombre en Excel | Campo Interno | Tipo | Descripción |
|---|---|---|---|
| **Pt_Name** ⭐ | patient_id | String | Identificador único del paciente |
| **Facility** ⭐ | facility_id | Number | Número de la instalación |
| **Provider** | provider_id | Number | ID del proveedor de salud |
| **Patient Name** | patient_name | String | Nombre completo del paciente |
| **Wound Loc** ⭐ | location | String | Ubicación de la herida |
| **Etiology** ⭐ | etiology | String | Causa de la herida |
| **Width** | width | Number | Ancho en cm |
| **Height** | height | Number | Alto en cm |
| **Depth** | depth | Number | Profundidad en cm |
| **SA(cm2)** ⭐ | surface | Number | Área superficial cm² |
| **Exudate** | exudate | String | Tipo de exudado |
| **Tissue** | tissue | String | Tipo de tejido |
| **Treatment** | treatment | String | Plan de tratamiento |
| **Frequency** | frequency | String | Frecuencia del tratamiento |
| **Progress** ⭐ | progress | String | Improving/Stable/Deteriorating |
| **Disposition** ⭐ | disposition | String | Active/Resolved/New/Hospitalized |
| **Debridement** | debridement | String | Tipo de desbridamiento |
| **Init SA** | initial_surface | Number | Área inicial cm² |
| **Start Date** | start_date | Date | Fecha inicio (YYYY-MM-DD) |
| **DOS** ⭐ | dos | Date | Fecha de servicio (YYYY-MM-DD) |
| **Days** | days | Number | Número de días |
| **Healing %** | healing_percentage | Number | Porcentaje cicatrización |
| **Healing Rate** | healing_rate | Number | Velocidad cicatrización |
| **Healing Days** | healing_days | Number | Días estimados cicatrización |
| **PUSH_SCORE** ⭐ | push_score | Number | Puntaje PUSH (0-17) |

⭐ = Campos requeridos

### Estructura del Archivo Excel (Ejemplo)

| Pt_Name | Facility | Provider | Patient Name | Wound Loc | Etiology | Width | Height | Depth | SA(cm2) | Exudate | Tissue | Treatment | Frequency | Progress | Disposition | Debridement | Init SA | Start Date | DOS | Days | Healing % | Healing Rate | Healing Days | PUSH_SCORE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P001 | 5 | 101 | Juan Pérez | Left leg | Pressure Ulcer | 5.2 | 4.8 | 1.5 | 10.5 | Moderate | Granulation | Dressing... | Daily | Improving | Active | Autolytic | 12.0 | 2024-12-15 | 2025-01-15 | 31 | 12.5 | 0.4 | 90 | 12 |

### Campos Requeridos (⭐)

| Nombre Excel | Tipo | Descripción | Validación |
|-------|------|-------------|------------|
| `Pt_Name` | String | ID único del paciente | No vacío |
| `Facility` | Number | ID de la instalación | Número entero válido |
| `Wound Loc` | String | Ubicación de la herida | No vacío |
| `Etiology` | String | Causa de la herida | No vacío |
| `SA(cm2)` | Number | Área superficial (cm²) | Número positivo |
| `PUSH_SCORE` | Number | Puntaje PUSH (0-17) | 0 ≤ valor ≤ 17 |
| `Progress` | String | Progreso: `Improving`, `Deteriorating`, `Stable` | Valores enumerados |
| `Disposition` | String | Estado: `Active`, `Resolved`, `New`, `Hospitalized` | Valores enumerados |
| `DOS` | Date | Fecha de servicio (YYYY-MM-DD) | Formato válido |

### Campos Opcionales (recomendados)

| Campo | Tipo | Descripción | Validación |
|-------|------|-------------|------------|
| `Provider` | Number | ID del proveedor | Número entero |
| `Patient Name` | String | Nombre del paciente | Texto libre |
| `Width` | Number | Ancho de la herida (cm) | Decimal positivo |
| `Height` | Number | Alto de la herida (cm) | Decimal positivo |
| `Depth` | Number | Profundidad de la herida (cm) | Decimal positivo |
| `Exudate` | String | Tipo de exudado | `None`, `Minimal`, `Moderate`, `Heavy`, `Copious` |
| `Tissue` | String | Tipo de tejido | Texto libre (ej: Granulation, Epithelialization, Necrotic) |
| `Treatment` | String | Plan de tratamiento | Texto libre (hasta 800 caracteres) |
| `frequency` | String | Frecuencia de cambio de cura | Texto libre (ej: Daily, 3 times per week) |
| `debridement` | String | Tipo de desbridamiento | `None`, `Autolytic`, `Enzymatic`, `Mechanical`, `Surgical` |
| `initial_surface` | Number | Área inicial (cm²) | Decimal positivo |
| `start_date` | Date | Fecha de inicio de la herida | Formato YYYY-MM-DD |
| `days` | Number | Días desde la evaluación inicial | Número entero positivo |
| `healing_percentage` | Number | % de cicatrización | Decimal 0-100 |
| `healing_rate` | Number | Velocidad de cicatrización | Decimal (puede ser negativo si empeora) |
| `healing_days` | Number | Días estimados para cicatrizar | Número entero |

---

## 🚀 Cómo Usar la Importación

### 1. Acceder a la Funcionalidad

1. Inicia sesión en la aplicación
2. Selecciona una instalación (facility)
3. Ve al menú lateral → **"Import Excel"**

### 2. Preparar el Archivo

- **Descarga la plantilla**: Haz clic en "Descargar Plantilla" para obtener un ejemplo
- **Completa los datos**: Asegúrate de que todos los campos requeridos estén presentes
- **Valida los datos**: Revisa que los tipos de datos sean correctos

### 3. Subir el Archivo

- **Arrastrar y soltar**: Arrastra el archivo Excel al área designada
- **O hacer clic**: Haz clic en el área para seleccionar el archivo manualmente
- **Formatos soportados**: `.xlsx` y `.xls` (máximo 10MB)

### 4. Procesar y Importar

1. **Vista previa**: Revisa las primeras 5 filas para confirmar el formato
2. **Validación**: El sistema valida automáticamente cada fila
3. **Importar**: Haz clic en "Importar Datos" para cargar a la base de datos

---

## ✅ Validaciones Automáticas

### Campos Requeridos
- Todos los campos marcados como requeridos deben tener valores
- Los campos vacíos generan errores de validación

### Tipos de Datos
- `surface`: Debe ser un número decimal positivo
- `push_score`: Debe ser un entero entre 0 y 17
- `facility_id`: Debe ser un número entero
- `dos`: Debe tener formato YYYY-MM-DD

### Valores Enumerados
- **Progress**: `Improving`, `Deteriorating`, `Stable`
- **Disposition**: `Active`, `Resolved`, `New`, `Hospitalized`
- **Exudate**: `None`, `Minimal`, `Moderate`, `Heavy`, `Copious` (opcional)
- **Debridement**: `None`, `Autolytic`, `Enzymatic`, `Mechanical`, `Surgical` (opcional)

### Fechas
- Formato: `YYYY-MM-DD` (ejemplo: `2025-01-15`)
- Fechas inválidas generan errores

---

## 📊 Resultados de Importación

### Respuesta Exitosa
```json
{
  "status": true,
  "message": "Import completed. 150 records inserted successfully.",
  "insertedCount": 150,
  "errorCount": 0,
  "errors": [],
  "totalProcessed": 150
}
```

### Respuesta con Errores
```json
{
  "status": false,
  "message": "Import completed with errors. 120 records inserted, 30 errors.",
  "insertedCount": 120,
  "errorCount": 30,
  "errors": [
    "Row 5: Invalid PUSH score: 25 (must be 0-17)",
    "Row 12: Invalid date format: 01/15/2025 (expected YYYY-MM-DD)",
    "Row 18: Missing required fields: patient_id, facility_id"
  ],
  "totalProcessed": 150
}
```

---

## 🔧 Solución de Problemas

### Errores Comunes

#### 1. "Campos requeridos faltantes"
**Solución**: Asegúrate de que todas las columnas requeridas estén presentes en la primera fila

#### 2. "Tipo de dato inválido"
**Solución**: Verifica que `surface` y `push_score` sean números, y que `dos` tenga formato de fecha correcto

#### 3. "Valor enumerado inválido"
**Solución**: Usa exactamente los valores permitidos para `progress` y `disposition`

#### 4. "Archivo demasiado grande"
**Solución**: Divide archivos grandes en lotes más pequeños (recomendado: máximo 1000 filas por archivo)

#### 5. "Error de conexión a BD"
**Solución**: Verifica la conectividad de red y que las credenciales de BD sean válidas

#### 6. "Nombre de columna incorrecto"
**Solución**: Verifica que los nombres de las columnas coincidan exactamente con los nombres amigables (Pt_Name, SA(cm2), DOS, etc.). Los nombres son sensibles a mayúsculas/minúsculas.

### Logs de Depuración

Los logs del servidor muestran detalles de cada importación:
```
[/api/import-excel] Processing 150 rows from wound_data.xlsx
[/api/import-excel] Remapping columns: Pt_Name → patient_id, Facility → facility_id, etc.
[/api/import-excel] Import completed. Success: 120, Errors: 30
```

---

## ✨ Remapeo Automático de Columnas (Características Clave)

### ¿Cómo Funciona el Remapeo?

Cuando cargas un archivo Excel, el sistema realiza la siguiente transformación automáticamente:

**PASO 1: Lee los Encabezados (Lo que ves tú)**
```
{
  'Pt_Name': 'P001',
  'Facility': 5,
  'Wound Loc': 'Left leg',
  'SA(cm2)': 10.5,
  'DOS': '2025-01-15',
  'PUSH_SCORE': 12
}
```

**PASO 2: Remapea a Nombres Internos (Lo que usa la BD)**
```
{
  'patient_id': 'P001',
  'facility_id': 5,
  'location': 'Left leg',
  'surface': 10.5,
  'dos': '2025-01-15',
  'push_score': 12
}
```

### Ventajas del Sistema de Remapeo

✅ **Interfaz Amigable**: Los usuarios ven nombres comprensibles (SA(cm2) vs surface)
✅ **Datos Internos Limpios**: La BD mantiene nombres consistentes
✅ **Compatible Hacia Atrás**: Si proporcionas nombres internos antiguos, también funcionan
✅ **Validación Precisa**: Se valida usando nombres internos para consistencia
✅ **Transparente**: ¡Todo sucede automáticamente sin intervención del usuario!

### Columnas que se Remapean

Todas las 25 columnas del archivo Excel se remapean automáticamente según la tabla de mapeo mostrada arriba. Si una columna no tiene un mapeo definido, se pasa tal cual como está.

---

## 📋 Plantilla de Excel

### Descargar Plantilla
Haz clic en "Descargar Plantilla" en la interfaz para obtener un archivo de ejemplo con:
- Estructura correcta de columnas con nombres amigables
- Datos de ejemplo válidos
- Formato de fecha correcto (YYYY-MM-DD)
- Columnas con ancho óptimo

### Ejemplo de Plantilla (Nombres Amigables)

```excel
Pt_Name | Facility | Provider | Patient Name | Wound Loc  | Etiology       | Width | Height | Depth | SA(cm2) | Exudate | Tissue       | Treatment             | Frequency        | Progress  | Disposition | Debridement | Init SA | Start Date | DOS        | Days | Healing % | Healing Rate | Healing Days | PUSH_SCORE
P001    | 5        | 101      | Juan Pérez   | Left leg   | Pressure Ulcer | 5.2   | 4.8    | 1.5   | 10.5    | Moderate| Granulation  | Dressing w/hydrogel   | Daily            | Improving | Active      | Autolytic   | 12.0    | 2024-12-15 | 2025-01-15 | 31   | 12.5      | 0.4          | 90           | 12
P002    | 5        | 102      | María García | Right arm  | Surgical       | 3.0   | 2.5    | 0.8   | 5.2     | Minimal | Epithelialization| Simple dressing   | 3 times/week     | Stable    | Active      | None        | 5.5     | 2025-01-01 | 2025-01-16 | 15   | 5.5       | 0.2          | 60           | 8
```

**Nota**: Cuando descargues la plantilla desde la aplicación, todos estos nombres estarán pre-configurados correctamente.

---

## 🔒 Seguridad y Permisos

### Autenticación Requerida
- Solo usuarios autenticados pueden acceder a la importación
- Se valida el token JWT en cada solicitud

### Validación de Datos
- Todos los datos se validan antes de la inserción
- Transacciones seguras: si una fila falla, no afecta a las demás
- Logs detallados de todas las operaciones

### Límites de Seguridad
- Máximo 10MB por archivo
- Validación estricta de tipos de datos
- Protección contra inyección SQL mediante parámetros preparados

---

## 📈 Rendimiento

### Recomendaciones
- **Archivos pequeños**: Divide archivos grandes para mejor rendimiento
- **Validación previa**: Revisa los datos antes de importar
- **Conexión estable**: Asegura buena conectividad de red durante la importación

### Métricas de Rendimiento
- **Archivos pequeños** (< 100 filas): < 5 segundos
- **Archivos medianos** (100-500 filas): 5-15 segundos
- **Archivos grandes** (500+ filas): 15-60 segundos

---

## 🆘 Soporte

Si encuentras problemas:

1. **Revisa los logs** del navegador (F12 → Console)
2. **Verifica el formato** del archivo Excel
3. **Descarga la plantilla** y compárala con tu archivo
4. **Contacta al administrador** si persisten los errores

---

**Última actualización:** 20 de enero de 2026
**Versión:** 1.0.0