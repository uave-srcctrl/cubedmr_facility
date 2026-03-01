/**
 * Unit Tests: API Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('API Response Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Response Parsing', () => {
    it('should parse JSON response correctly', () => {
      const jsonString = '{"success":true,"data":{"id":1,"name":"Test"}}';
      const parsed = JSON.parse(jsonString);
      
      expect(parsed.success).toBe(true);
      expect(parsed.data.id).toBe(1);
      expect(parsed.data.name).toBe('Test');
    });

    it('should handle malformed JSON gracefully', () => {
      const malformed = '{invalid json}';
      
      expect(() => JSON.parse(malformed)).toThrow();
    });

    it('should handle empty response', () => {
      const empty = '';
      
      expect(() => JSON.parse(empty)).toThrow();
    });
  });

  describe('Error Response Handling', () => {
    interface ApiError {
      success: false;
      error: string;
      code?: number;
    }

    const isApiError = (response: unknown): response is ApiError => {
      return (
        typeof response === 'object' &&
        response !== null &&
        'success' in response &&
        (response as ApiError).success === false &&
        'error' in response
      );
    };

    it('should identify error response', () => {
      const errorResponse = { success: false, error: 'Not found' };
      
      expect(isApiError(errorResponse)).toBe(true);
    });

    it('should not identify success as error', () => {
      const successResponse = { success: true, data: {} };
      
      expect(isApiError(successResponse)).toBe(false);
    });
  });

  describe('Request Building', () => {
    interface RequestOptions {
      method: string;
      headers: Record<string, string>;
      body?: string;
    }

    const buildRequest = (
      method: string,
      data?: Record<string, unknown>,
      token?: string
    ): RequestOptions => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options: RequestOptions = { method, headers };
      
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      return options;
    };

    it('should add authorization header when token provided', () => {
      const options = buildRequest('GET', undefined, 'my-token');
      
      expect(options.headers['Authorization']).toBe('Bearer my-token');
    });

    it('should not add body for GET requests', () => {
      const options = buildRequest('GET', { data: 'test' });
      
      expect(options.body).toBeUndefined();
    });

    it('should add body for POST requests', () => {
      const options = buildRequest('POST', { name: 'test' });
      
      expect(options.body).toBe('{"name":"test"}');
    });

    it('should set correct content type', () => {
      const options = buildRequest('GET');
      
      expect(options.headers['Content-Type']).toBe('application/json');
    });
  });
});

describe('URL Building', () => {
  const buildUrl = (base: string, endpoint: string, params?: Record<string, string | number>): string => {
    const url = new URL(endpoint, base);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    return url.toString();
  };

  it('should build URL with query params', () => {
    const url = buildUrl('https://api.example.com', '/facilities', { id: 1 });
    
    expect(url).toContain('id=1');
  });

  it('should handle multiple params', () => {
    const url = buildUrl('https://api.example.com', '/facilities', { 
      id: 1, 
      status: 'active' 
    });
    
    expect(url).toContain('id=1');
    expect(url).toContain('status=active');
  });

  it('should work without params', () => {
    const url = buildUrl('https://api.example.com', '/facilities');
    
    expect(url).toBe('https://api.example.com/facilities');
  });
});

describe('Date Formatting', () => {
  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  it('should format Date object', () => {
    const date = new Date('2026-02-28T12:00:00Z');
    
    expect(formatDate(date)).toBe('2026-02-28');
  });

  it('should format date string', () => {
    expect(formatDate('2026-02-28T12:00:00Z')).toBe('2026-02-28');
  });

  it('should handle ISO string input', () => {
    expect(formatDate('2026-02-28')).toBe('2026-02-28');
  });
});
