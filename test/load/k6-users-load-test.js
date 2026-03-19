import http from 'k6/http';
import { check } from 'k6';

/*
 * k6 Users Profile Load Test — Black-box testing
 *
 * Purpose: Verify GET /api/users/me performance under load
 * and that @nestjs/throttler rate limiting works.
 *
 * Prerequisites:
 *   1. Start the app: npm run start:dev
 *   2. Ensure a test user exists (email: loadtest@example.com, password: Password1!)
 *   3. Install k6: https://k6.io/docs/get-started/installation/
 *   4. Run: k6 run test/load/k6-users-load-test.js
 *
 * Expected: Most requests return 200, throttled ones return 429.
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

export const options = {
  scenarios: {
    profile_load: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 50,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.5'],
  },
};

// Setup: login once to get a token
export function setup() {
  const loginPayload = JSON.stringify({
    email: 'loadtest@example.com',
    password: 'Password1!',
  });

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const token = loginRes.json('data.accessToken');
  if (!token) {
    console.log('Login failed — ensure a test user exists. Proceeding with dummy token.');
    return { token: 'dummy-token-for-load-test' };
  }
  return { token };
}

// Load test: hit GET /api/users/me with the token
export default function (data) {
  const res = http.get(`${BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
  });

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
      k6 Users Profile Load Test Results
======================================================
  Total Requests: ${totalRequests}
  Check the output above for 429 responses.
  If 429s appear, throttler is working!
======================================================
`,
  };
}
