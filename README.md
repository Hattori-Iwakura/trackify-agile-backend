# Trackify Agile Backend

Backend API for **Trackify** — an Agile Issue Tracker built as a graduation project.

## Tech Stack

| Tool | Purpose |
|------|---------|
| **NestJS** | TypeScript backend framework |
| **Prisma** | ORM for PostgreSQL |
| **Zod** | Request validation |
| **Swagger** | Auto-generated API documentation |
| **Jest** | Unit & E2E testing |
| **SonarQube** | Code quality analysis |
| **Docker** | Multi-stage containerized builds |
| **GitHub Actions** | CI/CD pipeline |

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL (via the [infrastructure repo](https://github.com/anitygravity/trackify-agile-infrastructure))

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Copy environment variables
cp .env.example .env

# Run in development mode
npm run start:dev
```

The API will be available at `http://localhost:3000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm run start:prod` | Run production build |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:cov` | Run tests with coverage report |
| `npm run lint` | Lint and auto-fix |

## Docker

```bash
# Build the image
docker build -t trackify-backend .

# Run the container
docker run -p 3000:3000 --env-file .env trackify-backend
```

The Dockerfile uses a multi-stage build (Node.js Alpine) for an optimized production image.

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main`/`develop`:

1. **Lint & Test** — installs deps, lints, runs unit + e2e tests with coverage
2. **SonarQube Analysis** — scans code quality on a self-hosted Windows runner
3. **Docker Build & Push** — builds and pushes to Docker Hub (only on `main`)

## Project Architecture

This is the **backend-only** repository in a polyrepo setup:

- **Frontend** (Angular) → separate repo
- **Infrastructure** (Docker Compose, Nginx, n8n, SonarQube) → [trackify-agile-infrastructure](https://github.com/anitygravity/trackify-agile-infrastructure)

Test PR 4