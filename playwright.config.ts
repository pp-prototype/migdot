import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 2,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:5177',
    channel: 'chrome',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 1000 },
  },
  webServer: [{
    command: 'npm run dev:local -- --host 127.0.0.1 --port 5177 --strictPort',
    url: 'http://127.0.0.1:5177',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://preview-must-ignore.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_preview_must_ignore' },
  }, {
    command: 'npm run dev -- --config vite.auth-test.config.ts --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:54329', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ui_test' },
  }, {
    command: 'npm run build -- --outDir node_modules/.cache/migdot-production-test && npm run preview -- --outDir node_modules/.cache/migdot-production-test --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  }],
})
