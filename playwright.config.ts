import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the *static export*, not `next dev`.
 *
 * The acceptance criteria for the UI polish pass claim 375px and "every screen",
 * and the previous config verified neither: it booted `npm run dev` (a different
 * artifact from the one Amplify serves) at Pixel 7's 412px. Both are fixed here —
 * `webServer` builds and serves `out/`, and the primary project is 375px.
 */
/**
 * Escape hatch for environments that already have a Chromium build on disk from
 * a different Playwright release (CI images, sandboxes). Set CHROMIUM_PATH to it
 * and the suite runs against that binary instead of failing on a version-pinned
 * download. Unset locally — the bundled browser is used as normal.
 */
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  // A stuck save used to be invisible; keep per-test time short so a hang fails
  // loudly instead of looking like a slow suite.
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      // The breakpoint the product is specified at — one-handed, smallest phone.
      //
      // The viewport is set explicitly rather than via a device preset: every
      // iPhone preset defaults to WebKit (an extra browser download), and
      // Playwright's "iPhone SE" is the 1st-gen 320px device, not the 375px one
      // the acceptance criteria mean. Chromium mobile emulation at exactly
      // 375×667 is what the ACs actually claim. For genuine WebKit rendering,
      // run `npx playwright install webkit` and swap in
      // `devices["iPhone SE (3rd gen)"]`.
      name: "mobile-375",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      // Kept for the wider-phone check the config previously did exclusively.
      name: "mobile-412",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    // `trailingSlash: true` in next.config means the export writes directory
    // indexes, so a plain static server resolves every route.
    command: "npm run build && npm run serve:out",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
