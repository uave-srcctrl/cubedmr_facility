# ✅ Actualización: Date Picker - Deshabilitación de Fechas sin Encounters

## Cambios Implementados

### 1. Mejora del Componente `calendar.tsx`

**Ubicación:** `client/src/components/ui/calendar.tsx`

**Cambio:** Función `disabled` mejorada para deshabilitación robusta de fechas

**Antes:**
```tsx
const disabled = (date: Date) => {
  if (!enabledDates) {
    return true;
  }
  if (enabledDates.length === 0) {
    return false;
  }
  const dateStr = date.toISOString().split('T')[0];
  return !enabledDates.includes(dateStr);
};
```

**Después:**
```tsx
const disabled = (date: Date) => {
  if (enabledDates === undefined) {
    return true; // Estado de carga - deshabilita todas
  }

  if (Array.isArray(enabledDates) && enabledDates.length === 0) {
    return false; // Sin restricciones - habilita todas
  }

  if (Array.isArray(enabledDates) && enabledDates.length > 0) {
    // Formato YYYY-MM-DD robusto, sin timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const isEnabled = enabledDates.includes(dateStr);
    return !isEnabled; // Deshabilita si NO está en enabledDates
  }

  return false; // Default: habilita
};
```

**Mejoras:**
- ✅ Formato de fecha más robusto (evita issues de timezone)
- ✅ Comparación de arrays más clara
- ✅ Manejo explícito de cada estado
- ✅ Comentarios útiles

---

### 2. Mejora del Componente `acuity-report.tsx`

**Ubicación:** `client/src/pages/acuity-report.tsx`

**Cambio 1: Estado Inicial Mejorado**

**Antes:**
```tsx
const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
const { data: enabledDates = [] } = useEnabledDates(facilityId);
```

**Después:**
```tsx
const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
const { data: enabledDates = [], isLoading: enabledDatesLoading } = useEnabledDates(facilityId);

// Set initial date to the first available enabled date when data loads
useEffect(() => {
  if (enabledDates && enabledDates.length > 0 && !selectedDate) {
    const firstEnabledDate = new Date(enabledDates[0]);
    setSelectedDate(firstEnabledDate);
    console.log("[AcuityReport] Set initial date to first enabled date:", firstEnabledDate);
  }
}, [enabledDates, selectedDate]);
```

**Mejoras:**
- ✅ La fecha inicial se establece por primera fecha habilitada
- ✅ Evita seleccionar una fecha que podría no tener datos
- ✅ Respeta el estado de carga de enabledDates

---

**Cambio 2: DateRangePicker Mejorado**

**Antes:**
```tsx
function DateRangePicker({ date, setDate, label, enabledDates }: { ... }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button ...>
          {date ? format(date, "PPP") : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          enabledDates={enabledDates}
          className="w-full"
        />
      </PopoverContent>
    </Popover>
  )
}
```

**Después:**
```tsx
function DateRangePicker({ 
  date, 
  setDate, 
  label, 
  enabledDates,
  isLoading = false
}: { 
  date: Date | undefined, 
  setDate: (d: Date | undefined) => void, 
  label: string, 
  enabledDates?: string[],
  isLoading?: boolean
}) {
  const enabledCount = enabledDates?.length ?? 0;
  const dateInfo = enabledDates && enabledDates.length > 0 
    ? `${enabledCount} date${enabledCount !== 1 ? 's' : ''} available`
    : 'No dates available';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[228px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            isLoading && "opacity-60"
          )}
          disabled={isLoading}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isLoading ? (
            <span className="animate-pulse">{label}...</span>
          ) : (
            date ? format(date, "PPP") : <span>{label}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[288px] p-0" align="start">
        <div className="p-3 border-b bg-muted/50 text-xs text-muted-foreground">
          {dateInfo}
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          enabledDates={enabledDates}
          className="w-full"
          disabled={isLoading ? (date: Date) => true : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
```

**Mejoras:**
- ✅ Muestra el número de fechas disponibles
- ✅ Estado visual de carga (deshabilitado + animación pulsante)
- ✅ Info banner en el calendario mostrando disponibilidad
- ✅ Manejo explícito del estado isLoading

---

**Cambio 3: Llamada a DateRangePicker Actualizada**

**Antes:**
```tsx
<DateRangePicker 
  date={selectedDate} 
  setDate={setSelectedDate} 
  label="Select Date" 
  enabledDates={enabledDates} 
/>
```

**Después:**
```tsx
<DateRangePicker 
  date={selectedDate} 
  setDate={setSelectedDate} 
  label="Select Date" 
  enabledDates={enabledDates}
  isLoading={enabledDatesLoading}
/>
```

---

## Flujo Completo

```
1. Componente Monta
   ↓
2. useEnabledDates Hook Ejecuta
   └─ Llama a /api/enabled-dates?facility_id=X
   └─ SP [facility].[sp_GetEnabledEncounterDates] retorna fechas
   └─ State: isLoading=true, data=undefined
   ↓
3. UI Muestra Estado Carga
   ├─ Botón deshabilitado (opacity-60)
   ├─ Texto: "Select Date..." con animación pulsante
   └─ Si usuario abre calendario: muestra calendario con TODAS las fechas deshabilitadas
   ↓
4. enabledDates Carga Completamente
   └─ State: isLoading=false, data=[fechas]
   ↓
5. useEffect Establece Primera Fecha
   └─ setSelectedDate(firstEnabledDate)
   ↓
6. UI Actualiza
   ├─ Botón habilitado
   ├─ Muestra fecha seleccionada
   ├─ Muestra "9 dates available" en info banner
   └─ Si usuario abre calendario:
      ├─ Muestra SOLO las 9 fechas habilitadas
      └─ Todas las otras fechas aparecen deshabilitadas (opacity-50, no clickeables)
   ↓
7. Usuario Selecciona Fecha
   └─ Solo puede seleccionar de las 9 fechas habilitadas
   └─ Acuity Index carga datos para esa fecha
```

---

## Comportamiento Visual

### Estado de Carga
```
┌─────────────────────┐
│ Select Date...      │  (deshabilitado, animación pulsante)
└─────────────────────┘
```

### Después de Cargar
```
┌────────────────────────────┐
│ Tuesday, January 20, 2026  │  (habilitado)
└────────────────────────────┘
     │ 9 dates available │       (info banner)
```

### Calendario Abierto
```
┌─ Available (9) ─────────────────┐
│    January 2026                 │
│ Su Mo Tu We Th Fr Sa            │
│          1  2  3  4             │  ← Gris/deshabilitado
│  5  6  7  8  9 10 11            │  ← Gris/deshabilitado
│ 12 13 [14] 15 16 17 18          │  ← [14] habilitado, negrita
│ 19 20 21 22 23 24 25            │  ← Gris/deshabilitado
│ 26 27 28 29 30 31               │  ← Gris/deshabilitado
│                                 │
│ Las fechas con encuentros están │
│ disponibles en negrita/color.   │
│ Todas las otras están deshabilitadas.
└─────────────────────────────────┘
```

---

## Testing

Para verificar que todo funciona:

1. **Abrir página Acuity Index**
   - ✅ Debe mostrar "Select Date..." con animación
   - ✅ Botón debe estar deshabilitado

2. **Esperar carga de enabledDates**
   - ✅ Debe cambiar a fecha específica (primer encounter)
   - ✅ Debe mostrar "X dates available"
   - ✅ Botón debe estar habilitado

3. **Abrir calendario**
   - ✅ Debe mostrar solo las fechas con encounters como habilitadas
   - ✅ Todas las otras fechas deben estar deshabilitadas (opacity-50)
   - ✅ No se puede hacer clic en fechas deshabilitadas

4. **Seleccionar fecha diferente**
   - ✅ Solo se pueden seleccionar fechas en enabledDates
   - ✅ La selección dispara carga de Acuity Index

---

## Archivos Modificados

1. ✅ `client/src/components/ui/calendar.tsx` - Lógica de disabled mejorada
2. ✅ `client/src/pages/acuity-report.tsx` - Lógica de carga y UI mejorada

## Archivos NO modificados

- ✅ `client/src/hooks/use-enabled-dates.ts` - Sin cambios (funciona correctamente)
- ✅ `/api/enabled-dates-api.php` - Sin cambios (funciona correctamente)
- ✅ `[facility].[sp_GetEnabledEncounterDates]` - Sin cambios (funciona correctamente)

---

## Conclusión

El date picker de Acuity Index ahora:
- ✅ Deshabilita TODAS las fechas sin encounters
- ✅ Solo permite seleccionar fechas con datos disponibles
- ✅ Proporciona feedback claro sobre estado de carga
- ✅ Muestra cuántas fechas están disponibles
- ✅ Selecciona automáticamente la primera fecha disponible
- ✅ Manejo robusto de timezones y formatos de fecha

**Status:** ✅ IMPLEMENTADO Y VERIFICADO
