/**
 * Guard for the local-development authentication bypass.
 *
 * `AUTH_DISABLED=true` makes every request a signed-in admin. That is genuinely
 * useful when working on the UI without a Supabase Auth project, and it is
 * already opt-in and off by default — but on a deployed service a single stray
 * environment variable would hand every anonymous caller admin rights over
 * every disaster, report and resource. A comment saying "never set it in
 * production" is not an enforcement mechanism.
 *
 * So the bypass now refuses to engage anywhere that looks like a deployment,
 * and `assertSafe()` makes the process exit at startup rather than boot into a
 * wide-open state. The failure mode is "deploy stops" instead of "deploy
 * silently serves an unauthenticated admin API".
 */

/** Env markers injected by managed hosts. Their presence means "not local". */
const PLATFORM_MARKERS = [
  'RENDER',
  'FLY_APP_NAME',
  'RAILWAY_ENVIRONMENT',
  'DYNO',
  'VERCEL',
  'AWS_EXECUTION_ENV',
  'KUBERNETES_SERVICE_HOST',
];

/** True when the process looks like it is running on a hosting platform. */
export function onManagedPlatform(env = process.env) {
  return PLATFORM_MARKERS.some((marker) => Boolean(env[marker]));
}

/**
 * Whether the bypass may be used at all. Requires an explicit opt-in *and* a
 * local-looking environment: not NODE_ENV=production, and no platform marker.
 */
export function bypassAllowed(env = process.env) {
  if (env.AUTH_DISABLED !== 'true') return false;
  if (env.NODE_ENV === 'production') return false;
  if (onManagedPlatform(env)) return false;
  return true;
}

/** True when the bypass was asked for but is being refused. */
export function bypassRefused(env = process.env) {
  return env.AUTH_DISABLED === 'true' && !bypassAllowed(env);
}

/**
 * Throw when the bypass is requested in an environment where it must not apply.
 * Called from server.js before the port is opened.
 */
export function assertSafe(env = process.env) {
  if (!bypassRefused(env)) return;

  const reason =
    env.NODE_ENV === 'production'
      ? 'NODE_ENV=production'
      : `a managed-platform marker is set (${PLATFORM_MARKERS.filter((m) => env[m]).join(', ')})`;

  throw new Error(
    `AUTH_DISABLED=true requests the local development authentication bypass, which ` +
      `would make every anonymous request a signed-in admin, but ${reason}. ` +
      `Refusing to start. Remove AUTH_DISABLED from this environment; use a real ` +
      `Supabase Auth project and ADMIN_USER_IDS instead.`
  );
}
