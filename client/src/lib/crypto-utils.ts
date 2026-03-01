/**
 * Cryptographic utility functions for secure operations
 * @module crypto-utils
 */

/**
 * Computes SHA-256 hash of a string
 * Uses Web Crypto API for secure hashing
 * @param str - The string to hash
 * @returns Promise resolving to hex-encoded hash string
 * @example
 * const hash = await sha256("password123");
 * // Returns: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"
 */
export async function sha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a random device ID for authentication
 * Uses crypto.randomUUID if available, falls back to random hex string
 * @returns A unique device identifier string
 */
export function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
