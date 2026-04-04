# Session Report — 2026-03-22 — Frontend Implementation (Phase 1-8)

## Tóm tắt
Triển khai hoàn chỉnh frontend Trackify Agile sử dụng Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui v4, TanStack Query, Zustand, @dnd-kit, socket.io-client. Bao phủ 52 REST endpoints + 5 WebSocket events từ backend NestJS.

## Thay đổi

### Phase 1: Shared Foundation
| File | Mô tả |
|------|--------|
| `src/shared/types/index.ts` | Tất cả TypeScript enums + interfaces (User, Project, Issue, Sprint, Comment, Notification...) |
| `src/shared/lib/api-client.ts` | Fetch wrapper với Bearer token, auto-refresh 401, FormData support |
| `src/shared/lib/query-client.ts` | TanStack QueryClient factory (30s staleTime) |
| `src/shared/lib/socket.ts` | Socket.io-client singleton với JWT auth |
| `src/shared/providers/query-provider.tsx` | QueryClientProvider + ReactQueryDevtools |
| `src/shared/providers/theme-provider.tsx` | next-themes ThemeProvider |
| `src/shared/utils/format-date.ts` | formatDate + formatRelativeTime |
| `src/shared/hooks/use-debounce.ts` | Generic useDebounce hook |
| `src/shared/components/auth-guard.tsx` | Redirect nếu chưa đăng nhập |
| `src/shared/components/sidebar.tsx` | Sidebar với responsive mobile drawer |
| `src/shared/components/topbar.tsx` | Topbar với notification bell + user menu |
| `src/shared/components/dashboard-layout.tsx` | AuthGuard + Sidebar + Topbar + WebSocket |
| `src/shared/components/project-nav.tsx` | Tab navigation (Board, Backlog, Settings) |
| `src/shared/components/profile-dialog.tsx` | Edit profile + avatar upload |

### Phase 2: Auth Module (4 endpoints)
| File | Mô tả |
|------|--------|
| `src/features/auth/stores/auth.store.ts` | Zustand: user, tokens, login/logout, localStorage |
| `src/features/auth/api/auth.api.ts` | login, register, logout, refresh |
| `src/features/auth/api/users.api.ts` | getMe, updateProfile, uploadAvatar |
| `src/features/auth/hooks/use-login.ts` | useMutation login |
| `src/features/auth/hooks/use-register.ts` | useMutation register |
| `src/features/auth/hooks/use-logout.ts` | Clear store + cache + redirect |
| `src/features/auth/hooks/use-user.ts` | useQuery /users/me |
| `src/features/auth/components/login-form.tsx` | React Hook Form + Zod |
| `src/features/auth/components/register-form.tsx` | Strong password validation |

### Phase 3: Projects Module (14 endpoints)
| File | Mô tả |
|------|--------|
| `src/features/projects/api/projects.api.ts` | CRUD projects |
| `src/features/projects/api/members.api.ts` | Member management (5 endpoints) |
| `src/features/projects/api/labels.api.ts` | Label CRUD (4 endpoints) |
| `src/features/projects/hooks/` | useProjects, useProject, useMembers, useLabels + mutations |
| `src/features/projects/components/` | ProjectCard, ProjectList, CreateProjectDialog, MembersTable, InviteMemberDialog, LabelsManager |

### Phase 4: Issues + Kanban Board (13 endpoints)
| File | Mô tả |
|------|--------|
| `src/features/issues/api/issues.api.ts` | Full CRUD + board/status/reorder/labels |
| `src/features/issues/api/attachments.api.ts` | Upload (FormData), findAll, delete |
| `src/features/issues/stores/board.store.ts` | Zustand: searchText, filters, dragActiveId |
| `src/features/issues/hooks/` | useBoard, useIssues, useIssue, useIssueMutations (optimistic updates), useAttachments |
| `src/features/issues/components/` | KanbanBoard (DnD 6 columns), KanbanColumn, IssueCard, BoardFilters, CreateIssueDialog, IssueDetail, IssueFields, AttachmentList, LabelPicker |

### Phase 5: Sprints + Backlog (10 endpoints)
| File | Mô tả |
|------|--------|
| `src/features/sprints/api/sprints.api.ts` | CRUD + start/complete + backlog + issue management |
| `src/features/sprints/hooks/` | useSprints, useSprint, useBacklog, useSprintMutations |
| `src/features/sprints/components/` | SprintHeader (editable name), SprintPanel (collapsible + DnD), BacklogPanel, CreateSprintDialog (date validation), BacklogPageContent (DnD giữa sprints) |

### Phase 6: Comments (4 endpoints)
| File | Mô tả |
|------|--------|
| `src/features/comments/api/comments.api.ts` | CRUD comments |
| `src/features/comments/hooks/` | useComments, useCommentMutations |
| `src/features/comments/components/` | CommentThread, CommentItem (edit/delete/reply), CommentForm |

### Phase 7: Notifications + WebSocket (4 endpoints + 5 WS events)
| File | Mô tả |
|------|--------|
| `src/features/notifications/stores/socket.store.ts` | Zustand: connection + room state |
| `src/features/notifications/hooks/use-socket.ts` | WebSocket connection + query invalidation |
| `src/features/notifications/api/notifications.api.ts` | findAll, unreadCount, markRead, markAllRead |
| `src/features/notifications/hooks/` | useNotifications, useUnreadCount, useNotificationMutations |
| `src/features/notifications/components/` | NotificationBell (badge), NotificationList (paginated), NotificationItem |

### Phase 8: Polish + Integration
| File | Mô tả |
|------|--------|
| `src/app/(dashboard)/*/loading.tsx` | Skeleton loading states (4 files) |
| `src/app/(dashboard)/*/error.tsx` | Error boundaries với retry (3 files) |
| Responsive sidebar | Sheet drawer cho mobile |
| Responsive issue detail | Stack layout trên mobile |

## Packages đã cài đặt
| Package | Mục đích |
|---------|----------|
| next@14, react@18, react-dom@18 | Framework |
| typescript, @types/react, @types/node | TypeScript |
| tailwindcss, postcss, autoprefixer | Styling |
| @tanstack/react-query, @tanstack/react-query-devtools | Server state |
| zustand | Client state |
| react-hook-form, @hookform/resolvers, zod | Forms |
| @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities | Drag & Drop |
| socket.io-client | WebSocket |
| sonner | Toast notifications |
| lucide-react | Icons |
| next-themes | Theme support |
| clsx, tailwind-merge | Utility |
| class-variance-authority | shadcn/ui |

## Build Status
Build thành công — 12 routes, tất cả biên dịch không lỗi.

```
Route (app)                                   Size     First Load JS
├ ○ /login                                    3.7 kB     161 kB
├ ○ /register                                 3.85 kB    161 kB
├ ○ /notifications                            6.08 kB    115 kB
├ ○ /projects                                 4.62 kB    193 kB
├ ƒ /projects/[projectId]/board               2.37 kB    241 kB
├ ƒ /projects/[projectId]/backlog             4.39 kB    253 kB
├ ƒ /projects/[projectId]/issues/[issueKey]   7.5 kB     196 kB
├ ƒ /projects/[projectId]/settings            4.23 kB    215 kB
├ ƒ /projects/[projectId]/sprints/[sprintId]  9 kB       148 kB
```

## Ghi chú / Quyết định kiến trúc
- **Feature-Based Module Architecture**: Mỗi feature tự chứa (api, hooks, components, stores)
- **app/ là thin routing layer**: Route files chỉ import từ features/
- **shadcn/ui v4**: Sử dụng `render` prop pattern thay vì `asChild`
- **Optimistic Updates**: Kanban board drag-and-drop cập nhật UI ngay lập tức, rollback nếu lỗi
- **WebSocket → Query Invalidation**: Socket events trigger invalidateQueries, không maintain separate state
- **OneDrive EINVAL fix**: Cần `rm -rf .next` trước rebuild do OneDrive sync conflict

## Bước tiếp theo
1. Kết nối frontend với backend API thực tế
2. Test end-to-end flow: register → project → issue → kanban → sprint → comment → notification
3. Thêm Framer Motion animations (nếu cần)
4. Tối ưu performance (lazy loading, code splitting)
