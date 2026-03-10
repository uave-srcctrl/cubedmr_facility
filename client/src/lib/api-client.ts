/**
 * Centralized API Client
 * 
 * All API calls go directly to the PHP Slim API.
 * Includes encountertrackid/providertrackid for FacilityDataCenter compatibility.
 */

import { LOCAL_API } from "@/lib/api-config";
import { sha256 } from "@/lib/crypto-utils";

export interface ApiCallOptions {
  /** Token for authentication */
  token: string | null;
  /** User email */
  email: string | null;
  /** Device ID for request tracking */
  deviceId: string;
  /** Additional parameters to include in the request */
  params?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  status: boolean;
  data?: T;
  error?: string;
  message?: string;
  /** Additional fields returned by some endpoints */
  [key: string]: any;
}

/**
 * Compute encountertrackid (same algorithm as Flutter: SHA256(email + "38457487" + deviceId))
 */
async function computeTrackingFields(email: string, deviceId: string, token: string | null) {
  const salt = `${email}38457487${deviceId}`;
  const encountertrackid = await sha256(salt);
  return {
    encountertrackid,
    providertrackid: token || undefined,
  };
}

/**
 * Make an API call to the FacilityDataCenter entity
 * 
 * @param method - The method name to call (e.g., "lstFacilityPatients")
 * @param options - Authentication and additional parameters
 * @returns The API response data
 * @throws Error if the request fails or returns status: false
 */
export async function apiCall<T = any>(
  method: string,
  options: ApiCallOptions
): Promise<T> {
  const { token, email, deviceId, params = {} } = options;

  if (!token || !email) {
    throw new Error("Session expired. Please log in again.");
  }

  const tracking = await computeTrackingFields(email, deviceId, token);

  const response = await fetch(LOCAL_API.LOGIN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entity: "FacilityDataCenter",
      method,
      token,
      email,
      deviceId,
      ...tracking,
      ...params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();

  if (!result.status) {
    throw new Error(result.error || result.message || "Unknown error");
  }

  return result.data as T;
}

/**
 * Make an API call that returns the full response (including status)
 * Use this when you need to handle partial success or check additional fields
 */
export async function apiCallRaw<T = any>(
  method: string,
  options: ApiCallOptions
): Promise<ApiResponse<T>> {
  const { token, email, deviceId, params = {} } = options;

  if (!token || !email) {
    return { status: false, error: "Session expired. Please log in again." };
  }

  try {
    const tracking = await computeTrackingFields(email, deviceId, token);

    const response = await fetch(LOCAL_API.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity: "FacilityDataCenter",
        method,
        token,
        email,
        deviceId,
        ...tracking,
        ...params,
      }),
    });

    if (!response.ok) {
      return { status: false, error: `Request failed with status ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    return {
      status: false,
      error: error instanceof Error ? error.message : "Network error"
    };
  }
}

/**
 * Hook-friendly wrapper that uses auth context
 * Import this in components/hooks that already have useAuth available
 */
export function createApiCaller(getToken: () => string | null, getEmail: () => string | null, getDeviceId: () => string) {
  return async function call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    return apiCall<T>(method, {
      token: getToken(),
      email: getEmail(),
      deviceId: getDeviceId(),
      params,
    });
  };
}
