# Trackify Agile — Shared AI Agent Context

> **This file is the single source of truth for ALL AI agents working on this project.**
> It is committed to git so every teammate's agent stays aligned.
> Last updated: 2026-03-20 (Session: Notifications module implementation — BE5)

---

## 1. Project Overview

- **Project**: Trackify Agile — Web-based Agile Issue Tracker (University Graduation Project)
- **GitHub Workspace**: `anitygravity`
- **Team**: 7 members — 6 Backend (BE1–BE6), 1 Frontend (FE1)
- **Grading Focus**: SDLC Environment, CI/CD pipelines, Tooling, and DevOps — NOT complex product features
- **Architecture**: Polyrepo
  - **This repo**: Backend only (NestJS)
  - **Separate repo**: Frontend (NextJS)
  - **Separate repo**: Infrastructure (Docker Compose, Nginx, n8n)

---

## 2. Tech Stack (STRICT — No Substitutions)

### Backend (this repo)

| Layer | Technology | Notes |
|---|---|---|
| Framework | **NestJS** (TypeScript) | Modular architecture (controllers, services, modules) |
| ORM | **Prisma v7** | All database access — no raw SQL unless absolutely necessary |
| Database | **PostgreSQL** | `trackify_db` on `postgres-app:5432` (hosted in infra repo) |
| Validation | **Zod** | Request validation via custom `ZodValidationPipe` in `src/common/pipes/` |
| API Docs | **Swagger / OpenAPI** | Auto-generated from NestJS decorators — every endpoint MUST have them |
| Testing | **Jest** | Unit (`.spec.ts`) + E2E (`.e2e-spec.ts`) |
| File Upload | **Multer** | Via `@nestjs/platform-express` — required for file handling tasks |
| Real-time | **Socket.io** | Via `@nestjs/websockets` — required for real-time tasks |

### Frontend (separate repo — for reference only)

| Layer | Technology |
|---|---|
| Framework | **NextJS** (App Router) — **NOT Angular** |
| Validation | **Zod** (shared schema contracts with backend) |
| Forms | **React Hook Form** + Zod resolvers |

### DevOps & Infrastructure

| Tool | Purpose |
|---|---|
| **GitHub Actions** | CI/CD pipeline (test, scan, build, push) |
| **SonarQube** | Code quality gates — server at port `9000` |
| **Docker** | Multi-stage `node:20-alpine` builds |
| **n8n** | Workflow automation at port `5678` — syncs GitHub branches with Trello |
| **Nginx** | Reverse proxy routing between frontend and backend containers |

### Infrastructure Context

- **Docker Network**: `agile_network` (custom bridge) — backend container MUST join this network
- **App Database**: host `postgres-app`, port `5432`, database `trackify_db`
- **SonarQube DB**: `postgres-sonar` (separate instance)
- **Prisma v7 note**: Connection URL is in `prisma.config.ts`, NOT in `schema.prisma` datasource block

---

## 3. Academic Requirements (MANDATORY)

These rules exist to satisfy university grading criteria. They are **NON-NEGOTIABLE**.

### Rule: File Handling → Multer

> **IF** a task involves uploading, storing, or processing files (user avatars, issue attachments, profile images, documents)
> **THEN** you MUST implement it using **Multer** via `@nestjs/platform-express`.

- Use `@UseInterceptors(FileInterceptor(...))` in controllers
- Configure `diskStorage` or `memoryStorage` with proper file filters
- Validate file type (MIME) and size limits
- Store upload metadata (filename, mimeType, size) in the database via Prisma
- BE1 owns the shared `UploadModule`, BE3 imports it for issue attachments

### Rule: Real-time Updates → Socket.io

> **IF** a task involves real-time updates (Kanban board sync, live comments, push notifications)
> **THEN** you MUST implement it using **`@nestjs/websockets`** with **Socket.io**.

- Create `@WebSocketGateway()` classes
- Authenticate WebSocket connections via JWT in the handshake
- Use rooms for scoping: `project:{id}`, `issue:{key}`, `user:{id}`
- Emit events from services via injected gateway reference
- BE5 owns the WebSocket gateway, BE3/BE4 trigger events through it

---

## 4. Module Ownership

> **Each dev works ONLY within their `src/<module>/` directory to avoid merge conflicts.**

| Dev | Module Directory | Scope |
|---|---|---|
| **BE1** | `src/auth/`, `src/users/`, `src/upload/` | Authentication (JWT), user profiles, **Multer shared module** |
| **BE2** | `src/projects/` | Project CRUD, RBAC guards, members, labels/tags |
| **BE3** | `src/issues/` | Issue CRUD, Kanban board API, **issue attachments (Multer)**, filter/search |
| **BE4** | `src/sprints/`, `src/comments/` | Sprint lifecycle, backlog, comments with threading |
| **BE5** | `src/notifications/` | **WebSocket gateway (Socket.io)**, in-app notifications, real-time events |
| **BE6** | `src/common/`, `src/config/`, `src/health/`, `prisma/`, DevOps | Prisma schema, CI/CD, Docker, SonarQube, shared pipes/filters/interceptors |

### Cross-module dependencies

| Feature | Primary Owner | Depends On |
|---|---|---|
| Upload Avatar (Multer) | BE1 | — |
| Upload Attachments (Multer) | BE3 | BE1 (`UploadModule`) |
| RBAC Guards | BE2 | — (other modules import guards) |
| Kanban Board WebSocket | BE3 → BE5 | BE3 triggers, BE5 emits |
| Live Comments WebSocket | BE4 → BE5 | BE4 triggers, BE5 emits |
| Notifications WebSocket | BE5 | — |

---

## 5. NestJS Module Structure (Enforced)

Every feature module MUST follow this structure:

```
src/<module>/
  ├── <module>.module.ts          # Module definition
  ├── <module>.controller.ts      # REST endpoints + Swagger decorators
  ├── <module>.service.ts         # Business logic
  ├── <module>.controller.spec.ts # Controller tests
  ├── <module>.service.spec.ts    # Service tests
  ├── dto/                        # Zod schemas + inferred types
  │   ├── create-<entity>.dto.ts
  │   └── update-<entity>.dto.ts
  └── interfaces/                 # TypeScript interfaces (optional)
      └── <entity>.interface.ts
```

---

## 6. Code Conventions

### 6.1 Validation (Zod)

- Every request DTO MUST have a Zod schema
- Use the shared `ZodValidationPipe` from `src/common/pipes/zod-validation.pipe.ts`
- Export both the schema and the inferred type:

```typescript
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  key: z.string().min(2).max(10).toUpperCase(),
  description: z.string().optional(),
});
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
```

### 6.2 Swagger Decorators

Every controller method MUST include:
- `@ApiTags('module-name')`
- `@ApiOperation({ summary: '...' })`
- `@ApiResponse({ status: 2xx })` and `@ApiResponse({ status: 4xx })`
- `@ApiBearerAuth()` for authenticated endpoints
- `@ApiConsumes('multipart/form-data')` for file upload endpoints

### 6.3 Testing

- Every `.service.ts` → must have `.service.spec.ts`
- Every `.controller.ts` → must have `.controller.spec.ts`
- Every `.gateway.ts` → must have `.gateway.spec.ts`
- Tests must be meaningful — they feed into **SonarQube coverage reports**
- Target minimum **80% line coverage** per module

### 6.4 API Response Format

All responses are wrapped by `TransformInterceptor`:
```json
{
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2026-03-14T..."
}
```

Error responses use `HttpExceptionFilter`:
```json
{
  "statusCode": 400,
  "timestamp": "2026-03-14T...",
  "path": "/api/...",
  "message": "..."
}
```

### 6.5 Database Access

- Use Prisma for ALL database access
- No raw SQL unless absolutely necessary
- All models use `@@map("table_name")` for snake_case table names
- Relations use `onDelete: Cascade` or `onDelete: SetNull` as appropriate

---

## 7. Git Conventions

| Convention | Format | Example |
|---|---|---|
| **Branch naming** | `feature/<task-number>-<feature-name>` | `feature/42-issue-crud` |
| **PR title** | `[Task-ID] Short description` | `[TRK-42] Add issue CRUD endpoints` |
| **Commit message** | `[Task-ID] prefix: description` | `[TRK-42] feat: add create issue endpoint` |

- Conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- One feature per branch — do not mix unrelated changes
- PRs require at least 1 review before merge
- Target branch for feature PRs: `develop`

### n8n Automation

- When a feature branch is **merged into `develop`**, n8n automatically moves the corresponding Trello task to **Done**
- n8n matches the task number from the branch name — **incorrect branch names break the automation**

---

## 8. Current Project State

### Installed Dependencies
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` (v11)
- `@nestjs/swagger`, `@nestjs/config`
- `@prisma/client` (v7.5), `prisma` (v7.5)
- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` (Auth)
- `bcrypt` (password hashing)
- `@nestjs/throttler` (rate limiting)
- `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` (WebSocket/Socket.io)
- `@nestjs/event-emitter` (Event-driven decoupling)
- `zod`, `dotenv`, `rxjs`, `reflect-metadata`

### Existing Modules & Files

```
src/
  ├── main.ts                              # Swagger, global prefix /api, filters, interceptors
  ├── app.module.ts                        # Root module: ConfigModule, PrismaModule, CommonModule, AuthModule, ProjectsModule, IssuesModule, NotificationsModule, ThrottlerModule, EventEmitterModule
  ├── app.controller.ts                    # Default GET /
  ├── app.service.ts                       # Default service
  ├── config/
  │   └── env.validation.ts                # Zod-based .env validation
  ├── prisma/
  │   ├── prisma.module.ts                 # @Global PrismaModule
  │   └── prisma.service.ts                # PrismaClient with lifecycle hooks
  ├── auth/                                # ✅ Auth module (BE1) — IMPLEMENTED
  │   ├── auth.module.ts                   # PassportModule, JwtModule
  │   ├── auth.controller.ts               # POST register, login, refresh, logout
  │   ├── auth.service.ts                  # JWT signing, bcrypt hashing, refresh token mgmt
  │   ├── auth.controller.spec.ts          # 4 tests
  │   ├── auth.service.spec.ts             # 12 tests
  │   ├── auth.module.spec.ts              # 3 tests
  │   ├── dto/
  │   │   ├── register.dto.ts              # Zod: email, password (strict), fullName
  │   │   ├── login.dto.ts                 # Zod: email, password
  │   │   └── refresh-token.dto.ts         # Zod: refreshToken
  │   ├── strategies/
  │   │   ├── jwt.strategy.ts              # Passport JWT strategy
  │   │   └── jwt.strategy.spec.ts         # 2 tests
  │   └── guards/
  │       ├── jwt-auth.guard.ts            # AuthGuard('jwt')
  │       └── jwt-auth.guard.spec.ts       # 2 tests
  ├── common/
  │   ├── common.module.ts                 # Common module
  │   ├── constants/
  │   │   └── error-codes.ts               # ErrorCode enum (shared across all modules)
  │   ├── decorators/
  │   │   └── current-user.decorator.ts    # @CurrentUser() param decorator
  │   ├── pipes/
  │   │   └── zod-validation.pipe.ts       # ZodValidationPipe
  │   ├── filters/
  │   │   └── http-exception.filter.ts     # Global exception filter
  │   ├── interceptors/
  │   │   ├── transform.interceptor.ts     # Response wrapper { statusCode, data, timestamp }
  │   │   └── logging.interceptor.ts       # Request logger METHOD /url STATUS - Xms
  │   └── dto/
  │       └── pagination.dto.ts            # PaginationSchema + PaginatedResult<T>
  ├── upload/                               # ✅ Upload module (BE6) — IMPLEMENTED
  │   ├── upload.module.ts                 # UploadModule (exports UploadService)
  │   ├── upload.service.ts                # Fire-and-forget file deletion
  │   ├── upload.service.spec.ts           # 6 tests
  │   ├── multer.config.ts                 # createMulterOptions(subDir, allowedMimeTypes?) factory
  │   └── multer.config.spec.ts            # 11 tests
  ├── users/                               # ✅ Users module (BE6) — IMPLEMENTED
  │   ├── users.module.ts                  # UsersModule (imports UploadModule)
  │   ├── users.controller.ts              # GET /me, PATCH /me, POST /me/avatar
  │   ├── users.service.ts                 # findById, updateProfile, updateAvatar
  │   ├── users.controller.spec.ts         # 3 tests
  │   ├── users.service.spec.ts            # 5 tests
  │   └── dto/
  │       └── update-profile.dto.ts        # Zod: fullName, email (optional)
  ├── projects/                             # ✅ Projects module (BE2) — IMPLEMENTED
  │   ├── projects.module.ts              # ProjectsModule (3 controllers, 3 services)
  │   ├── projects.controller.ts          # POST, GET, GET/:id, PATCH/:id, DELETE/:id
  │   ├── projects.service.ts             # Project CRUD with $transaction for create
  │   ├── projects.controller.spec.ts     # 5 tests
  │   ├── projects.service.spec.ts        # 10 tests
  │   ├── projects.module.spec.ts         # 3 tests
  │   ├── members.controller.ts           # POST, GET, PATCH/:userId, DELETE/me, DELETE/:userId
  │   ├── members.service.ts              # Member CRUD with role escalation & last-owner rule
  │   ├── members.controller.spec.ts      # 5 tests
  │   ├── members.service.spec.ts         # 12 tests
  │   ├── labels.controller.ts            # POST, GET, PATCH/:labelId, DELETE/:labelId
  │   ├── labels.service.ts               # Label CRUD with per-project name uniqueness
  │   ├── labels.controller.spec.ts       # 4 tests
  │   ├── labels.service.spec.ts          # 8 tests
  │   ├── guards/
  │   │   ├── project-role.guard.ts       # ProjectRoleGuard (checks membership + role)
  │   │   └── project-role.guard.spec.ts  # 8 tests
  │   ├── decorators/
  │   │   └── require-project-roles.decorator.ts  # @RequireProjectRoles() metadata decorator
  │   └── dto/
  │       ├── create-project.dto.ts       # Zod: name, key (toUpperCase), description
  │       ├── update-project.dto.ts       # Zod: name, description (key immutable)
  │       ├── add-member.dto.ts           # Zod: userId (UUID), role (default MEMBER)
  │       ├── update-member-role.dto.ts   # Zod: role (required)
  │       ├── create-label.dto.ts         # Zod: name, color (hex regex)
  │       └── update-label.dto.ts         # Zod: name, color (both optional)
  ├── issues/                               # ✅ Issues module (BE3) — IMPLEMENTED
  │   ├── issues.module.ts               # IssuesModule (imports UploadModule)
  │   ├── issues.controller.ts           # CRUD + board + reorder + labels
  │   ├── issues.service.ts              # Business logic + atomic key generation
  │   ├── issues.controller.spec.ts      # 9 tests
  │   ├── issues.service.spec.ts         # 12 tests
  │   ├── issues.module.spec.ts          # 3 tests
  │   ├── attachments/
  │   │   ├── attachments.controller.ts  # Upload, list, delete (Multer)
  │   │   ├── attachments.service.ts     # Attachment CRUD + ownership check
  │   │   ├── attachments.controller.spec.ts  # 3 tests
  │   │   └── attachments.service.spec.ts     # 4 tests
  │   └── dto/
  │       ├── create-issue.dto.ts        # Zod: title, description, priority, type, assigneeId, labelIds
  │       ├── update-issue.dto.ts        # Zod: all optional, assigneeId nullable
  │       ├── update-issue-status.dto.ts # Zod: status (required)
  │       ├── reorder-issue.dto.ts       # Zod: status, position
  │       └── query-issues.dto.ts        # Zod: extends Pagination + filters
  ├── notifications/                      # ✅ Notifications module (BE5) — IMPLEMENTED
  │   ├── notifications.module.ts        # NotificationsModule (imports PrismaModule, JwtModule)
  │   ├── notifications.controller.ts   # GET /notifications, GET /unread-count, PATCH /:id/read, PATCH /read-all
  │   ├── notifications.service.ts      # create, findAllForUser, markAsRead, markAllAsRead, getUnreadCount
  │   ├── notifications.listener.ts     # @OnEvent handlers for 7 domain events
  │   ├── notifications.controller.spec.ts  # 4 tests
  │   ├── notifications.service.spec.ts     # 6 tests
  │   ├── notifications.module.spec.ts      # 4 tests
  │   ├── gateway/
  │   │   ├── notifications.gateway.ts      # WebSocket: JWT auth, rooms, emit methods
  │   │   └── notifications.gateway.spec.ts # 8 tests
  │   └── dto/
  │       └── create-notification.dto.ts    # Zod: type, title, message, userId, data
  └── health/
      ├── health.controller.ts             # GET /api/health (DB check + uptime)
      └── health.controller.spec.ts        # 2 tests

test/
  ├── app.e2e-spec.ts                      # App e2e test
  ├── auth.e2e-spec.ts                     # Auth e2e — 14 integration tests (full lifecycle)
  ├── users.e2e-spec.ts                    # Users e2e (TDD contract — BE1)
  ├── projects.e2e-spec.ts                 # Projects e2e (TDD contract — BE2)
  ├── issues.e2e-spec.ts                   # Issues e2e (TDD contract — BE3)
  ├── sprints.e2e-spec.ts                  # Sprints e2e (TDD contract — BE4)
  ├── comments.e2e-spec.ts                 # Comments e2e (TDD contract — BE4)
  ├── notifications.e2e-spec.ts            # Notifications e2e (TDD contract — BE5)
  ├── jest-e2e.json                        # E2E Jest config
  ├── __mocks__/
  │   ├── prisma-client.ts                 # Full Prisma mock (all 10 model delegates)
  │   └── prisma-enums.ts                  # Jest mock for Prisma v7 ESM enum exports
  └── helpers/
      ├── mock-prisma.helper.ts            # createMockPrismaService() factory
      └── e2e-setup.helper.ts              # createE2EApp() shared e2e bootstrap
  └── load/
      ├── k6-auth-load-test.js             # k6 rate limiting load test (black-box)
      └── k6-users-load-test.js            # k6 users endpoint load test (black-box)

prisma/
  └── schema.prisma                        # Full schema: 9 models, 7 enums

Other:
  ├── Dockerfile                           # Multi-stage node:20-alpine
  ├── prisma.config.ts                     # Prisma v7 config (DATABASE_URL here)
  ├── .env.example                         # All env vars documented
  └── .github/workflows/ci.yml            # CI pipeline
```

### Prisma Schema Models

| Model | Table | Owner | Status |
|---|---|---|---|
| `User` | `users` | BE1 | Schema ready + hashedRefreshToken added, no migration yet |
| `Project` | `projects` | BE2 | Schema ready + issueSequence added, no migration yet |
| `ProjectMember` | `project_members` | BE2 | Schema ready + @@index([userId]), no migration yet |
| `Label` | `labels` | BE2 | Schema ready, no migration yet |
| `Issue` | `issues` | BE3 | Schema ready + indexes added, no migration yet |
| `IssueLabel` | `issue_labels` | BE3 | Schema ready, no migration yet |
| `Attachment` | `attachments` | BE3 | Schema ready, no migration yet |
| `Sprint` | `sprints` | BE4 | Schema ready, no migration yet |
| `Comment` | `comments` | BE4 | Schema ready, no migration yet |
| `Notification` | `notifications` | BE5 | Schema ready, no migration yet |

### Enums
`GlobalRole`, `ProjectRole`, `IssueStatus`, `Priority`, `IssueType`, `SprintStatus`, `NotificationType`

### What's NOT Built Yet
- [x] Auth module (JWT, register, login, refresh, logout, rate limiting) — BE1 ✅
- [x] Users module (profile, avatar upload) — BE6 ✅
- [x] Upload module (Multer shared) — BE6 ✅
- [x] Projects module (CRUD, RBAC, members, labels) — BE2 ✅
- [x] Issues module (CRUD, board, attachments, filter) — BE3 ✅
- [ ] Sprints module (lifecycle, backlog) — BE4
- [ ] Comments module (CRUD, threading) — BE4
- [x] Notifications module (WebSocket gateway, Socket.io, event-driven) — BE5 ✅
- [ ] Initial Prisma migration (`prisma migrate dev --name init`)
- [ ] Seed data for development

---

## 9. Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Default | Used By |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | Prisma (in `prisma.config.ts`) |
| `PORT` | No | `3000` | App |
| `API_PREFIX` | No | `api` | App |
| `NODE_ENV` | No | `development` | App |
| `JWT_SECRET` | Yes (for auth) | — | BE1 |
| `JWT_EXPIRES_IN` | No | `15m` | BE1 |
| `JWT_REFRESH_SECRET` | Yes (for auth) | — | BE1 |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | BE1 |
| `UPLOAD_DIR` | No | `./uploads` | BE1/BE3 |
| `MAX_FILE_SIZE` | No | `5242880` | BE1/BE3 |

---

## 10. Session Reports

Completed work sessions are documented in `docs/reports/`. Read the latest report to understand what changed recently.

Current reports:
- `docs/reports/2026-03-14-foundation-setup.md` — BE6 foundation layer setup
- `docs/reports/2026-03-14-shared-agent-context.md` — Shared AI agent context system setup
- `docs/reports/2026-03-15-test-infrastructure-phase0.md` — Shared test infrastructure + BE6 common specs (26 tests)
- `docs/reports/2026-03-15-tdd-contracts-be1-be5.md` — TDD contract specs for all BE devs (~175 tests across 32 files)
- `docs/reports/2026-03-19-auth-module-implementation.md` — Auth module implementation (49 tests, 3 testing methodologies)
- `docs/reports/2026-03-19-users-module-implementation.md` — Users module implementation (8 tests passing)
- `docs/reports/2026-03-19-branch-summary-auth-users.md` — Vietnamese branch summary (Auth + Users + Upload)
- `docs/reports/2026-03-20-projects-module-implementation.md` — Projects module: CRUD, RBAC, members, labels (58 unit + 11 e2e tests)
- `docs/reports/2026-03-20-issues-module-implementation.md` — Issues module: CRUD, Kanban board, attachments, labels (35 tests)
- `docs/reports/2026-03-20-notifications-module-implementation.md` — Notifications module: WebSocket gateway, REST API, event-driven (28 tests)
