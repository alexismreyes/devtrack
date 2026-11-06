# Feature Specification: Custom Task Statuses

- **ID:** 018-custom-task-statuses
- **Status:** Verified
- **Created:** 2026-11-06
- **Related features:** 001-foundation through 017-task-attachments (Verified); deferred from `016-ui-refinements` **Q-125**; within-column rank (**H**), attachments reopen, and app-wide audit (**C**) out of scope

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Material product questions **Q-141–Q-150** are **Decided** (section 15). Implementation may proceed on T001–T017 only. Do **not** write `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** reopen Verified attachments (**017**), checklist, labels, comments, or activity contracts beyond the additive status-catalog surfaces this feature defines. Prefer folder `specs/018-custom-task-statuses/`.

This ID is **018-custom-task-statuses** (follow-on from Q-125 split). Friendly fixed-enum presentation (`To do` / `In progress` / `Done`) already shipped in Verified `016` without schema change; this feature is the real customizable catalog.

## 1. Problem

Verified DevTrack persists membership-authorized projects and tasks with a **fixed** Prisma `TaskStatus` enum (`TODO` | `IN_PROGRESS` | `DONE`). Kanban is three hard-coded columns; dashboard pending/completed/overdue formulas assume those three values; TaskDetail and filters use the same enum; activity field-change payloads store the enum strings.

Users want **additional statuses** (for example On hold, Cancelled) that match their workflow. Fixed friendly labels from `016` do not solve that. Custom statuses collide with enum storage, Kanban column contracts, dashboard definitions, filters, create-task defaults, and activity payloads — so they need an explicit Approved feature, not polish.

## 2. Goals

- Let OWNER and EDITOR maintain a **per-project** user-defined status catalog and assign catalog statuses to tasks through the backend.
- Preserve authentication distinct from authorization: reuse Verified `TaskAuthorizationPort` / membership; frontend hiding MUST NOT replace backend checks.
- Keep domain ownership under existing **`tasks`** (no peer `statuses` product domain).
- Evolve Kanban (dynamic columns), TaskDetail status control, board status filter, column create prefill, and dashboard pending/completed/overdue definitions per Decided Q-142–Q-148.
- Persist `Task.status` as a **stable freeform string key** (not Postgres enum, not UUID FK) while still owning display name / color / `isCompleted` / seed marker on a **project status catalog table**; migrate existing `TODO` / `IN_PROGRESS` / `DONE` values without `migrate reset` or volume delete.
- Reuse session cookie `devtrack_session`, Zod, error envelope, npm / Node.js 22 / PostgreSQL 16 / Prisma 6, Vitest + Testing Library + SuperTest, modular monolith, Prisma behind owning-domain repositories, and an **additive** (or carefully authorized non-destructive) migration only.
- Leave within-column **task** rank (**H**), attachments reopen, and app-wide audit (**C**) out of this folder. **Status-catalog** column order (persisted on `ProjectStatus`) is in scope per Q-142; that is not **H**.

## 3. Non-Goals

- Within-column **card** order / task `position` / `rank` (`proposed-features.md` **H**) — out of scope; Kanban same-column drop remains a no-op. (Distinct from **status-catalog** `position`/`rank` on `ProjectStatus`, which **is** in scope.)
- Reopening Verified task attachments / covers (`017`) beyond any incidental status DTO display needs.
- App-wide CRUD audit (`proposed-features.md` **C`); do not write `specs/005-audit/`.
- Assignees, search, notifications, calendar, invite-by-email (**M**), public share links (**O**), AI.
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- Production images, CI, or deployment (Q-006, Q-009); probe retention (Q-007); password complexity (Q-015); rate limiting / lockout (Q-017).
- Hard-delete of task or project rows; restore of soft-deleted tasks; `includeArchived` on project list.
- Changing `constitution.md`.
- Status icons and WIP limits (Q-149 Decided colors-only).
- Pure unconstrained free-text `Task.status` with **no** catalog (forbidden; assignment MUST validate against the project catalog).

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR, I want to create additional task statuses for my project, so that workflows can include states beyond To do / In progress / Done.

### User Story US-002

As an OWNER or EDITOR with task write, I want to set a task’s status to any allowed catalog status (including extras), so that the board and TaskDetail reflect real work state.

### User Story US-003

As an authenticated project member who can read tasks, I want Kanban and TaskDetail to show one column / option per catalog status in the project’s catalog order, so that custom statuses are usable without guessing API values.

### User Story US-008

As an OWNER or EDITOR, I want to reorder the full status catalog (seeded + custom) on the board/catalog, so that columns match our workflow without changing status keys.

### User Story US-004

As a project owner reading the dashboard, I want pending / completed / overdue counts to use each status’s `isCompleted` flag, so that summaries stay trustworthy with customs.

### User Story US-005

As a VIEWER, I want to see catalog statuses and task status values without mutating the catalog, so that hiding UI is not treated as authorization.

### User Story US-006

As a developer, I want statuses owned inside the existing `tasks` domain with narrow ports and no circular domain imports, so that Verified membership, comments, activity, labels, checklists, and attachments invariants stay intact.

### User Story US-007

As a developer, I want an additive migration from fixed enum rows to string keys plus seeded catalog rows, so that existing boards keep working after deploy without destructive reset.

## 5. Functional Requirements

- **FR-001:** The system MUST support a **per-project** user-defined status catalog (Q-141). New projects MUST **seed** three default statuses with keys `TODO` / `IN_PROGRESS` / `DONE` and initial display names `To do` / `In progress` / `Done` (Q-142 / FR-017). Seeded defaults are **not** immutable privileges.
- **FR-002:** Each catalog status MUST have a system-assigned unique identity (`id`), an immutable **stable key** string (immutable after create), a display name, a fixed color token, optional seed marker `isSystem` (true only for the three seeded defaults; informational — **not** a non-deletable / non-editable privilege), `isCompleted`, `projectId`, a persisted catalog **order** field (`position` / `rank` on `ProjectStatus` — status-catalog column order, **not** within-column task rank **H**), and `createdAt`. Client MUST NOT supply `id`, `key`, `isSystem`, or `createdAt`. Display name uniqueness is case-insensitive per project (`nameKey` strategy, labels-like). Name length 1–40 after trim (labels precedent).
- **FR-003:** A task MUST store exactly one status as the catalog **key** string for its project. Create MUST default to key `TODO` when that key still exists in the project catalog; otherwise default to the first `isCompleted=false` status by catalog position (plan-locked fallback). Assignment of an unknown key, cross-project key, or key not present in that project’s catalog MUST fail without persisting. This is **not** unconstrained free text.
- **FR-004:** Catalog list/read MUST require authentication plus project **task-read**. Catalog create/update/delete/reorder MUST require **OWNER + EDITOR** via `requireTaskWrite` (Q-145). Task status mutation MUST continue to require task write (`requireTaskWrite`: OWNER + EDITOR, including `ownerUserId` OWNER grant).
- **FR-005:** Persistence MUST follow Q-146 Decided reconciliation: `Task.status` is a Prisma/Postgres **string** (not enum, not FK); catalog metadata lives in a `ProjectStatus` (name TBD) table. Prefer an additive expand–backfill–constrain migration that preserves existing task rows’ `TODO` / `IN_PROGRESS` / `DONE` text. MUST NOT use `migrate reset` or delete Docker volumes without explicit user authorization. Prisma MUST stay behind owning-domain repositories.
- **FR-006:** Kanban MUST show **one dynamic column per catalog status** (Q-143). Drag-and-drop MUST persist status through the backend via `PATCH` task `{ status: <key> }`. Same-column drop MUST remain a no-op (no **task** rank — non-goal **H**). Column order MUST follow persisted catalog order (`ProjectStatus` position/rank ascending) for the full list (seeded + custom) (Q-142 allow reorder).
- **FR-007:** Dashboard owner-scoped aggregates MUST use catalog `isCompleted` (Q-144): pending = tasks whose status key resolves to `isCompleted=false`; completed = `isCompleted=true`; overdue = `!isCompleted` and `dueDate` strictly before UTC today (preserve Q-046/Q-049 shape). `GET /api/dashboard` MUST remain session-authenticated and owner-scoped (not membership).
- **FR-008:** Board status filter, TaskDetail status select, and Kanban (including column `+` prefill) MUST use the live project catalog (Q-148). Header create-task Dialog remains **default-only** (no status field); server defaults to `TODO`. Column `+` MUST prefill that column’s status key.
- **FR-009:** Task status changes MUST emit via existing `TASK_FIELDS_CHANGED` only, with old/new values as the **status keys**. Catalog CRUD and reorder MUST NOT emit activity events (Q-147). Still not app-wide audit **C**.
- **FR-010:** Authentication MUST remain distinct from authorization. Protected operations MUST require a valid `devtrack_session`. Frontend-only hiding MUST NOT replace backend checks.
- **FR-011:** The backend MUST remain a modular monolith. Owning domain: **`tasks`**. A generic repository MUST NOT be introduced. Circular domain dependencies MUST NOT be introduced.
- **FR-012:** External input MUST be validated at HTTP boundaries with Zod. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, session ids in JSON, or sensitive database data.
- **FR-013:** Each catalog status MUST have a **color** from the fixed labels-like token set: `RED` | `ORANGE` | `YELLOW` | `GREEN` | `TEAL` | `BLUE` | `PURPLE` | `PINK` | `GRAY` (Q-149). No status icons. No WIP limits.
- **FR-014:** This feature MUST NOT implement within-column **task** rank (**H**), reopen attachments beyond incidental DTO needs, or app-wide audit (**C**). Status-catalog order on `ProjectStatus` is allowed (Q-142). It MUST NOT write `specs/005-audit/`. It MUST NOT change `constitution.md`.
- **FR-015:** Domain status key identity, catalog association, assignment validation, authz-vs-auth, dashboard classification, catalog order, and Kanban column mapping MUST be testable without HTTP or Prisma where practical. API and critical UI behavior MUST be tested with Vitest, Testing Library, and SuperTest as applicable.
- **FR-016:** Archived-parent behavior for catalog mutate (including reorder) and task status mutate MUST match existing task-write semantics: authorized `ownerUserId` → `409` `CONFLICT`; other members → `403`; reads still allowed under task-read rules.
- **FR-017:** Seeded defaults start as `To do` / `In progress` / `Done` with keys `TODO` / `IN_PROGRESS` / `DONE`. On **all** catalog rows (seeded and custom): display **name**, **color**, and **`isCompleted` MAY be edited**; catalog **key** MUST remain immutable after create. **Delete** is blocked while any live task in the project uses that key (**A**). Seeded rows (`isSystem=true`) are deletable when not in use — there is **no** special non-deletable system privilege beyond seed. Guardrails (plan-locked): MUST NOT delete the last remaining status in a project; MUST leave at least one `isCompleted=false` status (reject delete or `isCompleted` flip that would leave zero non-completed statuses). Done’s `isCompleted` MAY be flipped by editors; dashboard follows live flags (Q-142). Full catalog **MAY** be reordered.
- **FR-018:** Custom status create body: `{ name, color, isCompleted? }` with `isCompleted` defaulting to `false`. Seeded Done starts `isCompleted=true`; seeded To do and In progress start `false` (all three later editable per FR-017). New customs append at the end of catalog order (highest position + 1) unless a later Decided rule says otherwise.
- **FR-019:** OWNER/EDITOR MUST be able to **reorder the full status catalog** (seeded + custom) via a dedicated reorder API and corresponding Kanban/catalog UI. Persisted order is `ProjectStatus` position/rank. List and Kanban columns MUST return/render in that order. Reorder MUST NOT change keys, names, colors, `isCompleted`, or `isSystem`. This is **not** proposed-feature **H**.

### Permission mapping

| Operation | Authorization |
| --- | --- |
| List catalog / see statuses on tasks / filter by status | Task read (OWNER, EDITOR, VIEWER) |
| Create / update / delete / reorder catalog statuses | OWNER + EDITOR (`requireTaskWrite`) |
| Change task status | Task write (OWNER + EDITOR) |
| Non-member on existing project | `403` |
| Missing project | `404` |
| Soft-deleted or missing task | `404` |
| Archived parent mutations | `ownerUserId` → `409`; other members → `403`; reads still allowed |

## 6. Acceptance Criteria

### Scenario AC-001: Create custom catalog status

- Given an authenticated OWNER or EDITOR on a project
- When they create a status with a valid display name, allowed color token, and optional `isCompleted`
- Then the status is persisted in that project catalog with system-assigned `id` and immutable stable `key`, `isSystem=false`
- Then an authorized reader can list it via the catalog list endpoint

### Scenario AC-002: Assign custom status to a task

- Given a live task and a custom catalog status in the same project
- When an OWNER or EDITOR PATCHes the task with `{ status: <that status key> }`
- Then the task persists that string key on `Task.status`
- Then authorized readers see that string on get/list and in TaskDetail (resolved via catalog for display/color)

### Scenario AC-003: Reject cross-scope or unknown status key

- Given a status key belonging to another project’s catalog, or a key not in the task’s project catalog
- When a writer attempts to assign it to a task
- Then the operation fails without persisting an invalid status

### Scenario AC-004: Seeded defaults remain usable after migration

- Given existing tasks with enum/`TODO` / `IN_PROGRESS` / `DONE` values
- When the additive migration is applied via `prisma migrate deploy`
- Then those tasks still store equivalent string keys without data loss
- Then each existing project has the three seeded catalog rows; create-task still defaults to `TODO` when that key exists

### Scenario AC-005: Kanban reflects dynamic catalog columns

- Given a project with at least one custom status
- When an authorized member opens the project board
- Then columns are one per catalog status in persisted catalog order (`ProjectStatus` position/rank)
- Then cross-column drop PATCHes `{ status: <column key> }`; same-column drop is a no-op (no within-column task rank **H**)

### Scenario AC-006: Dashboard counts with custom statuses

- Given owned active projects with tasks in default and custom statuses (including overdue due dates and at least one custom with `isCompleted=true`)
- When the owner calls `GET /api/dashboard`
- Then pending / completed / overdue follow `isCompleted` + due-date rules (Q-144)
- Then membership-only (non-owner) callers still see owner-scoped zeros / isolation as Verified

### Scenario AC-007: Authorization matrix

- Given VIEWER vs EDITOR vs OWNER vs non-member vs unauthenticated
- When catalog and task-status operations are attempted
- Then results match FR-004 (`401` / `403` / success as applicable); VIEWER cannot CRUD catalog

### Scenario AC-008: Filters and selectors use catalog

- Given a project catalog with custom statuses
- When a member uses board status filter, TaskDetail status select, and column `+`
- Then options and filter values use catalog keys/names/colors; header create has no status field and defaults to `TODO`

### Scenario AC-009: Activity behavior

- Given a successful task status PATCH that changes the key
- When activity is listed
- Then one `TASK_FIELDS_CHANGED` event includes status old/new **keys**
- Then catalog create/update/delete produces no activity events

### Scenario AC-010: Delete / rename / edit rules

- Given any catalog status (seeded or custom) with no live tasks using its key, and at least one other status remaining, and at least one other `isCompleted=false` status remaining after the delete
- When a writer deletes it
- Then it is removed and no longer listed
- Given any catalog status still referenced by at least one live task in the project
- When a writer attempts delete
- Then the operation fails with conflict and tasks keep their keys (**A**)
- Given the last remaining status in a project, or the last `isCompleted=false` status
- When a writer attempts delete (or flips the last non-completed status to completed)
- Then the operation is rejected (plan-locked guardrails)
- Given any catalog status (including seeded Done)
- When a writer renames it or changes color / `isCompleted`
- Then the key is unchanged, tasks keep working, and dashboard classification follows the new `isCompleted` flag
- Given any catalog status
- When a writer attempts to change `key`
- Then the operation is rejected (key immutable after create)

### Scenario AC-011: Non-goals held

- Given this feature folder
- When implementation is complete (after Approve)
- Then no within-column **task** `position`/`rank` (**H**), no attachments feature reopen, no `specs/005-audit/`, no status icons, and no WIP limits; colors use fixed tokens only
- Then status-catalog order on `ProjectStatus` may exist (Q-142) and MUST NOT be confused with **H**

### Scenario AC-014: Reorder full status catalog

- Given a project catalog with seeded and custom statuses
- When an OWNER or EDITOR reorders the full list (seeded + custom) via the reorder API / Kanban-or-catalog UI
- Then the new order is persisted on `ProjectStatus` position/rank
- Then catalog list and Kanban columns follow that order
- Then reorder alone leaves keys, names, colors, `isCompleted`, and `isSystem` unchanged
- Then VIEWER cannot reorder

### Scenario AC-012: Additive / non-destructive migration

- Given a database with Verified task rows
- When the feature migration is applied via `prisma migrate deploy`
- Then existing data remains; no `migrate reset` or volume delete is required

### Scenario AC-013: Domain ownership

- Given the modular monolith
- When status catalog + assignment ship
- Then ownership stays in `tasks` with `TaskAuthorizationPort` and no peer statuses domain

## 7. Business Rules

- Task status is a required single **catalog key** string for the task’s project — owning domain: `tasks`.
- Catalog is per-project; new projects seed three defaults (`TODO` / `IN_PROGRESS` / `DONE`); name/color/`isCompleted` editable on all rows; keys immutable after create; full catalog reorderable; delete blocked while in use (**A**); seeded rows deletable when unused; cannot delete last status; must keep ≥1 non-completed — owning domain: `tasks`.
- Kanban: one column per catalog status in catalog order; DnD writes key — owning domain: `tasks` + frontend board.
- Dashboard: pending = `!isCompleted`; completed = `isCompleted`; overdue = `!isCompleted` + dueDate before UTC today (follows live flags, including flipped Done) — owning domain: `tasks`.
- Authn ≠ authz; membership roles unchanged (`OWNER` / `EDITOR` / `VIEWER`) — owning domains: `auth`, `project-members`, `tasks`.
- No within-column **task** rank (**H**) in this feature; catalog `position`/`rank` on `ProjectStatus` is allowed — owning domain: `tasks` / frontend.
- Colors from fixed token set only — owning domain: `tasks`.

## 8. Data

Business concepts (Prisma details belong in the plan):

- **Status catalog entry:** `id`, `projectId`, immutable `key`, display `name` / `nameKey`, `color` token, `isSystem` (seed marker only), `isCompleted`, catalog **`position`/`rank`** (order among statuses in the project; **not** task card order), `createdAt`.
- **Task status:** `Task.status` string = catalog `key` (no FK). Integrity enforced in domain/service (validate key ∈ project catalog).
- **Seeded keys:** `TODO`, `IN_PROGRESS`, `DONE` (preserve today’s wire values on seed/migration).
- **Custom keys:** server-assigned opaque stable strings (UUID form recommended); never client-supplied; never change on rename.
- **Default seed order:** `TODO`, `IN_PROGRESS`, `DONE` at positions 0, 1, 2 (or equivalent contiguous ranks); customs append after existing max.
- **Lifecycle:** hard-delete any unused status (including seeded) subject to last-status and ≥1 non-completed guardrails; block when in use; no soft-delete of statuses; reorder updates only catalog order fields; name/color/`isCompleted` editable on all rows.
- **Migration:** convert enum column to string; seed three default rows per project with default order; existing values already match seeded keys.

## 9. API and Integrations

- List / create / update / delete / **reorder** status catalog entries under the project path.
- Reorder accepts an ordered list of status ids (full set for the project) and persists catalog `position`/`rank`; Kanban column order follows list order.
- Task create/get/list/update continue to use `status` as a **string key** on the wire (`PublicTaskDto.status: string`).
- List filter `?status=<key>` validates against the project catalog.
- Dashboard derived read uses `isCompleted` via catalog join/lookup.
- Reuse session cookie auth; no bearer token in JS.

## 10. Security

- Valid `devtrack_session` required for protected routes.
- Resource-level checks via `TaskAuthorizationPort` (and project existence rules consistent with labels/tasks).
- Catalog writers: OWNER + EDITOR; task status writers: task-write.
- Validate keys, names, colors, ids at HTTP boundary; do not leak stack traces or secrets.

## 11. Non-Functional

- Educational clarity: labels-like catalog + string key on task (honest Q-146 option 2 with catalog metadata).
- Board must remain usable with a modest number of custom statuses; no invented hard caps unless product later Decides one.
- Do not invent numeric performance SLOs.

## 12. Dependencies

- Existing features: Verified `004-tasks`, `006-kanban`, `007-workspace-ui`, `008-dashboard`, `009-collaboration`, `011-task-activity`, `012-task-labels` (catalog + color token precedent), `016-ui-refinements` (friendly labels + Q-125 deferral), `017-task-attachments`.
- Architectural constraints: constitution Articles II–V, VII–IX; modular monolith; additive/non-destructive migrations.
- External dependencies: none new expected; justify any new npm package in the plan if needed (DnD library already present).

## 13. Failures and Edge Cases

- Unauthenticated catalog or task status ops → `401`.
- Non-member on existing project → `403`.
- Missing project → `404`.
- Soft-deleted task → `404` on item ops.
- Archived parent mutations → `409` for `ownerUserId`, `403` for other members.
- Duplicate status name (case-insensitive) → `409`.
- Delete status still assigned → `409` (**A**).
- Delete last remaining status → `409`.
- Delete or `isCompleted` flip that would leave zero non-completed statuses → `409`.
- Attempt to change catalog `key` → `400` or `409`.
- Unknown status key on task PATCH → `400`.
- Invalid color token → `400`.
- Reorder with missing/extra/duplicate status ids → `400`.
- Every status MUST be classifiable via `isCompleted` (no unmapped bucket).

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001 | API + domain tests |
| FR-002 | AC-001, AC-010 | Domain + API |
| FR-003 | AC-002, AC-003, AC-004 | Service + API |
| FR-004 | AC-007 | SuperTest authz matrix |
| FR-005 | AC-004, AC-012 | Migration apply + tests |
| FR-006 | AC-005, AC-014 | Frontend + PATCH tests |
| FR-007 | AC-006 | Dashboard domain + API |
| FR-008 | AC-008 | Frontend + list filter API |
| FR-009 | AC-009 | Activity service/API |
| FR-010 | AC-007 | SuperTest |
| FR-011 | AC-013 | Review + module layout |
| FR-013 / FR-014 | AC-011 | Review non-goals |
| FR-015 | AC-001–AC-010, AC-014 | Vitest / SuperTest / Testing Library |
| FR-016 | AC-007 | Archived cases |
| FR-017 / FR-018 | AC-004, AC-008, AC-010 | UI + seed + edit/delete guardrails |
| FR-019 | AC-014, AC-005 | Reorder API + Kanban/catalog UI |

## 15. Open Questions

All material questions below are **Decided**. Recommendations that differed are noted.

### Q-141 — Catalog scope — **Decided: 1**

**Per-project catalog** (mirror labels): each project has its own statuses; tasks only use statuses from their project.

### Q-142 — Relationship to the fixed three; rename / delete / reorder — **Decided** (user-confirmed amend)

- New projects still **seed** To do / In progress / Done (keys `TODO` / `IN_PROGRESS` / `DONE`).
- Defaults are **NOT** immutable privileges: **name**, **color**, and **`isCompleted` MAY be edited** on all statuses including seeded ones (Done’s `isCompleted` may be flipped; dashboard follows flags).
- Catalog **keys** stay **immutable** after create (stable string on `Task.status`).
- **Allow reorder** of the **full** column/catalog list (seeded + custom) on Kanban/catalog. Persist order as `position`/`rank` on `ProjectStatus` (status-catalog order). Kanban column order follows that catalog order. This is **not** proposed-feature **H** (within-column card order).
- **Delete** blocked while in use (**A**). Seeded/system rows are deletable when not in use — **no** special non-deletable system flag beyond seed.
- Guardrails (plan-locked): cannot delete the last remaining status in a project; must keep at least one non-completed status (reject delete or `isCompleted` flip that would leave zero).

### Q-143 — Kanban column model — **Decided: 1**

Dynamic columns from catalog: one column per catalog status; DnD sets that status key directly.

### Q-144 — Dashboard pending / completed / overdue — **Decided: 1**

`isCompleted` flag on each catalog status; pending = not completed; overdue = not completed + dueDate strictly before UTC today.

### Q-145 — Who can CRUD the status catalog? — **Decided: 2**

OWNER + EDITOR via `requireTaskWrite` (labels-like).

### Q-146 — Migration / persistence strategy — **Decided: 2** (with catalog reconciliation)

**Replace enum with freeform string on `Task.status`.** Explicitly **not** additive enum-only (option 1) and **not** status-table+FK on Task (option 3).

**Required reconciliation (not unconstrained free text):** a per-project **status catalog table** still owns `name`, `color`, `isCompleted`, `isSystem`, and immutable `key`. `Task.status` stores that **stable key** string. Domain/service validates keys against the catalog. No Postgres enum; no UUID FK from Task → catalog.

### Q-147 — Activity emission — **Decided: 1**

Task status changes via `TASK_FIELDS_CHANGED` only (old/new = status keys). No catalog CRUD activity.

### Q-148 — Filters / create-task UI / TaskDetail select — **Decided: 3**

TaskDetail + filter + Kanban; header create default-only; column `+` prefills that column’s status key.

### Q-149 — WIP limits, colors, icons — **Decided: 2** (exception vs planner rec 1)

**Colors only** from fixed tokens (labels-like). No icons. No WIP limits.

### Q-150 — Confirm non-goals batch — **Decided: 1**

Exclude within-column rank (**H**), attachments reopen, and app-wide audit (**C**) / `specs/005-audit/`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-141–Q-150 Decided; persistence reconciliation documented)
- Approved for planning: Yes
- Approved for implementation: Yes
