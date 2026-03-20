# Session Report — 2026-03-20 — Issues Module Implementation (BE3)

## Summary
Implemented the full Issues module including Issue CRUD, Kanban board API, drag-and-drop reorder, label management, and file attachments with Multer integration. All endpoints are secured via ProjectRoleGuard with proper RBAC.

## Changes Made

### Prisma Schema (`prisma/schema.prisma`)
- Added `issueSequence Int @default(0)` to `Project` model for atomic issue key generation
- Added `@@index([projectId, status])` to `Issue` model for board query performance
- Added `@@index([projectId, sprintId])` to `Issue` model for sprint backlog queries

### Error Codes (`src/common/constants/error-codes.ts`)
- Added `ISSUE_KEY_NOT_FOUND`, `ISSUE_ASSIGNEE_NOT_PROJECT_MEMBER`, `ISSUE_LABEL_NOT_FOUND`
- Added `ATTACHMENT_NOT_FOUND`, `ATTACHMENT_DELETE_FORBIDDEN`

### Mock Helper (`test/helpers/mock-prisma.helper.ts`)
- Added `createMany` to mock delegate (needed for `issueLabel.createMany` in label attachment tests)

### Shared Multer Config (`src/upload/multer.config.ts`)
- Modified `createMulterOptions` to accept optional `allowedMimeTypes` parameter (backward compatible)

### DTOs (new files in `src/issues/dto/`)
- `create-issue.dto.ts` — title (required), description, priority, type, assigneeId, labelIds
- `update-issue.dto.ts` — all optional, assigneeId nullable
- `update-issue-status.dto.ts` — status (required) for Kanban moves
- `reorder-issue.dto.ts` — status + position for drag-and-drop
- `query-issues.dto.ts` — extends PaginationSchema with filters (status, priority, type, assigneeId, search)

### Issues Service (`src/issues/issues.service.ts`) — NEW
- `create` — atomic issueKey generation via `$transaction` + `issueSequence` increment
- `findAll` — paginated with filters (status, priority, type, assigneeId, full-text search)
- `findOne` — composite key lookup `{ projectId, issueNumber }` with full relations
- `update` — partial update with assignee validation
- `updateStatus` — dedicated status change for Kanban
- `remove` — ADMIN/OWNER restricted delete
- `getBoard` — returns `Record<IssueStatus, Issue[]>` sorted by position
- `reorder` — transactional position update with gap-based insertion
- `addLabel` / `removeLabel` — idempotent add, error on missing remove
- `parseIssueKey` — splits `TRK2-42` → extracts `42` via `split('-').pop()`
- `validateAssignee` — checks ProjectMember existence

### Issues Controller (`src/issues/issues.controller.ts`) — NEW
- All endpoints under `projects/:projectId/issues`
- Full Swagger decorators on every endpoint
- `ProjectRoleGuard` applied at class level, `RequireProjectRoles(ADMIN, OWNER)` on delete
- Route: `GET /board` before `GET /:issueKey` to avoid conflict

### Attachments Service (`src/issues/attachments/attachments.service.ts`) — NEW
- `upload` — creates DB record with file metadata from Multer
- `findAllForIssue` — lists with uploader info
- `remove` — ownership check (uploader OR ADMIN/OWNER), disk + DB cleanup

### Attachments Controller (`src/issues/attachments/attachments.controller.ts`) — NEW
- Routes under `projects/:projectId/issues/:issueKey/attachments`
- Multer with extended MIME types (images + PDF + text)
- `@ApiConsumes('multipart/form-data')` on upload

### Module Wiring
- `src/issues/issues.module.ts` — imports `UploadModule`, registers both controllers/services
- `src/app.module.ts` — added `IssuesModule` to imports

### Tests Updated
- `src/issues/issues.controller.spec.ts` — 9 tests, all passing
- `src/issues/issues.service.spec.ts` — 28 tests, all passing (expanded from 12 for 80%+ coverage)
- `src/issues/attachments/attachments.controller.spec.ts` — 3 tests, all passing
- `src/issues/attachments/attachments.service.spec.ts` — 4 tests, all passing
- `src/issues/issues.module.spec.ts` — 3 tests, all passing
- Removed `src/issues/` from `testPathIgnorePatterns` in `package.json`

### Design Spec
- `docs/superpowers/specs/2026-03-20-issues-module-design.md` — full approved design

## Packages Installed/Removed
None — all dependencies already present.

## Tests
- **53 tests total** in issues module, all passing
- Coverage: 97% statements, 88% branch, 96% functions, 99% lines
- **164 total project tests** passing (pre-existing OOM on guard spec when running full suite — isolated run passes)

## Build Status
TypeScript compilation passes with zero issues-related errors (pre-existing stub errors in comments/sprints/notifications modules remain).

## Notes / Decisions
- **IDOR prevention**: Issue lookup uses composite `{ projectId, issueNumber }` instead of `issueKey` string — structurally prevents cross-project access
- **Atomic key generation**: `project.issueSequence` incremented in `$transaction` — no race conditions
- **Issue key parsing**: `split('-').pop()` handles project keys with numbers (e.g., `TRK2-42`)
- **Multer enhancement**: Backward compatible — existing avatar upload unaffected
- **No status state machine**: Any-to-any transitions (YAGNI), error code reserved for future use

## Next Steps
- ~~Write comprehensive unit tests targeting 80%+ coverage~~ ✓ Done (97%+ across all files)
- Implement WebSocket integration (BE5) for real-time Kanban board updates
- Create Prisma migration for the schema changes (`issueSequence`, indexes)
- E2E tests for the full issue lifecycle
