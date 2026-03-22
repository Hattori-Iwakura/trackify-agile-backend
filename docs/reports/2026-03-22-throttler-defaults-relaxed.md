# Session Report — 2026-03-22 — Throttler defaults relaxed

## Summary
Relaxed global `@nestjs/throttler` limits so the SPA (parallel requests + React Strict Mode) no longer hits `ThrottlerException: Too Many Requests` during normal use. Health checks skip throttling.

## Changes Made
| File | Description |
|------|-------------|
| `src/app.module.ts` | `short` 3→40/s, `medium` 20→200/10s, `long` 100→1000/min |
| `src/health/health.controller.ts` | `@SkipThrottle()` on health controller |
| `CONTEXT.md` | Document new defaults + last updated |

## Packages Installed/Removed
None.

## Tests
- `npm run build` — pass.

## Notes / Decisions
- Auth routes keep their own `@Throttle()` overrides (register/login).
- k6 load tests that expect 429 under light load may need updated thresholds if re-run.

## Next Steps
- Restart Nest dev server and retry Notifications page.
