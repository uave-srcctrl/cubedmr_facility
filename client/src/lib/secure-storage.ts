import { logger } from "@/lib/logger";
/**
 * Secure Storage Utility for HIPAA Compliance
 * 
 * Encrypts sensitive data before storing in localStorage using AES-GCM.
 * Uses a session-derived encryption key that's not persisted.
 */

// Encryption key stored in memory only (cleared on page refresh)
let encryptionKey: CryptoKey | null = null;

// Generate a random encryption key for this session
async function getOrCreateSessionKey(): Promise<CryptoKey> {
  if (encryptionKey) {
    return encryptionKey;
  }
  
  // Check if we have a key ID stored (to regenerate same key from session storage)
  const keyId = sessionStorage.getItem('_sk_id');
  
  if (keyId) {
    // Derive key from keyId using PBKDF2
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keyId),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('hipaa-secure-storage'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } else {
    // Generate new key ID and derive key
    const newKeyId = crypto.randomUUID();
    sessionStorage.setItem('_sk_id', newKeyId);
    
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(newKeyId),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('hipaa-secure-storage'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  return encryptionKey;
}

// Convert ArrayBuffer to base64 string
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Encrypt data
async function encrypt(data: string): Promise<string> {
  const key = await getOrCreateSessionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return bufferToBase64(combined.buffer);
}

// Decrypt data
async function decrypt(encryptedData: string): Promise<string | null> {
  try {
    const key = await getOrCreateSessionKey();
    const combined = new Uint8Array(base64ToBuffer(encryptedData));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    // Decryption failed (wrong key, corrupted data, etc.)
    return null;
  }
}

// Keys that contain sensitive/PHI data and should be encrypted
const SENSITIVE_KEYS = [
  'authToken',
  'userEmail',
  'userName',
  'userEntity',
  'userEntityName',
  'userEntityId',
  'userFacilityId',
  'userCurrentTenant',
  'selectedFacilityId',
  'availableFacilities'
];

/**
 * Secure Storage API - encrypts sensitive data automatically
 */
export const secureStorage = {
  /**
   * Store an item, encrypting if it's sensitive
   */
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    if (SENSITIVE_KEYS.includes(key)) {
      const encrypted = await encrypt(value);
      localStorage.setItem(`_enc_${key}`, encrypted);
    } else {
      localStorage.setItem(key, value);
    }
  },
  
  /**
   * Retrieve an item, decrypting if it's sensitive
   */
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    
    if (SENSITIVE_KEYS.includes(key)) {
      const encrypted = localStorage.getItem(`_enc_${key}`);
      if (!encrypted) return null;
      return await decrypt(encrypted);
    }
    
    return localStorage.getItem(key);
  },
  
  /**
   * Remove an item
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    
    if (SENSITIVE_KEYS.includes(key)) {
      localStorage.removeItem(`_enc_${key}`);
    } else {
      localStorage.removeItem(key);
    }
  },
  
  /**
   * Clear all sensitive data
   */
  clearSensitiveData(): void {
    if (typeof window === 'undefined') return;
    
    for (const key of SENSITIVE_KEYS) {
      localStorage.removeItem(`_enc_${key}`);
      localStorage.removeItem(key); // Also remove any unencrypted versions
    }
    sessionStorage.removeItem('_sk_id');
    encryptionKey = null;
  }
};

/**
 * Sync versions for backward compatibility (uses cached values)
 * Note: These return empty/null if encryption key not initialized
 */
const cachedValues: Map<string, string | null> = new Map();

export const secureStorageSync = {
  /**
   * Initialize cache from encrypted storage (call at app startup)
   */
  async initialize(): Promise<void> {
    for (const key of SENSITIVE_KEYS) {
      const value = await secureStorage.getItem(key);
      cachedValues.set(key, value);
    }
  },
  
  /**
   * Get item synchronously from cache
   * Falls back to localStorage if cache miss (for non-encrypted keys or during recovery)
   */
  getItem(key: string): string | null {
    if (SENSITIVE_KEYS.includes(key)) {
      const cached = cachedValues.get(key);
      if (cached !== undefined) {
        return cached;
      }
      // Cache miss - try to recover from localStorage (unencrypted fallback)
      // This helps when in-memory cache is cleared but localStorage persists
      const fallback = localStorage.getItem(key);
      if (fallback) {
        // Re-cache for future sync access
        cachedValues.set(key, fallback);
        return fallback;
      }
      return null;
    }
    return localStorage.getItem(key);
  },
  
  /**
   * Set item (async encryption, but updates cache immediately)
   */
  setItem(key: string, value: string): void {
    if (SENSITIVE_KEYS.includes(key)) {
      cachedValues.set(key, value);
      // Async encrypt and store
      secureStorage.setItem(key, value).catch(logger.error);
    } else {
      localStorage.setItem(key, value);
    }
  },
  
  /**
   * Remove item
   */
  removeItem(key: string): void {
    if (SENSITIVE_KEYS.includes(key)) {
      cachedValues.delete(key);
    }
    secureStorage.removeItem(key);
  },
  
  /**
   * Clear all sensitive data
   */
  clearSensitiveData(): void {
    cachedValues.clear();
    secureStorage.clearSensitiveData();
  }
};

export default secureStorage;
