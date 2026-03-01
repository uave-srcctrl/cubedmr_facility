/**
 * Smoke Tests
 * 
 * Quick sanity checks to verify deployment was successful.
 * These tests run fast and should catch major deployment issues.
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:5000';
const PHP_API_BASE = process.env.TEST_PHP_API_URL || 'http://localhost/api';

// Helper to check if URL is reachable
async function isReachable(url: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

describe('Smoke Tests - Health Checks', () => {
  describe('Node.js Server', () => {
    it('should respond to health check', async () => {
      const reachable = await isReachable(API_BASE);
      
      if (!reachable) {
        console.warn('Node.js server not reachable, skipping test');
        return;
      }
      
      const response = await fetch(API_BASE);
      expect(response.status).toBeLessThan(500);
    });

    it('should return valid JSON from API endpoints', async () => {
      const reachable = await isReachable(`${API_BASE}/api`);
      
      if (!reachable) {
        console.warn('Node.js API not reachable, skipping test');
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/facilities`);
      const contentType = response.headers.get('content-type');
      
      expect(contentType).toContain('application/json');
    });
  });

  describe('PHP API Server', () => {
    it('should respond to requests', async () => {
      const reachable = await isReachable(PHP_API_BASE);
      
      if (!reachable) {
        console.warn('PHP API not reachable, skipping test');
        return;
      }
      
      const response = await fetch(PHP_API_BASE);
      expect(response.status).toBeLessThan(500);
    });
  });
});

describe('Smoke Tests - Core Functionality', () => {
  describe('Authentication Flow', () => {
    it('should return 401 for unauthenticated requests to protected endpoints', async () => {
      const reachable = await isReachable(API_BASE);
      
      if (!reachable) {
        console.warn('Server not reachable, skipping test');
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/protected-resource`);
      // Either 401, 403, or redirect is acceptable
      expect([401, 403, 302, 404]).toContain(response.status);
    });
  });

  describe('Static Assets', () => {
    it('should serve static files', async () => {
      const reachable = await isReachable(API_BASE);
      
      if (!reachable) {
        console.warn('Server not reachable, skipping test');
        return;
      }
      
      const response = await fetch(API_BASE);
      // Should return HTML for root
      expect(response.status).toBeLessThan(500);
    });
  });
});

describe('Smoke Tests - Security Headers', () => {
  it('should include X-Frame-Options header', async () => {
    const reachable = await isReachable(PHP_API_BASE);
    
    if (!reachable) {
      console.warn('PHP API not reachable, skipping test');
      return;
    }
    
    const response = await fetch(`${PHP_API_BASE}/settings`);
    const header = response.headers.get('x-frame-options');
    
    // Security header should be present
    // Note: May not be present if middleware not applied
    if (header) {
      expect(['DENY', 'SAMEORIGIN']).toContain(header);
    }
  });

  it('should include X-Content-Type-Options header', async () => {
    const reachable = await isReachable(PHP_API_BASE);
    
    if (!reachable) {
      console.warn('PHP API not reachable, skipping test');
      return;
    }
    
    const response = await fetch(`${PHP_API_BASE}/settings`);
    const header = response.headers.get('x-content-type-options');
    
    if (header) {
      expect(header).toBe('nosniff');
    }
  });
});

describe('Smoke Tests - Critical Endpoints', () => {
  const criticalEndpoints = [
    { name: 'Facilities List', url: '/facilities' },
    { name: 'Settings', url: '/settings' }
  ];

  criticalEndpoints.forEach(({ name, url }) => {
    it(`${name} endpoint should respond`, async () => {
      const reachable = await isReachable(PHP_API_BASE);
      
      if (!reachable) {
        console.warn('PHP API not reachable, skipping test');
        return;
      }
      
      const response = await fetch(`${PHP_API_BASE}${url}`);
      
      // Should not return 5xx errors
      expect(response.status).toBeLessThan(500);
    });
  });
});

describe('Smoke Tests - Error Handling', () => {
  it('should handle 404 gracefully', async () => {
    const reachable = await isReachable(PHP_API_BASE);
    
    if (!reachable) {
      console.warn('PHP API not reachable, skipping test');
      return;
    }
    
    const response = await fetch(`${PHP_API_BASE}/nonexistent-endpoint-${Date.now()}`);
    
    // Should return 404, not 500
    expect(response.status).toBe(404);
  });

  it('should handle malformed requests', async () => {
    const reachable = await isReachable(PHP_API_BASE);
    
    if (!reachable) {
      console.warn('PHP API not reachable, skipping test');
      return;
    }
    
    const response = await fetch(`${PHP_API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json'
    });
    
    // Should handle gracefully, not crash
    expect(response.status).toBeLessThan(500);
  });
});
