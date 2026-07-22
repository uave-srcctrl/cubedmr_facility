import { LOCAL_API } from "@/lib/api-config";
import { dispatchAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";
import { secureStorageSync } from "@/lib/secure-storage";
import { sha256 } from "@/lib/crypto-utils";
import { logger } from "@/lib/logger";

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
    let token = secureStorageSync.getItem("authToken");
    // Clean up token if it has extra quotes (shouldn't happen, but defensive)
    if (token) {
      token = token.replace(/^["']|["']$/g, '');
    }
    return token;
  }

  function getEmail(): string | null {
    if (typeof window === "undefined") return null;
    return secureStorageSync.getItem("userEmail");
  }

  function getFacilityId(): string | null {
    if (typeof window === "undefined") return null;
    return secureStorageSync.getItem("userFacilityId");
  }

  // DEPRECATED: Use getAvailableFacilities() instead
  // This was the old sync getter - now use the new async getFacilities() to fetch from server
  function getStoredFacilities(): Facility[] {
    if (typeof window === "undefined") return [];
    const facilitiesJson = secureStorageSync.getItem("availableFacilities");
    if (!facilitiesJson) return [];
    try {
      return JSON.parse(facilitiesJson);
    } catch {
      return [];
    }
  }

  function getEntity(): string | null {
    if (typeof window === "undefined") return null;
    return secureStorageSync.getItem("userEntity");
  }

  function getEntityName(): string | null {
    if (typeof window === "undefined") return null;
    return secureStorageSync.getItem("userEntityName");
  }

  function getEntityId(): string | null {
    if (typeof window === "undefined") return null;
    return secureStorageSync.getItem("userEntityId");
  }

  function getCurrentTenant(): string | null {
    if (typeof window === "undefined") return null;
    return secureStorageSync.getItem("userCurrentTenant");
  }

  function getUserName(): string | null {
    if (typeof window === "undefined") return null;
    return secureStorageSync.getItem("userName");
  }

  function getDeviceId(): string {
    if (typeof window === "undefined") return "web-server";
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = "web-" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  }

  // ==================== FACILITY SELECTION METHODS ====================

  function getSelectedFacility(): string | null {
    if (typeof window === "undefined") return null;
    return secureStorageSync.getItem("selectedFacilityId");
  }

  function setSelectedFacility(facilityId: string): void {
    if (typeof window === "undefined") return;
    secureStorageSync.setItem("selectedFacilityId", facilityId);

    // Dispatch evento para que componentes se actualicen con el ID
    dispatchAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, facilityId);
  }

  function clearSelectedFacility(): void {
    if (typeof window === "undefined") return;
    secureStorageSync.removeItem("selectedFacilityId");

    // Dispatch evento para que componentes se actualicen
    dispatchAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, null);
  }

  function getSelectedFacilityInfo(): Facility | null {
    const selectedId = getSelectedFacility();
    if (!selectedId) return null;

    const facilities = getAvailableFacilities();
    return facilities.find(f => f.id === selectedId) || null;
  }

  function getAvailableFacilities(): Facility[] {
    if (typeof window === "undefined") return [];
    const facilitiesJson = secureStorageSync.getItem("availableFacilities");
    if (!facilitiesJson) return [];
    try {
      return JSON.parse(facilitiesJson);
    } catch {
      return [];
    }
  }

  function setAvailableFacilities(facilities: Facility[]): void {
    if (typeof window === "undefined") return;
    secureStorageSync.setItem("availableFacilities", JSON.stringify(facilities));
  }

  // ==================== AUTH STATE CHECKS ====================

  /**
   * Check if session has all required auth data (token AND email)
   * Use this before making API calls that require email
   */
  function hasValidSession(): boolean {
    const token = getToken();
    const email = getEmail();
    return !!(token && email);
  }

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

    // Debug logging removed for HIPAA compliance

    try {
      const token = getToken();
      const email = getEmail();
      const facilityId = getFacilityId();

      // PHI logging removed for HIPAA compliance

      if (token && email) {
        // Send logout request directly to PHP API
        const response = await fetch(LOCAL_API.LOGIN, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: "TryLogoutFacilities",
            email,
            deviceId: "web-client",
            facility_id: facilityId,
          }),
        });

        const logoutResponse = await response.json();
        // Response logging removed for HIPAA compliance
      } else {
        // No token/email - skip server logout
      }
    } catch (error) {
      logger.error("[Auth] Logout error");
    } finally {
      // Calling clearAuth
      clearAuth();
      // clearAuth completed
    }
  }

  function setAuth(token: string, email: string, entity?: string, entityName?: string, entityId?: string, facilityId?: string | null, facilities?: Facility[]): void {
    if (typeof window === "undefined") return;
    secureStorageSync.setItem("authToken", token);
    secureStorageSync.setItem("userEmail", email);
    if (entity) secureStorageSync.setItem("userEntity", entity);
    if (entityName) secureStorageSync.setItem("userEntityName", entityName);
    if (entityId) secureStorageSync.setItem("userEntityId", entityId);
    if (facilityId) secureStorageSync.setItem("userFacilityId", facilityId);
    if (facilityId === null) secureStorageSync.removeItem("userFacilityId");
    if (facilities) setAvailableFacilities(facilities);
  }

  function clearAuth(): void {
    if (typeof window === "undefined") return;

    // HIPAA: Use secure storage clear for encrypted data
    secureStorageSync.clearSensitiveData();

    // Also clear any remaining non-sensitive items
    localStorage.removeItem("userFacilities");
    localStorage.removeItem("userGroups");

    // Dispatch logout event
    dispatchAuthEvent(AUTH_EVENTS.LOGOUT);
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
      // Use selectedFacilityId as facilityId if available, otherwise fallback to stored facility ID
      facilityId: selectedFacility || getFacilityId() || getEntityId(),
      selectedFacilityId: selectedFacility,
      facilities: getAvailableFacilities(),
      userName: getUserName(),
    };
  }

  // ==================== FLUTTER-LIKE USER DATA LOADING ====================

  async function loadUser(email: string): Promise<boolean> {
    try {
      // PHI logging removed for HIPAA compliance

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
        logger.error('[useAuth] EntityInfo request failed:', entityInfoResponse.status);
        return false;
      }

      const entityInfoData = await entityInfoResponse.json();
      // PHI logging removed for HIPAA compliance

      if (entityInfoData.data && entityInfoData.data[0]) {
        const userData = entityInfoData.data[0];
        // PHI logging removed for HIPAA compliance

        // Update user info using secure storage
        if (userData.email) secureStorageSync.setItem("userEmail", userData.email);
        if (userData.mobile) localStorage.setItem("userMobile", userData.mobile);
        if (userData.mfa !== undefined) localStorage.setItem("userMfa", userData.mfa.toString());
        if (userData.entityName) secureStorageSync.setItem("userEntity", userData.entityName);
        if (userData.entityName) secureStorageSync.setItem("userEntityName", userData.entityName);
        if (userData.currentTenant) secureStorageSync.setItem("userCurrentTenant", userData.currentTenant.toString());

        // Store the real name of the user (Provider or Nurse name)
        if (userData.ProviderName) {
          secureStorageSync.setItem("userName", userData.ProviderName);
          // PHI logging removed
        } else if (userData.NurseName) {
          secureStorageSync.setItem("userName", userData.NurseName);
          // PHI logging removed
        }

        // NOTE: entityId will be set after GroupsByUser is loaded, since userData.entity might be undefined
        // Store both ProviderId and NurseId for later use (will set entityId based on user groups)
        if (userData.ProviderId) {
          localStorage.setItem("tempProviderId", userData.ProviderId.toString());
        }
        if (userData.NurseId) {
          localStorage.setItem("tempNurseId", userData.NurseId.toString());
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
        logger.error('[useAuth] GroupsByUser request failed:', groupsResponse.status);
        return false;
      }

      const groupsData = await groupsResponse.json();
      // PHI logging removed for HIPAA compliance

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
        // PHI logging removed for HIPAA compliance

        // NOW set entityId based on user groups (not userData.entity which might be undefined)
        // PHI logging removed for HIPAA compliance
        if (userGroups.includes('Provider')) {
          const tempProviderId = localStorage.getItem("tempProviderId");
          if (tempProviderId) {
            // Setting userEntityId
            secureStorageSync.setItem("userEntityId", tempProviderId);
          }
        } else if (userGroups.includes('Nurse')) {
          const tempNurseId = localStorage.getItem("tempNurseId");
          if (tempNurseId) {
            // Setting userEntityId
            secureStorageSync.setItem("userEntityId", tempNurseId);
          }
        } else {
          // User is neither Provider nor Nurse
          secureStorageSync.removeItem("userEntityId");
        }

        // Clean up temp variables
        localStorage.removeItem("tempProviderId");
        localStorage.removeItem("tempNurseId");
      }

      // loadUser completed
      return true;
    } catch (error) {
      logger.error('[useAuth] loadUser error');
      return false;
    }
  }

  async function getFacilities(): Promise<Facility[]> {
    try {
      // PHI logging removed for HIPAA compliance

      const token = getToken();
      const email = getEmail();

      // PHI logging removed for HIPAA compliance

      if (!token || !email) {
        logger.error("[useAuth] getFacilities: Missing auth credentials");
        return [];
      }

      // Get deviceId - ensure it's a plain string, not quoted
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = "web-" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("deviceId", deviceId);
      }

      // Clean up token if it has extra quotes
      const cleanToken = token.replace(/^["']|["']$/g, '');

      // Get provider ID if user is a provider
      const userGroups = getUserGroups();
      const entityId = localStorage.getItem("userEntityId");

      let providerId: string | undefined;
      let practiceId: string | undefined;

      // Determine provider/practice IDs based on user role
      if (userGroups.includes('Provider') && entityId && entityId !== "undefined" && entityId !== "null") {
        providerId = entityId;
        // PHI logging removed
      }

      // Build request payload using FacilityDataCenter entity structure
      const requestPayload: any = {
        entity: "FacilityDataCenter",
        method: "lstAllFacilities",  // Changed from lstFacilitiesByWounds to get ALL facilities
        token: cleanToken,
        email,
        deviceId, // Include deviceId so server can calculate encountertrackid
      };

      // Add optional parameters
      if (practiceId) requestPayload.practiceId = practiceId;
      // FacilityDataCenter.lstAllFacilities returns all facilities (optionally filtered by practiceId)

      // PHI logging removed for HIPAA compliance

      // Send as JSON to Express server
      const startTime = performance.now();
      // Request logging removed

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);

      // Performance logging removed for HIPAA compliance

      if (!response.ok) {
        logger.error("[useAuth] getFacilities request failed:", response.status);
        return [];
      }

      // Parse JSON response once
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        logger.error("[useAuth] getFacilities JSON parse error");
        return [];
      }

      // PHI logging removed for HIPAA compliance

      if (data.data && Array.isArray(data.data)) {
        // PHI logging removed for HIPAA compliance

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
          timezone: item.timezone || 'UTC',

          // Campos de heridas (si están disponibles)
          total_wound_encounters: item.total_wound_encounters,
          active_wounds: item.active_wounds,
          average_push_score: item.average_push_score,
          acuity_level: item.acuity_level,

          // Fecha del último encounter
          last_encounter_date: item.last_encounter_date
        }));

        // Deduplicate facilities by ID (keep first occurrence)
        const seenIds = new Set<string>();
        const uniqueFacilities = facilities.filter(f => {
          const id = String(f.id);
          if (seenIds.has(id)) {
            // Duplicate removed - PHI logging removed
            return false;
          }
          seenIds.add(id);
          return true;
        });

        // PHI logging removed for HIPAA compliance

        // Store facilities in localStorage
        setAvailableFacilities(uniqueFacilities);

        // Dispatch event so components can refresh their data
        dispatchAuthEvent(AUTH_EVENTS.FACILITIES_UPDATED, { count: uniqueFacilities.length });

        // PHI logging removed for HIPAA compliance

        return uniqueFacilities;
      }

      // PHI logging removed for HIPAA compliance
      return [];
    } catch (error) {
      logger.error("[useAuth] getFacilities error");
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
    getDeviceId,
    isAuthenticated,
    hasValidSession,
    isFacilitySelected,
    hasFacilities,
    getSelectedFacility,
    setSelectedFacility,
    clearSelectedFacility,
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
