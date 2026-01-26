# 📚 GUÍA DE USO - Importador Excel de Heridas

## 🎯 Objetivo

Importar datos de heridas desde Excel a la base de datos `facility.wound_encounters` de forma segura, validada y con transformaciones automáticas.

---

## ⚡ INICIO RÁPIDO

### 1. Descargar plantilla
```
UI → "Download Excel Template" → Guardar archivo
```

### 2. Completar datos
Llenar filas con información de heridas, se soportan dos formatos de columnas.

### 3. Subir archivo
```
UI → Drag & Drop o "Select File" → Automáticamente importa
```

### 4. Ver resultados
✅ Éxito o ❌ Errores específicos con detalles de corrección.

---

## 📝 FORMATOS DE COLUMNAS SOPORTADOS

### Opción A: Nombres Cortos (Original)
```
Pt_Name | Facility | Wound Loc | SA(cm2) | PUSH_SCORE | Progress | DOS | ...
P001    | 5        | Left leg  | 10.5    | 12         | Improving| 2025-01-20
```

### Opción B: Nombres Descriptivos (Nuevo)
```
Pt Name | Facility | Wound Loc | SA (cm²) | PUSH SCORE | Progress | DOS | ...
P001    | 5        | Left leg  | 10.5     | 12         | Improving| 2025-01-20
```

### Opción C: Nombres Largos con Contexto
```
Pt Name | Facility | Appropriate debridement | SA (cm²) | Healing Velocity (cm²/Week) | ...
P001    | 5        | Autolytic               | 10.5     | 0.4                         | ...
```

✅ **Puede mezclar formatos en el mismo Excel**

---

## 🔄 TRANSFORMACIONES AUTOMÁTICAS

### Size (Cm) → width, height, depth

**Entrada Excel:**
```
Size (Cm) = "5x4x2"    o    "5.2 x 4.8 x 1.5"
```

**Salida BD (automática):**
```
width: 5.0 (o 5.2)
height: 4.0 (o 4.8)
depth: 2.0 (o 1.5)
```

**Formatos aceptados:**
- `5x4x2` ✓
- `5.2x4.8x1.5` ✓
- `5.2 x 4.8 x 1.5` ✓
- ` 5 x 4 x 2 ` ✓

---

## ✅ CAMPOS REQUERIDOS (9)

| Campo | Ejemplo | Notas |
|-------|---------|-------|
| **Pt Name** | P001 | ID del paciente |
| **Facility** | 5 | ID de facility |
| **Wound Loc** | Left leg | Localización de herida |
| **Etiology** | Pressure Ulcer | Causa de herida |
| **SA (cm²)** | 10.5 | Superficie en cm² (>0) |
| **Progress** | Improving | Ver opciones abajo |
| **Disposition** | Active | Ver opciones abajo |
| **DOS** | 2025-01-20 | Fecha (YYYY-MM-DD) |
| **PUSH SCORE** | 12 | 0-17 |

---

## 📋 CAMPOS OPCIONALES (14)

| Campo | Ejemplo | Notas |
|-------|---------|-------|
| Provider | 101 | ID proveedor |
| Patient Name | Juan Pérez | Nombre completo |
| Exudate | Moderate | None, Minimal, Moderate, Heavy, Copious |
| Tissue | Granulation | Tipo de tejido |
| Tx Plan | Hydrogel dressing | Plan de tratamiento |
| Frequency | Daily | Frecuencia |
| Appropriate debridement | Autolytic | None, Autolytic, Enzymatic, Mechanical, Surgical |
| Initial SA | 12.0 | Superficie inicial |
| Wound start date | 2024-12-15 | Fecha inicio (YYYY-MM-DD) |
| Duration (days) | 31 | Días de duración |
| % Healing2 | 12.5 | Porcentaje de cicatrización (0-100) |
| Healing Velocity (cm²/Week) | 0.4 | Velocidad de cicatrización |
| Healing Time Days | 90 | Días estimados para cicatrización |
| Width, Height, Depth | 5.2, 4.8, 1.5 | Como alternativa a Size (Cm) |

---

## 🎯 ENUMERACIONES (Valores Válidos)

### Progress (Estado de progreso)
```
✓ Improving (Mejorando)
✓ Deteriorating (Empeorando)
✓ Stable (Estable)
```

### Disposition (Disposición)
```
✓ Active (Activo)
✓ Resolved (Resuelto)
✓ New (Nuevo)
✓ Hospitalized (Hospitalizado)
```

### Exudate (Exudado)
```
✓ None (Ninguno)
✓ Minimal (Mínimo)
✓ Moderate (Moderado)
✓ Heavy (Abundante)
✓ Copious (Copiosa)
```

### Debridement (Desbridamiento)
```
✓ None (Ninguno)
✓ Autolytic (Autolítico)
✓ Enzymatic (Enzimático)
✓ Mechanical (Mecánico)
✓ Surgical (Quirúrgico)
```

---

## 📅 FORMATOS DE FECHA

**Válido:**
```
2025-01-20
2024-12-15
YYYY-MM-DD
```

**Inválido:**
```
01/20/2025 ❌
20-01-2025 ❌
January 20 ❌
20/01/2025 ❌
```

**Regla de coherencia:**
```
start_date ≤ DOS (Fecha inicio ≤ Fecha de observación)
```

---

## 🔢 RANGOS NUMÉRICOS

| Campo | Rango | Ejemplo |
|-------|-------|---------|
| facility_id | > 0 | 1, 5, 100 |
| provider_id | > 0 | 101, 102 |
| surface | > 0 | 10.5, 25.2 |
| push_score | 0-17 | 0, 8, 12, 17 |
| healing_percentage | 0-100 | 25, 50, 100 |
| width, height, depth | ≥ 0 | 5.2, 4.8, 1.5 |
| days | ≥ 0 | 0, 31, 90 |
| healing_rate | ≥ 0 | 0.1, 0.4, 1.2 |

---

## ❌ CAMPOS A IGNORAR

Las siguientes columnas se descartan automáticamente (no se incluyen en la importación):

```
- Helper Colum
- Helper Column
- [Cualquier columna no mapeada]
```

---

## 📊 EJEMPLOS DE ARCHIVOS VÁLIDOS

### Ejemplo 1: Formato Corto
```
Pt_Name | Facility | Wound Loc | SA(cm2) | PUSH_SCORE | Progress | DOS | Disposition
P001    | 5        | Left leg  | 10.5    | 12         | Improving| 2025-01-20 | Active
P002    | 5        | Right arm | 5.2     | 8          | Stable   | 2025-01-16 | Active
```
✅ Funciona perfectamente

### Ejemplo 2: Formato Largo
```
Pt Name | Facility | Wound Loc | SA (cm²) | Size (Cm) | Appropriate debridement | Healing Time Days | PUSH SCORE | Progress | DOS
P001    | 5        | Left leg  | 10.5     | 5x4x2     | Autolytic               | 90                | 12         | Improving| 2025-01-20
```
✅ Funciona perfectamente (Size se transforma automáticamente)

### Ejemplo 3: Formato Mixto
```
Pt_Name | Facility | Wound Loc | SA (cm²) | Appropriate debridement | PUSH_SCORE | Progress | DOS
P001    | 5        | Left leg  | 10.5     | Autolytic               | 12         | Improving| 2025-01-20
```
✅ Funciona perfectamente (mezcla ambos formatos)

### Ejemplo 4: Con Helper Colum
```
Pt Name | Facility | Helper Colum | Wound Loc | SA (cm²) | PUSH SCORE | Progress | DOS
P001    | 5        | Data-temp-001| Left leg  | 10.5     | 12         | Improving| 2025-01-20
```
✅ Funciona perfectamente (Helper Colum ignorada automáticamente)

---

## 🚫 EJEMPLOS DE ARCHIVOS INVÁLIDOS

### Error 1: Falta campo requerido
```
Pt Name | Facility | Wound Loc | SA (cm²) | Progress | DOS
❌ FALTA: Disposition, PUSH SCORE, Etiology
Mensaje: "Missing required fields: disposition, push_score, etiology"
```

### Error 2: Valor inválido en enumeración
```
Progress: "Mejorando"  ← Debe ser "Improving"
❌ Valor inválido
Mensaje: "Row 1: Invalid value 'Mejorando' for field 'progress'. Expected: Improving, Deteriorating, or Stable"
```

### Error 3: Rango incorrecto
```
PUSH_SCORE: 25  ← Máximo es 17
❌ Fuera de rango
Mensaje: "Row 1: Field 'push_score' must be between 0 and 17, got 25"
```

### Error 4: Formato de fecha incorrecto
```
DOS: "01/20/2025"  ← Debe ser YYYY-MM-DD
❌ Formato inválido
Mensaje: "Row 1: Invalid date format for 'dos'. Expected YYYY-MM-DD"
```

### Error 5: SA (Superficie) = 0 o negativa
```
SA (cm²): 0  ← Debe ser > 0
❌ Valor inválido
Mensaje: "Row 1: Field 'surface' must be greater than 0"
```

### Error 6: Incoherencia de fechas
```
start_date: "2025-01-20"
DOS:       "2025-01-15"
❌ start_date > DOS
Mensaje: "Row 1: start_date must be ≤ dos (Wound start date 2025-01-20 is after DOS 2025-01-15)"
```

---

## 🔧 TROUBLESHOOTING

### P: "Uploaded file contains no data"
**R:** 
- Verificar que Excel tenga al menos 1 fila de datos
- Verificar que la primera fila tenga encabezados de columna
- Asegurar que no sea un archivo vacío

### P: "Column 'Size (Cm)' expected format like '5x4x2'"
**R:**
- Verificar formato: "5x4x2", "5.2 x 4.8 x 1.5"
- No usar: "5 cm x 4 cm x 2 cm"
- No mezclar con Width/Height/Depth en mismo Excel

### P: "Missing required fields"
**R:**
- Completar todos los 9 campos requeridos:
  - Pt Name, Facility, Wound Loc, Etiology, SA (cm²), Progress, Disposition, DOS, PUSH SCORE
- Ver tabla CAMPOS REQUERIDOS arriba

### P: "Invalid value for 'progress'"
**R:**
- Usar exactamente: "Improving", "Deteriorating", o "Stable"
- Verificar mayúsculas/minúsculas
- No traducir (usar inglés)

### P: "Invalid date format for 'dos'"
**R:**
- Formato debe ser: YYYY-MM-DD
- Ejemplo correcto: 2025-01-20
- No usar: 01/20/2025, 20-01-2025, etc.

### P: "Row 1: Field 'push_score' must be between 0 and 17"
**R:**
- PUSH SCORE debe ser número entre 0-17
- Ejemplos válidos: 0, 8, 12, 17
- No textos: "twelve", "Medium"

### P: "start_date must be ≤ dos"
**R:**
- La fecha de inicio debe ser anterior o igual a DOS
- Verificar: Wound start date ≤ DOS
- Ejemplo correcto: start_date: 2025-01-01, DOS: 2025-01-20

---

## 🔐 SEGURIDAD

El sistema implementa **4 capas de seguridad**:

1. **Validación Local (Cliente)** - Validación básica en navegador
2. **Sanitización** - Escapa caracteres peligrosos (< > " ' &)
3. **Validación en Servidor** - Validación completa en API local
4. **Delegación Externa** - API externa realiza inserción final

**Características:**
- ✅ Prepared Statements (previene SQL injection)
- ✅ HTML/XML sanitization (previene XSS)
- ✅ Type validation (previene type confusion)
- ✅ Enum validation (previene valores no autorizados)
- ✅ Range validation (previene valores fuera de rango)
- ✅ JWT authentication (previene acceso no autorizado)

---

## 📈 FLUJO COMPLETO

```
1. Usuario descarga plantilla
   ↓
2. Usuario completa datos (Excel local)
   ↓
3. Usuario sube archivo
   ↓
4. Cliente: Lectura Excel + Mapeo columnas + Transformación Size
   ↓
5. Cliente: Validación básica + Envío a API
   ↓
6. API Local: Validación completa + Sanitización
   ↓
7. API Local: Delegación a API externa + Trasmisión JWT
   ↓
8. API Externa: Inserción en BD + Auditoria
   ↓
9. API Local: Recibir resultado
   ↓
10. Cliente: Mostrar resultado (Éxito o Errores detallados)
```

---

## 💾 PERSISTENCIA

Los datos se guardan en: **`facility.wound_encounters`**

**Con auditoría automática:**
```
- created_date: GETDATE() (timestamp de inserción)
- import_source: JWT token (tracking de quién importó)
- id: Auto-generado (PK)
```

---

## 🎓 TIPS

✅ **DO (Sí hacer)**
- Usar uno de los formatos de columna consistentemente
- Verificar enumeraciones antes de subir (Progress, Disposition, etc.)
- Mantener fechas en YYYY-MM-DD
- Llenar todos los campos requeridos
- Revisar errores y corregir (mostrados con número de fila)

❌ **DON'T (No hacer)**
- Traducir enumeraciones al español
- Mezclar formatos de fecha
- Dejar campos requeridos en blanco
- Usar caracteres especiales en Pt Name
- Subir archivos muy grandes (>10MB)

---

## 📞 SOPORTE

Si encuentra errores:
1. Leer el mensaje de error (incluye fila y campo)
2. Revisar esta guía en sección CAMPOS REQUERIDOS / ENUMERACIONES
3. Contactar al administrador si persiste

---

## ✅ CHECKLIST ANTES DE SUBIR

- [ ] Todos los 9 campos requeridos están llenos
- [ ] Fechas en formato YYYY-MM-DD
- [ ] Progress, Disposition, Exudate, Debridement usan valores de la lista
- [ ] PUSH SCORE entre 0-17
- [ ] Superficie > 0
- [ ] start_date ≤ DOS (si ambos existen)
- [ ] Size (Cm) en formato "5x4x2" o "5.2 x 4.8 x 1.5" (si existe)
- [ ] Archivo no está vacío (>1 fila de datos)
- [ ] Nombres de columna reconocidos (usar formatos de la guía)

---

**🎉 ¡Listo para importar! 🎉**
