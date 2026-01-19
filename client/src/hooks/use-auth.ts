import { LOCAL_API } from "@/lib/api-config";
import { dispatchAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";

// Helper function to compute SHA256 hash
async function sha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface Facility {
  id: string;
  name: string;
  patients?: number;
  activePatients?: number;
  [key: string]: any;
}

export function useAuth() {
  // ==================== GETTERS ====================

  function getToken(): string | null {
    if (typeof window === "undefined") return null;
    let token = localStorage.getItem("authToken");
    // Clean up token if it has extra quotes (shouldn't happen, but defensive)
    if (token) {
      token = token.replace(/^["']|["']$/g, '');
    }
    return token;
  }

  function getEmail(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userEmail");
  }

  function getFacilityId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userFacilityId");
  }

  // DEPRECATED: Use getAvailableFacilities() instead
  // This was the old sync getter - now use the new async getFacilities() to fetch from server
  function getStoredFacilities(): Facility[] {
    if (typeof window === "undefined") return [];
    const facilitiesJson = localStorage.getItem("availableFacilities");
    if (!facilitiesJson) return [];
    try {
      return JSON.parse(facilitiesJson);
    } catch {
      return [];
    }
  }

  function getEntity(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userEntity");
  }

  function getEntityName(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userEntityName");
  }

  function getEntityId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userEntityId");
  }

  function getCurrentTenant(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userCurrentTenant");
  }

  function getUserName(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userName");
  }

  // ==================== FACILITY SELECTION METHODS ====================

  function getSelectedFacility(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("selectedFacilityId");
  }

  function setSelectedFacility(facilityId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedFacilityId", facilityId);
    
    // Dispatch evento para que componentes se actualicen con el ID
    dispatchAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, facilityId);
  }

  function getSelectedFacilityInfo(): Facility | null {
    const selectedId = getSelectedFacility();
    if (!selectedId) return null;
    
    const facilities = getAvailableFacilities();
    return facilities.find(f => f.id === selectedId) || null;
  }

  function getAvailableFacilities(): Facility[] {
    if (typeof window === "undefined") return [];
    const facilitiesJson = localStorage.getItem("availableFacilities");
    if (!facilitiesJson) return [];
    try {
      return JSON.parse(facilitiesJson);
    } catch {
      return [];
    }
  }

  function setAvailableFacilities(facilities: Facility[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("availableFacilities", JSON.stringify(facilities));
  }

  // ==================== AUTH STATE CHECKS ====================

  function isAuthenticated(): boolean {
    // Check if user has valid token (primary auth check)
    const token = getToken();
    const hasValidToken = token !== null && token !== "";

    // If no token, not authenticated
    if (!hasValidToken) return false;

    // For facility portal, we also need facilities available
    // But allow users to reach facility selector even if they have no facilities
    // The facility selector will show appropriate error message
    return true;
  }

  function isFacilitySelected(): boolean {
    const selectedFacilityId = getSelectedFacility();
    return selectedFacilityId !== null && selectedFacilityId !== "";
  }

  function hasFacilities(): boolean {
    const facilities = getAvailableFacilities();
    return facilities.length > 0;
  }

  async function logout(): Promise<void> {
    if (typeof window === "undefined") return;
    
    console.log("[Auth] logout() called");
    
    try {
      const token = getToken();
      const email = getEmail();
      const facilityId = getFacilityId();
      
      console.log("[Auth] Logout params - email:", email, "facilityId:", facilityId, "hasToken:", !!token);
      
      if (token && email) {
        console.log("[Auth] Sending logout request to server...");
        const response = await fetch(LOCAL_API.LOGOUT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            email,
            facility_id: facilityId,
          }),
        });
        
        const logoutResponse = await response.json();
        console.log("[Auth] Logout response from server:", logoutResponse);
      } else {
        console.log("[Auth] No token or email, skipping server logout request");
      }
    } catch (error) {
      console.error("[Auth] Logout error:", error);
    } finally {
      console.log("[Auth] Calling clearAuth()...");
      clearAuth();
      console.log("[Auth] clearAuth() completed, localStorage cleaned");
    }
  }

  function setAuth(token: string, email: string, entity?: string, entityName?: string, entityId?: string, facilityId?: string | null, facilities?: Facility[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("authToken", token);
    localStorage.setItem("userEmail", email);
    if (entity) localStorage.setItem("userEntity", entity);
    if (entityName) localStorage.setItem("userEntityName", entityName);
    if (entityId) localStorage.setItem("userEntityId", entityId);
    if (facilityId) localStorage.setItem("userFacilityId", facilityId);
    if (facilityId === null) localStorage.removeItem("userFacilityId");
    if (facilities) setAvailableFacilities(facilities);
  }

  function clearAuth(): void {
    if (typeof window === "undefined") return;
    
    console.log("[Auth] clearAuth() - Removing all auth-related localStorage items");
    
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userEntity");
    localStorage.removeItem("userEntityName");
    localStorage.removeItem("userEntityId");
    localStorage.removeItem("userCurrentTenant");
    localStorage.removeItem("userFacilityId");
    localStorage.removeItem("userFacilities");
    localStorage.removeItem("selectedFacilityId");
    localStorage.removeItem("availableFacilities");
    localStorage.removeItem("userGroups");
    
    console.log("[Auth] clearAuth() - Dispatching LOGOUT event");
    // Dispatch logout event
    dispatchAuthEvent(AUTH_EVENTS.LOGOUT);
    console.log("[Auth] clearAuth() - Completed");
  }

  function getAuthInfo(): {
    token: string | null;
    email: string | null;
    entity: string | null;
    entityName: string | null;
    entityId: string | null;
    currentTenant: string | null;
    facilityId: string | null;
    selectedFacilityId: string | null;
    facilities: Facility[];
    userName: string | null;
  } {
    const selectedFacility = getSelectedFacility();
    return {
      token: getToken(),
      email: getEmail(),
      entity: getEntity(),
      entityName: getEntityName(),
      entityId: getEntityId(),
      currentTenant: getCurrentTenant(),
      // Use selectedFacilityId as facilityId if available, otherwise use entityId
      facilityId: selectedFacility || getFacilityId(getEntityId()),
      selectedFacilityId: selectedFacility,
      facilities: getAvailableFacilities(),
      userName: getUserName(),
    };
  }

  // ==================== FLUTTER-LIKE USER DATA LOADING ====================

  async function loadUser(email: string): Promise<boolean> {
    try {
      console.log('[useAuth] loadUser called for email:', email);

      // Get deviceId
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = "web-" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("deviceId", deviceId);
      }

      // Generate encountertrackid like in login
      const salt = `${email}38457487${deviceId}`;
      const encountertrackid = await sha256(salt);

      // Step 1: Get EntityInfo (basic user info)
      const entityInfoResponse = await fetch(LOCAL_API.ENTITY_INFO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "EntityInfo",
          email: email,
          token: getToken(),
          deviceId: deviceId,
          encountertrackid: encountertrackid,
        }),
      });

      if (!entityInfoResponse.ok) {
        console.error('[useAuth] EntityInfo request failed:', entityInfoResponse.status);
        return false;
      }

      const entityInfoData = await entityInfoResponse.json();
      console.log('[useAuth] EntityInfo response:', entityInfoData);

      if (entityInfoData.data && entityInfoData.data[0]) {
        const userData = entityInfoData.data[0];

        // Update user info in localStorage
        if (userData.email) localStorage.setItem("userEmail", userData.email);
        if (userData.mobile) localStorage.setItem("userMobile", userData.mobile);
        if (userData.mfa !== undefined) localStorage.setItem("userMfa", userData.mfa.toString());
        if (userData.entityName) localStorage.setItem("userEntity", userData.entityName);
        if (userData.entityName) localStorage.setItem("userEntityName", userData.entityName);
        if (userData.currentTenant) localStorage.setItem("userCurrentTenant", userData.currentTenant.toString());

        // Store the real name of the user (Provider or Nurse name)
        if (userData.ProviderName) {
          localStorage.setItem("userName", userData.ProviderName);
          console.log('[useAuth] Stored Provider name:', userData.ProviderName);
        } else if (userData.NurseName) {
          localStorage.setItem("userName", userData.NurseName);
          console.log('[useAuth] Stored Nurse name:', userData.NurseName);
        }

        // Set entityId based on entity type - only set if value exists and is not undefined/null
        if (userData.entity === 'Provider' && userData.ProviderId) {
          localStorage.setItem("userEntityId", userData.ProviderId.toString());
        } else if (userData.entity === 'Nurse' && userData.NurseId) {
          localStorage.setItem("userEntityId", userData.NurseId.toString());
        } else {
          // Clear entityId if it doesn't match any valid entity type
          localStorage.removeItem("userEntityId");
        }
      }

      // Step 2: Get GroupsByUser (user groups/roles)
      const groupsResponse = await fetch(LOCAL_API.GROUPS_BY_USER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "GroupsByUser",
          email: email,
          token: getToken(),
          deviceId: deviceId,
          encountertrackid: encountertrackid,
        }),
      });

      if (!groupsResponse.ok) {
        console.error('[useAuth] GroupsByUser request failed:', groupsResponse.status);
        return false;
      }

      const groupsData = await groupsResponse.json();
      console.log('[useAuth] GroupsByUser response:', groupsData);

      // Clear existing groups
      localStorage.removeItem("userGroups");

      if (groupsData.data && groupsData.data[0]) {
        const groups = groupsData.data[0];
        const userGroups: string[] = [];

        if (groups.Admin === 1) userGroups.push('Admin');
        if (groups.Provider === 1) userGroups.push('Provider');
        if (groups.Nurse === 1) userGroups.push('Nurse');
        if (groups.Staff === 1) userGroups.push('Staff');

        localStorage.setItem("userGroups", JSON.stringify(userGroups));
        console.log('[useAuth] User groups set:', userGroups);
      }

      console.log('[useAuth] loadUser completed successfully');
      return true;
    } catch (error) {
      console.error('[useAuth] loadUser error:', error);
      return false;
    }
  }

  async function getFacilities(): Promise<Facility[]> {
    try {
      console.log('[useAuth] getFacilities called');

      const token = getToken();
      const email = getEmail();

      if (!token || !email) {
        console.error('[useAuth] No token or email available');
        return [];
      }

      // Get deviceId - ensure it's a plain string, not quoted
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = "web-" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("deviceId", deviceId);
      }
      
      // Clean up deviceId if it has extra quotes
      deviceId = deviceId.replace(/^["']|["']$/g, '');

      // Generate encountertrackid
      const salt = `${email}38457487${deviceId}`;
      const encountertrackid = await sha256(salt);

      // Prepare parameters for getting facilities
      // For providers, use FacilitiesByProvider; for others use Facility with lst action
      const userGroups = getUserGroups();
      const entityId = localStorage.getItem("userEntityId");
      
      let entity = "Facility";
      const params: any = {};

      // Determine which entity to use based on user role
      if (userGroups.includes('Provider') && entityId && entityId !== "undefined" && entityId !== "null") {
        // Use FacilitiesByProvider for providers
        entity = "FacilitiesByProvider";
        params.providerId = entityId;
        params.id = entityId;  // Also include id parameter for API compatibility
        console.log('[useAuth] Using FacilitiesByProvider with providerId:', entityId);
      } else if (userGroups.includes('Nurse') && entityId && entityId !== "undefined" && entityId !== "null") {
        // For nurses, use regular Facility with lst action
        entity = "Facility";
        params.action = "lst";
        params.nurseId = entityId;
        params.id = entityId;  // Also include id parameter for API compatibility
        console.log('[useAuth] Using Facility lst for nurse');
      } else {
        // Default: use Facility with lst action
        entity = "Facility";
        params.action = "lst";
        params.id = entityId || email;  // Use entityId if available, otherwise use email as fallback
        console.log('[useAuth] Using Facility lst (default) with id:', params.id);
      }

      params.entity = entity;

      // Always include tenantId if available
      const currentTenant = getCurrentTenant();
      if (currentTenant) {
        params.tenantId = currentTenant;
      }

      // Clean up token if it has extra quotes
      const cleanToken = token.replace(/^["']|["']$/g, '');

      // Build request payload
      // Include token for authorization with Express server
      const requestPayload: any = {
        entity,
        token: cleanToken,
        email,
        deviceId,
        encountertrackid,
      };
      
      // Add optional parameters
      if (params.action) requestPayload.action = params.action;
      if (params.id) requestPayload.id = params.id;
      if (params.providerId) requestPayload.providerId = params.providerId;
      if (params.nurseId) requestPayload.nurseId = params.nurseId;
      if (params.tenantId) requestPayload.tenantId = params.tenantId;

      console.log('[useAuth] getFacilities payload:', {
        entity,
        action: params.action,
        providerId: params.providerId,
        nurseId: params.nurseId,
        email,
        deviceId,
        encountertrackid,
        token: cleanToken ? '***' : 'missing',
        id: params.id,
        note: 'Sending as FormData (URL-encoded) like Flutter'
      });

      // Send as JSON (matching the pattern from EntityInfo and GroupsByUser endpoints)
      // Use JSON instead of FormData for consistency and better multer parsing
      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        console.error('[useAuth] Facilities request failed:', response.status);
        const errorText = await response.text();
        console.error('[useAuth] Error response body:', errorText);
        return [];
      }

      // Parse JSON response once
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[useAuth] Failed to parse response as JSON:', parseError);
        return [];
      }

      console.log('[useAuth] Facilities response:', data);

      if (data.data && Array.isArray(data.data)) {
        const facilities: Facility[] = data.data.map((item: any) => ({
          id: item.id?.toString() || '',
          name: item.name || '',
          address: item.address || '',
          city: item.city || '',
          state: item.state || '',
          zip: item.zip || '',
          country: item.country || '',
          phone: item.phone || '',
          fax: item.fax || '',
          email: item.email || '',
          contactPerson: item.contactPerson || '',
          npi: item.npi || '',
          taxonomy: item.taxonomy || '',
          specialties: Array.isArray(item.specialties) ? item.specialties : [],
          providerName: item.providerName || '',
          statusRecord: item.statusRecord || 'A',
          createdAt: item.createdAt || '',
          updatedAt: item.updatedAt || '',
          timezone: item.timezone || 'UTC'
        }));

        console.log('[useAuth] getFacilities mapped facilities array:', facilities);
        console.log('[useAuth] Facilities list - Total:', facilities.length, 'facilities');
        facilities.forEach((f, i) => console.log(`  [${i}] ${f.name} (${f.id})`));

        // Store facilities in localStorage
        setAvailableFacilities(facilities);
        console.log('[useAuth] Facilities stored:', facilities.length, 'facilities');

        return facilities;
      }

      return [];
    } catch (error) {
      console.error('[useAuth] getFacilities error:', error);
      return [];
    }
  }

  function getUserGroups(): string[] {
    if (typeof window === "undefined") return [];
    const groupsJson = localStorage.getItem("userGroups");
    if (!groupsJson) return [];
    try {
      return JSON.parse(groupsJson);
    } catch {
      return [];
    }
  }

  function isProvider(): boolean {
    return getUserGroups().includes('Provider');
  }

  function isNurse(): boolean {
    return getUserGroups().includes('Nurse');
  }

  function isAdmin(): boolean {
    return getUserGroups().includes('Admin');
  }

  function isStaff(): boolean {
    return getUserGroups().includes('Staff');
  }

  return {
    getToken,
    getEmail,
    getFacilityId,
    getEntity,
    getEntityName,
    getEntityId,
    getCurrentTenant,
    getUserName,
    isAuthenticated,
    isFacilitySelected,
    hasFacilities,
    getSelectedFacility,
    setSelectedFacility,
    getSelectedFacilityInfo,
    getAvailableFacilities,
    setAvailableFacilities,
    logout,
    setAuth,
    clearAuth,
    getAuthInfo,
    // New Flutter-like functions
    loadUser,
    getFacilities: getFacilities,
    getUserGroups,
    isProvider,
    isNurse,
    isAdmin,
    isStaff,
  };
}
