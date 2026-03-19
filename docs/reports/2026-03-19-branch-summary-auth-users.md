# Báo Cáo Tổng Hợp Branch — `feature/CARD-6-Auth&User-Module`

> **Ngày**: 2026-03-19
> **Người thực hiện**: BE1 (Auth, Users, Upload)
> **Branch**: `feature/CARD-6-Auth&User-Module`

---

## 1. Tổng Quan

Branch này triển khai **2 module chính** và **1 module hỗ trợ** cho hệ thống Trackify Agile:

| Module | Thư mục | Mô tả |
|--------|---------|-------|
| **Auth** | `src/auth/` | Xác thực JWT (đăng ký, đăng nhập, refresh token, đăng xuất) |
| **Users** | `src/users/` | Quản lý hồ sơ người dùng (xem, cập nhật, upload avatar) |
| **Upload** | `src/upload/` | Module Multer dùng chung — BE3 sẽ tái sử dụng cho đính kèm issue |

---

## 2. Auth Module — Xác Thực JWT

### 2.1 Các Endpoint

| Method | Endpoint | Mô tả | Bảo vệ |
|--------|----------|-------|--------|
| `POST` | `/api/auth/register` | Đăng ký tài khoản mới | Public + Rate limit |
| `POST` | `/api/auth/login` | Đăng nhập, trả về access + refresh token | Public + Rate limit |
| `POST` | `/api/auth/refresh` | Làm mới access token bằng refresh token | Public |
| `POST` | `/api/auth/logout` | Đăng xuất, vô hiệu hóa refresh token | JWT Guard |

### 2.2 Kiến Trúc

- **Passport.js** + `passport-jwt`: Strategy pattern cho JWT, mở rộng dễ dàng cho OAuth sau này
- **bcrypt** (cost 10): Hash mật khẩu + hash refresh token trước khi lưu DB
- **@nestjs/throttler**: Rate limiting 3 tầng
  - Global: 3 req/s, 20 req/10s, 100 req/phút
  - Auth endpoints: 1 req/s, 5 req/phút (chống brute-force)
- **Chính sách mật khẩu** (Zod validation): Tối thiểu 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt

### 2.3 Bảo Mật

- Lỗi đăng nhập trả về thông báo giống nhau cho email sai và mật khẩu sai (chống user enumeration)
- Refresh token được hash bằng bcrypt trước khi lưu vào DB (`hashedRefreshToken`)
- Đăng xuất set `hashedRefreshToken = null` → vô hiệu hóa mọi request refresh sau đó
- Mật khẩu **KHÔNG BAO GIỜ** trả về trong response (dùng Prisma `select`)

---

## 3. Users Module — Quản Lý Hồ Sơ

### 3.1 Các Endpoint

| Method | Endpoint | Mô tả | Bảo vệ |
|--------|----------|-------|--------|
| `GET` | `/api/users/me` | Lấy hồ sơ người dùng hiện tại | JWT Guard |
| `PATCH` | `/api/users/me` | Cập nhật hồ sơ (fullName, email) | JWT Guard |
| `POST` | `/api/users/me/avatar` | Upload ảnh đại diện (Multer) | JWT Guard |

### 3.2 Kiến Trúc

- **`USER_SAFE_SELECT`**: Hằng số Prisma `select` đảm bảo `password` và `hashedRefreshToken` không bao giờ được trả về
- **Zod validation**: `UpdateProfileSchema` — fullName (1-100 ký tự), email (định dạng hợp lệ), ít nhất 1 trường phải có
- **Kiểm tra email trùng**: Trước khi cập nhật email, kiểm tra `findUnique` để tránh xung đột
- **Avatar URL**: Lưu dạng URL tương đối (`/uploads/avatars/{uuid}.jpg`) — frontend sử dụng trực tiếp

### 3.3 Swagger API Documentation

- Tất cả endpoint có `@ApiBody()` mô tả chi tiết request body/parameters
- `@ApiConsumes('multipart/form-data')` cho endpoint upload avatar
- `@ApiBearerAuth()` cho các endpoint yêu cầu JWT
- Xem tại `http://localhost:3000/api/docs`

---

## 4. Upload Module — Xử Lý File (Yêu Cầu Học Thuật: Multer)

### 4.1 Cấu Trúc

| File | Mục đích |
|------|----------|
| `multer.config.ts` | Factory `createMulterOptions(subDir)` — cấu hình diskStorage, fileFilter, limits |
| `upload.service.ts` | `deleteFile(filePath)` — xóa file cũ (fire-and-forget) |
| `upload.module.ts` | Module NestJS — export `UploadService` cho các module khác |

### 4.2 Bảo Mật Upload

| Mối đe dọa | Biện pháp |
|-------------|-----------|
| MIME spoofing | Kiểm tra `file.mimetype`, KHÔNG tin extension — chỉ chấp nhận `image/jpeg`, `image/png`, `image/webp` |
| Directory traversal | Đổi tên file bằng `crypto.randomUUID()` — không dùng tên gốc từ client |
| File quá lớn | `limits.fileSize` = 5MB (từ env `MAX_FILE_SIZE`) |
| Tràn dung lượng đĩa | Xóa avatar cũ trước khi lưu avatar mới |
| Truy cập không xác thực | Tất cả endpoint upload sau `JwtAuthGuard` |

### 4.3 Static File Serving

- Dùng `app.useStaticAssets()` native Express trong `main.ts`
- Map `GET /uploads/*` tới thư mục `UPLOAD_DIR` (mặc định `./uploads`)
- **KHÔNG** cài `@nestjs/serve-static` — không cần thiết

### 4.4 Tái Sử Dụng

Module này được thiết kế cho BE3 import lại sau:
```typescript
// Trong issues module
import { UploadModule } from '../upload/upload.module';
import { createMulterOptions } from '../upload/multer.config';

// Dùng với subDir khác
@UseInterceptors(FileInterceptor('file', createMulterOptions('attachments')))
```

---

## 5. Cây Thư Mục Đã Thay Đổi

```
src/
  ├── main.ts                              # [SỬA] Thêm useStaticAssets, NestExpressApplication
  ├── app.module.ts                        # [SỬA] Import AuthModule, UsersModule, ThrottlerModule
  ├── config/
  │   └── env.validation.ts                # [SỬA] JWT_SECRET, JWT_REFRESH_SECRET bắt buộc
  ├── auth/                                # [MỚI] Module xác thực
  │   ├── auth.module.ts
  │   ├── auth.controller.ts               # 4 endpoints + Swagger @ApiBody
  │   ├── auth.service.ts
  │   ├── auth.controller.spec.ts          # 4 unit tests
  │   ├── auth.service.spec.ts             # 12 unit tests
  │   ├── auth.module.spec.ts              # 3 unit tests
  │   ├── dto/
  │   │   ├── register.dto.ts
  │   │   ├── login.dto.ts
  │   │   └── refresh-token.dto.ts
  │   ├── strategies/
  │   │   ├── jwt.strategy.ts
  │   │   └── jwt.strategy.spec.ts         # 2 unit tests
  │   └── guards/
  │       ├── jwt-auth.guard.ts
  │       └── jwt-auth.guard.spec.ts       # 2 unit tests
  ├── users/                               # [MỚI] Module quản lý người dùng
  │   ├── users.module.ts
  │   ├── users.controller.ts              # 3 endpoints + Swagger @ApiBody
  │   ├── users.service.ts                 # USER_SAFE_SELECT, fire-and-forget delete
  │   ├── users.controller.spec.ts         # 4 unit tests
  │   ├── users.service.spec.ts            # 5 unit tests
  │   └── dto/
  │       └── update-profile.dto.ts
  ├── upload/                              # [MỚI] Module upload dùng chung
  │   ├── upload.module.ts
  │   ├── upload.service.ts
  │   ├── upload.service.spec.ts           # 6 unit tests
  │   ├── upload.module.spec.ts            # 1 unit test
  │   └── multer.config.ts
  │   └── multer.config.spec.ts            # 11 unit tests
  └── common/
      ├── constants/
      │   └── error-codes.ts               # [SỬA] Thêm error codes cho Auth, Users, Upload
      └── decorators/
          └── current-user.decorator.ts    # [MỚI] @CurrentUser() decorator

test/
  ├── auth.e2e-spec.ts                     # [SỬA] 14 integration tests
  ├── users.e2e-spec.ts                    # [SỬA] 7 integration tests
  └── load/
      ├── k6-auth-load-test.js             # [MỚI] k6 load test cho auth
      └── k6-users-load-test.js            # [MỚI] k6 load test cho users
```

---

## 6. Kiểm Thử (Testing)

### 6.1 White-box — Unit Tests

| Module | File | Số lượng | Kết quả |
|--------|------|----------|---------|
| Auth | `auth.service.spec.ts` | 12 | PASS |
| Auth | `auth.controller.spec.ts` | 4 | PASS |
| Auth | `auth.module.spec.ts` | 3 | PASS |
| Auth | `jwt.strategy.spec.ts` | 2 | PASS |
| Auth | `jwt-auth.guard.spec.ts` | 2 | PASS |
| Users | `users.service.spec.ts` | 5 | PASS |
| Users | `users.controller.spec.ts` | 4 | PASS |
| Upload | `upload.service.spec.ts` | 6 | PASS |
| Upload | `upload.module.spec.ts` | 1 | PASS |
| Upload | `multer.config.spec.ts` | 11 | PASS |
| **Tổng** | **10 file** | **50** | **50/50 PASS** |

### 6.2 Grey-box — Integration Tests (E2E)

#### Auth E2E (`test/auth.e2e-spec.ts`)

| # | Test Case | Endpoint | Input | Expected |
|---|-----------|----------|-------|----------|
| 1 | Đăng ký user mới | `POST /auth/register` | email, password, fullName hợp lệ | 201, user object (không có password) |
| 2 | Từ chối email không hợp lệ | `POST /auth/register` | email sai định dạng | 400 |
| 3 | Từ chối mật khẩu yếu (không viết hoa) | `POST /auth/register` | `password1!` | 400 |
| 4 | Từ chối mật khẩu yếu (không ký tự đặc biệt) | `POST /auth/register` | `Password1` | 400 |
| 5 | Từ chối mật khẩu ngắn | `POST /auth/register` | `Pa1!` | 400 |
| 6 | Từ chối email trùng | `POST /auth/register` | Email đã tồn tại | 409 |
| 7 | Đăng nhập thành công | `POST /auth/login` | Credentials hợp lệ | 200, `{ accessToken, refreshToken }` |
| 8 | Từ chối sai mật khẩu | `POST /auth/login` | Mật khẩu sai | 401 |
| 9 | Từ chối email không tồn tại | `POST /auth/login` | Email không có trong DB | 401 |
| 10 | Refresh access token | `POST /auth/refresh` | Refresh token hợp lệ | 200, `{ accessToken }` |
| 11 | Từ chối refresh token không hợp lệ | `POST /auth/refresh` | Token sai | 401 |
| 12 | Đăng xuất thành công | `POST /auth/logout` | Bearer token hợp lệ | 200 |
| 13 | Từ chối đăng xuất không có token | `POST /auth/logout` | Không có header | 401 |
| 14 | Luồng đầy đủ: đăng ký → đăng nhập → refresh → đăng xuất → refresh bị từ chối | Tất cả | Full lifecycle | Hoàn chỉnh |

#### Users E2E (`test/users.e2e-spec.ts`)

| # | Test Case | Endpoint | Input | Expected |
|---|-----------|----------|-------|----------|
| 1 | Từ chối không có token | `GET /users/me` | Không có auth header | 401 |
| 2 | Trả hồ sơ với token hợp lệ | `GET /users/me` | JWT Bearer token | 200, user profile (không có password) |
| 3 | Cập nhật fullName | `PATCH /users/me` | `{ fullName: "Updated" }` + JWT | 200, fullName đã cập nhật |
| 4 | Từ chối dữ liệu không hợp lệ | `PATCH /users/me` | `{ fullName: "" }` + JWT | 400 |
| 5 | Từ chối email trùng | `PATCH /users/me` | `{ email: "taken@..." }` + JWT | 409 |
| 6 | Upload avatar thành công | `POST /users/me/avatar` | File JPEG + JWT | 201, có `avatarUrl` |
| 7 | Từ chối file không phải ảnh | `POST /users/me/avatar` | File TXT + JWT | 400 |

### 6.3 Black-box — k6 Load Tests

| # | File | Endpoint | Cấu hình | Mục đích |
|---|------|----------|----------|----------|
| 1 | `k6-auth-load-test.js` | `POST /auth/login` | 10 VUs, 30 iterations | Xác minh throttler trả 429 khi quá giới hạn |
| 2 | `k6-users-load-test.js` | `GET /users/me` | 10 VUs, 50 iterations | Xác minh hiệu năng và rate limiting |

### 6.4 Tổng Kết Testing

| Phương pháp | Số lượng | Kết quả | Phục vụ môn học |
|-------------|----------|---------|-----------------|
| White-box (Unit) | 50 tests | 50/50 PASS | Kiểm thử & QA |
| Grey-box (E2E) | 21 tests | 21/21 PASS | Kiểm thử & QA |
| Black-box (k6) | 2 scripts | READY | Kiểm thử & QA |
| **Tổng cộng** | **73** | **71/71 PASS + 2 READY** | |

### 6.5 Code Coverage (SonarQube)

| Module | Statements | Lines | Mục tiêu | Đạt? |
|--------|-----------|-------|----------|------|
| `src/auth/` | ~95% | ~95% | 80% | Đạt |
| `src/users/` | 85% | 87.5% | 80% | Đạt |
| `src/upload/` | 100% | 100% | 80% | Đạt |

---

## 7. Packages Đã Cài Đặt

| Package | Loại | Mục đích |
|---------|------|----------|
| `@nestjs/jwt` | prod | Ký và xác minh JWT |
| `@nestjs/passport` | prod | Tích hợp Passport cho NestJS |
| `passport` | prod | Framework xác thực |
| `passport-jwt` | prod | Strategy JWT cho Passport |
| `bcrypt` | prod | Hash mật khẩu và refresh token |
| `@nestjs/throttler` | prod | Rate limiting / chống DDoS |
| `@types/bcrypt` | dev | TypeScript types cho bcrypt |
| `@types/passport-jwt` | dev | TypeScript types cho passport-jwt |
| `@types/multer` | dev | TypeScript types cho Multer (Express.Multer.File) |

---

## 8. Cấu Hình Đã Cập Nhật

| File | Thay đổi |
|------|----------|
| `sonar-project.properties` | Bỏ `src/auth/`, `src/users/`, `src/upload/` khỏi exclusions |
| `eslint.config.mjs` | Bỏ `src/auth/`, `src/users/`, `src/upload/` khỏi ignores |
| `package.json` | Bỏ `src/users/`, `src/upload/` khỏi `testPathIgnorePatterns` |
| `.env.example` | Đã có JWT_SECRET, JWT_REFRESH_SECRET, UPLOAD_DIR, MAX_FILE_SIZE |

---

## 9. Các Quyết Định Kiến Trúc

| Quyết định | Lý do |
|------------|-------|
| Passport.js cho auth | Industry-standard, mở rộng cho OAuth/Google sau này |
| Refresh token hash trong DB | Bảo mật hơn so với lưu token thô; đăng xuất vô hiệu hóa ngay |
| `USER_SAFE_SELECT` constant | Đảm bảo password không bao giờ rò rỉ qua bất kỳ API nào |
| UploadModule tách riêng | BE3 tái sử dụng cho attachments; Single Responsibility |
| `useStaticAssets` thay vì `ServeStaticModule` | Không cần cài thêm package; đủ cho serve file tĩnh |
| UUID filename | Chống directory traversal + collision-free |
| Fire-and-forget delete | File cũ bị xóa không nên block response cho user |
| `@ApiBody()` cho Swagger | Zod schemas không tự động sinh Swagger params, cần khai báo thủ công |

---

## 10. Các Bước Tiếp Theo

- [ ] Chạy Prisma migration đầu tiên (`prisma migrate dev --name init`)
- [ ] Seed data cho development
- [ ] Triển khai module Projects (BE2)
- [ ] Triển khai module Issues (BE3) — import `UploadModule`
- [ ] Triển khai module Sprints + Comments (BE4)
- [ ] Triển khai module Notifications + WebSocket (BE5)
- [ ] Tích hợp OAuth (Google) — iteration sau

---

## 11. Yêu Cầu Học Thuật Đã Đáp Ứng

| Môn học | Yêu cầu | Cách đáp ứng |
|---------|---------|--------------|
| DevOps/Tooling | Docker-ready, CI/CD, SonarQube | Code đạt coverage gate, ESLint clean, Dockerfile multi-stage |
| Modern Frameworks | NestJS nâng cao | Passport strategies, Guards, Decorators, Interceptors, Zod pipes |
| Kiểm thử & QA | 3 phương pháp test | White-box (unit), Grey-box (E2E), Black-box (k6 load) |
| Kiểm thử & QA | File handling | Multer upload với MIME validation, diskStorage, size limits |
