# DevTrack — implemented features and approach

Human-readable catalog of **Verified** work: what shipped, and how (tech + concepts). Detailed contracts stay in `specs/<id>-<name>/`. Agent session notes stay in `memory.md`. Later ideas stay in `proposed-features.md`.

**How this file is updated:** after a spec is Verified, the agent proposes a catalog patch and **does not edit this file until you confirm**. Do not treat a completion report as an automatic update.

Last confirmed: 2026-10-31 (features `001`–`009`).

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
- **Approach:** React Router destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`. Guest `/` → register; authenticated `/` → `/projects`. Top app bar + left project sidebar. Backend probe HTTP kept.

### 006 — Kanban

- **Spec:** `specs/006-kanban/`
- **What:** Status columns on project detail; persisted status changes; drag-and-drop.
- **Approach:** Presentation of existing tasks. `@dnd-kit/core` only (`DragOverlay`). Cross-column drop → `PATCH /api/tasks/:id` `{ status }`. Same-column drop is a no-op. No `@dnd-kit/sortable`, no `position`/`rank`, no extra move endpoint.

### 007 — Workspace UI

- **Spec:** `specs/007-workspace-ui/` (includes polish in the same folder)
- **What:** Trello-like workspace without cloning Trello: project card grid, Dialogs, compact board, whole-UI palettes.
- **Approach:** Name-derived color+initials covers (no uploads, no `coverColor`). Create/edit/task forms as Dialogs. Palettes (Forest default plus catalog solids/gradients) on the document root; id in localStorage `devtrack.uiPalette` only. Remaining-height Kanban (`h-svh`). Back to projects on the board header.

### 008 — Dashboard

- **Spec:** `specs/008-dashboard/`
- **What:** Owner summaries and pending / completed / overdue counts from persisted data.
- **Approach:** No `dashboard` domain and no dashboard table. `tasks` use-case over the projects port. Additive `GET /api/dashboard`. Route `/dashboard` + top-bar link; authenticated `/` still `/projects`. Pending = `TODO`+`IN_PROGRESS`; completed = `DONE`; overdue = non-`DONE` with `dueDate` before UTC today. Active owned projects only. Membership does not affect these counts.

### 009 — Collaboration

- **Spec:** `specs/009-collaboration/`
- **What:** Project membership, explicit roles, backend resource-level authorization, Members Dialog.
- **Approach:** Domain `project-members`. Roles `OWNER` / `EDITOR` / `VIEWER`. Prisma `ProjectMember`. Add existing users by email (no SMTP). `ownerUserId` still grants OWNER. `GET /api/projects` lists projects the actor may see. EDITOR: edit + task writes, no archive/members admin. VIEWER: read/list. Archived GET remains creating-owner only. Members UI is a board-header Dialog, not a new page.

### 010 — Task Comments

- **Spec:** `specs/010-task-comments/`
- **What:** Persisted plain-text discussion on a task; author edit; author or OWNER soft-delete.
- **Approach:** Owned by `tasks` (no peer comments domain). Prisma `TaskComment` with `deletedAt`. Create/list via `TaskAuthorizationPort` task write/read; author-only PATCH; soft-delete author or effective OWNER; no restore; no mentions/rich text. UI in existing `TaskDetail` Dialog. Later shipped: **L** activity (`011`), **E** labels (`012`), **F** checklists (`015`).

### 011 — Task Activity

- **Spec:** `specs/011-task-activity/`
- **What:** Task-scoped activity feed for created, field changes, soft-delete, and comments added.
- **Approach:** Owned by `tasks`. Prisma `task_activity_events`. Emit in the same transaction as the write. `GET /api/tasks/:taskId/activity` → `{ activity }` (newest first, task read). Comment-added stores `commentId` + body preview. Shown in TaskDetail “Comments & activity” (omit `COMMENT_ADDED` rows to avoid duplicates). Not app-wide audit **C**. Later shipped: **F** checklists (`015`).

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
- **Approach:** Frontend-only. Create Dialog from Checklist button; checklist blocks `bg-card`+border; thinner TaskDetail labels; Color palette circle + scheme preview (`devtrack.uiPalette` only); `To do` / `In progress` / `Done` on TaskDetail status + Kanban headers (API values unchanged). Custom statuses deferred separately. Later shipped: **G** attachments (`017`).

### 017 — Task Attachments

- **Spec:** `specs/017-task-attachments/`
- **What:** Task file attachments + image cover; Kanban cover face.
- **Approach:** Owned by `tasks`. Compose volume (`attachments_data` / `ATTACHMENTS_ROOT`); nested multipart + authenticated `/content`; cover summary on `PublicTaskDto` only; activity `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED`. UI: action-row Attachment Popover for upload; attachment list stacked in main column. Max 20 MiB/file. Deferred: custom statuses; **C** audit.

---

## Related files

| File | Role |
| --- | --- |
| `prompt.md` | Product direction (not a status log) |
| `constitution.md` | Binding SDD/DDD/security rules |
| `specs/` | Per-feature spec, plan, tasks |
| `memory.md` | Agent memory (commands, issues, decisions) |
| `proposed-features.md` | Later ideas, not specified |
