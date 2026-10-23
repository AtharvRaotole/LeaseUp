import { describe, it, expect } from 'vitest';
import { allowedOrigins } from '../lib/cors-allowed-origins';

describe('allowedOrigins', () => {
  it('omits CSP e2e preview port when not demo or CI', () => {
    const list = allowedOrigins({ APP_MODE: 'live' });
    expect(list).not.toContain('http://127.0.0.1:4178');
  });

  it('includes CSP e2e preview port in demo mode', () => {
    const list = allowedOrigins({ APP_MODE: 'demo' });
    expect(list).toContain('http://127.0.0.1:4178');
  });

  it('includes CSP e2e preview port when CI=true', () => {
    const list = allowedOrigins({ CI: 'true' });
    expect(list).toContain('http://127.0.0.1:4178');
  });

  it('respects ALLOWED_ORIGINS when set', () => {
    const list = allowedOrigins({ ALLOWED_ORIGINS: 'https://leaseup.example' });
    expect(list).toEqual(['https://leaseup.example']);
  });
});
