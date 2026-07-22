import { useAuth } from "./use-auth";
import { logger } from "@/lib/logger";

export function useAuthenticatedFetch() {
  const { getToken, getEmail } = useAuth();

  async function authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = getToken();
    const email = getEmail();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers || {}) as Record<string, string>),
    };

    // Add auth header - either Bearer token or facility email
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      logger.debug("[AuthFetch] Token attached to request");
    } else if (email) {
      headers["X-Facility-Email"] = email;
      logger.debug("[AuthFetch] Facility email attached to request");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If 401, authentication failed
    if (response.status === 401) {
      logger.error("[AuthFetch] Authentication failed - clearing session");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userEntity");
      localStorage.removeItem("userEntityName");
      localStorage.removeItem("userEntityId");
      // Could trigger logout here
    }

    return response;
  }

  return { authenticatedFetch };
}
