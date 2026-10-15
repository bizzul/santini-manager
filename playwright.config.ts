import path from "path";
import { defineConfig, devices } from "@playwright/test";

const port = 3010;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "zztest-shared-browser-hours.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  retries: 0,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    actionTimeout: 20_000,
    navigationTimeout: 90_000,
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- -p ${port}`,
    cwd: path.join(__dirname, "."),
    url: `http://127.0.0.1:${port}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      STORAGE_SUPABASE_URL: process.env.STORAGE_SUPABASE_URL ?? "",
      STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      STORAGE_SUPABASE_SERVICE_ROLE_KEY:
        process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ?? "",
      NEXT_PUBLIC_ROOT_DOMAIN: "localhost",
    },
  },
});
