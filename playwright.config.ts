// Oberflächentests: klicken die gebaute App im Browser durch, so wie sie auf das iPad kommt.
// Laufen vor jeder Veröffentlichung (siehe .github/workflows/veroeffentlichen.yml).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    locale: 'de-DE',
    trace: 'retain-on-failure',
  },
  projects: [
    // Safari-Engine mit iPad-Kennung: deckt auch die iPad-Wege ab (z. B. Sicherung über „Datei ablegen …“).
    { name: 'ipad', use: { ...devices['iPad Pro 11 landscape'] } },
    { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1180, height: 820 } } },
  ],
  webServer: {
    // In der Pipeline ist schon gebaut; lokal wird vorher gebaut.
    command: `${process.env.CI ? '' : 'npm run build && '}npm run preview -- --port 4173 --strictPort`,
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
