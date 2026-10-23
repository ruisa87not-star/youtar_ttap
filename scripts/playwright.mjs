// Keep test browsers inside this project; some Windows hosts cannot load
// Firefox's side-by-side assembly from the shared browser cache.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';
await import('@playwright/test/cli');
