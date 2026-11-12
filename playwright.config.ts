import { defineConfig, devices } from '@playwright/test';

/** Parcours de bout en bout sur un téléphone Android simulé, en mode local (sans compte). */
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4173', trace: 'off', locale: 'fr-FR', timezoneId: 'Africa/Casablanca' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 180000 },
});
