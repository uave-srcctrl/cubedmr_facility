# WoundCare Local Development - Setup Verification Checklist

## Pre-Startup Checks

### ✅ Environment Configuration

- [ ] `.env.local` file exists
- [ ] `VITE_ENVIRONMENT=local` is set
- [ ] `VITE_BACKEND_URL=http://localhost:5000` is set
- [ ] `VITE_DEBUG_API=true` is set (for debugging)

**Verify:**
```bash
cat .env.local | grep VITE_ENVIRONMENT
# Should output: VITE_ENVIRONMENT=local
```

### ✅ Docker MSSQL

- [ ] Docker container is running
- [ ] Container name: `localWoundCareDBServer`
- [ ] Port 4433 is exposed
- [ ] Database `curisec` is available

**Verify:**
```bash
docker ps | grep localWoundCareDBServer
# Should show the running container

docker exec localWoundCareDBServer /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 3232@lano -Q "SELECT name FROM sys.databases;" 
# Should list curisec database
```

### ✅ Node Environment

- [ ] Node.js is installed
- [ ] npm is installed
- [ ] `client/node_modules` exists
- [ ] `client/package.json` exists

**Verify:**
```bash
node --version    # Should be v18+
npm --version     # Should be 9+
```

### ✅ API Connectivity

- [ ] Dev API responds: `https://api-dev.local/test`
- [ ] Prod API responds: `https://api-prod.local/test`
- [ ] Both return status: `true`

**Verify:**
```bash
curl https://api-dev.local/test
curl https://api-prod.local/test
# Both should return:
# {"status":true,"message":"Database connection successful",...}
```

## Startup Steps

### 1. Ensure Docker MSSQL is Running

```bash
# If not running, start it:
docker start localWoundCareDBServer

# Verify it's running:
docker ps | grep mssql
```

### 2. Navigate to Project Directory

```bash
cd c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter
```

### 3. Start Development Server

**Windows:**
```bash
start-dev.bat
```

**Linux/Mac:**
```bash
bash start-dev.sh
```

**Manual (any OS):**
```bash
cd client
npm run dev
```

### 4. Wait for Server to Start

You should see output like:
```
VITE v5.x.x ready in XX ms

➜  Local:   http://localhost:5173/
➜  Press h + enter to show help
```

## Testing Workflow

### 1. Open Application

- Navigate to: `http://localhost:5173`
- Should see: Login page
- Should see no console errors

### 2. Test Login

**Test Credentials (if available):**
- Email: (test email from database)
- Password: (test password hash from database)

**Or:**
- Login with known credentials
- Check browser console for debug logs
- Expected flow:
  1. Enter credentials
  2. Sent to: `/facility/api/get` (via API_CONFIG)
  3. Response includes facilities list
  4. Redirected to facility selector

### 3. Test Local API Usage

**In browser console:**
```javascript
// Should use local API (LOCAL_DEVELOPMENT environment)
console.log('Environment:', API_CONFIG.ENVIRONMENT);  // Should be 'local'
console.log('Backend URL:', API_CONFIG.BACKEND_URL);   // Should be localhost:5000

// Make test request
fetch(API_CONFIG.LOGIN, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'test' })
})
.then(r => r.json())
.then(d => console.log('Response:', d));
```

### 4. Select Facility

- Choose a facility from the selector
- App should navigate to dashboard
- Dashboard should load KPIs and reports
- No CORS errors expected (using LOCAL API)

### 5. Test Different Pages

- [ ] Dashboard: Loads KPIs
- [ ] Facility Report: Loads facility wound data
- [ ] Outcome Report: Loads outcome data
- [ ] Etiology Report: Loads etiology distribution
- [ ] Patients: Lists patients
- [ ] Excel Import: Can upload file
- [ ] Settings: Shows facility settings

## Debugging Tips

### Enable Debug Logging

In browser console:
```javascript
// Check current environment
console.log('Current env:', API_CONFIG);

// Enable all logging
localStorage.setItem('debug', '*');
location.reload();

// Disable logging
localStorage.removeItem('debug');
location.reload();
```

### Check API Calls

In browser DevTools:
1. Open: F12 → Network tab
2. Make a request (login, fetch data, etc.)
3. Check:
   - Request URL should use `/facility/api/*`
   - Status should be 200/201
   - Response should be JSON

### Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot GET /facility/api/..." | Express server not running on port 5000 |
| "Unexpected token 'u' in JSON at..." | API returned HTML instead of JSON (server error) |
| "CORS error" | Using REMOTE API instead of LOCAL (check .env.local) |
| "Login failed" | Check database connectivity with `test-connection.php` |
| "No facilities shown" | Check user has facilities in database |

## Verify API_CONFIG is Working

### Check in Different Entvironments

**Currently LOCAL:**
```javascript
// Open browser console
API_CONFIG.IS_LOCAL  // Should be: true
API_CONFIG.IS_REMOTE // Should be: false
API_CONFIG.BACKEND_URL // Should be: http://localhost:5000
API_CONFIG.LOGIN // Should be: /facility/api/get
```

**To Test REMOTE (don't commit):**
```bash
# Edit .env.local temporarily
VITE_ENVIRONMENT=remote

# Restart dev server
# Then check:
API_CONFIG.IS_LOCAL  # Should be: false
API_CONFIG.IS_REMOTE # Should be: true
API_CONFIG.BACKEND_URL # Should be: https://cubed-mr.app
```

## Performance Expectations

| Metric | Expected |
|--------|----------|
| App startup | < 5 seconds |
| Login | < 3 seconds |
| Facility selector load | < 2 seconds |
| Dashboard KPIs | < 5 seconds |
| Report generation | < 10 seconds |

## Success Indicators

✅ You're ready when:
1. Dev server starts without errors
2. React app loads at http://localhost:5173
3. Login page displays correctly
4. Can login with valid credentials
5. Facility selector shows facilities
6. Dashboard loads without CORS errors
7. All API calls use `/facility/api/*` paths
8. No console errors visible
9. `API_CONFIG.IS_LOCAL` is `true`

## Next Steps After Verification

1. If everything works:
   - Keep this setup for development
   - Commit `.env.local` (if not in gitignore)
   - Document any custom configurations

2. If issues occur:
   - Check Docker MSSQL is running
   - Verify Express server if needed
   - Check `.env.local` configuration
   - Review browser console for errors
   - Check Network tab in DevTools

3. For production:
   - Change `VITE_ENVIRONMENT=remote`
   - Run `npm run build`
   - Deploy `client/dist/` folder

## Files Reference

| File | Purpose |
|------|---------|
| `.env.local` | Environment configuration (LOCAL/REMOTE) |
| `client/src/lib/api-config.ts` | API endpoints and environment detection |
| `client/src/hooks/use-auth.ts` | Authentication and LOCAL_API usage |
| `QUICK_START_MULTI_ENV.md` | Quick reference guide |
| `MULTI_ENVIRONMENT_SETUP.md` | Detailed setup documentation |

