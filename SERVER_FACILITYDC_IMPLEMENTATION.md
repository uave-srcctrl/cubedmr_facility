# Server Implementation: FacilityDataCenter Entity Handler

## Overview

Updated Express.js server to handle the new `FacilityDataCenter` entity for retrieving facility data with wound statistics.

## Changes Made

### File: `server/routes.ts`

**Location:** Lines 242-263 (in the `/api/get` POST handler)

**Change:** Added `"FacilityDataCenter"` to the list of entities that require FormData/multipart encoding.

```typescript
// BEFORE:
} else if (requestedEntity === "Facility" || requestedEntity === "FacilitiesByProvider") {

// AFTER:
} else if (requestedEntity === "Facility" || requestedEntity === "FacilitiesByProvider" || requestedEntity === "FacilityDataCenter") {
```

### Why FormData?

The remote API (`cubed-mr.app`) expects multipart/form-data for facility list operations:
- Converts the JSON payload to FormData
- Adds Authorization header with Bearer token
- Sends via POST to `https://cubed-mr.app/api/get`
- Remote API routes `method: "lstFacilitiesByWounds"` to the appropriate handler

## Request Flow

### Client Request (React)

```json
POST http://localhost:5000/api/get
{
  "entity": "FacilityDataCenter",
  "method": "lstFacilitiesByWounds",
  "email": "drperez@curisec.com",
  "token": "E95C2109-9945-4CE5-8026-82844C13E8FE",
  "providerId": "5"
}
```

### Server Processing

1. **Receives** JSON request from React client
2. **Validates** required parameters (entity, email, token)
3. **Extracts** remote payload with FacilityDataCenter parameters
4. **Converts** to FormData (multipart) for remote API compatibility
5. **Forwards** to remote API with Authorization header
6. **Returns** facility list with wound statistics to client

### Remote API Call

```
POST https://cubed-mr.app/api/get
Content-Type: multipart/form-data
Authorization: Bearer {token}

Parameters:
- entity: FacilityDataCenter
- method: lstFacilitiesByWounds
- email: user email
- token: auth token
- providerId: (optional) filter by provider
- practiceId: (optional) filter by practice
```

### Remote Database Call

Remote API calls SQL Server stored procedure:

```sql
EXEC facility.sp_facility_LST_AllFacilitiesByWounds 
  @providerId = 5,
  @includeZeroWounds = 1
```

### Response to Client

```json
{
  "status": true,
  "data": [
    {
      "id": 5,
      "facility_id": 5,
      "name": "Facility 5",
      "facility_name": "Facility 5",
      "total_wound_encounters": 145,
      "total_active_patients": 32,
      "patients_seen_today": 8,
      "active_wounds": 28,
      "new_wounds": 5,
      "resolved_wounds": 112,
      "hospitalized_wounds": 2,
      "improving_wounds": 18,
      "deteriorating_wounds": 3,
      "stable_wounds": 7,
      "critical_wounds": 1,
      "alert_wounds": 4,
      "chronic_wounds": 23,
      "average_push_score": "8.45",
      "average_wound_area_cm2": "12.34",
      "average_days_since_onset": "45",
      "percent_improving": "64.29",
      "percent_resolved": "77.93",
      "top_etiologies": "Pressure,Venous,Traumatic",
      "acuity_level": "Alerta",
      "last_encounter_date": "2024-01-15T09:30:00",
      "first_encounter_date": "2023-06-20T14:15:00",
      "report_date": "2024-01-15T23:59:59"
    }
  ]
}
```

## Parameters Reference

### FacilityDataCenter Entity Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| entity | string | ✅ Yes | Must be `"FacilityDataCenter"` |
| method | string | ✅ Yes | Must be `"lstFacilitiesByWounds"` |
| email | string | ✅ Yes | User email (used by remote API) |
| token | string | ✅ Yes | JWT authentication token |
| providerId | integer | ❌ No | Filter facilities by provider ID |
| practiceId | integer | ❌ No | Filter facilities by practice ID |

### Optional Parameters Behavior

- **providerId omitted:** Returns all facilities accessible to user
- **providerId included:** Returns only facilities where that provider has wound encounters
- **practiceId omitted:** Uses default or all practices
- **practiceId included:** Filters by practice (if supported by remote API)

## Implementation Details

### Content-Type Handling

The server automatically detects FacilityDataCenter and uses multipart/form-data:

```typescript
// Set proper headers for multipart FormData
headers = {
  ...formData.getHeaders(),  // Adds boundary and other FormData headers
  ...(remotePayload.token && { "Authorization": `Bearer ${remotePayload.token}` }),
};
```

### Token Authorization

The token is added as a Bearer header for API authentication:

```
Authorization: Bearer {token}
```

This allows the remote API to validate the user and their permissions before returning facility data.

### Logging

New debug logging was added to help troubleshoot:

```typescript
console.log("[/api/get] Sending as FormData (multipart) for Facility list with Authorization header", {
  entity: requestedEntity,      // "FacilityDataCenter"
  method: remotePayload.method, // "lstFacilitiesByWounds"
  providerId: remotePayload.providerId,
  practiceId: remotePayload.practiceId
});
```

## Testing Checklist

- [ ] Client sends correct FacilityDataCenter payload
- [ ] Server receives and logs the request
- [ ] Server converts to FormData correctly
- [ ] Server includes Authorization header
- [ ] Remote API returns facility list successfully
- [ ] Facilities display in React component
- [ ] Provider filtering works when providerId included
- [ ] Empty list handled gracefully if no results

## Troubleshooting

### Facilities List Still Empty

1. **Check Server Logs:**
   ```
   [/api/get] Sending as FormData (multipart) for Facility list...
   [/api/get] Remote response status: 200
   ```

2. **Verify Token Validity:**
   - Token should not be expired
   - Token should belong to authenticated user

3. **Verify Remote API Accessibility:**
   ```bash
   curl -X POST https://cubed-mr.app/api/get \
     -H "Authorization: Bearer {token}" \
     -F "entity=FacilityDataCenter" \
     -F "method=lstFacilitiesByWounds" \
     -F "email=user@email.com" \
     -F "token={token}" \
     -F "providerId=5"
   ```

### Authorization Errors

- **401 Unauthorized:** Token may be invalid or expired
  - Check that token is from successful TryLogin call
  - Verify token hasn't expired (check localStorage)

- **403 Forbidden:** User lacks permissions
  - Verify user has provider/facility access rights
  - Check if user is in correct group (Provider, Nurse, etc.)

### Missing Method Error

- **"Method not found":** Remote API doesn't recognize `lstFacilitiesByWounds`
  - Verify SQL procedure `sp_facility_LST_AllFacilitiesByWounds` is deployed
  - Check procedure name matches exactly (case-sensitive)

## Integration with SQL Procedure

The remote API will invoke:

```sql
EXEC facility.sp_facility_LST_AllFacilitiesByWounds
  @providerId = {providerId from request},
  @includeZeroWounds = 1
```

### SQL Procedure Requirements

- **Location:** SQL Server database on 190.92.153.67
- **Schema:** `facility`
- **Name:** `sp_facility_LST_AllFacilitiesByWounds`
- **Deployment:** Required before facilities can be retrieved
- **Parameters:**
  - @providerId INT (optional, filters by provider)
  - @includeZeroWounds BIT (default = 1, includes facilities with no wounds)

## Performance Notes

- **Expected Response Time:** <1 second
- **Network:** HTTP request to remote API
- **Database:** Single stored procedure call
- **Caching:** Not implemented (fresh data on each request)

## Future Enhancements

1. **Client-Side Caching:**
   - Cache facilities list for 5-10 minutes
   - Refresh on demand

2. **Pagination:**
   - Add `limit` and `offset` parameters
   - For facilities with 100+ providers

3. **Sorting:**
   - Add `orderBy` parameter
   - Sort by name, encounters, wounds, etc.

4. **Additional Filtering:**
   - Filter by date range
   - Filter by acuity level
   - Filter by wound type

## Related Files

- **React Client:** [client/src/hooks/use-auth.ts](../client/src/hooks/use-auth.ts#L367-L430)
- **Facility Selector:** [client/src/components/FacilitySelectorPage.tsx](../client/src/components/FacilitySelectorPage.tsx)
- **SQL Procedure:** [sp-facility-lst-all-facilities-by-wounds.sql](./sp-facility-lst-all-facilities-by-wounds.sql)
- **Router Handler:** [server/routes.ts](./routes.ts#L242-L263)

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-01-15 | Dev Team | Initial implementation of FacilityDataCenter handler |

