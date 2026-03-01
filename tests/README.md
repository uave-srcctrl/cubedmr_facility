# Test Suite Documentation

## Overview

Testing infrastructure using Vitest for the wounddatacenter application.

## Test Categories

### 1. Unit Tests (`tests/unit/`)
- **Purpose:** Test individual functions and utilities
- **Run:** `npm run test:unit`
- **Files:**
  - `auth.test.ts` - Authentication utilities
  - `api.test.ts` - API helpers and formatting

### 2. Integration Tests (`tests/integration/`)
- **Purpose:** Test route handlers and middleware
- **Run:** `npm run test:integration`
- **Files:**
  - `routes.test.ts` - Express route logic

### 3. Smoke Tests (`tests/smoke/`)
- **Purpose:** Quick deployment verification
- **Run:** `npm run test:smoke`
- **Files:**
  - `smoke.test.ts` - Health checks and critical endpoints

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### With Coverage
```bash
npm run test:coverage
```

### Interactive UI
```bash
npm run test:ui
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `test` | Environment |
| `TEST_API_URL` | `http://localhost:5000` | Node.js API URL |
| `TEST_PHP_API_URL` | `http://localhost/api` | PHP API URL |

## CI/CD Integration

Tests run automatically via GitHub Actions on:
- Push to `main`, `develop`, `Fix-compliences`
- Pull requests

See `.github/workflows/ci-cd.yml` for configuration.

## Adding New Tests

1. Create test file in appropriate directory
2. Use `.test.ts` or `.spec.ts` extension
3. Import from `vitest`
4. Run `npm test` to verify

## Example Test

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature', () => {
  it('should work correctly', () => {
    expect(1 + 1).toBe(2);
  });
});
```
