import { defineConfig } from '@playwright/test';

/**
 * Playwright config cho WebSocket / real-time integration tests.
 *
 * Tests chạy dựa vào server NestJS đang chạy thật (với database thật).
 * Dùng reuseExistingServer: true — nếu server đang chạy thì dùng luôn,
 * nếu không thì tự start bằng `npm run start:dev`.
 *
 * Chạy: npx playwright test
 * Hoặc: npm run test:playwright
 */
export default defineConfig({
  testDir: './test/playwright',
  timeout: 30_000,
  retries: 0,
  workers: 1, // Chạy tuần tự để chia sẻ state (app instance, tokens)
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  webServer: {
    command: 'npm run start:dev',
    url: 'http://localhost:3001/api/health',
    reuseExistingServer: true, // Dùng server đang chạy nếu có
    timeout: 90_000,
  },
});
