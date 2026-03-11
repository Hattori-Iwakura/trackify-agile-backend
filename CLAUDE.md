# Agile Issue Tracker (Trackify) — Backend Repository

## Project Overview

- **Project**: Trackify — Agile Issue Tracker (Graduation Project)
- **GitHub Workspace**: anitygravity
- **Grading Focus**: SDLC Environment, CI/CD pipelines, Tooling, and DevOps practices (NOT complex product features)
- **Architecture**: Polyrepo — this repo is strictly Backend only
  - Frontend (Angular) → separate repo
  - Infrastructure (Docker Compose, Nginx, n8n) → separate repo

## Infrastructure Context (from infra repo)

- **Docker Network**: `agile_network` (custom bridge) — backend container must join this network
- **App Database**: `postgres-app` → host: `postgres-app`, port: `5432`, db: `trackify_db`
- **SonarQube**: running on port `9000` (with its own `postgres-sonar` db)
- **n8n**: workflow automation on port `5678`
- **Nginx**: reverse proxy routing traffic between frontend and backend containers

## Tech Stack & Tooling

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL (`trackify_db` on `postgres-app:5432`, hosted in infra repo)
- **ORM**: Prisma
- **Validation**: Zod
- **API Docs**: Swagger / OpenAPI (auto-generated)
- **Testing**: Jest (Unit + E2E)
- **Code Quality**: SonarQube (via SonarScanner, server at port 9000)
- **Containerization**: Docker (multi-stage Node.js Alpine, highly optimized)
- **CI/CD**: GitHub Actions
  - Run tests
  - SonarQube scanning
  - Build Docker image
  - Push to Docker Hub

## DevOps Goals

1. Fully automated CI/CD pipeline via GitHub Actions
2. SonarQube integration for code quality gates
3. Optimized multi-stage Dockerfile for production
4. Proper testing coverage (unit + e2e) with Jest
5. Swagger/OpenAPI documentation auto-generated from NestJS decorators

## Conventions

- Use Prisma for all database access (no raw SQL unless necessary)
- Use Zod schemas for request validation
- Follow NestJS module structure (controllers, services, modules)
- Keep Dockerfile lean — multi-stage build with Alpine base
- Backend container connects to `agile_network` to reach `postgres-app` and other services

## Directives

- Treat this `CLAUDE.md` as a living document — update it when significant changes occur
- Maintain docs-as-code: document Dockerfile, CI/CD, and setup instructions as they are created
