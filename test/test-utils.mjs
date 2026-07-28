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

/**
 * Start an Express app on an ephemeral port, run `fn(baseUrl)` and always close
 * the server afterwards. Keeps router tests free of hardcoded ports.
 */
export async function withServer(app, fn) {
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

export function serialTest(name, fn) {
  return { name, fn, serial: true };
}
