/**
 * The AUTH_DISABLED bypass turns every anonymous request into a signed-in
 * admin. It is useful locally and catastrophic on a deployed host, and it used
 * to be protected only by a comment saying "never set it in production".
 *
 * These tests pin the guard: the bypass engages only in a local-looking
 * environment, and asking for it anywhere else makes startup fail loudly.
 */
import { assertSafe, bypassAllowed, bypassRefused, onManagedPlatform } from '../config/authBypass.js';

describe('bypassAllowed', () => {
  it('is off when AUTH_DISABLED is unset, empty or not exactly "true"', () => {
    expect(bypassAllowed({})).toBe(false);
    expect(bypassAllowed({ AUTH_DISABLED: '' })).toBe(false);
    expect(bypassAllowed({ AUTH_DISABLED: 'false' })).toBe(false);
    // Deliberately strict: "1", "yes" and "TRUE" must not enable it.
    expect(bypassAllowed({ AUTH_DISABLED: '1' })).toBe(false);
    expect(bypassAllowed({ AUTH_DISABLED: 'yes' })).toBe(false);
    expect(bypassAllowed({ AUTH_DISABLED: 'TRUE' })).toBe(false);
  });

  it('is on for an explicit opt-in in a local environment', () => {
    expect(bypassAllowed({ AUTH_DISABLED: 'true' })).toBe(true);
    expect(bypassAllowed({ AUTH_DISABLED: 'true', NODE_ENV: 'development' })).toBe(true);
    expect(bypassAllowed({ AUTH_DISABLED: 'true', NODE_ENV: 'test' })).toBe(true);
  });

  it('is refused under NODE_ENV=production even with the opt-in', () => {
    expect(bypassAllowed({ AUTH_DISABLED: 'true', NODE_ENV: 'production' })).toBe(false);
  });

  it.each([
    'RENDER',
    'FLY_APP_NAME',
    'RAILWAY_ENVIRONMENT',
    'DYNO',
    'VERCEL',
    'AWS_EXECUTION_ENV',
    'KUBERNETES_SERVICE_HOST',
  ])('is refused when the managed-platform marker %s is present', (marker) => {
    expect(bypassAllowed({ AUTH_DISABLED: 'true', [marker]: 'true' })).toBe(false);
  });
});

describe('onManagedPlatform', () => {
  it('detects a hosting platform and reports a bare shell as local', () => {
    expect(onManagedPlatform({ RENDER: 'true' })).toBe(true);
    expect(onManagedPlatform({})).toBe(false);
  });
});

describe('bypassRefused', () => {
  it('is true only when the bypass was requested and denied', () => {
    expect(bypassRefused({ AUTH_DISABLED: 'true', RENDER: 'true' })).toBe(true);
    expect(bypassRefused({ AUTH_DISABLED: 'true' })).toBe(false);
    expect(bypassRefused({})).toBe(false);
  });
});

describe('assertSafe', () => {
  it('stays silent when no bypass is requested', () => {
    expect(() => assertSafe({})).not.toThrow();
    expect(() => assertSafe({ NODE_ENV: 'production' })).not.toThrow();
  });

  it('stays silent for a legitimate local bypass', () => {
    expect(() => assertSafe({ AUTH_DISABLED: 'true' })).not.toThrow();
  });

  it('throws and names the reason on a managed platform', () => {
    expect(() => assertSafe({ AUTH_DISABLED: 'true', RENDER: 'true' })).toThrow(/RENDER/);
    expect(() => assertSafe({ AUTH_DISABLED: 'true', RENDER: 'true' })).toThrow(
      /Refusing to start/
    );
  });

  it('throws and names the reason under NODE_ENV=production', () => {
    expect(() => assertSafe({ AUTH_DISABLED: 'true', NODE_ENV: 'production' })).toThrow(
      /NODE_ENV=production/
    );
  });
});
