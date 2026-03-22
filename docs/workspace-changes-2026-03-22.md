# Ghi chú thay đổi workspace — 2026-03-22

Tài liệu này mô tả các thay đổi đáng chú ý **trong repo** `trackify-agile-backend` (NestJS + Prisma), đồng bộ tên file với frontend và infrastructure.

## Ngữ cảnh

- **Mục tiêu:** giảm 429 từ Throttler khi SPA gọi nhiều request song song / React Strict Mode; cập nhật health, auth, notifications và tài liệu.

## Git workflow — nhánh theo chức năng (repo này)

| Repo | Nhánh đề xuất | Ý nghĩa ngắn |
|------|----------------|---------------|
| **trackify-agile-backend** | `feature/api-throttler-health-auth` | Điều chỉnh rate limit (Throttler) cho SPA, bỏ throttle health, chỉnh auth/notifications/schema/docs liên quan. |

Tạo nhánh từ `develop`: `git checkout develop && git pull` (nếu cần), rồi `git checkout -b feature/api-throttler-health-auth`.

## Thay đổi chính

| File / thư mục | Mô tả |
|----------------|--------|
| `src/app.module.ts` | Nới giới hạn `@nestjs/throttler`: ví dụ `short` 3→40/s, `medium` 20→200/10s, `long` 100→1000/phút (chi tiết trong report session). |
| `src/health/health.controller.ts` | `@SkipThrottle()` để health check không bị rate limit. |
| `src/auth/auth.controller.ts`, `src/auth/auth.service.ts` | Chỉnh nhẹ logic / hợp đồng API. |
| `src/notifications/notifications.service.ts` | Cập nhật service; đi kèm chỉnh `*.spec.ts`. |
| `prisma/schema.prisma` | Thay đổi schema nhỏ. |
| `nest-cli.json`, `package.json`, `Dockerfile` | Cấu hình / dependency / image. |
| `.env.example`, `README.md`, `CONTEXT.md` | Biến môi trường mẫu và tài liệu dự án. |

## Báo cáo session chi tiết

- `docs/reports/2026-03-22-throttler-defaults-relaxed.md` — quyết định Throttler, test build, next steps.

## File untracked — cân nhắc trước khi commit

| Path | Gợi ý |
|------|--------|
| `tsconfig.build.tsbuildinfo` | Artifact build — nên thêm vào `.gitignore` nếu chưa. |
| `uploads/avatars/*.jpg` | Dữ liệu upload cục bộ — thường **không** commit. |

## Gợi ý commit

1. Commit code + `CONTEXT.md` + report trong `docs/reports/` theo convention nhóm.
2. Tránh commit thư mục `uploads/` và file `.tsbuildinfo` nếu policy repo không cho phép.

## Liên kết repo khác

- Frontend: `Trackify-Agile/docs/workspace-changes-2026-03-22.md`
- Infrastructure: `trackify-agile-infrastructure/docs/workspace-changes-2026-03-22.md`
