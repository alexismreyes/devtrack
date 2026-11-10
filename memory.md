# DevTrack — Project Memory

## Identity

- Name: DevTrack
- Purpose: Project and task management for individuals and small teams
- Architecture: Modular monolith
- Stage: Foundation through password change Verified

## Stack decisions

Verified for `001-foundation`, `002-authentication`, `005-frontend-shell`, `006-kanban`, and `007-workspace-ui` (including polish).

- Frontend: React, TypeScript, Vite, React Router 7 (SPA/library mode), Tailwind CSS 4, copied shadcn/ui primitives (`button`, `input`, `label`, `card`, `textarea`, `dialog`), Recharts for `/dashboard` overview charts (022 Q-171; layout/DTO superseded by 026)
- Backend: Node.js 22 LTS, Express, TypeScript
- Package manager: npm
- Runtime validation: Zod at HTTP boundaries
- Tests: Vitest, Testing Library, SuperTest
- API errors: HTTP status plus `{ error: { code, message } }`; no secrets, stack traces, hashes, or connection strings
- Browser to API: published backend port + `VITE_API_URL`; CORS origin with credentials, not `*`
- Auth: HTTP-only session cookie `devtrack_session`; Argon2id; 7-day absolute expiry; logout revokes that session; concurrent sessions allowed; authenticated password change (`027`) revokes other sessions and keeps current (`POST /api/auth/password` → `204`)
- Health: `GET /health` (public liveness), `GET /ready` (public readiness via `system` repository)
- Probes: `POST/GET /api/system/probes` require a session; no `SystemProbe` ownership; no product-UI destination (Q-030)
- ORM: Prisma 6 behind owning-domain repositories
- Database: PostgreSQL 16
- Infra: Docker Compose services `frontend`, `backend`, `db`
- Frontend talks to backend over HTTP (`credentials: 'include'`)
- Backend talks to Postgres on the Compose network using hostname `db`
- Prisma Client and migrations belong to the backend (`backend/prisma/`)
- Navigation is real URL destinations (React Router), not `App.tsx` view/state switching (Q-016 / Q-028)
- Styling is Tailwind + copied shadcn/ui with layout metaphors and original DevTrack identity: top app bar, compact left project sidebar, `/projects` card grid with optional uploaded image covers (020) else name-derived color+initials fallback (compact ~14–18rem, left-aligned), board-like project detail with remaining-height compact ~16–20rem `TODO` / `IN_PROGRESS` / `DONE` columns, Dialogs for create/edit/add-task/task-detail, whole-UI palettes from a documented catalog persisted in localStorage only (Q-029 / Q-031 / Q-032 / Q-033 / Q-036 / Q-037 / Q-038 / Q-041 / Q-042 / Q-044; cover upload Q-155–Q-161; dark palettes Obsidian/Noir/Dusk Q-177; checklist/dashboard/profile eyecandy Q-178)
- Project-detail Kanban uses `@dnd-kit/core` only, including `DragOverlay`; cross-column drop PATCHes existing task `status` key; same-column drop is a no-op; no `@dnd-kit/sortable`; no task `position`/`rank` field (Q-034 / Q-035 / Q-043). Catalog column order uses `ProjectStatus.position` (018; not **H**)
- Copied shadcn Dialog plus `@radix-ui/react-dialog` is allowed; no second CSS framework; no DropdownMenu; no Trello branding; no `next-themes` (Q-038 / Q-041)
- Whole-UI palette id is stored only in localStorage under `devtrack.uiPalette`. No profile API, cookie, or Prisma field. Logout does not clear it. Missing/unknown ids fall back to Forest.

## Governing files

- `prompt.md` — product direction
- `constitution.md` — binding rules
- `AGENTS.md` — agent instructions
- `implemented-features.md` — human catalog of Verified features and approach; update only after the user confirms a proposed patch
- `memory.md` — this file
- `.cursor/agents/` — isolated planner, implementer, reviewer (fresh subagent per stage; paths not file dumps)
- `.cursor/skills/sdd-workflow/SKILL.md` — SDD workflow
- `.specify/templates/` — spec, plan, and task templates
- `specs/` — feature artifacts

## Domains

Implemented: `system`, `auth`, `users`, `projects`, `tasks`, `project-members`. No new domain in `005-frontend-shell`, `006-kanban`, `007-workspace-ui`, `008-dashboard`, `010-task-comments`, `011-task-activity`, `012-task-labels`, `015-task-checklists`, `017-task-attachments`, `018-custom-task-statuses`, `019-ui-polish`, `020-project-covers`, `021-feed-pagination`, `022-dashboard-v2`, `023-ui-eyecandy`, `024-project-cover-on-create`, `025-feed-window`, or `026-dashboard-overview` (dashboard aggregations, comments, activity, labels, checklists, attachments, status catalog, and feed pagination/window live in the `tasks` domain; 019/023 are frontend presentation only; project covers live in `projects`; 022 charts were frontend presentation of the then-existing dashboard DTO; **026** replaces membership-scoped overview DTO + UI while keeping aggregations in `tasks`; 024 is frontend create-path orchestration over existing 020 cover API; 025 is frontend window UX over 021 cursor/limit APIs). `009-collaboration` added `project-members`. `027-password-change` extends existing `auth` (no new domain; no migration).

Later candidates in `proposed-features.md`. App-wide CRUD audit (later feature ID, **not** `005`, **not** `006`, and **not** `007`; do not write `specs/005-audit/`).

## Proposed backlog

Foundation (Verified) → authentication (Verified) → projects (Verified) → tasks (Verified) → frontend-shell (Verified) → Kanban (Verified) → workspace-ui (Verified, including polish) → dashboard → collaboration → task comments → task activity → task labels → task-detail layout → TaskDetail polish → task checklists → custom task statuses → UI polish → project covers → feed pagination → dashboard charts → UI eyecandy (Verified) → project cover on create (Verified) → feed window (Verified) → dashboard overview (Verified) → password change (Verified) → audit (later ID, not `005`).

Dashboard (`008-dashboard`), collaboration (`009-collaboration`), task comments (`010-task-comments`), task activity (`011-task-activity`), task labels (`012-task-labels`), task-detail layout (`013-task-detail-layout`), TaskDetail polish (`014-task-detail-polish`), task checklists (`015-task-checklists`), UI refinements (`016-ui-refinements`), task attachments (`017-task-attachments`), custom task statuses (`018-custom-task-statuses`), UI polish (`019-ui-polish`), project covers (`020-project-covers`), feed pagination (`021-feed-pagination`), dashboard charts (`022-dashboard-v2`), UI eyecandy (`023-ui-eyecandy`), project cover on create (`024-project-cover-on-create`), feed window (`025-feed-window`), dashboard overview (`026-dashboard-overview`), and password change (`027-password-change`) are Verified. Extra Trello/Jira/email/AI ideas live in `proposed-features.md` for later choice; do not implement from that file. Do not write `specs/005-audit/`. No next Approved delivery queued. Deferred: within-column rank **H**; later **C** app-wide audit. Catalog `implemented-features.md` last confirmed through 018; 019–027 catalog patches await user confirm if not applied.

## Verified status

`001-foundation` Verified. `002-authentication` Verified. `003-projects` Verified. `004-tasks` Verified. `005-frontend-shell` Verified. `006-kanban` Verified. `007-workspace-ui` Verified (original T001–T013 and polish T014–T026). `008-dashboard` Verified (T001–T014; **owner-only scope and DTO SUPERSEDED by `026-dashboard-overview`**). `009-collaboration` Verified (T001–T017). `010-task-comments` Verified (T001–T016). `011-task-activity` Verified (T001–T016). `012-task-labels` Verified (T001–T017). `013-task-detail-layout` Verified (T001–T012). `014-task-detail-polish` Verified (T001–T013). `015-task-checklists` Verified (T001–T017). `016-ui-refinements` Verified (T001–T014). `017-task-attachments` Verified (T001–T019). `018-custom-task-statuses` Verified (T001–T017). `019-ui-polish` Verified (T001–T012). `020-project-covers` Verified (T001–T016). `021-feed-pagination` Verified (T001–T014). `022-dashboard-v2` Verified (T001–T012; **owner-scoped charts/mode toggle SUPERSEDED by `026` overview**). `023-ui-eyecandy` Verified (T001–T013). `024-project-cover-on-create` Verified (T001–T011). `025-feed-window` Verified (T001–T011). `026-dashboard-overview` Verified (T001–T014). `027-password-change` Verified (T001–T014; after Low hash/revoke UoW fix). Reviewer for 008: PASS. Blocking: no. Failed ACs: none. Reviewer for 009–027: PASS WITH NON-BLOCKING FINDINGS (each; 018 after reorder-txn fix; 021 after FR-010 comment-reset fix; 027 Low non-atomic hash→revoke addressed before Verified). Blocking: no. Failed ACs: none. T001–T013 complete for 005. T001–T011 complete for 006. T001–T013 complete for original 007. T014–T026 complete for 007 polish. Reviewer for 005: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for 006: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for original 007: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for 007 polish (T025): PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Informational: live contrast not audited in review; AC-018 not re-executed by reviewer. Low: some project-cover slots retint with the theme tokens (still name-derived, no stored coverColor).

Present in the repo:

- `frontend/`, `backend/`, `docker-compose.yml`
- `system` probe slice; `auth` sessions; `users` identity/profile; owner-only `projects` with archive/unarchive; project-scoped `tasks` with soft-delete
- React Router destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`, `/dashboard`; guest root → register; authenticated root → projects (not dashboard); unknown paths (including `/system/probes`) → not-found
- `GET /api/dashboard` (session required): **026 SUPERSEDES 008/022 owner-only scope and response DTO**. Membership-scoped active projects (OWNER/EDITOR/VIEWER via project-members + `ownerUserId` OWNER equivalence; VIEWER included). Replaced DTO: `totalProjects`, `openTasks` (`!isCompleted`), `teamMembers` (distinct member user ids across scoped set), `dueSoon` (`dueDate` in UTC `[today, today+7]` inclusive and `!isCompleted`), `projectsPie[{ statusKey, label, count }]` (task counts by live status key), `tasksBars[{ projectId, projectName, checklistCompletionPercent }]`, `progress[{ projectId, projectName, completedTasks, totalTasks }]`. Empty membership → zeros + empty arrays, `200`. Soft-deleted tasks and archived projects excluded. Aggregations in `tasks` use-case over projects/members ports; no `dashboard` domain or Prisma dashboard model. `/dashboard` UI: KPI row + Recharts pie/bars/progress toward template; 022 stacked-bar/pie mode toggle removed. Prior 008 fields (`projectCount`/`pendingCount`/`overdueCount`/per-project pending-completed-overdue) and 022 owner-wide pending/completed/overdue charts are obsolete.
- Collaboration: domain `project-members`; roles `OWNER`/`EDITOR`/`VIEWER`; Prisma `ProjectMember`; `GET`/`POST /api/projects/:projectId/members`; `PATCH`/`DELETE .../members/:userId`; add by existing email `{ email, role }` with no mail. `GET /api/projects` lists active projects the actor is authorized to see. `ownerUserId` still grants OWNER. Create-project inserts OWNER membership atomically. Members Dialog on the board header. EDITOR: edit project + task writes, no archive/members admin. VIEWER: read/list only. Archived GET remains `ownerUserId` only.
- Task comments (`010-task-comments`, proposed **D**): owned by `tasks` (no peer comments domain). Prisma `TaskComment` / `task_comments` with nullable `deletedAt`. `POST`/`GET /api/tasks/:taskId/comments`; `PATCH`/`DELETE /api/tasks/:taskId/comments/:commentId`. Create = task write; list = task read via `TaskAuthorizationPort`; author-only PATCH body; soft-delete by author or effective OWNER (`requireProjectOwner`); no restore; plain text only; no mentions. Public DTO omits `deletedAt`. UI lives in existing `TaskDetail` Dialog. **List contract superseded by `021-feed-pagination`:** `GET` comments is cursor/limit paginated (default limit 5, max 50, `nextCursor`); write paths unchanged.
- Task activity (`011-task-activity`, proposed **L**): owned by `tasks`. Prisma `task_activity_events` with kinds `TASK_CREATED`, `TASK_FIELDS_CHANGED`, `TASK_SOFT_DELETED`, `COMMENT_ADDED`. Emit in same DB transaction as create/update/softDelete/comment-create; fail write if event insert fails; no emit on no-op PATCH or comment edit/delete. Field-change: one event per PATCH with old/new for changed fields. Comment-added stores `commentId` + short body preview. **List contract superseded by `021-feed-pagination` (supersedes Q-078 / AC-016 full-list):** `GET /api/tasks/:taskId/activity` → `{ activity, nextCursor }` cursor/limit pages (default 5, max 50) via `requireTaskRead`; actor display name resolved at list time. Forward-only (no backfill). Read-only UI in `TaskDetail`. Not app-wide audit **C**.
- Feed pagination (`021-feed-pagination`): owned by `tasks` (no new domain; no migration). Opaque cursor `{ createdAt, id }` with id tie-break; newest-first pages; cursor/limit GETs (default 5, max 50, `nextCursor`). **UI Load more append superseded by `025-feed-window`:** Comments & activity shows a ≤5 interleaved window with Prev/Next replace (FE cursor/window stack); API contracts unchanged. After comment create/edit/delete and 014-style activity reloads, reset to newest window and clear stack (021 FR-010 amended to window model).
- Feed window (`025-feed-window`): frontend-only over `tasks` list APIs (no new domain; no migration; no `prevCursor`). Q-181 FE cursor/window stack for Prev; Q-182 interleave from current fetched pages only, show newest ≤5, Next/Prev replace (no append buffer). Supersedes 021 Load more append UX / AC-006 append expectation.
- Task labels (`012-task-labels`, proposed **E**): owned by `tasks`. Per-project catalog (`ProjectLabel` with `name`/`nameKey`/fixed color token) + many labels per task (join). Catalog CRUD and assignment via `requireTaskWrite`; reads via `requireTaskRead`. Color tokens: `RED`|`ORANGE`|`YELLOW`|`GREEN`|`TEAL`|`BLUE`|`PURPLE`|`PINK`|`GRAY`. Name 1–40 trim, case-insensitive unique per project. Hard-delete clears assignments. `PUT /api/tasks/:taskId/labels` replace-set; catalog under `/api/projects/:projectId/labels`. `PublicTaskDto.labels` for card face; optional single `labelId` list filter. No label activity events. UI: board Labels Dialog; TaskDetail Labels Popover (013) for assign + catalog CRUD; card chips; board filter.
- Task detail layout (`013-task-detail-layout`): frontend-only. Two-column TaskDetail (`md+`; stack below). Labels-only action row → Popover (search, checkboxes, edit/create); apply `replaceTaskLabels` on outside-click/Done; Escape discards. Board Labels Dialog kept. Right panel “Comments & activity” interleaved newest-first; omit `COMMENT_ADDED` activity rows. Added `@radix-ui/react-popover` + shadcn `popover`. No schema/API contract changes. **021** cursor/limit first-page limit 5; **025** Prev/Next window replace (supersedes 021 Load more append).
- TaskDetail polish (`014-task-detail-polish`): opaque `--popover`/`--popover-foreground` on all palettes; reload activity after Save and comment create/edit/delete; clearer timeline spacing; Edit/Delete as link buttons; nine-token `LabelColorSwatchPicker` in LabelsPopover + LabelsDialog (no color `<select>`). Frontend-only.
- Task checklists (`015-task-checklists`, proposed **F**): owned by `tasks`. Prisma checklists + items (`20261105140000_task_checklists`); nested REST under `/api/tasks/:taskId/checklists` (+ items). Name 1–80; item text 1–200; checked default false; hard-delete cascade; `createdAt` asc; empty allowed; no PublicTaskDto/Kanban embed. Authz: mutate = `requireTaskWrite`, list = `requireTaskRead`; archived like task writes. Additive activity kinds `CHECKLIST_ADDED` / `CHECKLIST_REMOVED` / `CHECKLIST_ITEM_COMPLETED` / `CHECKLIST_ITEM_UNCOMPLETED` same-tx (fail write if insert fails); no emit on item add/delete, rename, text-only PATCH, or no-op checked. UI: TaskDetail action-row Checklist + main-column lists with progress bar and strikethrough (no hide-checked); Comments & activity renders the four kinds; still omits `COMMENT_ADDED`. Later shipped: attachments **G** (`017`).
- UI refinements (`016-ui-refinements`): frontend-only. Create-checklist Dialog from action-row Checklist (inline primary create removed); checklist blocks `bg-card`+border; thinner TaskDetail field labels; Color palette circle + scheme-preview picker (still `devtrack.uiPalette` localStorage only); friendly fixed-enum status labels `To do` / `In progress` / `Done` on TaskDetail status control + Kanban headers only (API/DnD values unchanged). Custom statuses later shipped as `018`.
- Task attachments (`017-task-attachments`, proposed **G**): owned by `tasks`. Prisma `TaskAttachment` + nullable `Task.coverAttachmentId`; Compose named volume `attachments_data` (`ATTACHMENTS_ROOT`); path `{root}/{projectId}/{taskId}/{attachmentId}`. Nested multipart upload/list/delete + authenticated `/content` (`Cache-Control: private`); cover PUT/DELETE. Allowlist jpeg/png/webp/gif/pdf/text; **20 MiB**/file; 20/task; magic sniff; no AV. Authz write mutate / read list+download; archived like checklists. Hard-delete row+blob; soft-deleted task → 404 (keep rows/blobs; no GC). Activity `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` same-tx. `PublicTaskDto.cover` summary only. UI: action-row Attachment Popover for upload (Labels-like); attachment list stacked in main column; Kanban cover via authenticated fetch.
- Custom task statuses (`018-custom-task-statuses`): owned by `tasks`. Prisma `ProjectStatus` catalog + `Task.status` as stable string key (not enum, not FK). Seed `TODO`/`IN_PROGRESS`/`DONE` per project (editable name/color/`isCompleted`; immutable keys; deletable when unused). Catalog `position` reorder (full list; not task rank **H**). Guardrails: delete-in-use blocked; cannot delete last status; ≥1 non-completed. Routes under `/api/projects/:projectId/statuses` (+ reorder); authz `requireTaskWrite`. Dashboard uses live `isCompleted`. Activity status keys only via `TASK_FIELDS_CHANGED`. UI: dynamic Kanban columns; Statuses Dialog; TaskDetail/filter/column-prefill; label color tokens. Reorder writes in one `$transaction`.
- UI polish (`019-ui-polish`): frontend-only. Pointer/hand cursor baseline on shadcn `Button` and product router links (Q-151). Whole Kanban card opens TaskDetail (not title-only; Q-152) with `@dnd-kit` activation-distance / cancel-on-click so completed drag does not open detail (Q-154). Authenticated top-bar **Projects** → `/projects` beside **Dashboard** (Q-153); DevTrack brand still → `/projects`. No Prisma/API/migrations; no notes/covers/pagination/charts/**H**/**C**.
- Project covers (`020-project-covers`): owned by `projects` (not `tasks`, not peer `covers`). Prisma `ProjectCover` 1:1; Compose named volume `project_covers_data` (`PROJECT_COVERS_ROOT`); path `{root}/{projectId}/{coverId}`. `PUT`/`DELETE` `/api/projects/:projectId/cover` + authenticated `GET .../cover/content` (`Cache-Control: private`). Allowlist jpeg/png/webp/gif; **5 MiB**; magic sniff; one cover; clear removes blob+metadata. Mutate OWNER+EDITOR (`requireProjectWrite`-style); read/content via project membership visibility. `PublicProjectDto.cover` summary `| null`. UI: `ProjectCard` authenticated blob fetch with name-derived fallback when null; upload/replace/clear in Edit Project Dialog. Reopens 007 Q-036/Q-039 name-derived-only for uploaded images.
- Project cover on create (`024-project-cover-on-create`): frontend-only orchestration. Create Project Dialog optional cover file → `POST /api/projects` then optional 020 `PUT .../cover`. Soft-fail (Q-180): project remains without cover if PUT fails; status copy “Project created, but cover upload failed.” (Q-179). No new multipart create API, volume, Prisma, or domain.
- Authenticated chrome: top app bar (DevTrack → `/projects`, Color palette selector, Projects → `/projects`, Dashboard → `/dashboard`, profile, logout) and compact left sidebar of listed project names plus a create `+` Dialog; `/projects` main is a constrained card grid of listed (non-archived) projects with uploaded cover images when set else name-derived color-initials fallback (empty/select-or-create main superseded); project detail has compact header (name, short description, Back to projects next to Edit/Archive/Statuses) and remaining-height dynamic catalog status columns; create-task and task-detail are Dialogs (board stays mounted); compact filters sit above the board; profile keeps the compact sidebar; guest login/register have no product sidebar and inherit stored-or-Forest palette
- Original FR-006 / Q-037 “remove Back to projects” is **superseded**: Back to projects is restored on the board header action row; DevTrack still links to `/projects`
- Whole-UI palettes from the Q-041 catalog (solids Forest default, Ocean, Sunset, Violet, Midnight; dark solids Obsidian, Noir, Dusk from 023/Q-177; gradients Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier) applied on the document root; persisted only as catalog id in localStorage `devtrack.uiPalette`; guests use stored-or-Forest; logout does not clear the key
- UI eyecandy (`023-ui-eyecandy`): frontend-only. Checklist interactive controls use pointer cursor (extends 019); checklist blocks and dashboard/profile cards use palette-token `--eyecandy-surface-image` / `bg-eyecandy-surface` (not flat `bg-card`-only; amends 016 Q-129 presentation for checklists). Visual polish only on then-existing dashboard cards (Q-178); **026** owns membership overview rewrite and consumes eyecandy surfaces. No Prisma/API/migrations.
- Dashboard overview (`026-dashboard-overview`): owned by `tasks` (no new domain; no migration). **SUPERSEDES 008 owner-only scope** (Q6 MEMBERSHIP-SCOPED, VIEWER included) and **SUPERSEDES 008/022 DTO + 022 chart mode toggle** (Q-186 replace). KPIs + pie-by-status-key + checklist-% bars + completed/total progress; Recharts only; empty success UI (Q-183).
- Password change (`027-password-change`): owned by `auth` (no new domain; no migration). `POST /api/auth/password` `{ currentPassword, newPassword }` → `204`; wrong current → `400 INVALID_CREDENTIALS`; Argon2id verify+rehash; revoke other sessions / keep current (Q-187); min 8, ≠ current, FE confirm only (Q-188). Hash update + revoke-others in one `UnitOfWork` (`PrismaAuthRepository` via `currentPrisma`). Profile UI change-password form. No SMTP/email reset.
- `@dnd-kit/core` is present with `DragOverlay` and activation-distance 8; entire Kanban card face opens TaskDetail on activate (suppress after completed drag); task cards use a pointer cursor; `@dnd-kit/sortable` is absent; no second DnD library; no task `position`/`rank`; catalog `ProjectStatus.position` only; no move endpoint; status moves reuse `PATCH /api/tasks/:id` `{ status }` with `credentials: 'include'`
- `ProbePage` and probe chrome removed from the React app; backend `system` probe HTTP, Prisma `SystemProbe`, `GET /health`, `GET /ready`, and backend probe tests unchanged
- Copied shadcn primitives only: `button`, `input`, `label`, `card`, `textarea`, `dialog`, `popover`; peers `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-dialog`, `@radix-ui/react-popover`; chart library `recharts` ^3.10.1 (022; no second chart library)
- No project `coverColor` or User palette field. Project cover blobs live on Compose `project_covers_data` (`PROJECT_COVERS_ROOT`); task attachment blobs on `attachments_data` (not Postgres). No task `position`/`rank`. No app-wide audit. Dashboard counts are derived, not stored. Membership is persisted. `specs/005-audit/` is absent. Authenticated shell uses `h-svh overflow-hidden` so Kanban columns scroll inside remaining height.

Coordinator close-out evidence for `027-password-change` T013–T014 (Node.js `v22.22.3`; implementer-recorded + prior reviewer):

- Prior implementer T010–T011: backend auth-service/auth-api/prisma-auth-repository → 32 passed; `tsc --noEmit` exit 0; frontend ProfilePage + client → 87 passed; `tsc --noEmit` exit 0
- Low fix re-run: same three backend files → 33 passed (+1 UoW rollback); `tsc --noEmit` exit 0
- No migration; no Compose/env/constitution changes; extends `auth` only
- Reviewer T013: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-007 PASS; blocking no; low: hash then revoke-others not one transaction — **resolved** (`UnitOfWork` + `currentPrisma`); informational: reviewer did not re-run suites
- T014: `memory.md` records Verified + Q-187–Q-189; catalog propose only

Coordinator close-out evidence for `026-dashboard-overview` T013–T014 (Node.js `v22.22.3`; implementer-recorded + reviewer):

- Prior implementer T010–T011: frontend full → 34 files / 300 passed; `npm run typecheck` exit 0; backend targeted dashboard → 55 passed; `npm run typecheck` exit 0; backend full → 419 passed with 1 unrelated `labels-api.test.ts` fail (`nextCursor` assertion drift)
- No migration; no Compose/env/constitution changes; DTO replace on existing `GET /api/dashboard`; no `dashboard` domain/Prisma model
- Reviewer T013: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-008 PASS; blocking no; low: memory still documented 008 owner-scoped DTO (resolved by T014); informational: reviewer did not re-run suites; Progress UI % + tooltip completed/total
- T014: `memory.md` records membership scope + DTO supersession of 008/022 and Q-183–Q-186 / Q5 / Q6; catalog propose only

Coordinator close-out evidence for `025-feed-window` T010–T011 (Node.js `v22.22.3`; implementer-recorded + reviewer):

- Prior implementer: targeted CommentsActivityPanel + TaskDetail → 2 files / 39 passed; `npm run typecheck` exit 0; full `npm test` → 34 files / 300 passed
- Close-out re-run: same two targeted files → 39 passed; `npm run typecheck` exit 0; full `npm test` → 34 files / 300 passed
- No migration; no API/schema/Compose/env/constitution changes; frontend Prev/Next window over 021 cursor/limit GETs
- Reviewer T010: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-007 PASS; blocking no; low: AC-005 edit/delete navigate-then-reset not separately asserted (share `reloadNewestFeedWindow`); informational: Q-182 overflow skip on Next; reviewer did not re-run suites

Coordinator close-out evidence for `024-project-cover-on-create` T010–T011 (Node.js `v22.22.3`; implementer-recorded + reviewer):

- Prior implementer: `ProjectsPage.test.tsx` → 14 passed; `npm run typecheck` exit 0; full `npm test` → 34 files / 300 passed
- Close-out re-run: targeted ProjectsPage → 14 passed; `npm run typecheck` exit 0; full `npm test` → 34 files / 300 passed
- No migration; no API/schema/Compose/env/constitution changes; frontend create-then-PUT reuse of 020
- Reviewer T010: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-005 PASS (AC-001 card UI unverified live); blocking no; low: no home-card cover assert; informational: reviewer did not re-run suites

Coordinator close-out evidence for `023-ui-eyecandy` T012–T013 (Node.js `v22.22.3`; implementer-recorded + reviewer):

- Prior implementer: frontend targeted uiPalettes / uiEyecandy / UiPaletteProvider / popoverTheme / checklist eyecandy / Dashboard / Profile / TaskDetail → 57 passed; `npm run typecheck` exit 0; full `npm test` → 34 files / 296 passed
- No migration; no API/schema/Compose/env/constitution changes; frontend-only
- Reviewer T012: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-006 PASS; blocking no; informational: reviewer did not re-run suites; low: Card base `bg-card` under eyecandy class; create-checklist cursor via shared Button

Coordinator close-out evidence for `022-dashboard-v2` T011–T012 (Node.js `v22.22.3`; implementer-recorded + reviewer):

- Prior implementer: frontend targeted DashboardPage / DashboardCharts / dashboardChartData / frontend-deps → 17 passed; `npm run typecheck` exit 0; full `npm test` → 32 files / 291 passed
- Close-out re-run: same four targeted files → 4 files / 17 passed; `npm run typecheck` exit 0
- No migration; no API/schema/Compose/env changes; `recharts` ^3.10.1 only chart library
- Reviewer T011: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-008 PASS; blocking no; informational: reviewer did not re-run suites; AC-004 via unchanged owner-scoped API

Coordinator close-out evidence for `021-feed-pagination` T013–T014 (Node.js `v22.22.3`; implementer-recorded + reviewer re-review):

- `backend` targeted vitest (feed-cursor + comments/activity service/api) → 5 files / 42 passed; `npm run typecheck` exit 0
- `frontend` targeted vitest (client + CommentsActivityPanel + TaskDetail + TasksPanel) → 4 files / 140 passed; `npm run typecheck` exit 0
- No migration; no Compose/env changes
- Reviewer T013: first PASS WITH NON-BLOCKING (Medium FR-010) → fixed → re-review PASS WITH NON-BLOCKING FINDINGS; FR-010 resolved; AC-001–AC-008 PASS; blocking no

Coordinator close-out evidence for `020-project-covers` T015–T016 (Node.js `v22.22.3`; implementer-recorded prior batch + reviewer):

- `backend` cover suites + full `npm test` → 412 passed; `npm run typecheck` exit 0
- `frontend` targeted + full `npm test` → 278 passed; `npm run typecheck` exit 0
- Migration `20261109150000_project_covers` applied via `prisma migrate deploy`; Compose volume `project_covers_data`
- Reviewer T015: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-009 PASS; blocking no

Coordinator close-out evidence for `019-ui-polish` T012 (Node.js `v22.22.3`; implementer-recorded):

- `frontend` targeted vitest (button-cursor / KanbanBoard / App / TasksPanel) → 63 passed; `npm run typecheck` exit 0; full `npm test` → 28 files / 267 passed
- No backend changes; no migration
- Reviewer T011: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-006 PASS; blocking no

Coordinator close-out evidence for `018-custom-task-statuses` T017 (Node.js `v22.22.3`; implementer-recorded):

- `backend` `npm test` → 56 files / 398 passed; post-fix status suite → 5 files / 33 passed; `npm run typecheck` + `npm run build` exit 0
- `frontend` `npm test` → 27 files / 261 passed; `npm run typecheck` + `npm run build` exit 0
- Migration `20261106180000_project_statuses` applied via `prisma migrate deploy`
- Reviewer T016: first FAIL (non-transactional reorder) → fixed → re-review PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-014 PASS; blocking no

Coordinator close-out evidence for `017-task-attachments` T017 (Node.js `v22.22.3`; implementer-recorded):

- `backend` targeted vitest 11 files / 93 passed; `npm run typecheck` + `npm run build` exit 0
- `frontend` targeted vitest 5 files / 113 passed; `npm run typecheck` + `npm run build` exit 0
- Migration `20261106160000_task_attachments` applied via `prisma migrate deploy`
- Reviewer T018: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-014 PASS; blocking no

Coordinator close-out evidence for `016-ui-refinements` T012 (Node.js `v22.22.3`; implementer-recorded):

- `frontend` targeted vitest 6 files / 45 passed; `npm run typecheck` exit 0; full `npm test` 26 files / 230 passed
- Reviewer T013: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-010 PASS; blocking no

Coordinator close-out evidence for `015-task-checklists` T015 (Node.js `v22.22.3` via nvm; implementer-recorded):

- `backend` targeted vitest (checklists + comments/labels/activity) 8 files / 53 passed; `npm run typecheck` + `npm run build` exit 0
- `frontend` targeted vitest (client/TaskDetail/CommentsActivityPanel/TaskChecklistsPanel/KanbanBoard) 5 files / 98 passed; `npm run typecheck` + `npm run build` exit 0
- Reviewer T016: PASS WITH NON-BLOCKING FINDINGS; AC-001–AC-015 PASS; blocking no

Coordinator independently re-ran on Node.js `v22.22.3` for `014-task-detail-polish` T012 close-out:

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 24 files / 215 tests passed

Coordinator independently re-ran on Node.js `v22.22.3` for `013-task-detail-layout` T011 close-out:

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 22 files / 210 tests passed

Coordinator independently re-ran after `nvm use 22` for `012-task-labels` T016 close-out (host `node -v` may still show 24; suites green):

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 41 files / 316 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 20 files / 205 tests passed

Coordinator independently re-ran on Node.js `v22.22.3` for `011-task-activity` after T015 close-out:

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 36 files / 287 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 19 files / 186 tests passed

Coordinator independently re-ran on Node.js `v22.22.3` for `010-task-comments` after T015 close-out (flake fixes applied):

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 31 files / 260 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 19 files / 179 tests passed

Coordinator independently re-ran in Compose for `009-collaboration` after T013 (Node v22.23.4 in containers):

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 26 files / 228 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 19 files / 169 tests passed

Coordinator live browser pass on Compose (frontend rebuilt, backend restarted; no DB reset): owner board header **Members** Dialog; add existing `editor.009@example.com` as EDITOR; editor `/projects` shows the shared board; EDITOR chrome has Edit and Add task, not Archive or Members; editor `/dashboard` then stayed zeros under **008 owner-only** (that scope is **SUPERSEDED by Verified `026`** — members now see membership-scoped aggregates).

Coordinator independently re-ran in Compose for `008-dashboard` after T010 (Node v22.23.4 in containers):

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 21 files / 177 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 17 files / 141 tests passed

Coordinator live browser pass on Compose (frontend rebuilt, backend restarted so `GET /api/dashboard` loaded; no DB reset): register → `/projects`; Dashboard nav → `/dashboard` empty zeros; create project → totals Projects 1; create TODO task; PATCH `dueDate` `2020-01-01` → pending 1 and overdue 1; DevTrack brand still `/projects` card grid; guest `/dashboard` → `/login`. Chrome MCP create-task date fill did not persist (dueDate stayed null until PATCH).

Coordinator independently re-ran on Node.js 22.13.0 for `007-workspace-ui` polish after T025:

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 16 files / 133 tests passed

Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): `/projects` card grid + Color palette select (Forest default, switched to Aurora gradient); board shows Back to projects next to Edit/Archive; narrower left-aligned columns; Back navigates to `/projects`; palette remains Aurora.

Prior coordinator re-run on Node.js 22.13.0 for original `007-workspace-ui` after the remaining-height shell fix (superseded by polish counts above):

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 14 files / 118 tests passed

Prior original-007 live browser pass on Compose (frontend rebuilt, no DB reset): `/projects` shows compact sidebar + card grid with SB cover (not Select a project); board had compact header Edit/Archive, no always-on forms, no Back to projects (superseded by polish Back restore); Edit opens dialog; Add task opens dialog without status field; task click opens Task detail dialog with board behind; column + Add buttons present.

Prior coordinator re-run on Node.js 22.13.0 for `006-kanban`:

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 12 files / 107 tests passed

Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): login → project detail shows TODO/IN_PROGRESS/DONE columns; create task appears in TODO; keyboard DnD Space+ArrowRight+Space moved card to IN_PROGRESS; sidebar/chrome kept.

Prior coordinator re-run on Node.js 22.13.0 for `005-frontend-shell` (superseded by 006 counts above):

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 11 files / 92 tests passed

Prior 005 live browser pass on Compose (frontend rebuilt, no DB reset): guest `/` → `/register`, no sidebar; register → `/projects` with left sidebar + empty/select-or-create main; create project in sidebar; select project → `/projects/:id` with tasks list not columns; profile keeps sidebar; logout → `/login` no sidebar; guest `/projects` → `/login`; `/system/probes` → not-found, no probe UI. No drag-and-drop. Superseded on project-detail by 006 columns + keyboard DnD. `/projects` empty main superseded by 007 card grid.

Prior coordinator re-run on Node.js 22.22.3 for `004-tasks`:

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 20 files / 158 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 11 files / 87 tests passed (superseded by 005 counts above)

## Migrations

- `backend/prisma/migrations/20261026120000_init_system_probe/`
- `backend/prisma/migrations/20261026133000_authentication/` (`User`, `AuthPasswordCredential`, `AuthSession`)
- `backend/prisma/migrations/20261027120000_projects/` (`Project`: name, optional description, `ownerUserId`, `archivedAt`)
- `backend/prisma/migrations/20261029150000_tasks/` (`Task`: title, optional description, status, priority, optional dueDate, `deletedAt`; FK to project)
- Applied with `prisma migrate deploy`. No database reset or volume delete.
- `005-frontend-shell` added no migrations and did not change Prisma schema.
- `006-kanban` added no migrations and did not change Prisma schema. No `position`/`rank` field.
- `007-workspace-ui` added no migrations and did not change Prisma schema. No `coverColor` field. No `position`/`rank` field. No User palette/theme field. Polish used localStorage `devtrack.uiPalette` only.
- `008-dashboard` added no migrations and did not change Prisma schema. No dashboard table or field.
- `009-collaboration`: `backend/prisma/migrations/20261031120000_project_members/` (`ProjectMember`, unique `(projectId, userId)`, FKs Restrict). Applied with `prisma migrate deploy`. No reset or volume delete. `Project.ownerUserId` kept.
- `010-task-comments`: `backend/prisma/migrations/20261104180000_task_comments/` (`TaskComment` / `task_comments`: `id`, `taskId`, `authorUserId`, `body`, `createdAt`, nullable `deletedAt`; FKs Restrict; `taskId` index). Additive only. Applied with `prisma migrate deploy`. No reset or volume delete.
- `011-task-activity`: `backend/prisma/migrations/20261104210000_task_activity/` (`task_activity_events`: `id`, `taskId`, `actorUserId`, `kind` enum, `payload` JSON, `createdAt`; FKs Restrict; indexes on `taskId` and `(taskId, createdAt)`). Additive only. Applied with `prisma migrate deploy`. No reset or volume delete.
- `012-task-labels`: `backend/prisma/migrations/20261105120000_task_labels/` (project label catalog + task↔label join; Cascade on label delete). Additive only. Applied with `prisma migrate deploy`. No reset or volume delete.
- `015-task-checklists`: `backend/prisma/migrations/20261105140000_task_checklists/` (checklist + item tables; Cascade checklist→items; additive `TaskActivityKind` values). Additive only. Applied with `prisma migrate deploy`. No reset or volume delete.
- `017-task-attachments`: `backend/prisma/migrations/20261106160000_task_attachments/` (`TaskAttachment`; nullable `Task.coverAttachmentId` SetNull; additive activity kinds). Additive only. Applied with `prisma migrate deploy`. Compose named volume `attachments_data`. No reset or volume delete.
- `018-custom-task-statuses`: `backend/prisma/migrations/20261106180000_project_statuses/` (`ProjectStatus` catalog; `Task.status` enum → String key; seed defaults per project). Additive / expand–backfill–constrain. Applied with `prisma migrate deploy`. No reset or volume delete.
- `019-ui-polish` added no migrations and did not change Prisma schema or API contracts.
- `020-project-covers`: `backend/prisma/migrations/20261109150000_project_covers/` (`ProjectCover` / `project_covers` 1:1 on `projectId`; FKs Restrict). Additive only. Applied with `prisma migrate deploy`. Compose named volume `project_covers_data` → `/data/project-covers` (`PROJECT_COVERS_ROOT`). No reset or volume delete.
- `021-feed-pagination` added no migrations and did not change Prisma schema. Uses existing `taskId` / `(taskId, createdAt)` indexes.
- `022-dashboard-v2` added no migrations and did not change Prisma schema or API contracts. Frontend-only charts over existing `GET /api/dashboard`.
- `023-ui-eyecandy` added no migrations and did not change Prisma schema or API contracts. Frontend-only presentation (palettes + surfaces).
- `024-project-cover-on-create` added no migrations and did not change Prisma schema or API contracts. Frontend create-then-PUT reuse of 020 cover endpoints.
- `025-feed-window` added no migrations and did not change Prisma schema or API contracts. Frontend-only Prev/Next window over existing 021 cursor/limit GETs.
- `026-dashboard-overview` added no migrations and did not change Prisma schema. Replaced `GET /api/dashboard` response DTO (breaking vs 008/022 clients updated in-feature); membership-scoped aggregations only.

## Known issues

- Q-006 production images deferred; local Compose uses Vite/tsx dev servers
- Q-007 probe list retention deferred
- Q-009 CI/deployment deferred
- Q-015 password complexity beyond non-empty deferred
- Q-017 rate limiting / lockout deferred
- Sidebar and `/projects` grid refetch is pathname-or-create-epoch keyed (`frontend/src/layout/AuthenticatedLayout.tsx` `reloadKey={`${location.pathname}:${projectListEpoch}`}`), so archive/rename can linger until navigation (007 independent review, non-blocking; not a failed AC). Create-project success bumps the shared epoch so sidebar and grid refresh without navigating.
- Copied Dialog CSS animate classes are unused (no `tailwindcss-animate` plugin); dismiss still works (007 informational, non-blocking)
- Radix Dialog marks the board `aria-hidden` while task detail is open; columns stay mounted behind the overlay (007 informational, non-blocking)
- Live palette contrast was not audited in T025 (informational). AC-018 was not re-executed by the polish reviewer; coordinator independently re-ran frontend typecheck (exit 0) and `npm test` (16 files / 133 tests passed, Node 22.13.0).
- Some project-cover slots retint with whole-UI theme tokens when showing name-derived fallback (007 polish T025, low/non-blocking). Uploaded image covers (020) are separate; no stored `coverColor`.
- Dedicated Kanban drop tests cover 403 and archived 409 only; 400/401/404/network share the same revert path (006 independent review, non-blocking; not a failed AC)
- Authenticated users share a global probe list (no ownership, per Q-014); probe HTTP remains, product UI does not
- Projects are membership-authorized (`OWNER`/`EDITOR`/`VIEWER`); dashboard aggregates are membership-scoped as of Verified `026` (008 owner-only superseded)
- Projects created before `009-collaboration` may have no OWNER membership row; `ownerUserId` still grants OWNER. New creates insert an OWNER row.
- Default project list excludes archived; recover archived only via detail GET (Q-021); no `includeArchived` sidebar filter
- Tasks are soft-deleted (`deletedAt`); HTTP DELETE does not remove the row; no restore API
- Archived projects still list/get tasks; create/update/soft-delete return 409
- HTTP 403 is not reachable on `/api/users/me` (no `/api/users/:id`); own-profile authz is in `users` service
- `CORS_ORIGIN=*` is not rejected at config load; current env uses the frontend origin
- Email uniqueness is a unique index plus canonical lowercase in write paths
- Prisma CLI high advisories left in place to stay on Prisma 6
- Backend typecheck excludes test files
- Persistence tests skip if `DATABASE_URL` is missing
- Agent default PATH may be Node 24 without `docker`; use nvm 22.22.3 and Docker Desktop CLI
- No dedicated Prisma persistence integration test for `TaskComment` when `DATABASE_URL` is set (010 independent review, non-blocking; coverage is domain/service/SuperTest + in-memory)
- SuperTest comment list does not explicitly assert cross-task exclusion; `listByTaskId` filters by `taskId` (010 independent review, non-blocking)
- Archived-project owner comment PATCH is not separately SuperTest-asserted; shares `assertParentWritable` with create/delete (010 independent review, informational)
- AC-015 same-tx emit failure covered via in-memory `SnapshotUnitOfWork` only; no Prisma insert-failure integration test (011 independent review, non-blocking)
- ~~TaskDetail activity loads on open; does not auto-refresh after local mutations~~ **Superseded:** 014 reloads activity after Save/comment mutations; 021 resets first-page cursors on those reloads (FR-010)
- Labels list filter 401/403 not reasserted in labels-api suite (relies on existing task-list auth) (012 independent review, non-blocking)
- Soft-deleted task GET with labels covered in tasks-api; labels suite covers assignment 404 (012 independent review, informational)
- LabelsPopover catalog edit path lightly tested; Escape discard covered in unit tests not live Dialog host (013 independent review, non-blocking)
- Failed activity reload after comment mutations not explicitly tested; Save-path failure covered (014 independent review, non-blocking)
- Checklist SuperTest uses in-memory `ImmediateUnitOfWork`; same-tx fail-write covered in service via `SnapshotUnitOfWork` (015 independent review, non-blocking)
- `CHECKLIST_ITEM_UNCOMPLETED` emission asserted in service tests, not separately in checklists-api SuperTest (015 independent review, non-blocking)
- Nested TaskDetail + create-checklist Dialog focus/dismiss beyond unit tests (016 independent review, non-blocking)
- Checklist contrast asserts live in TaskDetail tests, not TaskChecklistsPanel suite (016 independent review, non-blocking)
- Attachments SuperTest: VIEWER `/content` success and cover PUT/DELETE 403 lightly covered (017 independent review, non-blocking)
- `coverAttachmentId` same-task rule enforced in service/repo only (no DB check constraint) (017 independent review, non-blocking)
- No dedicated Prisma attachments-repository persistence suite (017 independent review, non-blocking)
- Status catalog `listByProjectId` for reorder still runs outside `$transaction`; concurrent reorders can race then unique `(projectId, position)` fails and rolls back (018 re-review, informational)
- Board may briefly show empty columns if statuses catalog fetch fails (soft catch) (018 implementer note, informational)
- Kanban pointer click-after-drag relies on activation-distance + suppress ref; automated pointer DnD open-suppress not separately asserted beyond keyboard drag + active-drag click suppress (019 independent review / implementer note, non-blocking)
- Project covers SuperTest: AC-004 oversized → `400 VALIDATION_ERROR` not asserted at API layer (size wired on multipart + domain; covered in domain/middleware tests) (020 independent review, non-blocking)
- Multipart oversized cover responses reuse “Attachment exceeds…” copy (harmless, slightly misleading) (020 independent review, non-blocking)
- Live Compose browser E2E for project cover upload/display not run in 020 close-out (020 informational)
- FR-010 multi-page comments cursor reset asserted for create-path only; edit/delete share the same `Promise.all([loadComments(), loadActivity()])` helper without a parallel multi-page reset test (021 re-review, non-blocking)
- Comments table has `taskId` index only (no composite `(taskId, createdAt)`); plan allowed no migration (021 informational)
- Dashboard charts reviewer did not re-run `npm test` / typecheck (readonly); AC-004 owner scope relied on then-unchanged `GET /api/dashboard` (022 independent review, informational; **026 supersedes owner scope + DTO**)
- 026 overview reviewer did not re-run T010/T011 suites (Ask/readonly); Progress UI shows % with completed/total in tooltip (allowed by AC-005) (026 independent review, informational)
- Unrelated backend `labels-api.test.ts` expects comments body without `nextCursor` while route returns `{ comments, nextCursor }` (observed during 026 full suite; not introduced by 026)
- UI eyecandy reviewer did not re-run T009/T010 suites (readonly); totals from prior implementer log (023 independent review, informational)
- `Card` still ships base `bg-card` under `EYECANDY_SURFACE_CLASS`; gradient via `--eyecandy-surface-image` still satisfies not bg-card-only (023 independent review, low/non-blocking)
- Create-checklist control relies on shared `Button` `cursor-pointer`, not an explicit 023 assert; still meets FR-001 (023 independent review, low/non-blocking)
- Catalog `implemented-features.md` last confirmed through 018; Verified 019–027 entries proposed but not written until user confirms
- Password-change hash+revoke fail-path atomicity covered via in-memory `SnapshotAuthUnitOfWork` only; production uses `PrismaUnitOfWork` + `currentPrisma` (027 Low fix; same pattern as checklist/activity UoW tests)
- Create-path cover: home `/projects` card cover face after create+PUT not separately asserted in `ProjectsPage` tests; relies on epoch refresh + existing `ProjectCard` (024 independent review, low/non-blocking)
- Live Compose browser E2E for create-with-cover card display not run in 024 close-out (024 informational)
- 024 reviewer did not re-run T007/T008 suites (readonly); totals from implementer + close-out re-run (024 independent review, informational)
- AC-005 multi-path reset: create→Next→reset asserted; edit/delete/014 reload share `reloadNewestFeedWindow` without parallel navigate-then-reset tests (025 independent review, low/non-blocking)
- Q-182 dual-feed interleave may omit items beyond the visible ≤5 when Next advances API pages (locked algorithm; accepted) (025 informational)
- 025 reviewer did not re-run T007/T008 suites (readonly); totals from implementer + close-out re-run (025 independent review, informational)

## Next approved work

No next Approved delivery queued. `027-password-change` is Verified (Q-187–Q-189 locked). `023`–`027` batch complete in repo. Deferred: within-column rank **H**; later **C** app-wide audit. Do not implement from `proposed-features.md` without a new Approved feature folder.

## Open decisions

Resolved by `007-workspace-ui`:

- Q-036: `/projects` main content and project-card cover. Owner: product + frontend. Status: **Decided**, later **reopened** by `020-project-covers` Q-155. Use the main area for a grid of project cards. Originally: cover is color + initials derived from the project name; no image upload, no `coverColor` field. **020:** uploaded image covers allowed; name-derived remains null-cover fallback (Q-158). Compact Trello-like card size is added by Q-044.
- Q-037: Forms vs modals and compact chrome. Owner: product + frontend. Status: **Decided**, except the Back-to-projects clause. Compact sidebar names + create `+` modal. Project update is a modal. Archive/unarchive stay on board chrome actions. Add-task is a modal from board-header `+` and per-column `+` (column `+` pre-fills that column’s `status`). Task detail is a modal; the board stays visible. **Superseded:** “Remove always-visible Back to projects because the app name navigates to `/projects`.” Restore Back to projects next to Edit/Archive; keep the app-name link (FR-006).
- Q-038: Board presentation and Dialog. Owner: product + frontend. Status: **Decided**. Compact header (name, short description, actions) and compact filters above the board. Columns are the primary remaining-height focus (presentation, not dashboard aggregates). Compact column width is added by Q-044. Task cards show title, existing priority, and optional due date. Copied shadcn Dialog is allowed. No second CSS framework. No new domain.
- Q-039: Exact cover color and initials algorithm. Owner: frontend. Status: **Applied**. Deterministic hash of the project `name` into a small fixed DevTrack palette; initials from the first letter of the first two whitespace-separated tokens, else the first two characters, else one character; update when `name` changes.
- Q-040: Board-header `+` default status, and navigation after creating a project. Owner: product + frontend. Status: **Applied**. Header `+` omits `status` so the API default `TODO` applies. After successful create-project, close the modal, refresh the owner list, and stay on the current destination. Compact header actions are buttons (plus the restored Back control); DropdownMenu was not added.
- Q-041: Built-in whole-UI palette catalog. Owner: product + frontend. Status: **Decided**. Solids Forest (default), Ocean, Sunset, Violet, Midnight; gradients Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier. Persist only the palette id in localStorage. No profile API, no schema, no migration.
- Q-042: Palette selector placement and storage key. Owner: product + frontend. Status: **Decided**. Apply the palette on the document root. Compact accessible selector on the authenticated top app bar. Guests use stored-or-Forest; a guest-bar selector is not required. Persist only the catalog id under `devtrack.uiPalette`. Do not clear it on logout. Invalid/missing values → Forest.
- Q-043: Whether `@dnd-kit/sortable` is required for drag animation. Owner: frontend. Status: **Decided**. Not required. Use `@dnd-kit/core` `DragOverlay` and/or `useDraggable` `transform`. Do not add `@dnd-kit/sortable`. Keep Q-034 status-only moves.
- Q-044: Exact card and column widths. Owner: frontend. Status: **Decided**. Project cards: CSS grid with `auto-fill` plus a max card width of about 14–18rem, left-aligned, not full-main stretch. Kanban columns: compact max width of about 16–20rem, left-aligned row of three, remaining-height scroll inside the column. Unused main space MAY remain.

Resolved by `006-kanban`:

- Q-033: Keep vs replace the ungrouped 004/005 task list on project-detail. Owner: product + frontend. Status: **Decided**. Replace the ungrouped task list on `/projects/:projectId` with the Kanban board. No list/board toggle. Keep create, optional filters, and nested `TaskDetail`.
- Q-034: Within-column order and whether a persisted `position`/`rank` field is required. Owner: product + `tasks`. Status: **Decided**. Status-only. Drag between columns PATCHes existing task `status`. No `position`/`rank` field, no rank migration, no move endpoint. Same-column drop is a no-op (order not persisted). Within-column visual order stays existing list order (newest `createdAt` first per column).
- Q-035: Drag-and-drop library (additional dependency). Owner: frontend. Status: **Decided**. `@dnd-kit/core` as an explicit documented dependency, added only after the column board works. Do not add `@dnd-kit/sortable`. Do not add a second DnD library.

Resolved by `005-frontend-shell`:

- Q-016: Frontend routing and styling. Owner: frontend. Navigation is real URL destinations; styling is FR-009 / Q-031 layout metaphors with original DevTrack identity.
- Q-028: React Router (SPA/library mode, React 19 + Vite 7 compatible). Destinations are URLs, not `App.tsx` view flags.
- Q-029: Tailwind CSS + copied shadcn/ui and documented peers. No second CSS framework. No full catalog.
- Q-030: No product-UI destination for system probes. `ProbePage` removed; backend probe slice kept.
- Q-031: Layout metaphors only; original DevTrack identity; not a Trello clone. The “no Kanban columns / no drag-and-drop” part is **superseded on project-detail only** by `006-kanban`.
- Q-032: Authenticated left sidebar of the caller’s projects on product destinations; guest login/register have no product sidebar; verified list APIs/rules; profile keeps sidebar; archived detail URL keeps archive/unarchive; no `includeArchived` filter; persistent desktop sidebar is enough. The empty/select-or-create `/projects` main and always-visible create form are **superseded by `007-workspace-ui`**.

Deferred, not blocking:

- Dev vs production container configuration (Q-006)
- Probe list retention bound (Q-007)
- CI and deployment (Q-009)
- Password complexity beyond non-empty (Q-015)
- Rate limiting / lockout (Q-017)

Recorded as Decided and implemented in Verified `008-dashboard`:

- Q-045: Authenticated destination `/dashboard` in existing `AuthenticatedLayout` with a top-app-bar nav link. Keep authenticated `/` → `/projects`. Do not replace the `/projects` card grid. Do not change guest root → register.
- Q-046: Overdue iff `dueDate` is a calendar date strictly before UTC today. Due today is on time. `DONE` is never overdue. Null `dueDate` is never overdue.
- Q-047: Exclude archived owned projects and their tasks from all dashboard summaries and counts. Active owned projects only. Do not add `includeArchived` on `GET /api/projects`. **026:** still exclude archived; scope is membership-active, not owner-only.
- Q-048: Additive backend derived-read `GET /api/dashboard`. Session cookie, owner-scoped. Owner-wide project count, task count, pending, completed, overdue, plus per-project breakdown of the same. No extra lists/charts. Aggregations in a `tasks` use-case over the projects port; no `dashboard` domain or Prisma dashboard model. **SUPERSEDED by Verified `026`:** membership scope (Q6) + replaced overview DTO (Q-186).
- Q-049: Pending = `TODO` + `IN_PROGRESS`. Completed = `DONE`. A pending task may also count as overdue. `DONE` never overdue. **018/`isCompleted` later; 026 openTasks uses `!isCompleted` (no overdue KPI on overview).**
- Q-050: Owner-wide totals plus per-project breakdown. No extra lists, due-soon, charts, or activity. **Charts later shipped in Verified `022-dashboard-v2` (Q-169–Q-176).** **Overview rewrite + due-soon/team KPIs in Verified `026`.**

Recorded as Decided and implemented in Verified `009-collaboration`:

- Q-051: Roles `OWNER`, `EDITOR`, `VIEWER`.
- Q-052: OWNER: all project/task/membership ops. EDITOR: view + PATCH name/description + full task CRUD; no archive/unarchive; no membership admin. VIEWER: project/task read/list only. `ownerUserId` grants OWNER powers even without a membership row.
- Q-053: Add member by existing user email. POST `{ email, role }`. No mail. Unknown email → 404.
- Q-054: Insert creator as OWNER membership row. Only OWNER may manage members. Cannot remove `ownerUserId`. Cannot leave the project with no OWNER. No owner transfer.
- Q-055: `GET`/`POST /api/projects/:projectId/members`; `PATCH`/`DELETE .../members/:userId`. Prisma `ProjectMember` (`id`, `projectId`, `userId`, role enum, `createdAt`, unique `(projectId, userId)`, FKs Restrict). Duplicate → 409.
- Q-056: Members Dialog on the project board header. No members page. No workspace-ui redesign.
- Q-057: Non-owner members MUST NOT GET an archived project by id. Only `ownerUserId` may GET archived. Default list still excludes archived.

Recorded as Decided and implemented in Verified `010-task-comments`:

- Q-058: Author may `PATCH` own comment `body` only. Non-authors (including OWNER/EDITOR) MUST NOT edit.
- Q-059: Soft-delete via nullable `deletedAt`. Author or effective project OWNER may soft-delete. No restore API. Soft-deleted comments omitted from list and treated as not found on item ops.
- Q-060: Mentions out of scope — plain body only; no `@mention` parsing, storage, or notifications.
- Q-061: Plain text only. No Markdown/HTML rich-text requirement; no rich-text editor dependency.
- Q-062: Feature folder is comments only (proposed **D**). Do not implement card activity or labels here.
- Q-063: Create follows task write; list follows task read; edit author-only; soft-delete author OR effective OWNER.
- Q-064: Oldest `createdAt` first among live comments. **List page order superseded by `021` Q-166** (newest-first pages + older via cursor); **025** Prev/Next window UX; write/create ordering unchanged.
- Q-065: Comments owned by existing `tasks` domain.

Recorded as Decided and implemented in Verified `011-task-activity`:

- Q-066: Task activity ≠ app-wide audit **C**; no `specs/005-audit/`; C stays later/separate.
- Q-067: Activity owned under `tasks`.
- Q-068: List via task read (`requireTaskRead`).
- Q-069: Read-only section in `TaskDetail`; no new route; no board-card strip.
- Q-070: One field-change event per successful PATCH.
- Q-071: Field names + old/new for changed fields only.
- Q-072: No emit on no-op PATCH.
- Q-073: Newest `createdAt` first.
- Q-074: Forward-only; no backfill.
- Q-075: Comment-added stores `commentId` + short body preview.
- Q-076: Resolve `actorDisplayName` at list time.
- Q-077: Same DB transaction; fail write if event insert fails.
- Q-078: Full list; no pagination. **Superseded by `021-feed-pagination` Q-165** (cursor/limit; default 5; max 50; `nextCursor`).
- Q-079: `GET /api/tasks/:taskId/activity` → `{ activity: [...] }`. **Response envelope superseded by 021** → `{ activity, nextCursor }` with optional `cursor`/`limit` query.

Recorded as Decided and implemented in Verified `012-task-labels`:

- Q-080: Labels owned under `tasks` (catalog + assignment).
- Q-081 / Q-082: Catalog CRUD and task assign = OWNER+EDITOR (`requireTaskWrite`); reads = task read.
- Q-083: Required color from fixed named tokens (no freeform hex).
- Q-084: Name unique after trim, case-insensitive within project.
- Q-085: Hard-delete label + clear assignments; no restore.
- Q-086: `PUT /api/tasks/:taskId/labels` replace-set `{ labelIds }`.
- Q-087: Embed `labels: [{ id, name, color }]` on `PublicTaskDto`.
- Q-088: Optional single `labelId` filter AND with status/priority.
- Q-089: No activity events for label changes.
- Q-090: Board Labels Dialog + TaskDetail assign + card face + filter.
- Q-091: Allow PATCH name and/or color.
- Q-092: Name 1–40 after trim; no hard count caps.
- Q-093: Archived mutate same as task writes (409/403); reads allowed.

Recorded as Decided and implemented in Verified `013-task-detail-layout`:

- Q-094: Label checkbox selection persists on popover close (batch), not each toggle.
- Q-095: Catalog create/edit in TaskDetail Labels Popover and board Labels Dialog.
- Q-096: One right panel “Comments & activity”; compose on top; interleaved newest-first.
- Q-097: Action row Labels only (no Dates/Checklist/Attachment placeholders).
- Q-098: Two columns from `md+`; stack below.
- Q-099: Outside-click/Done apply; Escape discards uncommitted toggles.
- Q-100: Omit `COMMENT_ADDED` activity rows in the interleaved panel (avoid duplicate with live comments).
- Q-101: shadcn Popover + `@radix-ui/react-popover`.

Recorded as Decided and implemented in Verified `014-task-detail-polish`:

- Q-102: Reload activity after task Save and comment create/edit/delete (live right timeline).
- Q-103: Color picker is a swatch grid of the existing nine tokens only (no freeform expansion).
- Q-104: New folder `014-task-detail-polish` (do not reopen Verified 013 as Draft).

Recorded as Decided and implemented in Verified `015-task-checklists`:

- Q-105: Checklists (**F**) before attachments (**G**).
- Q-106: One or more named checklists per task; items text + checked (not child tasks).
- Q-107 / Q-108: Attachments / local Compose storage out of scope here (deferred with **G**).
- Q-109: SUPERSEDED by Q-109b (prior “no activity” void).
- Q-109b: Emit `CHECKLIST_ADDED`, `CHECKLIST_REMOVED`, `CHECKLIST_ITEM_COMPLETED`, `CHECKLIST_ITEM_UNCOMPLETED` same-tx; no emit on item add/delete or checklist rename.
- Q-110: Mutations = `requireTaskWrite`; list = `requireTaskRead`.
- Q-111: Archived parent same as task writes (owner 409 / other members 403).
- Q-112: Hard-delete checklist cascades items; hard-delete item; no soft-delete.
- Q-113: Order by `createdAt` ascending only; no drag reorder / position.
- Q-114: Name 1–80; item text 1–200 after trim.
- Q-115: Do not embed checklists on `PublicTaskDto` / Kanban card face.
- Q-116: Name required (no server default empty name).
- Q-117: Nested REST under `/api/tasks/:taskId/checklists` (+ items).
- Q-118: Action-row Checklist + main-column lists in TaskDetail.
- Q-119: Allow rename / edit text / toggle checked after create.
- Q-120: Empty checklists allowed.
- Q-121: Checked defaults false; create body `{ text }` only; PATCH `text` and/or `checked`.
- Q-122: Per-checklist progress bar (checked/total %; empty → 0%).
- Q-123: Mark checked with strikethrough; do not hide checked items.
- Q-124: Activity payloads ids + name/text previews; render four kinds in Comments & activity.

Recorded as Decided and implemented in Verified `016-ui-refinements`:

- Q-125: Split custom statuses to a future feature; ship fixed-enum friendly presentation in 016 (1+3).
- Q-126: Create-checklist Dialog from Checklist button; remove inline primary create.
- Q-127: Friendly copy `To do` / `In progress` / `Done`.
- Q-128: Friendly chrome on TaskDetail status control + Kanban column headers only.
- Q-129: Checklist blocks use `bg-card` + border.

Recorded as Decided and implemented in Verified `017-task-attachments`:

- Q-130: Attachments + cover-from-image-attachment in this folder.
- Q-131: Local Compose named volume; path `{root}/{projectId}/{taskId}/{attachmentId}`.
- Q-132: Hard-delete row+blob; soft-deleted task → 404 keep rows/blobs; no GC; no attachment soft-delete.
- Q-133: jpeg/png/webp/gif + pdf + text/plain; **20 MiB**/file; 20/task; magic sniff; no AV (amended from 5 MiB).
- Q-134: Write mutate / read list+download; archived like checklists.
- Q-135: `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` same-tx.
- Q-136: Nested multipart under tasks + authenticated `/content`.
- Q-137: Amended — action-row Attachment **Popover** (Labels-like) for upload; attachment list stacked in main column (no inline upload form).
- Q-138: Nullable pointer to image attachment; Kanban face; clear ≠ delete; delete cover attachment clears cover.
- Q-139: Session + `requireTaskRead`; no public/unsigned URLs.
- Q-140: `PublicTaskDto.cover` summary only; not full attachments array.

Recorded as Decided and implemented in Verified `018-custom-task-statuses`:

- Q-141: Per-project status catalog (labels-like).
- Q-142: Seed TODO/IN_PROGRESS/DONE; name/color/`isCompleted` editable on all rows; keys immutable; full-list catalog reorder via `ProjectStatus.position` (not **H**); delete-in-use blocked; seeded deletable when unused; last-status and ≥1 non-completed guardrails.
- Q-143: Dynamic Kanban columns from catalog; DnD sets status key.
- Q-144: Dashboard pending/completed/overdue via catalog `isCompleted`.
- Q-145: Catalog CRUD + reorder = OWNER + EDITOR (`requireTaskWrite`).
- Q-146: `Task.status` = stable string key (not enum, not FK) + `ProjectStatus` catalog metadata.
- Q-147: Task status activity via `TASK_FIELDS_CHANGED` keys only; no catalog CRUD/reorder events.
- Q-148: TaskDetail + filter + Kanban; header create default-only; column `+` prefills key.
- Q-149: Colors from fixed label tokens; no icons; no WIP.
- Q-150: Exclude **H**, attachments reopen, and **C** / `specs/005-audit/`.

Recorded as Decided and implemented in Verified `019-ui-polish`:

- Q-151: Enabled product buttons and links use pointer/hand cursor.
- Q-152: Entire Kanban task card opens TaskDetail (not title-only).
- Q-153: Authenticated top-bar **Projects** → `/projects` alongside **Dashboard**; DevTrack brand still → `/projects`.
- Q-154: `@dnd-kit` activation-distance / cancel-on-click; completed drag (including cross-column status move) MUST NOT open TaskDetail.

Recorded as Decided and implemented in Verified `020-project-covers`:

- Q-155: Project cover is an **IMAGE upload** (not color-only). Reopens/supersedes 007 Q-036/Q-039 name-derived-only as the sole cover mechanism.
- Q-156: Attachments-like storage: Compose named volume + authenticated content; metadata in PostgreSQL; no public unsigned URLs.
- Q-157: Mutate = OWNER + EDITOR (`requireProjectWrite`-style); VIEWER read-only; archived mutations match project PATCH.
- Q-158: Null cover → **name-derived color + initials** fallback on `/projects` cards.
- Q-159: Dedicated volume `project_covers_data` + env `PROJECT_COVERS_ROOT` (not under task `attachments_data`).
- Q-160: Allowlist `image/jpeg|png|webp|gif`; **5 MiB** max; magic sniff; no AV; exactly one cover per project (replace).
- Q-161: Explicit **clear** removes active cover metadata + blob without deleting the project; replace hard-deletes prior blob.

Recorded as Decided and implemented in Verified `021-feed-pagination`:

- Q-162: Paginate **both** task activity and task comments.
- Q-163: **Cursor + limit**; default **limit = 5**.
- Q-164: **Load more** UX (not infinite scroll requirement). **UI superseded by `025-feed-window` Prev/Next window replace.**
- Q-165: Supersedes 011 Q-078 / AC-016 full-list and 010 full-list GET comments list assumption; write contracts otherwise intact.
- Q-166: Both first pages return the **newest** `limit` items; older pages via cursor; within-page newest-first for both feeds. (**025** Next fetches older; Prev via FE stack.)
- Q-167: Originally one shared Load more with append re-interleave. **Superseded by `025` Q-182:** interleave current pages only, show ≤5, replace (no append buffer).
- Q-168: Max **limit = 50**; default remains **5** when omitted.

Recorded as Decided and implemented in Verified `022-dashboard-v2`:

- Q-169: Default visualization = **stacked bars** of pending/completed/overdue **by project** from existing aggregates. **SUPERSEDED by `026` fixed overview composition** (KPI + pie + checklist bars + progress).
- Q-170: Also offer **pie/donut** rendering. **026** keeps Recharts pie for task counts by status key (different units).
- Q-171: Chart library = **Recharts** as an explicit documented frontend dependency (no second chart library). **Kept by 026.**
- Q-172: Prefer derive from `GET /api/dashboard`; current payload sufficient → **no API extension**. **SUPERSEDED by `026` Q-186 DTO replace.**
- Q-173: Keep **owner-scoped** dashboard semantics. **SUPERSEDED by `026` Q6 MEMBERSHIP-SCOPED.**
- Q-174: Chart mode is **session/page UI state only** (no localStorage/Prisma); default stacked bars on each visit. **SUPERSEDED:** 026 removes mode toggle for fixed template layout.
- Q-175: Chart region has an accessible name; existing numeric summaries remain visible; no full screen-reader chart navigation suite required.
- Q-176: Pie/donut uses owner-wide pending/completed/overdue as three slices (categories; pending∩overdue overlap allowed, not a partition of `taskCount`). **SUPERSEDED by `026` Q-184** pie = task counts by live status key.

Recorded as Decided and implemented in Verified `023-ui-eyecandy`:

- Q-177: Exact dark palette ids/labels = **`Obsidian`**, **`Noir`**, **`Dusk`** (catalog + CSS tokens; same localStorage `devtrack.uiPalette` rules as Q-041/Q-042).
- Q-178: Dashboard/profile work is **visual polish only** on current cards; **026** owns overview layout/data rewrite (shipped Verified).

Recorded as Decided and implemented in Verified `024-project-cover-on-create`:

- Q-179: Soft-failure user copy after create = **“Project created, but cover upload failed.”**; keep successful-create Dialog close + list refresh.
- Q-180: Create+cover is **soft-fail** — project remains without cover if cover PUT fails after create succeeds (not a single transaction).

Recorded as Decided and implemented in Verified `025-feed-window`:

- Q-181: Prev via **FE cursor/window stack** (snapshot stack); **no** `prevCursor` API unless a material gap is proven then amend.
- Q-182: Interleave newest-first from **current** fetched comments + activity pages only; show newest **≤5**; Next/Prev **replace** (no append buffer). Supersedes 021 Load more append UX.

Recorded as Decided and implemented in Verified `026-dashboard-overview`:

- Q6: Dashboard scope = **MEMBERSHIP-SCOPED** active projects (OWNER/EDITOR/VIEWER; VIEWER included). **SUPERSEDES 008 Q-048 / 022 Q-173 owner-only.**
- Q5=3: Tasks bars = checklist completion % per project; Progress = completed/total tasks per project.
- Q-183: Empty pie/bars/progress = **empty success UI** (not an error).
- Q-184: Projects pie units = **task counts by live status key** (not project-status entity; not 022 pending/completed/overdue slices).
- Q-185: Team Members KPI includes users across VIEWER memberships (locked by Q6).
- Q-186: Carefully **replace** `GET /api/dashboard` response shape (keep path); update 008/022 clients in-feature. Breaking vs prior DTO.

Recorded as Decided and implemented in Verified `027-password-change`:

- Q-187: After successful password change, **revoke all other** sessions; **keep** the current session active.
- Q-188: New password **min 8** after trim; non-empty; must differ from current; no further complexity; confirm-new is **FE-only**.
- Q-189: `POST /api/auth/password` body `{ currentPassword, newPassword }` → `204 No Content`.

Do not silently turn an open question into an architectural decision.

## Memory rules

At session start: read governing files and inspect the repo.

After meaningful work, record verified changes, decisions and rationale, commands and actual results, known issues, remaining questions, and the next approved task.

Distinguish implemented, planned, proposed, and unverified. Never store secrets here.
