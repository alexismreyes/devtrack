# DevTrack — implemented features and approach

Human-readable catalog of **Verified** work: what shipped, and how (tech + concepts). Detailed contracts stay in `specs/<id>-<name>/`. Agent session notes stay in `memory.md`. Later ideas stay in `proposed-features.md`.

**How this file is updated:** after a spec is Verified, the agent proposes a catalog patch and **does not edit this file until you confirm**. Do not treat a completion report as an automatic update.

Last confirmed: 2026-11-10 (features `001`–`033`).

---

## Platform approach (all features)

| Concern | Approach |
| --- | --- |
| Process | Spec-Driven Development: Draft spec → plan → tasks → explicit approval → implement → independent review → Verified |
| Architecture | Modular monolith (DDD). One domain owns its rules, HTTP, DTOs, and Prisma repository. Cross-domain calls use narrow ports. No microservices. |
| Persistence | PostgreSQL 16 + Prisma 6 behind owning repositories. Versioned migrations under `backend/prisma/`. No generic repository. Prisma types are not public DTOs. |
| Containers | Docker Compose: `frontend` (React), `backend` (Express + Prisma), `db` (Postgres named volume). Frontend talks HTTP only. Backend uses hostname `db`. |
| Language / quality | TypeScript on both sides. Zod at HTTP boundaries. Errors: `{ error: { code, message } }`. Tests: Vitest, Testing Library, SuperTest. Node.js 22 LTS. |
| Auth vs authz | Authentication: HTTP-only cookie `devtrack_session`, Argon2id. Authorization: backend resource checks (ownership, then membership roles). UI is not the security boundary. |
| Frontend | React 19, Vite, React Router 7 destinations, `fetch` with `credentials: 'include'`, Tailwind v4, copied shadcn (`button`, `input`, `label`, `card`, `textarea`, `dialog`). No Trello branding. |
| Concepts taught | SDD, DDD bounded contexts, ports/adapters, cookie sessions, REST, derived reads vs stored aggregates, role-based authorization |

---

## Verified features

### 001 — Foundation

- **Spec:** `specs/001-foundation/`
- **What:** Repo layout, Compose stack, health/ready, first vertical slice through Prisma.
- **Approach:** Three-service Compose; `system` domain owns probes and readiness; `GET /health` (liveness) and `GET /ready` (DB via repository). Educational probe HTTP exists; it is not product chrome.

### 002 — Authentication and users

- **Spec:** `specs/002-authentication/`
- **What:** Register, login, logout, session cookie, profile (`GET`/`PATCH /api/users/me`).
- **Approach:** Domains `auth` (credentials, sessions) and `users` (identity/profile). Argon2id hashes. HttpOnly `devtrack_session`, 7-day absolute expiry, logout revokes that session. No bearer token in JS.

### 003 — Projects

- **Spec:** `specs/003-projects/`
- **What:** Create, list, get, update, archive/unarchive. Creating actor is `ownerUserId` (client cannot set it).
- **Approach:** Domain `projects`. Default list is active (non-archived) authorized projects. Owner GET of an archived project still works. No `includeArchived` list filter.

### 004 — Tasks

- **Spec:** `specs/004-tasks/`
- **What:** Project-scoped CRUD; status `TODO` / `IN_PROGRESS` / `DONE`; priority `LOW` / `MEDIUM` / `HIGH`; optional calendar `dueDate`; filters; soft-delete (`deletedAt`).
- **Approach:** Domain `tasks`. Parent project access through a `projects` port (not Prisma cross-import). Archived parent: reads allowed for authorized actors, writes `409`. Soft-delete is HTTP DELETE without removing the row. No restore API.

### 005 — Frontend shell

- **Spec:** `specs/005-frontend-shell/`
- **What:** Real routes, authenticated chrome, guest vs signed-in destinations. Probe UI removed from the React app.
- **Approach:** React Router destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`. Guest `/` originally → register (**superseded by `029`** → `/login`); authenticated `/` → `/projects`. Top app bar + left project sidebar. Backend probe HTTP kept.

### 006 — Kanban

- **Spec:** `specs/006-kanban/`
- **What:** Status columns on project detail; persisted status changes; drag-and-drop.
- **Approach:** Presentation of existing tasks. Originally `@dnd-kit/core` only; cross-column `PATCH` `{ status }`; same-column no-op; no sortable/position. **Later:** column sortable (`028`/`032`); within-column `Task.position` + card sortable (`031`); still no Trello branding.

### 007 — Workspace UI

- **Spec:** `specs/007-workspace-ui/` (includes polish in the same folder)
- **What:** Trello-like workspace without cloning Trello: project card grid, Dialogs, compact board, whole-UI palettes.
- **Approach:** Originally name-derived color+initials covers only (no uploads). Create/edit/task forms as Dialogs. Palettes on the document root; id in localStorage `devtrack.uiPalette` only. Remaining-height Kanban (`h-svh`). Back to projects on the board header. **Later:** image project covers (`020`/`024`); more dark palettes (`023`/`033`).

### 008 — Dashboard

- **Spec:** `specs/008-dashboard/`
- **What:** Owner summaries and pending / completed / overdue counts from persisted data.
- **Approach:** No `dashboard` domain and no dashboard table. Additive `GET /api/dashboard`. Route `/dashboard` + top-bar link. Original owner-only pending/completed/overdue formulas. **SUPERSEDED by `026`:** membership-scoped overview DTO (KPIs, pie, checklist bars, progress); charts path via `022` then overview rewrite.

### 009 — Collaboration

- **Spec:** `specs/009-collaboration/`
- **What:** Project membership, explicit roles, backend resource-level authorization, Members Dialog.
- **Approach:** Domain `project-members`. Roles `OWNER` / `EDITOR` / `VIEWER`. Prisma `ProjectMember`. Add existing users by email (no SMTP). `ownerUserId` still grants OWNER. `GET /api/projects` lists projects the actor may see. EDITOR: edit + task writes, no archive/members admin. VIEWER: read/list. Archived GET remains creating-owner only. Members UI is a board-header Dialog, not a new page.

### 010 — Task Comments

- **Spec:** `specs/010-task-comments/`
- **What:** Persisted plain-text discussion on a task; author edit; author or OWNER soft-delete.
- **Approach:** Owned by `tasks` (no peer comments domain). Prisma `TaskComment` with `deletedAt`. Create/list via `TaskAuthorizationPort` task write/read; author-only PATCH; soft-delete author or effective OWNER; no restore; no mentions/rich text. UI in existing `TaskDetail` Dialog. Later: **L** activity (`011`); list GET paginated (`021`); windowed UI (`025`).

### 011 — Task Activity

- **Spec:** `specs/011-task-activity/`
- **What:** Task-scoped activity feed for created, field changes, soft-delete, and comments added.
- **Approach:** Owned by `tasks`. Prisma `task_activity_events`. Emit in the same transaction as the write. Originally full-list `GET .../activity`. Comment-added stores `commentId` + body preview. Shown in TaskDetail “Comments & activity” (omit `COMMENT_ADDED`). Not app-wide audit **C**. Later: cursor pagination (`021`); ≤5 Prev/Next window (`025`).

### 012 — Task Labels

- **Spec:** `specs/012-task-labels/`
- **What:** Per-project label catalog; many labels per task; card face; filter by label.
- **Approach:** Owned by `tasks`. Fixed color tokens; case-insensitive unique names; hard-delete clears assignments. Catalog CRUD + `PUT /api/tasks/:taskId/labels`; labels embedded on task DTO. Board Labels Dialog, TaskDetail Labels Popover, card chips, filter. No label activity events. Later shipped: **F** checklists (`015`).

### 013 — Task Detail Layout

- **Spec:** `specs/013-task-detail-layout/`
- **What:** Trello-like TaskDetail: two-column layout; Labels popover; Comments & activity aside.
- **Approach:** Frontend-only. Labels Popover (apply-on-close / Escape discard); interleaved feed omits `COMMENT_ADDED`; board Labels Dialog kept; added `@radix-ui/react-popover`. Later shipped: **F** checklists (`015`); UI refinements (`016`).

### 014 — Task Detail Polish

- **Spec:** `specs/014-task-detail-polish/`
- **What:** Opaque Labels popover; live activity reload; timeline/link polish; color swatch picker.
- **Approach:** Frontend-only. `--popover` tokens on all palettes; reload activity after Save and comment mutations; Edit/Delete as links; nine-token `LabelColorSwatchPicker` in Popover + board Dialog. Later shipped: **F** checklists (`015`); UI refinements (`016`).

### 015 — Task Checklists

- **Spec:** `specs/015-task-checklists/`
- **What:** Named checklists + items on TaskDetail; progress bar; checklist activity kinds.
- **Approach:** Owned by `tasks`. Nested REST; hard-delete cascade; `createdAt` order; no Kanban embed. Emit `CHECKLIST_ADDED` / `CHECKLIST_REMOVED` / `CHECKLIST_ITEM_COMPLETED` / `CHECKLIST_ITEM_UNCOMPLETED` same-tx. UI: action-row Checklist + main-column lists (strikethrough, no hide). Later shipped: **G** attachments (`017`).

### 016 — UI Refinements

- **Spec:** `specs/016-ui-refinements/`
- **What:** Checklist create Dialog; checklist contrast; thinner field labels; palette preview picker; friendly fixed statuses.
- **Approach:** Frontend-only. Create Dialog from Checklist button; checklist blocks `bg-card`+border; thinner TaskDetail labels; Color palette circle + scheme preview (`devtrack.uiPalette` only); `To do` / `In progress` / `Done` on TaskDetail status + Kanban headers (API values unchanged). Later shipped: **G** attachments (`017`); custom statuses (`018`).

### 017 — Task Attachments

- **Spec:** `specs/017-task-attachments/`
- **What:** Task file attachments + image cover; Kanban cover face.
- **Approach:** Owned by `tasks`. Compose volume (`attachments_data` / `ATTACHMENTS_ROOT`); nested multipart + authenticated `/content`; cover summary on `PublicTaskDto` only; activity `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED`. UI: action-row Attachment Popover for upload; attachment list stacked in main column. Max 20 MiB/file. Later shipped: custom statuses (`018`). Deferred: **C** audit.

### 018 — Custom Task Statuses

- **Spec:** `specs/018-custom-task-statuses/`
- **What:** Per-project status catalog; dynamic Kanban columns; catalog reorder; dashboard via `isCompleted`.
- **Approach:** Owned by `tasks`. `Task.status` = stable string key; `ProjectStatus` for name/color/`isCompleted`/position; seed TODO/IN_PROGRESS/DONE (editable, keys immutable); Statuses Dialog + label color tokens. Later: column drag (`028`/`032`); within-column rank **H** (`031`). Deferred: **C** audit.

### 019 — UI Polish

- **Spec:** `specs/019-ui-polish/`
- **What:** Pointer cursor baseline; whole Kanban card opens TaskDetail; Projects top-bar nav.
- **Approach:** Frontend-only. `cursor-pointer` on shadcn Button + product links; card-level open with `@dnd-kit` activation-distance so completed drag does not open detail; AuthenticatedLayout **Projects** → `/projects` beside Dashboard. No API/schema.

### 020 — Project Covers

- **Spec:** `specs/020-project-covers/`
- **What:** Per-project image cover on `/projects` cards; upload/replace/clear; authenticated content.
- **Approach:** Owned by `projects`. Prisma `ProjectCover` 1:1; Compose `project_covers_data` / `PROJECT_COVERS_ROOT`; PUT/DELETE cover + GET `/content` (`Cache-Control: private`). OWNER+EDITOR mutate; name-derived fallback when null. jpeg/png/webp/gif, 5 MiB. Reopens 007 name-derived-only.

### 021 — Feed Pagination

- **Spec:** `specs/021-feed-pagination/`
- **What:** Cursor/limit pagination for task comments and activity; Load more in Comments & activity.
- **Approach:** Owned by `tasks`. Default limit 5, max 50, `nextCursor`; newest-first pages + older on Load more; supersedes 011 full-list GET. No migration. Later: windowed Prev/Next UI (`025`).

### 022 — Dashboard v2

- **Spec:** `specs/022-dashboard-v2/`
- **What:** Charts on `/dashboard` (stacked bars default; pie/donut); numeric summaries kept.
- **Approach:** Frontend-only over then-existing `GET /api/dashboard`. Explicit `recharts` dependency; session chart mode only. **SUPERSEDED in layout/DTO by `026` overview** (membership-scoped KPIs + pie/bars/progress).

### 023 — UI Eyecandy

- **Spec:** `specs/023-ui-eyecandy/`
- **What:** Checklist pointer + non-flat checklist surfaces; dark palettes Obsidian/Noir/Dusk; gradient eyecandy on dashboard and profile cards.
- **Approach:** Frontend-only. `--eyecandy-surface-image` / `bg-eyecandy-surface` via palette tokens. Later: more dark palettes (`033`).

### 024 — Project Cover on Create

- **Spec:** `specs/024-project-cover-on-create/`
- **What:** Optional cover upload in Create Project Dialog (create-then-PUT).
- **Approach:** Frontend orchestration over Verified 020 `PUT .../cover`. Soft-fail keeps the project; copy “Project created, but cover upload failed.” No new API/volume.

### 025 — Feed Window

- **Spec:** `specs/025-feed-window/`
- **What:** Comments & activity show ≤5 items with Prev/Next (no infinite append).
- **Approach:** Frontend-only over 021 cursor/limit. FE cursor/window stack for Prev; interleaved replace window; supersedes 021 Load more append UX.

### 026 — Dashboard Overview

- **Spec:** `specs/026-dashboard-overview/`
- **What:** Membership-scoped `/dashboard` overview: KPIs (projects, open tasks, team members, due soon), pie by live status key, checklist-% bars, completed/total progress.
- **Approach:** No `dashboard` domain. `tasks` aggregations over projects/members ports. Replaces `GET /api/dashboard` DTO. **SUPERSEDES 008/022 owner-only** scope. Recharts; empty success UI. Due soon = next 7 UTC days `!isCompleted`. No migration.

### 027 — Password Change

- **Spec:** `specs/027-password-change/`
- **What:** Authenticated change password (current + new); revoke other sessions.
- **Approach:** Domain `auth`. `POST /api/auth/password` → `204`; Argon2id; min 8; ≠ current; FE confirm only. Hash + revoke-others in one UnitOfWork; keep current session. Profile form. No SMTP/migration.

### 028 — Status Drag Reorder

- **Spec:** `specs/028-status-drag-reorder/`
- **What:** Drag-reorder Kanban status columns; persist via existing catalog reorder API.
- **Approach:** Frontend-only. `@dnd-kit/sortable` (+ utilities) on columns; typed column vs card DnD; Dialog Move up/down kept. Reuses 018 `reorderStatuses`. Later polish: full header handle + Trello-like overlay (`032`).

### 029 — Auth UX

- **Spec:** `specs/029-auth-ux/`
- **What:** Password show/hide eye toggles; guest `/` → `/login`.
- **Approach:** Frontend-only shared `PasswordInput` on Login, Register, Profile change-password. Supersedes 005 guest-root → register; Register remains via UI links.

### 030 — Cover Pointer Cursor

- **Spec:** `specs/030-cover-pointer/`
- **What:** Pointer cursor on Create/Edit project cover file pickers.
- **Approach:** Frontend-only `cursor-pointer file:cursor-pointer` on cover `input[type=file]` (Q-196).

### 031 — Within-Column Rank

- **Spec:** `specs/031-within-column-rank/`
- **What:** Persist and drag-reorder task cards within a Kanban column (proposed **H**).
- **Approach:** Owned by `tasks`. Dense `Task.position`; migration `20261110180000_task_within_column_rank`; `PUT /api/projects/:projectId/tasks/reorder` `{ status, taskIds }`; list by position asc; cross-column status PATCH appends end; no position activity. Card `@dnd-kit/sortable`; disabled when priority/label filters active. Delivers proposed **H**.

### 032 — Kanban Column DnD Polish

- **Spec:** `specs/032-kanban-column-dnd-polish/`
- **What:** Full header-strip column handle; soft status tint; Trello-like free-follow column overlay.
- **Approach:** Frontend-only over 028. Entire tinted header is the grab zone; compact chrome `DragOverlay` follows the pointer; rail ghost; horizontal final `reorderStatuses`. Preserves 031 card DnD and write-gate.

### 033 — Dark Theme Retune

- **Spec:** `specs/033-dark-theme-retune/`
- **What:** Additive dark palettes Violet Night, Cyan Edge, Graphite (keep Obsidian/Noir/Dusk).
- **Approach:** Frontend-only catalog + CSS tokens + eyecandy surfaces; inspired by `templates/DarkThemes/` (not pixel clone). localStorage `devtrack.uiPalette` / Forest fallback unchanged.

---

## Related files

| File | Role |
| --- | --- |
| `prompt.md` | Product direction (not a status log) |
| `constitution.md` | Binding SDD/DDD/security rules |
| `specs/` | Per-feature spec, plan, tasks |
| `memory.md` | Agent memory (commands, issues, decisions) |
| `proposed-features.md` | Later ideas, not specified |
