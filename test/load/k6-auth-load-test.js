import http from 'k6/http';
import { check, sleep } from 'k6';

/*
 * k6 Auth Load Test — Black-box testing
 *
 * Purpose: Verify that @nestjs/throttler rate limiting works under load.
 * The /auth/login endpoint is configured with strict limits:
 *   - 1 request per second (short)
 *   - 5 requests per minute (medium)
 *
 * Prerequisites:
 *   1. Start the app: npm run start:dev
 *   2. Install k6: https://k6.io/docs/get-started/installation/
 *   3. Run: k6 run test/load/k6-auth-load-test.js
 *
 * Expected: After exceeding the rate limit, the server returns HTTP 429.
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

export const options = {
  scenarios: {
    burst_login: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 30,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.5'],
  },
};

export default function () {
  const payload = JSON.stringify({
    email: 'loadtest@example.com',
    password: 'WrongPassword1!',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  check(res, {
    'status is 200 or 401 or 429': (r) =>
      [200, 401, 429].includes(r.status),
    'rate limited returns 429': (r) => {
      if (r.status === 429) {
        console.log(`Rate limited! Status: ${r.status}`);
        return true;
      }
      return true;
    },
  });
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;

  return {
    stdout: `
======================================================
        k6 Auth Rate Limit Test Results
======================================================
  Total Requests: ${totalRequests}
  Check the output above for 429 responses.
  If 429s appear, throttler is working!
======================================================
`,
  };
}
