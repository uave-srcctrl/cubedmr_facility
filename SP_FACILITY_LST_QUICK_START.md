# 🚀 Quick Start: sp_facility_LST_AllFacilitiesByWounds

## Deployment Steps

### Step 1: Execute the Procedure Creation Script

```bash
# Connect to SQL Server
sqlcmd -S 190.92.153.67 -U sa -P [password] -d remoteWoundcareDB
```

```sql
-- Copy and paste the entire content from:
-- sp-facility-lst-all-facilities-by-wounds.sql
```

### Step 2: Verify Installation

```sql
-- Check if procedure exists
SELECT * FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_SCHEMA = 'facility' 
  AND ROUTINE_NAME = 'sp_facility_LST_AllFacilitiesByWounds';
```

### Step 3: Run Test Queries

```sql
-- Test 1: All facilities
EXEC facility.sp_facility_LST_AllFacilitiesByWounds;

-- Test 2: Specific provider
EXEC facility.sp_facility_LST_AllFacilitiesByWounds @providerId = 101;

-- Test 3: Only with wounds
EXEC facility.sp_facility_LST_AllFacilitiesByWounds @includeZeroWounds = 0;
```

---

## Common Use Cases

### Get Facilities for Dashboard
```sql
SELECT TOP 20
    facility_id,
    facility_name,
    total_wound_encounters,
    active_wounds,
    critical_wounds,
    acuity_level,
    average_push_score
FROM 
    (EXEC facility.sp_facility_LST_AllFacilitiesByWounds) AS F
ORDER BY 
    total_wound_encounters DESC;
```

### Get High-Risk Facilities
```sql
SELECT
    facility_id,
    facility_name,
    total_wound_encounters,
    critical_wounds,
    alert_wounds,
    acuity_level
FROM 
    (EXEC facility.sp_facility_LST_AllFacilitiesByWounds) AS F
WHERE 
    acuity_level IN ('Crítico', 'Alerta')
ORDER BY 
    critical_wounds DESC;
```

### Get Provider's Facilities
```sql
DECLARE @provider INT = 101;

SELECT
    facility_id,
    facility_name,
    total_wound_encounters,
    total_active_patients,
    percent_improving,
    average_push_score
FROM 
    (EXEC facility.sp_facility_LST_AllFacilitiesByWounds @providerId = @provider) AS F
ORDER BY 
    total_wound_encounters DESC;
```

---

## Frontend Integration

### React Component Example
```typescript
// hooks/use-facilities-by-wounds.ts
import { useQuery } from '@tanstack/react-query';

export function useFacilitiesByWounds(providerId?: number) {
  return useQuery({
    queryKey: ['facilities-by-wounds', providerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (providerId) params.append('providerId', String(providerId));
      
      const response = await fetch(
        `/api/facility-facilities-by-wounds?${params}`,
        { method: 'POST' }
      );
      return response.json();
    },
  });
}

// Usage in component
function FacilitiesDashboard() {
  const { data: facilities } = useFacilitiesByWounds();
  
  return (
    <table>
      <tbody>
        {facilities?.map(f => (
          <tr key={f.id}>
            <td>{f.facility_name}</td>
            <td>{f.total_wound_encounters}</td>
            <td>{f.critical_wounds}</td>
            <td>{f.acuity_level}</td>
            <td>{f.average_push_score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Flutter Example
```dart
// services/facility_service.dart
Future<List<FacilityWithWounds>> getAllFacilitiesByWounds({
  int? providerId,
  bool includeZeroWounds = true,
}) async {
  final response = await post(
    '/api/facility-facilities-by-wounds',
    body: jsonEncode({
      'providerId': providerId,
      'includeZeroWounds': includeZeroWounds,
    }),
  );
  
  return List<FacilityWithWounds>.from(
    jsonDecode(response.body).map(
      (f) => FacilityWithWounds.fromJson(f),
    ),
  );
}

// Usage
final facilities = await facilityService.getAllFacilitiesByWounds();
final providerFacilities = await facilityService
    .getAllFacilitiesByWounds(providerId: 101);
```

---

## Expected Response Format

```json
[
  {
    "id": 5,
    "facility_id": 5,
    "name": "Facility 5",
    "facility_name": "Facility 5",
    "total_wound_encounters": 145,
    "total_active_patients": 32,
    "patients_seen_today": 5,
    "active_wounds": 28,
    "new_wounds": 8,
    "resolved_wounds": 89,
    "hospitalized_wounds": 20,
    "improving_wounds": 22,
    "deteriorating_wounds": 3,
    "stable_wounds": 3,
    "critical_wounds": 2,
    "alert_wounds": 8,
    "chronic_wounds": 12,
    "average_push_score": "8.45",
    "average_wound_area_cm2": "15.23",
    "average_days_since_onset": "42.50",
    "percent_improving": "61.40",
    "percent_resolved": "61.38",
    "top_etiologies": "85 Pressure Ulcer, 45 Diabetic, 15 Venous",
    "acuity_level": "Alerta",
    "provider_id": 101,
    "primary_provider_id": 101,
    "last_encounter_date": "2026-01-28",
    "first_encounter_date": "2025-08-15",
    "report_date": "2026-01-28"
  },
  {
    "id": 10,
    "facility_id": 10,
    "name": "Facility 10",
    ...
  }
]
```

---

## Performance Tips

### 1. Add Recommended Indexes
```sql
CREATE INDEX IX_wound_encounters_facility_id 
  ON facility.wound_encounters(facility_id);
  
CREATE INDEX IX_wound_encounters_provider_id 
  ON facility.wound_encounters(provider_id);
  
CREATE INDEX IX_wound_encounters_dos 
  ON facility.wound_encounters(dos);
  
CREATE INDEX IX_wound_encounters_push_score 
  ON facility.wound_encounters(push_score);
```

### 2. Use Caching
```typescript
// React Query cache time: 5 minutes
queryClient.setQueryDefaults(['facilities-by-wounds'], {
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 3. Pagination (if needed)
```sql
-- For large result sets, consider pagination
WITH FacilitiesRanked AS (
  SELECT ROW_NUMBER() OVER (ORDER BY total_wound_encounters DESC) as RowNum,
         *
  FROM (SELECT * FROM facility.sp_facility_LST_AllFacilitiesByWounds()) AS F
)
SELECT * FROM FacilitiesRanked
WHERE RowNum BETWEEN (@pageNumber - 1) * @pageSize + 1 
      AND @pageNumber * @pageSize;
```

---

## Troubleshooting

### Issue: "Procedure does not exist"
**Solution:** Run the creation script again
```sql
-- Delete if exists
DROP PROCEDURE IF EXISTS facility.sp_facility_LST_AllFacilitiesByWounds;
GO
-- Then run creation script
```

### Issue: No results returned
**Possible causes:**
1. `facility.wound_encounters` table is empty
2. Filters (@providerId, @includeZeroWounds) are too restrictive
3. Wrong schema name (check if it's `facility` not `dbo`)

**Solution:**
```sql
-- Check if data exists
SELECT COUNT(*) as total_encounters
FROM facility.wound_encounters;

-- Check schema
SELECT SCHEMA_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME = 'facility';
```

### Issue: Slow query execution
**Solution:** Add recommended indexes (see Performance Tips)

---

## Related Procedures

Other facility wound procedures:
- `facility.sp_facility_WoundOutcome` - Detailed wound metrics
- `facility.sp_facility_AcuityIndex` - Acuity index calculation
- `facility.sp_facility_HighRiskWounds` - Critical wounds list
- `facility.sp_facility_EtiologyDistribution` - Etiology analysis

---

## Files Generated

- ✅ `sp-facility-lst-all-facilities-by-wounds.sql` - SQL procedure code
- ✅ `SP_FACILITY_LST_ALL_FACILITIES_BY_WOUNDS_GUIDE.md` - Complete guide
- ✅ `SP_FACILITY_LST_QUICK_START.md` - This file

