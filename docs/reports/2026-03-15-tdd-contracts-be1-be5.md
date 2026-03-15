# Session Report: TDD Contract Specs for BE1–BE5

**Date**: 2026-03-15
**Author**: BE6 (Infrastructure & DevOps)
**Session Type**: Test file creation (TDD contracts)

---

## Summary

Created TDD contract spec files for all backend developers (BE1–BE5). These files define the expected behavior of each module and serve as a testing contract — devs implement until tests pass.

**Important**: These specs import modules that don't exist yet. They will fail at import until the corresponding modules are implemented.

---

## Files Created

### BE1 — Auth & Users (6 unit + 2 e2e = 8 files)

| File | Tests | Purpose |
|---|---|---|
| `src/auth/auth.service.spec.ts` | ~8 | register, login, refreshToken, logout |
| `src/auth/auth.controller.spec.ts` | ~5 | POST register/login/refresh/logout |
| `src/auth/auth.module.spec.ts` | 3 | Module compilation |
| `src/users/users.service.spec.ts` | ~5 | findById, updateProfile, updateAvatar |
| `src/users/users.controller.spec.ts` | ~4 | GET/PATCH /users/me, POST avatar |
| `src/upload/upload.module.spec.ts` | 2 | Module compilation |
| `test/auth.e2e-spec.ts` | ~8 | Register/login/refresh/logout e2e |
| `test/users.e2e-spec.ts` | ~5 | Profile/avatar e2e |

### BE2 — Projects & RBAC (5 unit + 1 e2e = 6 files)

| File | Tests | Purpose |
|---|---|---|
| `src/projects/projects.service.spec.ts` | ~10 | CRUD, addMember, removeMember, updateMemberRole |
| `src/projects/projects.controller.spec.ts` | ~8 | All CRUD + member endpoints |
| `src/projects/guards/project-role.guard.spec.ts` | ~4 | Role checking, member validation |
| `src/projects/labels/labels.service.spec.ts` | ~5 | Create, findAll, update, remove |
| `src/projects/projects.module.spec.ts` | 3 | Module compilation |
| `test/projects.e2e-spec.ts` | ~8 | Projects/members/labels e2e |

### BE3 — Issues & Board (5 unit + 1 e2e = 6 files)

| File | Tests | Purpose |
|---|---|---|
| `src/issues/issues.service.spec.ts` | ~12 | Create (auto issueKey), findAll (filters), board, labels |
| `src/issues/issues.controller.spec.ts` | ~8 | All CRUD + board + status + position |
| `src/issues/attachments/attachments.service.spec.ts` | ~5 | Upload, findAll, remove (with ForbiddenException) |
| `src/issues/attachments/attachments.controller.spec.ts` | ~3 | Upload/list/delete |
| `src/issues/issues.module.spec.ts` | 3 | Module compilation |
| `test/issues.e2e-spec.ts` | ~10 | Issues/board/attachments e2e |

### BE4 — Sprints & Comments (5 unit + 2 e2e = 7 files)

| File | Tests | Purpose |
|---|---|---|
| `src/sprints/sprints.service.spec.ts` | ~11 | Create, findAll, start/complete lifecycle, backlog, add/remove issue |
| `src/sprints/sprints.controller.spec.ts` | ~9 | All CRUD + lifecycle + backlog endpoints |
| `src/sprints/sprints.module.spec.ts` | 3 | Module compilation |
| `src/comments/comments.service.spec.ts` | ~8 | Create (with threading), findAll, update, remove (ForbiddenException) |
| `src/comments/comments.controller.spec.ts` | ~4 | POST create, GET list, PATCH update, DELETE |
| `src/comments/comments.module.spec.ts` | 3 | Module compilation |
| `test/sprints.e2e-spec.ts` | ~9 | CRUD, lifecycle, backlog, issue management e2e |
| `test/comments.e2e-spec.ts` | ~7 | Create, reply, update, delete e2e |

### BE5 — Notifications & WebSocket (4 unit + 1 e2e = 5 files)

| File | Tests | Purpose |
|---|---|---|
| `src/notifications/gateway/notifications.gateway.spec.ts` | ~7 | JWT auth, room management, emit events |
| `src/notifications/notifications.service.spec.ts` | ~5 | Create, findAll, markAsRead, markAllAsRead, getUnreadCount |
| `src/notifications/notifications.controller.spec.ts` | ~4 | GET list, GET unread-count, PATCH read, PATCH read-all |
| `src/notifications/notifications.module.spec.ts` | 4 | Module compilation (controller + service + gateway) |
| `test/notifications.e2e-spec.ts` | ~6 | 401 without auth, CRUD notifications e2e |

---

## Totals

| Category | Count |
|---|---|
| Unit spec files | 25 |
| E2E spec files | 7 |
| Approximate test cases | ~175 |

---

## How Devs Should Use These

1. Pull the `develop` branch to get all spec files
2. Create your feature branch: `feature/<task-number>-<feature-name>`
3. Implement your module until `npm run test -- --testPathPattern=src/<your-module>` passes
4. Run `npm run test:cov` to verify 80%+ coverage
5. Push and create PR to `develop`

---

## Next Steps

- Each dev (BE1–BE5) implements their module until tests go green
- After all modules pass: run full suite, verify 80%+ coverage for SonarQube
- Run initial Prisma migration (`prisma migrate dev --name init`) when DB is available
