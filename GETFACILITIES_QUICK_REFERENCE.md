# ⚡ Quick Reference: FacilityDataCenter Endpoint

## 🎯 What Changed

The `getFacilities()` function in the React client now sends requests using:

```json
POST /api/get
{
  "entity": "FacilityDataCenter",
  "method": "lstFacilitiesByWounds",
  "email": "user@example.com",
  "token": "token-uuid",
  "providerId": "optional",
  "practiceId": "optional"
}
```

## 📍 File Changed

- **File:** `client/src/hooks/use-auth.ts`
- **Function:** `getFacilities()`
- **Lines:** ~368-430

## 💡 Key Points

| Aspect | Old | New |
|--------|-----|-----|
| Entity | `"Facility"` or `"FacilitiesByProvider"` | `"FacilityDataCenter"` |
| Method/Action | `action: "lst"` | `method: "lstFacilitiesByWounds"` |
| Extra Params | deviceId, encountertrackid, id | providerId, practiceId (optional) |
| Complexity | Multiple branches (role-based) | Single clean request |

## 🔌 Request Example

### User Who Is NOT a Provider
```json
{
  "entity": "FacilityDataCenter",
  "method": "lstFacilitiesByWounds",
  "email": "user@hospital.com",
  "token": "abc-123-def-456"
}
```

### User Who IS a Provider (ID: 101)
```json
{
  "entity": "FacilityDataCenter",
  "method": "lstFacilitiesByWounds",
  "email": "provider@hospital.com",
  "token": "abc-123-def-456",
  "providerId": "101"
}
```

## 📦 Response

Same format as before:
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
      "critical_wounds": 2,
      "average_push_score": "8.45",
      "acuity_level": "Alerta",
      ...more fields...
    }
  ]
}
```

## ✅ Testing

### Browser Console Logs
Look for these logs to confirm it's working:
```
[useAuth] getFacilities using new FacilityDataCenter endpoint
[useAuth] getFacilities payload: {...}
[useAuth] Facilities response: {...}
```

### Quick Test Command
```javascript
// In browser console, after login:
const auth = useAuth(); // Approximate
// getFacilities will be called automatically during login flow
```

## ⚠️ Server Requirements

The **Express server** needs to handle this:

```typescript
// In server/routes.ts
if (req.body.entity === "FacilityDataCenter") {
  const method = req.body.method;
  
  switch(method) {
    case "lstFacilitiesByWounds":
      // Forward to remote API
      // Call sp_facility_LST_AllFacilitiesByWounds
      // With providerId parameter if provided
      break;
  }
}
```

## 🔄 When It's Called

1. **After Login** - `login.tsx` → `loadUserDataAndFacilities()` → `getFacilities()`
2. **App Initialization** - `App.tsx` → `updateAuthState()` → `getFacilities()`
3. **Manual Call** - Any component can call `useAuth().getFacilities()`

## 📝 Browser DevTools Tips

### Monitor Network Requests
1. Open DevTools → Network tab
2. Login and watch for POST to `/facility/api/get`
3. Check the Request payload:
   ```json
   {
     "entity": "FacilityDataCenter",
     "method": "lstFacilitiesByWounds",
     ...
   }
   ```

### Monitor Console Output
1. Open DevTools → Console tab
2. Filter for `[useAuth]` messages
3. Look for `getFacilities using new FacilityDataCenter endpoint`

## 🎯 Related Files

| File | Purpose |
|------|---------|
| `client/src/hooks/use-auth.ts` | Contains `getFacilities()` function |
| `client/src/pages/facility-selector.tsx` | Uses `getFacilities()` to display list |
| `server/routes.ts` | Must handle the new payload |
| `sp-facility-lst-all-facilities-by-wounds.sql` | Database SP that returns the data |

## 📞 Troubleshooting

### Issue: Still sending old entity type
**Solution:** Clear browser cache and reload
```bash
Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
# Clear Cookies and cached files
# Then reload the page
```

### Issue: Provider ID not being sent
**Possible causes:**
1. User doesn't have 'Provider' group
2. entityId is not in localStorage
3. entityId is "undefined" or "null" string

**Debug:**
```javascript
// In browser console:
console.log(JSON.parse(localStorage.getItem('userGroups')));
console.log(localStorage.getItem('userEntityId'));
```

### Issue: Empty facilities list returned
**Possible causes:**
1. No facilities with wound_encounters data
2. Remote API not returning data
3. Server not handling FacilityDataCenter entity

**Debug:**
1. Check browser Network tab for API response
2. Look for error messages in console
3. Check server logs on Express server

## 📚 Documentation

- **Full Details:** `IMPLEMENTATION_GETFACILITIES_FACILITY_DATA_CENTER.md`
- **SP Docs:** `SP_FACILITY_LST_ALL_FACILITIES_BY_WOUNDS_GUIDE.md`
- **Quick Start:** `SP_FACILITY_LST_QUICK_START.md`

---

**Status:** ✅ **IMPLEMENTED IN CLIENT**  
**Next:** 🔄 **AWAITING SERVER-SIDE IMPLEMENTATION**
