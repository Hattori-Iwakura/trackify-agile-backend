# Trackify Agile Backend

Backend API for **Trackify** — an Agile Issue Tracker built as a graduation project.

## Tech Stack

| Tool | Purpose |
|------|---------|
| **NestJS** | TypeScript backend framework |
| **Prisma v7** | ORM for PostgreSQL |
| **Zod** | Request validation |
| **Swagger** | Auto-generated API documentation |
| **Jest** | Unit & E2E testing |
| **Multer** | File upload handling |
| **Socket.io** | Real-time WebSocket communication |
| **SonarQube** | Code quality analysis |
| **Docker** | Multi-stage containerized builds |
| **GitHub Actions** | CI/CD pipeline |
| **n8n** | Workflow automation (GitHub → Trello sync) |

## Architecture

This is the **backend-only** repository in a polyrepo setup:

| Repo | Stack |
|------|-------|
| **Backend** (this repo) | NestJS + Prisma + PostgreSQL |
| **Frontend** | [NextJS](https://github.com/anitygravity/trackify-agile-frontend) |
| **Infrastructure** | [Docker Compose, Nginx, n8n, SonarQube](https://github.com/anitygravity/trackify-agile-infrastructure) |

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL (via the [infrastructure repo](https://github.com/anitygravity/trackify-agile-infrastructure))

## Getting Started

### 1. Start the infrastructure

```bash
cd <path-to-infrastructure-repo>
docker-compose up -d
```

This starts PostgreSQL (`postgres-app:5432`), Nginx, n8n, and SonarQube.

### 2. Run the backend

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials

# Push schema to database
npx prisma db push

# Run in development mode
npm run start:dev
```

The API will be available at `http://localhost:3000`.
Swagger docs at `http://localhost:3000/api/docs`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm run start:prod` | Run production build |
| `npm test` | Run unit tests |
| `npm run test:cov` | Run tests with coverage report |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Lint and auto-fix |

## Project Structure

```
src/
  ├── main.ts                    # App bootstrap, Swagger, global prefix /api
  ├── app.module.ts              # Root module
  ├── config/                    # Environment validation (Zod)
  ├── prisma/                    # PrismaModule (global)
  ├── common/                    # Shared pipes, filters, interceptors
  │   ├── pipes/                 # ZodValidationPipe
  │   ├── filters/               # HttpExceptionFilter
  │   └── interceptors/          # TransformInterceptor, LoggingInterceptor
  ├── health/                    # Health check endpoint
  ├── auth/                      # Authentication (JWT) — BE1
  ├── users/                     # User profiles — BE1
  ├── upload/                    # File uploads (Multer) — BE1
  ├── projects/                  # Projects, RBAC, labels — BE2
  ├── issues/                    # Issues, Kanban board, attachments — BE3
  ├── sprints/                   # Sprint lifecycle, backlog — BE4
  ├── comments/                  # Threaded comments — BE4
  └── notifications/             # WebSocket gateway (Socket.io) — BE5

prisma/
  └── schema.prisma              # Database schema (9 models, 7 enums)
```

## Module Ownership

| Dev | Module | Scope |
|-----|--------|-------|
| **BE1** | `auth`, `users`, `upload` | Authentication (JWT), user profiles, Multer shared module |
| **BE2** | `projects` | Project CRUD, RBAC guards, members, labels |
| **BE3** | `issues` | Issue CRUD, Kanban board, attachments (Multer), filtering |
| **BE4** | `sprints`, `comments` | Sprint lifecycle, backlog, threaded comments |
| **BE5** | `notifications` | WebSocket gateway (Socket.io), real-time events |
| **BE6** | `common`, `config`, `health`, `prisma`, DevOps | Shared infrastructure, CI/CD, Docker, SonarQube |

## API Response Format

All responses are wrapped automatically:

```json
{
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2026-03-14T..."
}
```

## Docker

```bash
# Build the image
docker build -t trackify-backend .

# Run the container (must be on agile_network to reach PostgreSQL)
docker run -p 3000:3000 --network agile_network --env-file .env trackify-backend
```

## CI/CD Pipeline

The GitHub Actions workflow runs on every push to `main`/`develop` and PRs to `develop`:

1. **Lint & Test** — lints code, runs unit tests with coverage
2. **SonarQube Analysis** — code quality scan on self-hosted runner
3. **Docker Build & Push** — builds and pushes to Docker Hub (only on `main`)

## Git Conventions

| Convention | Format | Example |
|---|---|---|
| **Branch** | `feature/<task-number>-<feature-name>` | `feature/42-issue-crud` |
| **PR title** | `[Task-ID] Short description` | `[TRK-42] Add issue CRUD endpoints` |
| **Commit** | `[Task-ID] prefix: description` | `[TRK-42] feat: add create issue endpoint` |

Prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | App port (default: 3000) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret |
| `UPLOAD_DIR` | No | File upload directory (default: `./uploads`) |
| `MAX_FILE_SIZE` | No | Max upload size in bytes (default: 5MB) |

## Documentation

- [`CONTEXT.md`](CONTEXT.md) — Shared AI agent context (project rules, conventions, current state)
- [`docs/reports/`](docs/reports/) — Session reports documenting all changes
- [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) — Comprehensive test plan
- [`docs/TASK_ALLOCATION_MATRIX.md`](docs/TASK_ALLOCATION_MATRIX.md) — Team task allocation
