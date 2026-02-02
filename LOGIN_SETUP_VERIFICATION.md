# Complete Login Flow - Setup & Verification Checklist

## 🔧 System Setup Requirements

### ✅ Backend (PHP API)
- [x] XAMPP instalado en C:\xampp
- [x] Apache configurado con vhost api.local
- [x] PHP 8.2.12 con extensiones SQLSRV (TS x64) cargadas
- [x] MSSQL conexión configurada (localhost:4433)
- [x] Bases de datos: curisec (principal) + viglobal (autenticación)
- [x] DocumentRoot: C:/xampp/htdocs/api
- [x] Slim Framework setup en index.php
- [x] Stored procedures: sp_GET_UserAuthenticated, sp_ADD_UserToken, etc.

**Start Apache:**
```bash
# Apache is usually already running on Windows
# Or manually start:
C:\xampp\apache\bin\httpd.exe -d C:\xampp\apache
```

### ✅ Frontend (Node.js + React)
- [x] Node.js instalado
- [x] wounddatacenter directory has all dependencies
- [x] Environment configured (.env.local with VITE_ENVIRONMENT=local)
- [x] Client built with Vite
- [x] Server has routes configured

**Start servers:**
```bash
cd c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter

# Terminal 1: Node.js backend (Express)
npm run dev

# Terminal 2: Vite client dev server
npm run dev:client
```

## 📋 Login Flow Verification Steps

### Phase 1: Server Startup ✅
```
1. Start Apache (or verify running)
   - Check: http://127.0.0.1/test should return DB connection status
   
2. Start Node.js server
   - Command: npm run dev
   - Expected: Server runs on http://localhost:5000
   - Logs: Should show "Server listening on port 5000"
   
3. Start Vite dev client
   - Command: npm run dev:client
   - Expected: Client runs on http://localhost:5173
   - Logs: Should show "Local: http://localhost:5173"
```

### Phase 2: Login Page Load ✅
```
1. Open http://localhost:5173/facility/
   - Expected: Redirect to login page
   - Current URL: http://localhost:5173/facility/
   
2. Login form displays
   - Email field visible and focused
   - Password field visible
   - "Sign In" button visible
   - No authentication token in localStorage
```

### Phase 3: Single Facility Login ✅
```
1. Enter credentials for user with 1 facility
   - Email: demo@example.com (or other test user)
   - Password: password
   
2. Click "Sign In"
   - Expected: Loading spinner shows
   - Network logs show:
     * POST /facility/api/get (TryLogin)
     * POST /facility/api/get (EntityInfo)
     * POST /facility/api/get (GroupsByUser)
     * POST /facility/api/get (FacilityDataCenter, lstFacilitiesByWounds)
   
3. Auto-select facility and navigate
   - Expected: Redirect to /facility/ (dashboard)
   - localStorage should have:
     * authToken: JWT token
     * userEmail: user@example.com
     * selectedFacilityId: facility ID
     * availableFacilities: [{"id":"X","name":"Y",...}]
   
4. Dashboard displays
   - Expected: Facility name shown in header
   - Data loaded and visualized
   - No authentication errors
```

### Phase 4: Multiple Facilities Login ✅
```
1. Enter credentials for user with 2+ facilities
   - Email: provider@example.com (or other multi-facility user)
   - Password: password
   
2. Click "Sign In"
   - Expected: Loading spinner shows
   - Same network requests as Phase 3
   
3. Facility selector displays
   - Expected: Redirect to facility selector page
   - NOT /facility/ (dashboard)
   - List of facilities displayed
   
4. Facility list shows
   - Facility 1: name, active wounds, PUSH score, acuity
   - Facility 2: name, active wounds, PUSH score, acuity
   - Select buttons visible
   
5. Select a facility
   - Expected: Navigate to /facility/ (dashboard)
   - localStorage updated: selectedFacilityId: <selected_id>
   
6. Dashboard displays with selected facility
   - Expected: Correct facility name in header
   - Data matches selected facility
```

### Phase 5: Active Session Handling ✅
```
1. Login successfully (first session)
   - Expected: Dashboard loads
   - localStorage has token and selectedFacilityId
   
2. Immediately login again (different tab/window)
   - Expected: See retry logic in console
   - New deviceId generated automatically
   - Login succeeds with retry
   
3. Check localStorage
   - Expected: New deviceId stored
   - Token unchanged
   - SingleFacility users: Should have access to dashboard
```

### Phase 6: Rate Limiting ✅
```
1. Attempt login with wrong password 20+ times
   - Expected: After 20 failures, show error
   - "Too many login attempts. Please try again in 15 minutes."
   
2. Wait or clear localStorage manually
   - localStorage.removeItem('authToken')
   - Close and reopen browser tab
   
3. Attempt login again
   - Expected: Login form resets
```

### Phase 7: Logout ✅
```
1. User logged in and on dashboard
   - Expected: User menu visible
   
2. Click "Sign out" / Logout button
   - Expected: Confirm dialog (optional)
   
3. Logout initiated
   - Network: POST /facility/api/logout
   - localStorage cleared:
     * authToken removed
     * userEmail removed
     * selectedFacilityId removed
     * All auth data cleared
   
4. Redirect to login
   - Expected: Navigate to /facility/ (which redirects to /)
   - Login form displays
   
5. Try to access dashboard
   - Expected: Cannot access, redirect to login
```

## 🔍 Debugging & Verification

### Check Backend Connection
```
Terminal:
curl http://127.0.0.1/test

Expected response:
{
  "status": true,
  "message": "Database connection successful",
  "environment": "dev",
  "server": "localhost:4433",
  "database": "curisec",
  "tables_count": X
}
```

### Check Node.js Server Status
```
Terminal:
curl http://localhost:5000/health

Expected response:
{
  "status": "ok",
  "timestamp": "2026-02-02T..."
}
```

### Check Frontend Loads
```
Browser:
http://localhost:5173/facility/

Expected:
- Login page renders
- Console shows: "[Router] NOT authenticated - showing Login component"
- No errors in Network tab
```

### Monitor Login Request
```
Browser DevTools → Network tab:
1. Click "Sign In"
2. Look for requests to /facility/api/get
3. Request body should include:
   - entity: "TryLogin"
   - email: user email
   - password: SHA256 hash
   - deviceId: random string

4. Response should include:
   - status: true
   - data: [{ status: 1, token: "...", ... }]
```

### Check localStorage
```
Browser Console:
localStorage.getItem('authToken')        // Should return JWT
localStorage.getItem('userEmail')        // Should return email
localStorage.getItem('selectedFacilityId') // Should return facility ID (after selection)
localStorage.getItem('availableFacilities') // Should return JSON array
```

## ⚠️ Common Issues & Solutions

### Issue: Login page doesn't load
```
Solution:
1. Check if Node.js server is running on :5000
2. Check if Vite dev server is running on :5173
3. Check console for CORS errors
4. Verify environment variables in .env.local
```

### Issue: "Connection refused" when logging in
```
Solution:
1. Check if Apache is running
2. Check if /api endpoint is accessible: http://127.0.0.1/get
3. Verify MSSQL is running on localhost:4433
4. Check Apache error logs: C:\xampp\apache\logs\error.log
```

### Issue: "Too many login attempts" immediately
```
Solution:
1. Clear localStorage: localStorage.clear()
2. Close and reopen browser
3. Check if rate limit window has expired (15 minutes)
4. Restart Node.js server to reset in-memory rate limits
```

### Issue: Facility selector doesn't show facilities
```
Solution:
1. Check console for error in getFacilities()
2. Verify token is stored in localStorage
3. Check network response for /facility/api/get (FacilityDataCenter request)
4. Verify user has facilities assigned in database
```

### Issue: Dashboard shows but facility data is wrong
```
Solution:
1. Check selectedFacilityId in localStorage
2. Verify correct facility was selected
3. Check availableFacilities array in localStorage
4. Refresh page to reload facility data
```

## 📊 Expected Network Traffic

### Successful Login Flow (Single Facility)
```
POST /facility/api/get
├─ Request: entity=TryLogin, email, password, deviceId
├─ Response: status=1, token, facilities=[{id,name}]
│
POST /facility/api/get
├─ Request: entity=EntityInfo, email, token
├─ Response: ProviderId, NurseId, EntityName
│
POST /facility/api/get
├─ Request: entity=GroupsByUser, email, token
├─ Response: Admin, Provider, Nurse, Staff flags
│
POST /facility/api/get
├─ Request: entity=FacilityDataCenter, method=lstFacilitiesByWounds, token, email
└─ Response: [{id,name,active_wounds,total_wound_encounters,...}]
```

Then:
- localStorage updated
- Auto-select facility (because only 1)
- Navigate to /facility/
- Dashboard loads

## ✅ Final Verification

When everything works correctly:

1. **Login page**: Loads immediately without errors
2. **Single facility users**: Auto-navigate to dashboard
3. **Multi-facility users**: See selector, can select and navigate
4. **Active sessions**: Retry with new deviceId and succeed
5. **Rate limiting**: Blocks after 20 attempts, unblocks after 15 min
6. **Logout**: Clears all data, redirect to login
7. **Dashboard**: Shows correct facility data
8. **Error messages**: Clear and helpful

---

**Last Updated**: 2026-02-02
**Status**: ✅ FULLY IMPLEMENTED & READY FOR TESTING
