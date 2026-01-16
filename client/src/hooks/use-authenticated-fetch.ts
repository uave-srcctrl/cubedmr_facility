import { useAuth } from "./use-auth";

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
      console.log("[AuthFetch] Token attached to request");
    } else if (email) {
      headers["X-Facility-Email"] = email;
      console.log("[AuthFetch] Facility email attached to request");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If 401, authentication failed
    if (response.status === 401) {
      console.error("[AuthFetch] Authentication failed - clearing session");
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
