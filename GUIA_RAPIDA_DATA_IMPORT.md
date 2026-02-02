# 🎯 Guía Rápida - Data Import Hub + Settings

## ¿Qué se implementó?

### 1. **Data Import Hub Mejorado** ✨
El componente `data-import.tsx` ahora es un **wrapper robusto** que:
- ✅ Valida datos usando lógica de Excel Import
- ✅ Integra API backend multiformat
- ✅ Soporta procesamiento de directorios (batch)
- ✅ Muestra errores detallados y estructurados
- ✅ Permite importación exitosa con botón "Importar Datos"

### 2. **Componente de Configuración** ⚙️
Nueva página `/facility/settings` con:
- 📊 **Formatos de Importación**: Habilitar/deshabilitar formatos, controlar tamaño máximo
- 📈 **Tipos de Gráficos**: Configurar qué gráficos están disponibles
- 🎨 **Tema**: Cambiar modo (light/dark/system) y color de acento
- ⚙️ **General**: Guardado automático y notificaciones

---

## 🚀 Cómo Usar

### Data Import Hub

**Paso 1:** Navegue a `Menu → Data Import → Data Import Hub`

**Paso 2:** Elija el modo:
- **Archivo Único**: Un archivo a la vez
- **Directorio**: Todos los archivos de una carpeta

**Paso 3:** Seleccione el formato (Excel, CSV, JSON, XML, HL7, Word/PDF)

**Paso 4:** Arrastre y suelte el archivo o haga clic para seleccionar

**Paso 5:** Verifique los errores de validación (si los hay)

**Paso 6:** Haga clic en **"Importar Datos"** para enviar al servidor

### Configuración

**Paso 1:** Navegue a `Menu → Configuración` (nuevo icono ⚙️ en el pie del sidebar)

**Paso 2:** Elija la pestaña que desea configurar:
- **Formatos de Importación**: Habilitar/deshabilitar formatos individuales
- **Gráficos**: Seleccionar qué tipos de gráficos ver en reportes
- **Tema**: Cambiar apariencia y colores
- **General**: Activar/desactivar funciones

**Paso 3:** Haga clic en **"Guardar"** para aplicar los cambios

---

## 📋 Características Nuevas

### Data Import Hub

| Característica | Antes | Ahora |
|---|---|---|
| Validación | ❌ | ✅ Detallada |
| Importación | ❌ Deshabilitada | ✅ Funcional |
| Directorios | ❌ | ✅ Soportado |
| Errores | 🟡 Genéricos | ✅ Por fila |
| Instrucciones | 🟡 Mínimas | ✅ Por formato |

### Settings

| Feature | Descripción |
|---|---|
| **Formatos Configurables** | Habilitar solo los formatos que necesita |
| **Límites de Tamaño** | Control granular de límites por formato |
| **Personalización de Tema** | Light/Dark/System + 5 colores |
| **Gráficos Configurables** | Mostrar/ocultar tipos de gráficos |
| **Auto-guardado** | Guardar cambios automáticamente |
| **Sincronización** | Los cambios se aplican inmediatamente |

---

## 🔄 Validación Excel

Cuando importa un archivo Excel, se valida automáticamente:

✅ **Campos Requeridos:**
- `patient_id` (no puede estar vacío)
- `facility_id` (debe ser número)
- `location` (no puede estar vacío)
- `surface` (debe ser positivo)
- `push_score` (0-17)
- `progress` (Improving | Deteriorating | Stable)
- `disposition` (Active | Resolved | New | Hospitalized)
- `dos` (formato YYYY-MM-DD)

❌ **Errores Mostrados:**
- Número de fila exacto
- Nombre del campo con error
- Razón del error
- Primeros 10 errores en la UI

---

## 💾 Datos Guardados

### Configuración en localStorage
La configuración se guarda en `localStorage` con clave `appSettings`:
```javascript
{
  importFormats: [...],  // Formatos habilitados
  charts: [...],         // Gráficos habilitados
  theme: {
    mode: 'light|dark|system',
    accentColor: '#color'
  },
  autoSave: true,
  notificationsEnabled: true
}
```

---

## 🎨 Colores de Acento Disponibles

| Color | Hex | Nombre |
|---|---|---|
| 🔵 | #3b82f6 | Azul |
| 🔴 | #ef4444 | Rojo |
| 🟢 | #10b981 | Verde |
| 🟠 | #f59e0b | Ámbar |
| 🟣 | #8b5cf6 | Púrpura |

---

## 🔗 Endpoints Backend Necesarios

Para que la importación funcione completamente, se necesitan estos endpoints:

```
POST /api/import-excel  - Para Excel
POST /api/import-hl7    - Para HL7/FHIR
POST /api/import-json   - Para JSON
POST /api/import-data   - Fallback genérico
```

**Payload esperado:**
```json
{
  "data": [{ patient_id: "P001", ... }, ...],
  "filename": "documento.xlsx",
  "format": "excel",
  "fileCount": 1
}
```

**Respuesta esperada:**
```json
{
  "insertedCount": 42,
  "updatedCount": 3,
  "errors": []
}
```

---

## 🛠️ Archivos Modificados

### Creados
- ✅ `client/src/pages/settings.tsx` - Nueva página de configuración

### Modificados
- ✅ `client/src/pages/data-import.tsx` - Mejorado con validación y API
- ✅ `client/src/App.tsx` - Agregada ruta `/facility/settings`
- ✅ `client/src/components/layout.tsx` - Agregado enlace a Settings

### No Modificados (pero reutilizados)
- 📋 `client/src/lib/excel-utils.ts` - Validación Excel
- 📋 `client/src/pages/excel-import.tsx` - Especializado para Excel

---

## ⚡ Tips de Uso

### ✨ Mejores Prácticas

1. **Valide Primero**: Cargue el archivo y verifique que no haya errores antes de importar
2. **Descargue Muestras**: Use el botón "Descargar Muestra" para ver el formato esperado
3. **Batch Processing**: Use modo "Directorio" para importar múltiples archivos a la vez
4. **Monitoree Errores**: Revise cuidadosamente los errores de validación para corregir el origen

### 🎯 Resolución de Problemas

**Q: El botón "Importar Datos" está deshabilitado**
A: Significa que hay errores de validación. Revise la tarjeta de errores roja.

**Q: No veo un formato en el selector**
A: Quizás está deshabilitado en Configuración. Vaya a Settings y habilítelo.

**Q: La importación no se completa**
A: Verifique que el token de autenticación sea válido (revise la consola).

**Q: Los cambios de tema no se aplican**
A: Haga clic en "Guardar" en la página de Settings.

---

## 📚 Documentación

Para más detalles técnicos, ver:
- 📄 `IMPLEMENTACION_DATA_IMPORT_WRAPPER.md` - Documentación técnica completa
- 📄 `ANALISIS_COMPARATIVO_IMPORTS.md` - Comparación antes/después
- 📄 `PLAN_MEJORA_DATA_IMPORT.md` - Plan de mejoras futuras

---

## 🎉 ¡Todo Listo!

El Data Import Hub es ahora un sistema **robusto, seguro y fácil de usar** con opciones de configuración avanzadas.

¿Preguntas? Revise la documentación técnica o los archivos del código.

**Buen uso! 🚀**
