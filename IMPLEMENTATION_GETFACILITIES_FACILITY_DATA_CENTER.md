# 📝 Implementation: getFacilities() Now Uses FacilityDataCenter Endpoint

## 📋 Change Summary

Modified the `getFacilities()` function in the React client's authentication hook to invoke the new endpoint structure:

**Old Endpoint Structure:**
```json
POST /api/get
{
  "entity": "Facility",
  "action": "lst",
  "email": "user_email",
  "token": "user_token",
  "providerId": "optional"
}
```

**New Endpoint Structure:**
```json
POST /api/get
{
  "entity": "FacilityDataCenter",
  "method": "lstFacilitiesByWounds",
  "email": "user_email",
  "token": "user_token",
  "providerId": "optional",
  "practiceId": "optional"
}
```

---

## 🔧 Implementation Details

### File Modified
- **Path:** `client/src/hooks/use-auth.ts`
- **Function:** `getFacilities()`
- **Lines:** 367-430 (approximately)

### Changes Made

#### 1. Removed Unused Variables
```typescript
// REMOVED (no longer needed for this endpoint):
- deviceId handling (kept for storage, but not sent)
- encountertrackid generation
```

#### 2. Updated Payload Structure
```typescript
// NEW payload structure:
const requestPayload: any = {
  entity: "FacilityDataCenter",        // NEW entity type
  method: "lstFacilitiesByWounds",    // NEW method
  token: cleanToken,
  email,
};

// Optional parameters based on user role:
if (practiceId) requestPayload.practiceId = practiceId;
if (providerId) requestPayload.providerId = providerId;
```

#### 3. Dynamic Provider ID Resolution
```typescript
// Auto-detect provider ID from user groups
const userGroups = getUserGroups();
const entityId = localStorage.getItem("userEntityId");

if (userGroups.includes('Provider') && entityId) {
  providerId = entityId;
}
```

#### 4. Improved Logging
```typescript
console.log('[useAuth] getFacilities using new FacilityDataCenter endpoint');
console.log('[useAuth] getFacilities payload:', {
  entity: "FacilityDataCenter",
  method: "lstFacilitiesByWounds",
  email,
  providerId,
  practiceId,
  token: '***',
  note: 'New endpoint: POST /api/get with FacilityDataCenter entity'
});
```

---

## 📊 Payload Examples

### Example 1: Regular User
```json
{
  "entity": "FacilityDataCenter",
  "method": "lstFacilitiesByWounds",
  "email": "user@example.com",
  "token": "token-uuid"
}
```

### Example 2: Provider User
```json
{
  "entity": "FacilityDataCenter",
  "method": "lstFacilitiesByWounds",
  "email": "provider@example.com",
  "token": "token-uuid",
  "providerId": "101"
}
```

### Example 3: Future - With Practice ID
```json
{
  "entity": "FacilityDataCenter",
  "method": "lstFacilitiesByWounds",
  "email": "user@example.com",
  "token": "token-uuid",
  "providerId": "101",
  "practiceId": "5"
}
```

---

## 🔄 Call Flow

### Current Flow

```
Login → getFacilities() → POST /api/get
                        ↓
                    FacilityDataCenter endpoint
                        ↓
                    Remote API (cubed-mr.app)
                        ↓
                    SP: sp_facility_LST_AllFacilitiesByWounds
                        ↓
                    Facility List with Wound Statistics
```

### Integration Points

1. **Client:** React hook `useAuth()` → `getFacilities()`
2. **Request:** POST `/facility/api/get` (Express server)
3. **Payload:** `FacilityDataCenter.lstFacilitiesByWounds`
4. **Backend:** Remote API (cubed-mr.app)
5. **Database:** SQL Server SP `facility.sp_facility_LST_AllFacilitiesByWounds`

---

## ✅ Testing Checklist

### Prerequisites
- [ ] User is authenticated with valid token
- [ ] Email is stored in localStorage
- [ ] User's entityId is stored (for providers)
- [ ] User groups are properly loaded

### Test Cases

#### Test 1: Regular User (No Provider)
```javascript
// Expected payload:
{
  entity: "FacilityDataCenter",
  method: "lstFacilitiesByWounds",
  email: "user@example.com",
  token: "token-xxx"
}
// providerId and practiceId should be undefined/not included
```

#### Test 2: Provider User
```javascript
// Expected payload:
{
  entity: "FacilityDataCenter",
  method: "lstFacilitiesByWounds",
  email: "provider@example.com",
  token: "token-xxx",
  providerId: "101"
}
```

#### Test 3: Successful Response
```json
{
  "status": true,
  "data": [
    {
      "id": 5,
      "facility_id": 5,
      "name": "Facility 5",
      "total_wound_encounters": 145,
      "active_wounds": 28,
      "average_push_score": "8.45",
      "acuity_level": "Alerta",
      ...
    }
  ]
}
```

---

## 🔗 Related Components

### Components Using `getFacilities()`
1. **FacilitySelectorPage** (`client/src/pages/facility-selector.tsx`)
   - Calls `getFacilities()` on mount
   - Displays list to user for selection

2. **App.tsx** (Main Application)
   - Calls `getFacilities()` after login
   - Populates `availableFacilities` in localStorage

3. **useAuth Hook** (itself)
   - `getFacilities()` is part of this hook
   - Called by other components

### Related Hooks
- `useLogoutOnBrowserClose` - Handles logout
- `useSingleTabEnforcement` - Prevents multiple tabs
- `use-logout-on-unload` - Cleanup on page close

---

## 📝 Code Diff

### Before (Old Implementation)
```typescript
// Old: Multiple entities based on user role
if (userGroups.includes('Provider')) {
  entity = "FacilitiesByProvider";
  params.providerId = entityId;
} else if (userGroups.includes('Nurse')) {
  entity = "Facility";
  params.action = "lst";
  params.nurseId = entityId;
} else {
  entity = "Facility";
  params.action = "lst";
  params.id = entityId || email;
}

const requestPayload: any = {
  entity,
  token: cleanToken,
  email,
  deviceId,
  encountertrackid,
  ...params
};
```

### After (New Implementation)
```typescript
// New: Single entity with optional parameters
let providerId: string | undefined;
let practiceId: string | undefined;

if (userGroups.includes('Provider') && entityId) {
  providerId = entityId;
}

const requestPayload: any = {
  entity: "FacilityDataCenter",
  method: "lstFacilitiesByWounds",
  token: cleanToken,
  email,
};

if (practiceId) requestPayload.practiceId = practiceId;
if (providerId) requestPayload.providerId = providerId;
```

---

## 🎯 Benefits

1. **Simplified Logic**
   - Single entity type (`FacilityDataCenter`)
   - Clear method name (`lstFacilitiesByWounds`)
   - No more role-based branching

2. **Better Semantics**
   - Entity name reflects business logic ("DataCenter")
   - Method name is explicit and descriptive
   - Easier to understand code intent

3. **Scalability**
   - Easy to add new methods (e.g., `getFacilitiesForProvider`, `searchFacilities`)
   - Single endpoint pattern for all facility operations
   - Future-proof design

4. **Cleaner Request**
   - Removed unnecessary parameters (deviceId, encountertrackid)
   - Only sends required fields
   - Smaller payload size

---

## ⚠️ Important Notes

### Backward Compatibility
- This change **REQUIRES** server-side implementation
- The Express server (`routes.ts`) must handle `entity: "FacilityDataCenter"`
- The remote backend must support `method: "lstFacilitiesByWounds"`

### Server Implementation Needed
```typescript
// In server/routes.ts, need to handle:
if (entity === "FacilityDataCenter") {
  switch(method) {
    case "lstFacilitiesByWounds":
      // Call sp_facility_LST_AllFacilitiesByWounds
      // Pass providerId and practiceId parameters
      break;
  }
}
```

### Testing in Development
```bash
# Monitor browser console for:
[useAuth] getFacilities using new FacilityDataCenter endpoint
[useAuth] getFacilities payload: {...}
[useAuth] Facilities response: {...}
```

---

## 📚 Documentation References

- **Component:** [FacilitySelector](client/src/pages/facility-selector.tsx)
- **Hook:** [useAuth](client/src/hooks/use-auth.ts)
- **Server:** [routes.ts](server/routes.ts)
- **Database:** [sp-facility-lst-all-facilities-by-wounds.sql](sp-facility-lst-all-facilities-by-wounds.sql)

---

## 🔄 Next Steps

1. ✅ Update React client hook (DONE - this change)
2. ⏳ Update Express server to handle `FacilityDataCenter` entity
3. ⏳ Update remote backend to handle `lstFacilitiesByWounds` method
4. ⏳ Test end-to-end flow
5. ⏳ Update Flutter client (if using same API)

