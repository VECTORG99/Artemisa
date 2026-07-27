/**
 * Test utilities to prevent race conditions and env pollution.
 * Import this in test files that need isolated environments.
 */

/**
 * Backup and restore env vars to prevent test pollution.
 */
export function withCleanEnv(fn) {
  const backup = { ...process.env };
  return async () => {
    try {
      await fn();
    } finally {
      // Restore original env
      for (const key of Object.keys(process.env)) {
        if (!(key in backup)) delete process.env[key];
      }
      Object.assign(process.env, backup);
    }
  };
}

export function serialTest(name, fn) {
  return { name, fn, serial: true };
}
