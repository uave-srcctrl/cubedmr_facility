import { LOCAL_API } from "@/lib/api-config";

export function useAuth() {
  function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authToken");
  }

  function getEmail(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userEmail");
  }

  function getFacilityId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userFacilityId");
  }

  function getFacilities(): string[] {
    if (typeof window === "undefined") return [];
    const facilitiesJson = localStorage.getItem("userFacilities");
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

  function isAuthenticated(): boolean {
    // Facility login now uses facilityId
    const facilityId = getFacilityId();
    return facilityId !== null && facilityId !== "";
  }

  async function logout(): Promise<void> {
    if (typeof window === "undefined") return;
    
    try {
      const token = getToken();
      if (token) {
        // Call logout endpoint
        await fetch(LOCAL_API.LOGOUT, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("[Auth] Logout error:", error);
    } finally {
      // Always clear local storage
      clearAuth();
    }
  }

  function setAuth(token: string, email: string, entity?: string, entityName?: string, entityId?: string, facilityId?: string, facilities?: string[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("authToken", token);
    localStorage.setItem("userEmail", email);
    if (entity) localStorage.setItem("userEntity", entity);
    if (entityName) localStorage.setItem("userEntityName", entityName);
    if (entityId) localStorage.setItem("userEntityId", entityId);
    if (facilityId) localStorage.setItem("userFacilityId", facilityId);
    if (facilities) localStorage.setItem("userFacilities", JSON.stringify(facilities));
  }

  function clearAuth(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userEntity");
    localStorage.removeItem("userEntityName");
    localStorage.removeItem("userEntityId");
    localStorage.removeItem("userFacilityId");
    localStorage.removeItem("userFacilities");
  }

  function getAuthInfo(): {
    token: string | null;
    email: string | null;
    entity: string | null;
    entityName: string | null;
    entityId: string | null;
    facilityId: string | null;
    facilities: string[];
  } {
    return {
      token: getToken(),
      email: getEmail(),
      entity: getEntity(),
      entityName: getEntityName(),
      entityId: getEntityId(),
      facilityId: getFacilityId(),
      facilities: getFacilities(),
    };
  }

  return {
    getToken,
    getEmail,
    getFacilityId,
    getFacilities,
    getEntity,
    getEntityName,
    getEntityId,
    isAuthenticated,
    logout,
    setAuth,
    clearAuth,
    getAuthInfo,
  };
}
