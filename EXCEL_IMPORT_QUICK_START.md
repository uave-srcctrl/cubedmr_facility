# 🚀 Quick Start - Excel Import Feature

## 5-Minuto Setup

### 1️⃣ Usuario Final: Importar Datos

```
Paso 1: Abre la app → Facilities → Import Excel
Paso 2: Haz clic "Descargar Plantilla" 
Paso 3: Abre el Excel, rellena tus datos con nombres amigables:
        - Pt_Name (ID del paciente)
        - Facility (número de facility)
        - Wound Loc (ubicación de la herida)
        - SA(cm2) (área en cm²)
        - DOS (fecha de servicio)
        - PUSH_SCORE (puntaje 0-17)
        - etc. (otros 20 campos opcionalmente)
Paso 4: Guarda el archivo
Paso 5: Sube el archivo
Paso 6: Revisa preview, confirma "Importar Datos"
Paso 7: ✅ Listo! Los datos están en la BD
```

---

### 2️⃣ Desarrollador: Integración

**Cliente - React:**
```typescript
import { validateExcelData, createSampleExcel } from '@/lib/excel-utils';

// Generar plantilla descargable
createSampleExcel();

// Validar datos (remapea automáticamente)
const result = validateExcelData(jsonDataFromExcel);
if (result.isValid) {
  // result.data tiene nombres internos listos
  sendToServer(result.data);
}
```

**Servidor - Express:**
```typescript
app.post("/api/import-excel", async (req, res) => {
  // 1. Autentica usuario
  // 2. Valida datos
  // 3. Inserta en BD (SP o fallback)
  // 4. Retorna { status, insertedCount }
});
```

**Base de Datos:**
- SP ya existe: `sp_facility_import_excel_wounds`
- Tabla destino: `facility.wound_encounters`
- 26 campos soportados

---

## 📋 Mapeo de 26 Columnas

| Excel | Interno | Excel | Interno |
|-------|---------|-------|---------|
| **Pt_Name** ⭐ | patient_id | Days | days |
| **Facility** ⭐ | facility_id | Healing % | healing_percentage |
| Provider | provider_id | Healing Rate | healing_rate |
| Patient Name | patient_name | Healing Days | healing_days |
| **Wound Loc** ⭐ | location | Init SA | initial_surface |
| **Etiology** ⭐ | etiology | Start Date | start_date |
| Width | width | **DOS** ⭐ | dos |
| Height | height | **Progress** ⭐ | progress |
| Depth | depth | **Disposition** ⭐ | disposition |
| **SA(cm2)** ⭐ | surface | Debridement | debridement |
| Exudate | exudate | Treatment | treatment |
| Tissue | tissue | Frequency | frequency |
| **PUSH_SCORE** ⭐ | push_score | — | — |

⭐ = Campos requeridos

---

## ✅ Campos Requeridos

- `Pt_Name` - ID del paciente
- `Facility` - Número de facility
- `Wound Loc` - Ubicación de la herida
- `Etiology` - Causa de la herida
- `SA(cm2)` - Área superficial (número positivo)
- `Progress` - `Improving` | `Stable` | `Deteriorating`
- `Disposition` - `Active` | `Resolved` | `New` | `Hospitalized`
- `DOS` - Fecha (YYYY-MM-DD)
- `PUSH_SCORE` - 0-17

---

## 🔄 Cómo Funciona el Remapeo

```
✏️  Excel que Subes:
{
  'Pt_Name': 'P001',
  'Facility': 5,
  'SA(cm2)': 10.5,
  'DOS': '2025-01-15'
}

        ↓ Remapeo Automático ↓

💾 Base de Datos:
{
  'patient_id': 'P001',
  'facility_id': 5,
  'surface': 10.5,
  'dos': '2025-01-15'
}
```

Todo sucede automáticamente sin que hagas nada. ✨

---

## 🧪 Test Rápido

### Descargar → Rellenar → Importar

```
1. Abre Excel Import
2. Descarga plantilla
3. Rellena 1 fila con datos válidos
4. Sube el archivo
5. ✅ Verifica: "1 registros procesados"
```

### Verificar en BD

```sql
SELECT TOP 1 * FROM facility.wound_encounters 
WHERE patient_id = 'P001' 
ORDER BY id DESC
```

Debes ver el registro que importaste.

---

## 🐛 Solución de Problemas

| Problema | Solución |
|----------|----------|
| "Campo requerido faltante" | Falta una columna requerida. Descarga la plantilla nuevamente. |
| "Campo debe ser un número" | Verificar que los campos numéricos no tengan texto. |
| "PUSH score inválido: X" | Solo acepta 0-17. Cambia el valor. |
| "Progreso inválido" | Usa: Improving, Stable o Deteriorating |
| "Autorización fallida" | Inicia sesión nuevamente. El token expiró. |
| "Error de conexión" | Verifica que el servidor esté disponible. |

---

## 📚 Documentación Completa

| Documento | Para | Contenido |
|-----------|------|----------|
| `EXCEL_IMPORT_GUIDE.md` | 👤 Usuarios | Cómo usar, mapeo, FAQs |
| `EXCEL_IMPORT_TECHNICAL_REFERENCE.md` | 👨‍💻 Developers | API, funciones, ejemplos |
| `EXCEL_IMPORT_END_TO_END_FLOW.md` | 🔧 Técnicos | Flujo completo, diagramas |
| `EXCEL_IMPORT_TESTING_GUIDE.md` | 🧪 QA | 14 casos de test |
| `EXCEL_IMPORT_SUMMARY.md` | 📊 Managers | Resumen ejecutivo |

---

## 🎯 Próximos Pasos

**Para Usuarios:**
1. Prueba descargar la plantilla
2. Rellena con tus datos reales
3. Importa el archivo
4. Verifica que los datos aparecen en la BD

**Para Desarrolladores:**
1. Lee `EXCEL_IMPORT_TECHNICAL_REFERENCE.md`
2. Revisa `client/src/lib/excel-utils.ts`
3. Revisa `server/routes.ts` endpoint `/api/import-excel`
4. Personaliza según tus necesidades

**Para QA:**
1. Sigue `EXCEL_IMPORT_TESTING_GUIDE.md`
2. Ejecuta los 14 tests documentados
3. Verifica logs en servidor
4. Reporta cualquier problema

---

## ✨ Características Principales

✅ **26 Columnas Soportadas**
✅ **Remapeo Automático** - Excel amigable → BD interna
✅ **Validación Multi-nivel** - Cliente + Servidor
✅ **Transacciones Atómicas** - Stored Procedure
✅ **Fallback Automático** - Si SP falla, intenta inserción directa
✅ **Autenticación JWT** - Solo usuarios autenticados
✅ **Manejo de Errores** - Mensajes claros y específicos
✅ **Logging Completo** - Auditoría de todas las operaciones
✅ **Soporte por Email** - Documentación completa

---

## 🎓 Ejemplos

### Usar desde React Component

```typescript
import { validateExcelData } from '@/lib/excel-utils';
import * as XLSX from 'xlsx';

function MyComponent() {
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: 'array' });
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[0]);
      
      const result = validateExcelData(data);
      if (result.isValid) {
        console.log('Datos listos:', result.data);
        // Enviar a servidor con result.data
      } else {
        console.error('Errores:', result.errors);
      }
    };
    reader.readAsArrayBuffer(file);
  };
}
```

### Llamar desde Servidor

```typescript
const response = await fetch('http://localhost:3001/api/import-excel', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    data: remappedData,
    filename: 'wounds.xlsx'
  })
});

const result = await response.json();
// { status: 'success', insertedCount: 150, method: 'stored_procedure' }
```

---

## 📞 Contacto

**Documentación:** Ver archivos `EXCEL_IMPORT_*.md`  
**Código:** `client/src/lib/excel-utils.ts` | `server/routes.ts`  
**BD:** `facility.wound_encounters` en SQL Server

---

**Versión:** 2.0  
**Última actualización:** 2025-01-18  
**Estado:** ✅ LISTO PARA PRODUCCIÓN

