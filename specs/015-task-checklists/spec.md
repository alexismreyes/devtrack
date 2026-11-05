# Feature Specification: Task Checklists

- **ID:** 015-task-checklists
- **Status:** Verified
- **Created:** 2026-11-05
- **Related features:** 001-foundation through 014-task-detail-polish (Verified); proposed backlog **F**; attachments **G** and app-wide audit **C** deferred separately (not this folder)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Material product questions **Q-105**, **Q-106**, **Q-110–Q-121**, and **Q-122–Q-124** in section 15 are **Decided** (option **1** each unless noted). **Q-109** (no checklist activity) is **SUPERSEDED** by **Q-109b** (emit four checklist activity kinds). Do **not** invent alternate answers at implementation time. Implementation may proceed on T001–T017 only. Do **not** implement attachments (**G**), card covers, storage for **G**, item assign, item due date, hide-checked items, or Markdown description redesign in this folder (Q-107 / Q-108 / Q-123 and non-goals). Do **not** write `specs/005-audit/`. Do **not** change `constitution.md`. Own checklists under the existing **`tasks`** domain. Reuse `TaskAuthorizationPort` (all mutations = `requireTaskWrite`; list/read = `requireTaskRead` — Q-110). Additive Prisma migration only (no `migrate reset`, no volume delete). Keep Verified comments and labels **public HTTP contracts** intact. Extend `TaskActivityKind` / activity list payloads **additively** for the four Decided checklist kinds (Q-109b / Q-124); do not break existing kinds or `GET /api/tasks/:taskId/activity` path/envelope. UI lives in existing TaskDetail (013/014 two-column layout); action-row Checklist control + main-column lists with per-checklist progress and completed-item marking (Q-118 / Q-122 / Q-123). Checklists are **not** Kanban columns and **not** child tasks (Q-106). Do **not** embed checklists on `PublicTaskDto` / Kanban (Q-115).

This ID is **015-task-checklists** (proposed product ID **F**). Do not specify attachments (**G**) beyond a non-goal.

## 1. Problem

Verified slices persist membership-authorized projects and tasks, Kanban, comments, activity, labels, and a polished two-column TaskDetail. Collaborators can discuss and tag work, but there is **no way to break a task into named checklists of checkable items** that stay on the task card detail surface, show progress, and leave a light trail in Comments & activity.

`proposed-features.md` lists this as item **F** (“Checklists / sub-items”; keep out of Kanban columns at first). Attachments (**G**) and app-wide audit (**C**) remain separate later features.

## 2. Goals

- Persist **one or more named checklists per task**, each with **items** that have **text** and a **checked** state (Q-106).
- Keep checklists on the **task detail card** (TaskDetail Dialog), **not** as Kanban columns and **not** as child tasks (Q-106).
- Authorize list via task **read** and all mutations via task **write** through Verified `TaskAuthorizationPort` (Q-110).
- Emit **four** checklist-related activity kinds in the same DB transaction as the triggering write (Q-109b / Q-124 / same atomicity as 011 Q-077): checklist added, checklist removed, item completed, item uncompleted. Do **not** emit for item added/deleted or checklist renamed in this feature.
- Own persistence and use cases under the existing **`tasks`** domain (same pattern as comments/labels); no peer `checklists` product domain.
- Surface checklists in the existing TaskDetail two-column layout (013/014): action-row **Checklist** control; lists in the main column below labels/fields (Q-118); per-checklist progress bar (Q-122); checked items remain visible with completed/strikethrough styling and **no** hide-checked control (Q-123); render new activity kinds in Comments & activity (Q-124); no fake Dates/Attachment placeholders.
- Reuse session cookie `devtrack_session`, Zod, error envelope, npm / Node.js 22 / PostgreSQL 16 / Prisma 6, Vitest + Testing Library + SuperTest, modular monolith, Prisma behind owning-domain repositories, and an **additive** migration only.
- Leave attachments (**G**), covers, item assign, item due date, hide-checked, Markdown description redesign, and app-wide audit (**C**) out of this folder.

## 3. Non-Goals

- Attachments / card covers (`proposed-features.md` **G**) — out of scope; do not implement UI, API, or storage (Q-107 / Q-108 deferred to a later feature).
- App-wide CRUD audit (`proposed-features.md` **C**) — separate later feature ID; do not write `specs/005-audit/`.
- Treating checklist items as child tasks, nested boards, or Kanban columns (Q-106).
- Item assignee / “Assign” control and item due date / “Fecha de vencimiento” control (template reference only; out of scope).
- “Hide checked items” / “Ocultar los elementos marcados” control (Q-123 — mark-not-hide).
- Markdown description editor redesign (template description toolbar is out of scope; existing task description behavior unchanged).
- Assignees, within-column rank (`position` on tasks), search, notifications, calendar, invite-by-email (**M**), public share links (**O**), AI.
- Changing Verified comments public HTTP contracts (paths, request/response DTOs, status codes).
- Changing Verified activity **path/envelope** or existing kinds’ payload shapes; this feature **additively** extends kinds only (Q-109b / Q-124). Do **not** emit activity for item add/delete or checklist rename.
- Changing Verified labels catalog/assignment public HTTP contracts or `PublicTaskDto.labels` semantics beyond non-regression.
- Soft-delete / restore of tasks or comments (existing rules unchanged).
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- Production images, CI, or deployment (Q-006, Q-009); probe retention (Q-007); password complexity (Q-015); rate limiting / lockout (Q-017).
- Hard-delete of task or project rows; restore of soft-deleted tasks/comments; `includeArchived` on project list.
- Changing `constitution.md`.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR (task write, including `ownerUserId` OWNER grant), I want to create one or more named checklists on a live task, so that work can be broken into structured lists without inventing child tasks.

### User Story US-002

As an OWNER or EDITOR (task write), I want to add checklist items with text and toggle their checked state, so that progress on a task is visible on the card detail.

### User Story US-003

As an authenticated project member who can read tasks, I want to view checklists, item checked state, and per-checklist progress on TaskDetail, so that I can follow progress without write access.

### User Story US-004

As a VIEWER, I want to see checklists without mutating them, so that hiding UI is not treated as authorization.

### User Story US-005

As a developer, I want checklists owned inside the existing `tasks` domain with narrow ports and no circular domain imports, so that Verified comments / activity / labels / membership invariants stay intact.

### User Story US-006

As a developer, I want Verified comments and labels public contracts and Kanban/workspace destinations to keep working, and activity list to remain forward-compatible when new checklist kinds appear, so that checklists do not replace those slices or implement attachments/audit.

### User Story US-007

As an authorized reader of task activity, I want checklist add/remove and item complete/uncomplete events interleaved in Comments & activity with short name/text previews, so that progress changes are visible without a separate audit product.

## 5. Functional Requirements

- **FR-001:** The system MUST persist **one or more named checklists per task**. Each checklist MUST belong to exactly one live task. Checklists MUST NOT be modeled as child tasks or as Kanban columns (Q-106).
- **FR-002:** Each checklist MUST have a system-assigned unique identity, a system-assigned created time, a required association to its parent `taskId`, and a **name** required from the client: 1–80 characters after trim; no server default name (Q-114 / Q-116). Client MUST NOT supply checklist `id` or `createdAt`.
- **FR-003:** Each checklist MUST support **zero or more items** indefinitely (empty checklists allowed — Q-120). Each item MUST have a system-assigned unique identity, a system-assigned created time, parent checklist association, **text** (1–200 after trim — Q-114), and a boolean **checked** state defaulting to `false` on create; clients MUST NOT send `checked` on create (Q-121). Client MUST NOT supply item `id` or `createdAt`. No hard caps on checklist or item counts in this feature (Q-114).
- **FR-004:** Checklist and item **list/read** MUST require authentication plus task **read** authorization via `TaskAuthorizationPort.requireTaskRead` (OWNER, EDITOR, VIEWER, including `ownerUserId` grant). All checklist and item **mutations** (create, rename, delete checklist; add, edit text, delete item, PATCH checked) MUST require task **write** via `requireTaskWrite` (OWNER + EDITOR, including `ownerUserId` OWNER grant) (Q-110). There is no persisted reorder and no reorder API in this feature (Q-113). Unauthenticated callers MUST fail as `401`. Soft-deleted or missing task MUST fail as `404` for every caller on checklist routes. Non-members on an existing live parent MUST fail as `403` when authorization fails.
- **FR-005:** Checklist mutations MUST emit task-activity events for exactly these four kinds (Q-109b / Q-124), extending `TaskActivityKind` additively: `CHECKLIST_ADDED`, `CHECKLIST_REMOVED`, `CHECKLIST_ITEM_COMPLETED`, `CHECKLIST_ITEM_UNCOMPLETED`. Emit on create checklist, delete checklist, and item PATCH that changes `checked` to `true` / `false` respectively. MUST NOT emit for item add, item delete, checklist rename, item text-only edit, or no-op checked PATCH. Payloads MUST store ids + short name/text previews (same preview style as `COMMENT_ADDED` `bodyPreview`). Emit in the **same DB transaction** as the write; if activity insert fails, the write MUST fail (same as 011 Q-077). Verified existing activity kinds and `GET /api/tasks/:taskId/activity` path/envelope MUST remain intact aside from additive kinds.
- **FR-006:** Authentication MUST remain distinct from authorization. Protected checklist operations MUST require a valid `devtrack_session`. `auth` middleware MUST NOT decide membership or checklist permissions. Frontend-only hiding MUST NOT replace backend checks.
- **FR-007:** The backend MUST remain a modular monolith. Domain ownership MUST be the existing **`tasks`** domain. A generic repository MUST NOT be introduced. Circular domain dependencies MUST NOT be introduced. Owning domain MUST NOT import other domains’ Prisma repository implementations. Cross-domain authz MUST use `TaskAuthorizationPort`.
- **FR-008:** Prisma MUST be used only behind owning-domain repositories. Checklist persistence MUST be an **additive** versioned migration under `backend/prisma/`. MUST NOT use `migrate reset` or delete Docker volumes. Controllers MUST NOT query the database. Services MUST NOT issue ad hoc Prisma queries. Prisma types MUST NOT be domain entities or public DTOs. Extending the Prisma `TaskActivityKind` enum MUST be additive in the same or a companion additive migration as needed for checklist tables.
- **FR-009:** External input MUST be validated at HTTP boundaries with Zod. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, session ids in JSON, or sensitive database data.
- **FR-010:** Verified `010-task-comments` public HTTP contracts MUST remain intact.
- **FR-011:** Verified `012-task-labels` public HTTP contracts and `PublicTaskDto.labels` semantics MUST remain intact (non-regression). Task list/get/create/update DTOs and Kanban card faces MUST **not** embed checklists or checklist progress; TaskDetail loads via dedicated checklist list (Q-115).
- **FR-012:** The React UI MUST surface checklists inside the existing TaskDetail Dialog (two-column layout from 013/014). The action row MUST gain a **Checklist** control; checklist lists MUST render in the **main column** below labels/fields, not as the Comments & activity panel itself (Q-118). Each checklist MUST show a **progress bar** from checked/total as a percentage (optional `%` text); empty checklist → **0%** (Q-122). Checked items MUST remain **visible** and MUST be **visually marked** (strikethrough / completed styling); MUST NOT add a hide-checked-items control (Q-123). MUST NOT add fake Dates or Attachment action placeholders. MUST NOT implement attachments UI, item assign, or item due date. Call `VITE_API_URL` with `credentials: 'include'`. Do not store a bearer token in JS. Do not redesign Members Dialog, dashboard ownership rules, Kanban DnD, comments composer, or labels beyond checklist additions and activity-kind rendering. No drag-reorder UI for checklists/items (Q-113).
- **FR-013:** Archived-parent behavior for checklist mutations MUST match task writes / labels (Q-111): `ownerUserId` → `409` `CONFLICT`; other members → `403`; reads follow Verified task-read rules.
- **FR-014:** Hard-delete checklist MUST cascade to its items; hard-delete item MUST remove the row; no restore; no soft-delete columns on checklists/items (Q-112). Soft-deleted parent tasks MUST continue to expose no checklist HTTP surface (`404`). Empty checklists MAY remain after last item delete (Q-120). Delete checklist MUST emit `CHECKLIST_REMOVED` only (not per-item events) (Q-109b).
- **FR-015:** No persisted reorder in this feature; list checklists and items by `createdAt` ascending; no reorder endpoint; no drag-reorder UI (Q-113). MUST NOT add checklist DnD libraries beyond what 006 already uses for Kanban status moves.
- **FR-016:** Checklist name 1–80 after trim; item text 1–200 after trim; no hard caps on checklist or item counts (Q-114).
- **FR-017:** HTTP MUST use nested REST (Q-117): `GET`/`POST /api/tasks/:taskId/checklists`; `PATCH`/`DELETE /api/tasks/:taskId/checklists/:checklistId`; `POST /api/tasks/:taskId/checklists/:checklistId/items`; `PATCH`/`DELETE .../items/:itemId`. List response shape `{ checklists: [{ ..., items: [...] }] }`. PATCH checklist allows `name`; PATCH item allows `text` and/or `checked` (Q-119 / Q-121).
- **FR-018:** Domain checklist/item identity, task association, checked-state rules, authz-vs-auth, activity emission invariants for the four kinds, and delete/order invariants MUST be testable without HTTP or Prisma. API and critical UI behavior MUST be tested with Vitest, Testing Library, and SuperTest as applicable.
- **FR-019:** CORS, session cookie, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and the error envelope MUST stay as verified. `GET /health` and `GET /ready` MUST remain public.
- **FR-020:** This feature MUST NOT implement attachments (**G**) or app-wide audit (**C**). It MUST NOT write `specs/005-audit/`. It MUST NOT change `constitution.md`. Work MUST live under `specs/015-task-checklists/`.
- **FR-021:** Comments & activity interleaved timeline (013/014) MUST render the four new checklist activity kinds with actor + short name/text preview from the payload (Q-124). MUST NOT omit them the way `COMMENT_ADDED` is omitted. After successful checklist mutations that emit activity, TaskDetail MUST refresh activity so the timeline stays current (same spirit as 014 reload-after-comment/save).

### Permission mapping (Q-110 / Q-111 Decided)

| Operation | Authorization |
| --- | --- |
| List/read checklists + items on a task | Task read (OWNER, EDITOR, VIEWER) |
| Create / rename / delete checklist | Task write (OWNER + EDITOR, including `ownerUserId` OWNER grant) |
| Add / edit text / delete item / PATCH checked | Task write (OWNER + EDITOR, including `ownerUserId` OWNER grant) |
| Non-member on existing project | `403` |
| Missing / soft-deleted task | `404` |
| Archived parent mutations | `ownerUserId` → `409`; other members → `403`; reads allowed per task-read |

### Activity emission mapping (Q-109b / Q-124 Decided)

| Mutation | Activity kind | Notes |
| --- | --- | --- |
| Create checklist | `CHECKLIST_ADDED` | ids + name preview |
| Delete checklist | `CHECKLIST_REMOVED` | checklist deleted activity only; no per-item events |
| PATCH item `checked: true` (actual change) | `CHECKLIST_ITEM_COMPLETED` | ids + text preview |
| PATCH item `checked: false` (actual change) | `CHECKLIST_ITEM_UNCOMPLETED` | ids + text preview |
| Add item / delete item / rename checklist / text-only item PATCH / no-op checked PATCH | *(none)* | out of emission scope for this feature |

## 6. Acceptance Criteria

### Scenario AC-001: Create named checklist

- Given an authenticated OWNER or EDITOR on a live task under an active project
- When they create a checklist with a valid required name (1–80 after trim; no server default — Q-114 / Q-116)
- Then a checklist is persisted for that `taskId` with system-assigned `id` and `createdAt` and `items: []` allowed (Q-120)
- Then an authorized reader can list it via `GET /api/tasks/:taskId/checklists` (Q-117)
- Then a `CHECKLIST_ADDED` activity event is persisted for that task in the same transaction (Q-109b)

### Scenario AC-002: Multiple checklists per task

- Given a live task
- When an authorized writer creates two named checklists
- Then both appear when listing checklists for that task ordered by `createdAt` ascending (Q-113)
- Then neither is a child task nor a Kanban column
- Then two `CHECKLIST_ADDED` events appear in activity (one per create)

### Scenario AC-003: Add item and toggle checked

- Given a checklist on a live task
- When an authorized writer adds an item with valid text only (`{ text }`; no `checked` on create — Q-121)
- Then the item is persisted with `checked: false`
- Then **no** checklist activity event is emitted for the item add (Q-109b)
- When they PATCH `checked` and/or `text` (Q-119 / Q-121)
- Then subsequent list/read shows the updated state
- When `checked` changes to `true` / `false`
- Then `CHECKLIST_ITEM_COMPLETED` / `CHECKLIST_ITEM_UNCOMPLETED` is emitted respectively; text-only or no-op checked PATCH emits none

### Scenario AC-004: Task-read list / VIEWER

- Given a VIEWER on the parent project
- When they list checklists for a live task they can read
- Then they receive checklists and items
- When they attempt a mutate operation
- Then the API returns `403` and no mutation persists
- Then no new activity event is created for the failed attempt

### Scenario AC-005: Authz matrix

- Given unauthenticated caller → `401` on checklist routes
- Given non-member on existing project / live task → `403` on authorized ops
- Given missing or soft-deleted task → `404` for every caller

### Scenario AC-006: Checklist activity emission

- Given a successful create checklist, delete checklist, or item checked toggle that changes state
- When activity is listed for that task
- Then the corresponding kind among `CHECKLIST_ADDED`, `CHECKLIST_REMOVED`, `CHECKLIST_ITEM_COMPLETED`, `CHECKLIST_ITEM_UNCOMPLETED` appears with ids + short name/text preview payload (Q-109b / Q-124)
- Given successful item add, item delete, checklist rename, text-only item PATCH, or no-op checked PATCH
- When activity is listed
- Then no new checklist-related event is created for those mutations
- Then Verified existing activity kinds and `GET .../activity` path/envelope remain intact (additive kinds only)
- Given activity insert failure inside the same transaction as a checklist write
- Then the write MUST fail and no partial checklist mutation persists (011 Q-077 pattern)

### Scenario AC-007: Comments and labels contracts intact

- Given Verified comments and labels routes
- When checklist work is implemented
- Then comments and labels public paths/DTOs/statuses remain unchanged (non-regression)

### Scenario AC-008: TaskDetail UI

- Given TaskDetail open on a live task
- When checklists exist (or the writer creates them)
- Then checklists and items are visible in the TaskDetail main column below labels/fields (Q-118)
- Then each checklist shows a progress bar for checked/total as percentage (optional `%` text); empty checklist shows 0% (Q-122)
- Then checked items remain visible and are visually marked (strikethrough / completed styling); no hide-checked control is present (Q-123)
- Then the action row shows a Checklist control; Dates/Attachment placeholders remain absent
- Then Kanban card faces show no checklist progress (Q-115)
- Then VIEWER chrome is read-only; writers can mutate when `canWrite` and not archived-blocked
- Then no drag-reorder UI for checklists/items (Q-113)
- Then Comments & activity renders the four new checklist kinds (does not omit them like `COMMENT_ADDED`) (Q-124)
- Then item assign and item due-date controls are absent

### Scenario AC-009: Delete semantics

- Given a checklist with items
- When a writer DELETE the checklist
- Then the checklist and all its items are hard-deleted; no restore; no soft-delete columns (Q-112)
- Then exactly one `CHECKLIST_REMOVED` event is emitted (not per-item completion/removal events) (Q-109b)
- When a writer DELETE an item
- Then only that item row is removed; an empty parent checklist may remain (Q-120)
- Then no checklist activity event is emitted for the item delete

### Scenario AC-010: Ordering

- Given multiple checklists and items
- When listed via `GET /api/tasks/:taskId/checklists`
- Then checklists and nested items are ordered by `createdAt` ascending
- Then no reorder endpoint or persisted `position`/`rank` exists (Q-113)

### Scenario AC-011: Validation and limits

- Given name/text rules (name 1–80 trim; item text 1–200 trim; no count caps — Q-114)
- When a caller submits empty/oversized name or text, omits required name, or sends `checked` on item create
- Then the API returns `400` `VALIDATION_ERROR` and does not persist invalid data

### Scenario AC-012: Archived parent

- Given a task under an archived project
- When a writer mutates checklists
- Then `ownerUserId` receives `409` `CONFLICT` and other members receive `403` (Q-111)
- Then authorized reads still follow Verified task-read rules

### Scenario AC-013: Additive migration only

- Given checklist Prisma models (and additive `TaskActivityKind` enum values) are added
- When the migration is applied
- Then it is versioned and additive under `backend/prisma/migrations/`
- Then `prisma migrate deploy` is used; no `migrate reset`; no volume delete
- Then no attachment/cover storage tables are added in this folder

### Scenario AC-014: Domain ownership

- Given the modular monolith
- When checklist code lands
- Then it lives under `backend/src/modules/tasks/`
- Then authz uses `TaskAuthorizationPort`
- Then no peer `checklists` product domain and no `specs/005-audit/` appear

### Scenario AC-015: No attachments / constitution unchanged

- Given this feature folder
- When scope is inspected
- Then no attachment upload/download UI or API from **G** is present
- Then no hide-checked, item-assign, or item-due-date product UI is present
- Then `constitution.md` is unmodified by this feature

## 7. Business Rules

- One or more named checklists per task; items have text + checked; not child tasks; not Kanban columns — owning domain: `tasks` (Q-106)
- List = `requireTaskRead`; all mutations = `requireTaskWrite` via `TaskAuthorizationPort` (Q-110)
- Emit only the four Q-109b kinds; same-tx fail write on activity insert failure (Q-124 / 011 Q-077); remove = checklist deleted activity only
- Soft-deleted / missing task → checklist HTTP surface `404` — owning domain: `tasks`
- Authentication ≠ authorization — owning domains: `auth` vs `project-members` / `tasks` checklist use cases
- Archived mutations: `ownerUserId` → `409`; other members → `403`; reads follow task-read (Q-111)
- Hard-delete checklist cascades items; hard-delete item; no restore; no soft-delete columns (Q-112)
- List by `createdAt` ascending; no persisted reorder / drag UI (Q-113)
- Name 1–80 trim required from client; item text 1–200 trim; no count caps (Q-114 / Q-116)
- Do not embed on `PublicTaskDto` / Kanban; dedicated list for TaskDetail (Q-115)
- Nested REST per Q-117; PATCH name / item text and/or checked (Q-119 / Q-121); empty checklists allowed (Q-120); new items `checked: false` with no `checked` on create (Q-121)
- Action-row Checklist + main-column lists (Q-118); per-checklist progress bar checked/total (empty → 0%) (Q-122); mark checked with strikethrough, no hide control (Q-123); render new activity kinds in Comments & activity (Q-124)
- Comments / labels public contracts preserved; activity path/envelope preserved with additive kinds; no attachments (**G**); no app-wide audit (**C**)

## 8. Data

Business concepts (Prisma names belong in the plan):

- **TaskChecklist:** identity, parent `taskId`, name, `createdAt`; no order/position field; hard-delete lifecycle (Q-112 / Q-113)
- **TaskChecklistItem:** identity, parent checklist id, text, checked boolean (default false), `createdAt`; no order/position field; hard-delete lifecycle (Q-112 / Q-113)
- **TaskActivityEvent (existing):** additive kinds for checklist add/remove and item complete/uncomplete; payloads with ids + short previews (Q-109b / Q-124)
- **Task (existing):** soft-delete continues to hide checklist HTTP; `PublicTaskDto` does **not** embed checklists (Q-115)

Lifecycle:

- Create/list/mutate on live tasks by Q-110 roles
- Soft-deleted tasks: no HTTP checklist surface (`404`)
- Project archive: mutations per Q-111
- Attachments / binary storage: out of scope

## 9. API and Integrations

Nested REST (Q-117 Decided):

- `GET`/`POST /api/tasks/:taskId/checklists`
- `PATCH`/`DELETE /api/tasks/:taskId/checklists/:checklistId`
- `POST /api/tasks/:taskId/checklists/:checklistId/items`
- `PATCH`/`DELETE /api/tasks/:taskId/checklists/:checklistId/items/:itemId`
- List `{ checklists: [{ ..., items: [...] }] }` ordered by `createdAt` ascending
- Session cookie auth; membership authz via `TaskAuthorizationPort`
- Activity: reuse `GET /api/tasks/:taskId/activity`; additive kinds only; emission side effects on checklist writes per Q-109b / Q-124
- No attachment endpoints

## 10. Security

- Session required for all checklist routes
- Resource-level checks in backend via Verified membership ports
- Validate ids, names, text, and checked (on PATCH only); reject unknown fields including `checked` on create
- Do not expose Prisma internals, secrets, or stack traces
- Do not treat frontend chrome as authorization

## 11. Non-Functional

- Reuse existing stack and Compose topology
- Prefer clear educational patterns over new abstraction layers
- Do not invent numeric latency targets
- TaskDetail checklist UI MUST remain usable inside the existing Dialog density (013/014)
- No new npm dependency for checklist reorder (Q-113)

## 12. Dependencies

- Existing features: Verified 001–014 (esp. 004 tasks, 009 membership/`TaskAuthorizationPort`, 010 comments, 011 activity, 012 labels, 013/014 TaskDetail layout/polish)
- Architectural constraints: constitution Articles I–XIII; additive Prisma only; modular monolith
- External dependencies: none beyond current npm stack
- Template reference: `templates/checklist.png` (progress, strikethrough, activity previews; hide/assign/due/markdown toolbar remain out of scope)

## 13. Failures and Edge Cases

- Unauthenticated → `401`
- Non-member → `403` when task/project exists and authz fails
- Missing / soft-deleted task → `404`
- Missing checklist or item (or wrong-task association) → `404` on item ops
- Invalid body/params → `400` `VALIDATION_ERROR`
- Archived parent mutations → per Q-111
- Empty list → `200` with empty collection(s)
- Cross-task checklist/item id misuse → `404` without mutating another task
- Activity insert failure → fail checklist write (same transaction)

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-003 | AC-001, AC-002, AC-003 | Domain + API tests |
| FR-004, FR-006 | AC-004, AC-005 | Authz API tests |
| FR-005, FR-021 | AC-006, AC-008 | Activity emit + UI render |
| FR-010, FR-011 | AC-007 | Contract regression |
| FR-012 | AC-008 | Frontend tests |
| FR-013 | AC-012 | Archived API tests |
| FR-014 | AC-009 | Delete API tests |
| FR-015 | AC-010 | Order API tests (createdAt asc; no reorder) |
| FR-016 | AC-011 | Validation tests |
| FR-007–FR-009, FR-017–FR-019 | AC-013, AC-014 | Migration + typecheck + tests |
| FR-020 | AC-015 | Scope / constitution check |

## 15. Open Questions

### Decided for this feature (locked — do not reopen unless constitution conflict)

- **Q-105:** Sequencing vs attachments. Owner: product. Status: **Decided** → **1**.
  - Checklists first as `015-task-checklists`; attachments (**G**) later as a separate feature folder.
- **Q-106:** Checklist model. Owner: product. Status: **Decided** → **1**.
  - One or more **named checklists** per task; items with **text + checked**; stay on the **task card detail** (not Kanban columns); **not** child tasks.
- **Q-107 / Q-108:** Attachments / local Compose storage. Owner: product + infra. Status: **Out of scope here** (deferred with **G**).
- **Q-109:** Activity for checklist changes. Owner: product + `tasks`. Status: **SUPERSEDED** by **Q-109b** (prior Decided → **1** “no activity” is void).
- **Q-109b:** Activity for checklist changes (from `templates/checklist.png` review). Owner: product + `tasks`. Status: **Decided** → **Option 1**.
  - Emit activity for: checklist added, checklist removed, item completed, item uncompleted.
  - Do **not** emit for item added/deleted or checklist renamed in this feature (remove = checklist deleted activity only; no per-item events on checklist delete).
  - Kind names (plan-locked for consistency with existing enum style): `CHECKLIST_ADDED`, `CHECKLIST_REMOVED`, `CHECKLIST_ITEM_COMPLETED`, `CHECKLIST_ITEM_UNCOMPLETED`.
- **Q-110:** Authz detail for checklist vs item ops. Owner: product + `project-members`. Status: **Decided** → **1**.
  - All checklist/item mutations (including PATCH checked) = `requireTaskWrite`; list/read = `requireTaskRead`.
- **Q-111:** Archived parent behavior for checklist mutations. Owner: product. Status: **Decided** → **1**.
  - Same as task writes / labels: `ownerUserId` → `409`; other members → `403`; reads follow task-read.
- **Q-112:** Delete semantics. Owner: product + `tasks`. Status: **Decided** → **1**.
  - Hard-delete checklist cascades to its items; hard-delete item removes the row; no restore; no soft-delete columns.
- **Q-113:** Ordering. Owner: product + frontend. Status: **Decided** → **1**.
  - No persisted reorder; list checklists and items by `createdAt` ascending; UI has no drag reorder.
- **Q-114:** Limits. Owner: product. Status: **Decided** → **1**.
  - Checklist name 1–80 after trim; item text 1–200 after trim; no hard caps on checklist or item counts.
- **Q-115:** Embed checklists on `PublicTaskDto` / Kanban card face. Owner: product + API. Status: **Decided** → **1**.
  - Do **not** embed checklists on task list/get/create/update DTOs; load via dedicated checklist list when TaskDetail opens; Kanban card face shows no checklist progress.
- **Q-116:** Default / empty checklist name. Owner: product. Status: **Decided** → **1**.
  - Name required from client (1–80 after trim); no server default. UI MAY prefill `"Checklist"` in the form.
- **Q-117:** HTTP API shape. Owner: product + API. Status: **Decided** → **1**.
  - Nested resources: `GET`/`POST /api/tasks/:taskId/checklists`; `PATCH`/`DELETE /api/tasks/:taskId/checklists/:checklistId`; `POST /api/tasks/:taskId/checklists/:checklistId/items`; `PATCH`/`DELETE .../items/:itemId`. List returns `{ checklists: [{ ...fields, items: [...] }] }`.
- **Q-118:** TaskDetail UI placement. Owner: product + frontend. Status: **Decided** → **1**.
  - Action-row **Checklist** control; checklist lists render in the **main column** below labels/fields (not replacing Comments & activity).
- **Q-119:** Edit after create. Owner: product. Status: **Decided** → **1**.
  - Allow PATCH checklist `name`; allow PATCH item `text` and/or `checked`.
- **Q-120:** Empty checklists. Owner: product. Status: **Decided** → **1**.
  - Allow empty checklists (zero items) indefinitely.
- **Q-121:** Checked default and partial PATCH. Owner: product + API. Status: **Decided** → **1**.
  - New items default `checked: false`; clients MUST NOT set `checked` on create; item PATCH may send `text` and/or `checked`.
- **Q-122:** Per-checklist progress UI. Owner: product + frontend. Status: **Decided** → **Option 1**.
  - Per checklist progress bar: checked/total as percentage bar (+ optional `%` text); empty checklist → **0%**.
- **Q-123:** Hide vs mark checked items. Owner: product + frontend. Status: **Decided** → **mark-not-hide**.
  - NO “hide checked items” control. Checked items remain visible and MUST be visually marked (strikethrough / completed styling). Omit hide-checked feature.
- **Q-124:** Activity payload and Comments & activity rendering. Owner: product + `tasks` + frontend. Status: **Decided** → **Option 1**.
  - Activity payload stores ids + short name/text previews (like `COMMENT_ADDED` `bodyPreview`).
  - Show in Comments & activity interleaved timeline (013/014).
  - Extend `TaskActivityKind` enum + emit in same transaction as writes (fail write if activity insert fails, same as 011 Q-077).
  - Update `CommentsActivityPanel` to render new kinds (do **not** omit them like `COMMENT_ADDED`).
- Domain ownership under existing `tasks`; reuse `TaskAuthorizationPort`; additive Prisma only; no `migrate reset` / volume delete; UI in TaskDetail; no Kanban-column F; no attachments (**G**); no `specs/005-audit/`; no constitution change; keep comments/labels contracts intact; activity additive kinds only.

### Deferred platform items (unchanged)

- **Q-006:** Dev vs production images. Deferred.
- **Q-007:** Probe list retention. Deferred.
- **Q-009:** CI and deployment. Deferred.
- **Q-015:** Password complexity beyond non-empty. Deferred.
- **Q-017:** Rate limiting and account lockout. Deferred.

### Later product work (do not specify here)

- Attachments / covers (**G**), item assign, item due date, hide-checked (explicitly rejected for 015), Markdown description redesign, assignees, within-column task rank (**H**), search, notifications, calendar, invite-by-email (**M**), public share links (**O**), AI, app-wide audit (**C**, later ID, **not** `specs/005-audit/`).

### Leftover open questions

None material for Approve. Preview truncation length and exact percent display (integer rounded vs floor) are plan-locked to match `COMMENT_ADDED` preview max (120) and a simple integer percent `Math.round(checked/total*100)` with empty → 0; not product blockers.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-105/Q-106/Q-110–Q-124 Decided; **Q-109 SUPERSEDED** by **Q-109b**; **G** / assign / due / hide-checked / Markdown redesign out of scope
- Approved for planning: Yes
- Approved for implementation: Yes
