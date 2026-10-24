import { describe, expect, it } from 'vitest';
import { landingBrowserChromePath, LANDING_BROWSER_TAB_TITLE } from '../lib/landing-browser-chrome';

describe('landing browser chrome', () => {
  it('uses LeaseUp as tab title and path-only address bar', () => {
    expect(LANDING_BROWSER_TAB_TITLE).toBe('LeaseUp');
    const path = '/r/wicker?address=1574+N+Milwaukee+Ave&radius=10';
    expect(landingBrowserChromePath(path)).toBe(path);
    expect(landingBrowserChromePath(path, 20)).toMatch(/^\/r\/wicker\?address=1…$/);
    expect(landingBrowserChromePath(path, 20)).not.toMatch(/pages\.dev/);
  });
});
