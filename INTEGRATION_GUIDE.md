# 🔗 Integración: Procedimientos facility en React

## Cómo Conectar los Procedimientos al Frontend

### Arquitectura Propuesta

```
React Client
    ↓
Node.js Server (routes.ts)
    ↓
SQL Server (facility.sp_facility_*)
    ↓
facility.wound_encounters
```

---

## 1. Crear Endpoints en Node.js

### routes.ts

```typescript
import mssql from 'mssql';

// Configuración de conexión
const config = {
  server: '190.92.153.67',
  database: 'curisec',
  authentication: {
    type: 'default',
    options: {
      userName: 'curisec',
      password: 'curisec123'
    }
  },
  options: {
    trustServerCertificate: true,
    encrypt: true
  }
};

// ════════════════════════════════════════════════════════════════
// ENDPOINT 1: Wound Outcome
// ════════════════════════════════════════════════════════════════

app.post('/api/facility-wound-outcome-local', async (req, res) => {
  try {
    const { facilityId, startDate, endDate } = req.body;
    
    // Validar autenticación
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Conectar a BD
    const pool = new mssql.ConnectionPool(config);
    await pool.connect();
    
    const request = pool.request();
    const result = await request
      .input('facilityId', mssql.Int, facilityId)
      .input('startDate', mssql.Date, startDate)
      .input('endDate', mssql.Date, endDate)
      .execute('facility.sp_facility_WoundOutcome');

    await pool.close();

    res.json({
      status: true,
      data: result.recordset,
      source: 'local_procedure'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      status: false,
      error: error.message 
    });
  }
});

// ════════════════════════════════════════════════════════════════
// ENDPOINT 2: Acuity Index
// ════════════════════════════════════════════════════════════════

app.post('/api/facility-acuity-index-local', async (req, res) => {
  try {
    const { facilityId, daysBack = 90 } = req.body;
    
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pool = new mssql.ConnectionPool(config);
    await pool.connect();
    
    const request = pool.request();
    const result = await request
      .input('facilityId', mssql.Int, facilityId)
      .input('daysBack', mssql.Int, daysBack)
      .execute('facility.sp_facility_AcuityIndex');

    await pool.close();

    res.json({
      status: true,
      data: result.recordset,
      source: 'local_procedure'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      status: false,
      error: error.message 
    });
  }
});

// ════════════════════════════════════════════════════════════════
// ENDPOINT 3: High Risk Wounds
// ════════════════════════════════════════════════════════════════

app.post('/api/facility-high-risk-wounds', async (req, res) => {
  try {
    const { facilityId, pushScoreThreshold = 12 } = req.body;
    
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pool = new mssql.ConnectionPool(config);
    await pool.connect();
    
    const request = pool.request();
    const result = await request
      .input('facilityId', mssql.Int, facilityId)
      .input('pushScoreThreshold', mssql.Int, pushScoreThreshold)
      .execute('facility.sp_facility_HighRiskWounds');

    await pool.close();

    res.json({
      status: true,
      data: result.recordset,
      alerts: result.recordset.filter(w => w.alert_level === 'Crítico'),
      source: 'local_procedure'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      status: false,
      error: error.message 
    });
  }
});

// ════════════════════════════════════════════════════════════════
// ENDPOINT 4: Patient Wound Summary
// ════════════════════════════════════════════════════════════════

app.post('/api/facility-patient-summary', async (req, res) => {
  try {
    const { facilityId, startDate, endDate } = req.body;
    
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pool = new mssql.ConnectionPool(config);
    await pool.connect();
    
    const request = pool.request();
    const result = await request
      .input('facilityId', mssql.Int, facilityId)
      .input('startDate', mssql.Date, startDate)
      .input('endDate', mssql.Date, endDate)
      .execute('facility.sp_facility_PatientWoundSummary');

    await pool.close();

    res.json({
      status: true,
      data: result.recordset,
      highRiskPatients: result.recordset.filter(p => p.risk_level === 'Alto Riesgo'),
      source: 'local_procedure'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      status: false,
      error: error.message 
    });
  }
});
```

---

## 2. Actualizar React Hooks

### hooks/use-local-procedures.ts

```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

const API_URL = 'http://localhost:5000/api';

export function useWoundOutcomeLocal(facilityId: number, startDate?: string, endDate?: string) {
  const { getAuthInfo } = useAuth();
  const authInfo = getAuthInfo();

  return useQuery({
    queryKey: ['wound-outcome-local', facilityId, startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/facility-wound-outcome-local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authInfo.token}`
        },
        body: JSON.stringify({
          facilityId,
          startDate,
          endDate
        })
      });

      if (!response.ok) throw new Error('Failed to fetch wound outcome');
      return response.json();
    },
    enabled: !!startDate && !!endDate && !!authInfo.token
  });
}

export function useAcuityIndexLocal(facilityId: number, daysBack: number = 90) {
  const { getAuthInfo } = useAuth();
  const authInfo = getAuthInfo();

  return useQuery({
    queryKey: ['acuity-index-local', facilityId, daysBack],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/facility-acuity-index-local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authInfo.token}`
        },
        body: JSON.stringify({
          facilityId,
          daysBack
        })
      });

      if (!response.ok) throw new Error('Failed to fetch acuity index');
      return response.json();
    },
    enabled: !!authInfo.token
  });
}

export function useHighRiskWounds(facilityId: number, threshold: number = 12) {
  const { getAuthInfo } = useAuth();
  const authInfo = getAuthInfo();

  return useQuery({
    queryKey: ['high-risk-wounds', facilityId, threshold],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/facility-high-risk-wounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authInfo.token}`
        },
        body: JSON.stringify({
          facilityId,
          pushScoreThreshold: threshold
        })
      });

      if (!response.ok) throw new Error('Failed to fetch high risk wounds');
      return response.json();
    },
    enabled: !!authInfo.token
  });
}

export function usePatientWoundSummary(facilityId: number, startDate?: string, endDate?: string) {
  const { getAuthInfo } = useAuth();
  const authInfo = getAuthInfo();

  return useQuery({
    queryKey: ['patient-wound-summary', facilityId, startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/facility-patient-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authInfo.token}`
        },
        body: JSON.stringify({
          facilityId,
          startDate,
          endDate
        })
      });

      if (!response.ok) throw new Error('Failed to fetch patient summary');
      return response.json();
    },
    enabled: !!startDate && !!endDate && !!authInfo.token
  });
}
```

---

## 3. Usar en Componentes React

### pages/dashboard.tsx

```typescript
import { useWoundOutcomeLocal, useHighRiskWounds } from '@/hooks/use-local-procedures';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DashboardPage() {
  const facilityId = 5; // Del contexto autenticado
  const startDate = '2025-01-01';
  const endDate = '2025-12-31';

  // Datos de heridas
  const { data: woundData, isLoading: woundLoading } = useWoundOutcomeLocal(
    facilityId,
    startDate,
    endDate
  );

  // Heridas de alto riesgo
  const { data: riskData } = useHighRiskWounds(facilityId, 12);

  if (woundLoading) return <div>Cargando...</div>;

  const metrics = woundData?.data?.[0] || {};
  const criticalWounds = riskData?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Alertas de Alto Riesgo */}
      {criticalWounds.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            ⚠️ {criticalWounds.length} heridas críticas requieren atención inmediata
          </AlertDescription>
        </Alert>
      )}

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Heridas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.number_of_active_wounds || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">% Mejorando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {parseFloat(metrics.percent_of_wounds_improving || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Acuidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(metrics.facility_acuity_index || 0).toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PUSH Score Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(metrics.push_score_average || 0).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heridas Críticas */}
      {criticalWounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Heridas Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalWounds.map((wound) => (
                <div key={wound.encounter_id} className="p-3 border rounded bg-red-50">
                  <div className="flex justify-between">
                    <span>Paciente {wound.patient_id}</span>
                    <span className="font-bold">PUSH: {wound.push_score}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {wound.wound_etiology} - {wound.wound_location}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 4. Consideraciones de Performance

### Caching
```typescript
// Cachear resultados por 5 minutos
const queryOptions = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000
};
```

### Pool de Conexiones
```typescript
// En server.ts, crear pool una sola vez
let dbPool = null;

async function getDbPool() {
  if (!dbPool) {
    dbPool = new mssql.ConnectionPool(config);
    await dbPool.connect();
  }
  return dbPool;
}
```

### Paginación (si es necesario)
```typescript
// Para resultados grandes como PatientWoundSummary
const [page, setPage] = useState(1);
const pageSize = 20;

const paginatedData = data.slice(
  (page - 1) * pageSize,
  page * pageSize
);
```

---

## 5. Monitoreo y Logs

```typescript
// Agregar logging para debugging
app.post('/api/facility-wound-outcome-local', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // ... código ...
    
    const duration = Date.now() - startTime;
    console.log(`[SP] sp_facility_WoundOutcome took ${duration}ms`);
    
  } catch (error) {
    console.error('[SP ERROR] sp_facility_WoundOutcome:', error);
  }
});
```

---

## 6. Rutas Disponibles

```
POST /api/facility-wound-outcome-local
POST /api/facility-acuity-index-local
POST /api/facility-high-risk-wounds
POST /api/facility-patient-summary
```

---

**Última actualización:** 20 de enero de 2026
