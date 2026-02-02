# wounddatacenter Login Implementation Summary

## ✅ Fully Implemented Features

### 1. Login Form (pages/login.tsx)
- Email and password input fields
- SHA256 hashing matching Dart implementation
- Retry logic for active sessions (up to 3 attempts with new deviceIds)
- Rate limiting detection (max 20 attempts per 15 minutes)
- Toast notifications for errors/success
- Loading state during authentication

### 2. Post-Login Flow
```
Login → loadUserDataAndFacilities() → Check facility count
        ├─ Step 1: loadUser(email) → Load EntityInfo + GroupsByUser
        ├─ Step 2: getFacilities() → Load facility list
        └─ Decision:
            ├─ ONE facility → Auto-select + navigate to /facility/
            └─ MULTIPLE facilities → Show FacilitySelectorPage
```

### 3. Facility Selector (pages/facility-selector.tsx)
- Displays list of available facilities
- Shows facility metadata (patients, active wounds, PUSH score, acuity level)
- Loads facilities from server via `getFacilities()`
- Facility selection saves ID to localStorage
- Navigation to dashboard on selection

### 4. Storage & State Management (hooks/use-auth.ts)
- localStorage for auth data persistence
- Token storage and retrieval
- User info caching (email, entity, roles, names)
- Facility list caching
- Selected facility tracking

### 5. Router Logic (App.tsx)
```
App Router
├─ !isAuthenticated() → Login component
├─ isAuthenticated() && !isFacilitySelected() → FacilitySelectorPage
└─ isAuthenticated() && isFacilitySelected() → Dashboard (in Layout)
```

### 6. Event System (lib/auth-events.ts)
- AUTH_EVENTS.LOGIN
- AUTH_EVENTS.LOGOUT
- AUTH_EVENTS.FACILITY_CHANGED
- Automatic UI updates when events dispatch

## 🔧 Configuration

### Environment (Local Development)
```
VITE_ENVIRONMENT=local
VITE_BACKEND_URL=http://localhost:5000
VITE_DEBUG_API=true
```

### API Endpoints Used
```
POST /facility/api/get (entity=TryLogin)
POST /facility/api/get (entity=EntityInfo)
POST /facility/api/get (entity=GroupsByUser)
POST /facility/api/get (entity=FacilityDataCenter, method=lstFacilitiesByWounds)
```

## 📋 How the Login Flow Works

### Step 1: Initial Login (login.tsx)
1. User enters email and password
2. Password hashed: `SHA256(password)`
3. DeviceID generated if not exists
4. Salt calculated: `email + "38457487" + deviceId`
5. EncounterTrackID: `SHA256(salt)`
6. Send to backend with `entity: "TryLogin"`

### Step 2: Active Session Handling
- If backend returns `status: 0, reason: 1` (already logged in):
  - Retry up to 3 times with different deviceIds
  - Wait 300ms between retries
- If returns `reason: 5` (rate limited):
  - Show error message
  - Stop retrying

### Step 3: Successful Login
- Backend returns `status: 1` with token and facilities
- `processLoginSuccess()` called with response data
- `setAuth()` stores token, email, entity info, facilities

### Step 4: Load Complete User Data
- `loadUser(email)` fetches:
  - EntityInfo (Provider/Nurse IDs and names)
  - GroupsByUser (user roles)
  - Updates localStorage with complete user profile

### Step 5: Load Facilities
- `getFacilities()` makes server request
- Server fetches from backend: `FacilityDataCenter.lstFacilitiesByWounds`
- Returns array of facilities with wound metadata

### Step 6: Auto-Select or Show Selector
- **If 1 facility**: Call `setSelectedFacility(id)` → Navigate to `/facility/`
- **If multiple**: Show `FacilitySelectorPage` → User clicks facility → Navigate

### Step 7: Navigate to Dashboard
- App detects `isAuthenticated() && isFacilitySelected()`
- Renders Layout with Dashboard
- Dashboard can access selected facility ID and data

## 🧪 Manual Testing Steps

### Test Scenario 1: Single Facility User
1. Login with user who has 1 facility
2. Expected: Auto-select facility and navigate to dashboard
3. Verify: Dashboard shows correct facility data

### Test Scenario 2: Multiple Facilities User
1. Login with user who has 2+ facilities
2. Expected: Show facility selector page
3. Select a facility
4. Expected: Navigate to dashboard with selected facility

### Test Scenario 3: Active Session
1. Login first time (gets deviceId-1)
2. Quickly login again (tries deviceId-1, gets active session error)
3. Expected: Retry with deviceId-2 and deviceId-3 until success
4. Verify: Login succeeds

### Test Scenario 4: Rate Limiting
1. Attempt login with wrong password 20+ times
2. Expected: "Too many login attempts" error
3. Verify: Cannot attempt more logins for 15 minutes

### Test Scenario 5: Logout
1. Login successfully
2. Click logout in dashboard
3. Expected: Navigate to login page, localStorage cleared
4. Verify: Cannot access dashboard without logging in again

## 📁 Key Files

**Frontend (Client)**
- `client/src/pages/login.tsx` - Login form & post-login flow
- `client/src/pages/facility-selector.tsx` - Multi-facility selector
- `client/src/hooks/use-auth.ts` - Auth state management
- `client/src/App.tsx` - Router with auth-based routing
- `client/src/lib/api-config.ts` - API endpoint configuration
- `client/src/lib/auth-events.ts` - Event system

**Backend (Node.js/Express)**
- `server/routes.ts` - /api/get endpoint (proxy to PHP)
- `server/auth.ts` - Authentication utilities
- `server/storage.ts` - Session storage

**PHP Backend** (in /api)
- `index.php` - Route dispatcher
- `wec.php` - User class with tryLogin(), EntityInfo, etc.

## ⚠️ Important Notes

1. **DeviceID Persistence**: Each browser gets a unique deviceID stored in localStorage. This allows retry logic when user is already logged in elsewhere.

2. **Token Storage**: JWT token is stored in plain text in localStorage. In production, consider httpOnly cookies.

3. **Rate Limiting**: Implemented server-side with 15-minute window and 20 max attempts.

4. **Facilities Cache**: Facilities are fetched once during login and cached in localStorage. Refresh page to reload.

5. **Entity Types**: User can be Provider, Nurse, Admin, or Staff. EntityID (ProviderId or NurseId) used for facility queries.

6. **Backward Compatibility**: Code handles both `entityId` and `facilityId` in response (different API versions).

