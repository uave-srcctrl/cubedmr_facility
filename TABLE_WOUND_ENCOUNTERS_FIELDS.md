# 📋 Listado Completo de Campos: facility.wound_encounters

## 📊 Campos de la Tabla (28 campos totales)

### Información Identificadora (4 campos)
```
1.  patient_id          | VARCHAR(50)      | REQUERIDO | ID del paciente
2.  facility_id         | INT              | REQUERIDO | ID de la facility (FK)
3.  provider_id         | INT              | OPCIONAL  | ID del proveedor (FK)
4.  patient_name        | VARCHAR(100)     | OPCIONAL  | Nombre del paciente
```

### Características de la Herida (6 campos)
```
5.  location            | VARCHAR(100)     | REQUERIDO | Ubicación de la herida
6.  etiology            | VARCHAR(100)     | REQUERIDO | Causa/origen de la herida
7.  width               | DECIMAL(10,2)    | OPCIONAL  | Ancho en cm
8.  height              | DECIMAL(10,2)    | OPCIONAL  | Alto en cm
9.  depth               | DECIMAL(10,2)    | OPCIONAL  | Profundidad en cm
10. surface             | DECIMAL(10,2)    | REQUERIDO | Área de superficie (cm²)
```

### Características Clínicas (4 campos)
```
11. exudate             | VARCHAR(50)      | OPCIONAL  | Tipo de exudado (Enum)
12. tissue              | VARCHAR(100)     | OPCIONAL  | Tipo de tejido
13. treatment           | VARCHAR(MAX)     | OPCIONAL  | Plan/descripción de tratamiento
14. frequency           | VARCHAR(50)      | OPCIONAL  | Frecuencia de tratamiento
```

### Estado y Disposición (3 campos)
```
15. progress            | VARCHAR(50)      | REQUERIDO | Progreso (Improving|Deteriorating|Stable)
16. disposition         | VARCHAR(50)      | REQUERIDO | Disposición (Active|Resolved|New|Hospitalized)
17. debridement         | VARCHAR(50)      | OPCIONAL  | Tipo de desbridamiento (Enum)
```

### Superficies y Fechas (5 campos)
```
18. initial_surface     | DECIMAL(10,2)    | OPCIONAL  | Área inicial de superficie
19. start_date          | DATE             | OPCIONAL  | Fecha de inicio de la herida
20. dos                 | DATE             | REQUERIDO | Date of Service (Fecha de servicio)
21. days                | INT              | OPCIONAL  | Duración en días
```

### Cicatrización (3 campos)
```
22. healing_percentage  | DECIMAL(5,2)     | OPCIONAL  | Porcentaje de cicatrización (0-100)
23. healing_rate        | DECIMAL(10,2)    | OPCIONAL  | Velocidad de cicatrización (cm²/semana)
24. healing_days        | INT              | OPCIONAL  | Estimado de días para cicatrizar
```

### Scoring (1 campo)
```
25. push_score          | INT              | REQUERIDO | PUSH Score (0-17)
```

### Auditoría (2 campos)
```
26. created_date        | DATETIME2        | AUTO      | Fecha/hora de creación (GETDATE())
27. import_source       | VARCHAR(255)     | AUTO      | Usuario/token que realizó importación
```

### Campos del Sistema (1 campo)
```
28. id                  | INT              | AUTO      | Primary Key IDENTITY(1,1)
```

---

## 🔴 CAMPOS REQUERIDOS (9 campos)

| Campo | Tipo | Descripción | Validación |
|-------|------|-------------|-----------|
| `patient_id` | VARCHAR(50) | ID único del paciente | No vacío |
| `facility_id` | INT | ID de la facility | Número entero |
| `location` | VARCHAR(100) | Ubicación de la herida | No vacío |
| `etiology` | VARCHAR(100) | Causa de la herida | No vacío |
| `surface` | DECIMAL(10,2) | Área superficie (cm²) | Número > 0 |
| `progress` | VARCHAR(50) | Progreso de herida | Enum: Improving, Deteriorating, Stable |
| `disposition` | VARCHAR(50) | Disposición/estado | Enum: Active, Resolved, New, Hospitalized |
| `dos` | DATE | Date of Service | Fecha válida |
| `push_score` | INT | PUSH Score | Número 0-17 |

---

## 🟡 CAMPOS OPCIONALES (14 campos)

| Campo | Tipo | Descripción | Valores Válidos |
|-------|------|-------------|-----------------|
| `provider_id` | INT | ID del proveedor | Número entero o NULL |
| `patient_name` | VARCHAR(100) | Nombre del paciente | String o NULL |
| `width` | DECIMAL(10,2) | Ancho en cm | Número ≥ 0 o NULL |
| `height` | DECIMAL(10,2) | Alto en cm | Número ≥ 0 o NULL |
| `depth` | DECIMAL(10,2) | Profundidad en cm | Número ≥ 0 o NULL |
| `exudate` | VARCHAR(50) | Tipo de exudado | None, Minimal, Moderate, Heavy, Copious o NULL |
| `tissue` | VARCHAR(100) | Tipo de tejido | String o NULL |
| `treatment` | VARCHAR(MAX) | Plan de tratamiento | String (hasta 2000 chars) o NULL |
| `frequency` | VARCHAR(50) | Frecuencia | String o NULL |
| `debridement` | VARCHAR(50) | Tipo de desbridamiento | None, Autolytic, Enzymatic, Mechanical, Surgical o NULL |
| `initial_surface` | DECIMAL(10,2) | Área inicial (cm²) | Número ≥ 0 o NULL |
| `start_date` | DATE | Fecha de inicio | Fecha válida o NULL |
| `days` | INT | Duración en días | Número ≥ 0 o NULL |
| `healing_percentage` | DECIMAL(5,2) | % Cicatrización | Número 0-100 o NULL |
| `healing_rate` | DECIMAL(10,2) | Velocidad cicatrización | Número ≥ 0 o NULL |
| `healing_days` | INT | Días estimados | Número ≥ 0 o NULL |

---

## ⚙️ CAMPOS AUTOGENERADOS (3 campos)

| Campo | Tipo | Valor | Descripción |
|-------|------|-------|-------------|
| `id` | INT | IDENTITY(1,1) | Primary Key, auto-incrementado |
| `created_date` | DATETIME2 | GETDATE() | Fecha/hora actual de creación |
| `import_source` | VARCHAR(255) | JWT token/user | Usuario que realizó la importación |

---

## 📐 ESQUEMA SQL DE CREACIÓN

```sql
CREATE TABLE facility.wound_encounters (
  id INT PRIMARY KEY IDENTITY(1,1),
  
  -- Información Identificadora
  patient_id VARCHAR(50) NOT NULL,
  facility_id INT NOT NULL,
  provider_id INT NULL,
  patient_name VARCHAR(100) NULL,
  
  -- Características de la Herida
  location VARCHAR(100) NOT NULL,
  etiology VARCHAR(100) NOT NULL,
  width DECIMAL(10,2) NULL,
  height DECIMAL(10,2) NULL,
  depth DECIMAL(10,2) NULL,
  surface DECIMAL(10,2) NOT NULL,
  
  -- Características Clínicas
  exudate VARCHAR(50) NULL,
  tissue VARCHAR(100) NULL,
  treatment VARCHAR(MAX) NULL,
  frequency VARCHAR(50) NULL,
  
  -- Estado y Disposición
  progress VARCHAR(50) NOT NULL,
  disposition VARCHAR(50) NOT NULL,
  debridement VARCHAR(50) NULL,
  
  -- Superficies y Fechas
  initial_surface DECIMAL(10,2) NULL,
  start_date DATE NULL,
  dos DATE NOT NULL,
  days INT NULL,
  
  -- Cicatrización
  healing_percentage DECIMAL(5,2) NULL,
  healing_rate DECIMAL(10,2) NULL,
  healing_days INT NULL,
  
  -- Scoring
  push_score INT NOT NULL,
  
  -- Auditoría
  created_date DATETIME2 DEFAULT GETDATE(),
  import_source VARCHAR(255) NULL,
  
  -- Foreign Keys (Recomendado)
  FOREIGN KEY (facility_id) REFERENCES facility.facilities(id),
  
  -- Índices
  INDEX IX_facility_id (facility_id),
  INDEX IX_patient_id (patient_id),
  INDEX IX_created_date (created_date)
);
```

---

## 🗂️ ORGANIZACIÓN POR GRUPO

### Grupo 1: Identificación (4 campos)
```
patient_id
facility_id
provider_id
patient_name
```

### Grupo 2: Herida (6 campos)
```
location
etiology
width
height
depth
surface
```

### Grupo 3: Clínica (4 campos)
```
exudate
tissue
treatment
frequency
```

### Grupo 4: Estado (3 campos)
```
progress
disposition
debridement
```

### Grupo 5: Tiempo y Medidas (5 campos)
```
initial_surface
start_date
dos
days
```

### Grupo 6: Cicatrización (3 campos)
```
healing_percentage
healing_rate
healing_days
```

### Grupo 7: Scoring (1 campo)
```
push_score
```

### Grupo 8: Auditoría (2 campos)
```
created_date
import_source
```

---

## 📊 ESTADÍSTICAS

| Métrica | Valor |
|---------|-------|
| **Total de campos** | 28 |
| **Campos requeridos** | 9 |
| **Campos opcionales** | 14 |
| **Campos autogenerados** | 3 |
| **Campos de texto (VARCHAR)** | 13 |
| **Campos numéricos (DECIMAL/INT)** | 11 |
| **Campos de fecha (DATE)** | 2 |
| **Campos de auditoria** | 2 |

---

## ✅ TIPOS DE DATOS

| Tipo de Dato | Campos | Ejemplo |
|-------------|--------|---------|
| VARCHAR(50) | patient_id | "P12345" |
| VARCHAR(100) | patient_name, location, etiology, tissue | "John Doe", "Left leg" |
| VARCHAR(255) | import_source | "user@example.com" |
| VARCHAR(MAX) | treatment | "Largas descripciones..." |
| INT | facility_id, provider_id, days, healing_days, push_score | 1, 42, 5, 10, 12 |
| DECIMAL(10,2) | width, height, depth, surface, initial_surface, healing_rate | 5.50, 10.25 |
| DECIMAL(5,2) | healing_percentage | 75.50 |
| DATE | start_date, dos | 2026-01-20 |
| DATETIME2 | created_date | 2026-01-20 14:30:45.1234567 |

---

## 🔗 RELACIONES (Foreign Keys)

```sql
-- Foreign Key a facilities
FOREIGN KEY (facility_id) REFERENCES facility.facilities(id)

-- Recomendado agregaar:
FOREIGN KEY (provider_id) REFERENCES facility.providers(id)  -- Si existe tabla
```

---

## 🔍 ÍNDICES RECOMENDADOS

```sql
CREATE INDEX IX_wound_encounters_facility_id ON facility.wound_encounters(facility_id);
CREATE INDEX IX_wound_encounters_patient_id ON facility.wound_encounters(patient_id);
CREATE INDEX IX_wound_encounters_created_date ON facility.wound_encounters(created_date);
CREATE INDEX IX_wound_encounters_dos ON facility.wound_encounters(dos);
CREATE INDEX IX_wound_encounters_progress ON facility.wound_encounters(progress);
```

---

## 📝 ENUMERACIONES PERMITIDAS

### Progress (Progreso)
```
'Improving'
'Deteriorating'
'Stable'
```

### Disposition (Disposición)
```
'Active'
'Resolved'
'New'
'Hospitalized'
```

### Exudate (Exudado)
```
'None'
'Minimal'
'Moderate'
'Heavy'
'Copious'
```

### Debridement (Desbridamiento)
```
'None'
'Autolytic'
'Enzymatic'
'Mechanical'
'Surgical'
```

---

## 💾 CAPACIDAD DE ALMACENAMIENTO

| Campo | Max Tamaño |
|-------|-----------|
| patient_id | 50 caracteres |
| location | 100 caracteres |
| etiology | 100 caracteres |
| patient_name | 100 caracteres |
| tissue | 100 caracteres |
| exudate | 50 caracteres |
| frequency | 50 caracteres |
| progress | 50 caracteres |
| disposition | 50 caracteres |
| debridement | 50 caracteres |
| treatment | SIN LÍMITE (VARCHAR(MAX)) |
| import_source | 255 caracteres |

---

## ✅ RESUMEN

### 28 Campos totales:
- **9 requeridos**: Datos críticos para funcionalidad
- **14 opcionales**: Enriquecimiento de información
- **3 autogenerados**: Auditoria y gestión del sistema
- **2 campos de tiempo**: Auditoría temporal
- **13 campos de texto**: Información descriptiva
- **11 campos numéricos**: Medidas y scores

**Estado**: ✅ ESTRUCTURA COMPLETA Y DOCUMENTADA
