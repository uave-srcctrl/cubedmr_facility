# Login Flow Verification - wounddatacenter

## Current Status: ✅ FULLY IMPLEMENTED

### Flow Overview

#### 1. **Login (login.tsx)**
   - User enters email and password
   - Both hashed using SHA256 (matching Dart flow):
     - Step 1: `password_hash = SHA256(password)`
     - Step 2: `encountertrackid = SHA256(email + "38457487" + deviceId)`
   - Sends to `/api/get` endpoint with `entity: "TryLogin"`
   - Handles rate limiting (reason: 5 = too many attempts)
   - Handles active sessions (reason: 1 = already logged in elsewhere)

#### 2. **Post-Login Processing (login.tsx → processLoginSuccess)**
   - Stores initial auth info using `setAuth()`:
     - token
     - email
     - entity
     - entityName
     - entityId (facilityId or entityId from response)
     - facilities array (if provided)

#### 3. **User Data Loading (login.tsx → loadUserDataAndFacilities)**
   - Step 1: Call `loadUser(email)` which fetches:
     - `EntityInfo`: Basic user info (Provider/Nurse IDs, names)
     - `GroupsByUser`: User roles (Admin, Provider, Nurse, Staff)
   - Step 2: Call `getFacilities()` which fetches:
     - URL: `/api/get` with `entity: "FacilityDataCenter"`, `method: "lstFacilitiesByWounds"`
     - Returns list of all facilities accessible to the user

#### 4. **Facility Decision Logic**
   - **If ONE facility**: Auto-select and navigate to dashboard
     - Calls `setSelectedFacility(facilityId)`
     - Dispatches `FACILITY_CHANGED` event
     - Navigates to `/facility/` (dashboard)
   - **If MULTIPLE facilities**: Show facility selector
     - Displays `FacilitySelectorPage` component
     - User clicks on facility to select
     - Calls `setSelectedFacility(facilityId)`
     - Navigates to `/facility/` (dashboard)

#### 5. **Router Logic (App.tsx)**
   - `!isAuthenticated()` → Show Login component
   - `isAuthenticated() && !isFacilitySelected()` → Show FacilitySelectorPage
   - `isAuthenticated() && isFacilitySelected()` → Show Dashboard with Layout

### Components Involved

#### Authentication & Storage (hooks/use-auth.ts)
- `getToken()`: Get stored auth token
- `getEmail()`: Get stored email
- `setAuth()`: Store auth info
- `clearAuth()`: Clear all auth data on logout
- `getAuthInfo()`: Get complete auth state
- `isAuthenticated()`: Check if user has valid token
- `isFacilitySelected()`: Check if facility is selected

#### User Data (hooks/use-auth.ts)
- `loadUser(email)`: Load EntityInfo + GroupsByUser
- `getFacilities()`: Fetch available facilities for user
- `getEntityId()`: Get Provider/Nurse ID after loading user

#### Facility Selection (hooks/use-auth.ts)
- `setSelectedFacility(facilityId)`: Store selected facility
- `getSelectedFacility()`: Get currently selected facility
- `getSelectedFacilityInfo()`: Get full facility info object
- `getAvailableFacilities()`: Get stored facilities array

#### UI Components
- `Login` (pages/login.tsx): Login form
- `FacilitySelectorPage` (pages/facility-selector.tsx): Multi-facility selector
- `Dashboard` (pages/dashboard.tsx): Main dashboard view
- `Layout` (components/layout.tsx): Wrapper with navigation

### Storage Keys (localStorage)
```
authToken           → JWT token for API requests
userEmail          → Current user's email
userEntity         → User's entity type (Provider/Nurse/etc)
userEntityName     → User's role name
userEntityId       → ProviderId or NurseId
userCurrentTenant  → Current tenant ID
userFacilityId     → Primary facility ID
selectedFacilityId → Currently selected facility ID
availableFacilities → JSON array of all accessible facilities
userGroups         → JSON array of user roles [Provider, Nurse, Admin, Staff]
deviceId           → Browser device ID for authentication tracking
```

### Event System (lib/auth-events.ts)
```
AUTH_EVENTS.LOGIN           → User logged in
AUTH_EVENTS.LOGOUT          → User logged out
AUTH_EVENTS.FACILITY_CHANGED → Selected facility changed
```

### API Endpoints Called During Login

1. **POST /api/get** (with entity="TryLogin")
   - Request: email, password (SHA256), deviceId
   - Response: token, status, entity info, facilities list

2. **POST /api/get** (with entity="EntityInfo")
   - Request: email, token
   - Response: ProviderId, NurseId, EntityName, etc.

3. **POST /api/get** (with entity="GroupsByUser")
   - Request: email, token
   - Response: Admin, Provider, Nurse, Staff flags

4. **POST /api/get** (with entity="FacilityDataCenter", method="lstFacilitiesByWounds")
   - Request: token, email
   - Response: Array of facility objects with wound data

### Error Handling
- Rate limiting (max 20 failed attempts in 15 min)
- Active session detection + auto-retry with new deviceId
- Missing required fields validation
- Network error handling
- Invalid credentials handling

### Testing Checklist
- [ ] Login with valid credentials
- [ ] Token stored in localStorage after login
- [ ] User data loaded (EntityInfo + GroupsByUser)
- [ ] Single facility: Auto-select and navigate to dashboard
- [ ] Multiple facilities: Show facility selector, allow selection
- [ ] Facility selector displays facility list with wound data
- [ ] Selected facility ID stored and accessible
- [ ] Dashboard renders with correct facility data
- [ ] Logout clears all auth data
- [ ] Rate limiting blocks after 20 failed attempts
- [ ] Active session retry works with different deviceId

