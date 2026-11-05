# Feature Specification: Task Labels

- **ID:** 012-task-labels
- **Status:** Verified
- **Created:** 2026-11-05
- **Related features:** 001-foundation through 011-task-activity (Verified); proposed backlog **E**; checklists **F** and app-wide audit **C** deferred separately (not this folder)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product questions **Q-080–Q-093** in section 15 are **Decided** (user chose option **1** for each). Do not reopen Decided answers unless a constitution conflict. Locked constraints: **per-project label catalog**; **many labels per task**; **show labels on the card face**; **support filter by label**; do **not** implement checklists (**F**); do **not** write `specs/005-audit/`; do **not** change `constitution.md`; **additive** Prisma migrations only (no `migrate reset`, no volume delete); reuse Verified authz (`TaskAuthorizationPort` / membership); keep Verified comments and activity **public HTTP contracts** intact (Q-089: no activity emission for labels). Implementation may proceed on T001–T017 only. Color tokens: `RED` | `ORANGE` | `YELLOW` | `GREEN` | `TEAL` | `BLUE` | `PURPLE` | `PINK` | `GRAY`.

This ID is **012-task-labels** (proposed product ID **E**). Do not specify checklists (**F**) beyond a non-goal. Do not write `specs/005-audit/`. Do not implement app-wide audit (**C**).

## 1. Problem

Verified slices persist membership-authorized projects and tasks, Kanban columns, task comments, and task activity. Collaborators can organize work by status and priority, but there is **no per-project label catalog** and **no way to tag tasks with many labels**, show those labels on the Kanban card face, or filter the board by label.

`proposed-features.md` lists this as item **E** (“Labels / tags”). `010-task-comments` deferred notes already recorded the product scope decisions above. Checklists (**F**) and app-wide audit (**C**) remain separate.

## 2. Goals

- Persist a **per-project label catalog** so authorized members manage reusable labels for that project through the backend.
- Let authorized writers attach **many labels per task** (many-to-many) and change those assignments through the backend.
- Return enough label data on task reads/lists that the Kanban **card face** can show assigned labels without a separate product domain for display.
- Extend the existing project task **list filter** so callers can filter by a single optional `labelId` (alongside existing optional `status` / `priority` filters; AND across provided filters).
- Keep authentication distinct from authorization: a valid session MUST NOT grant access to labels or labeled tasks on projects the actor cannot access; reuse Verified `TaskAuthorizationPort` / membership roles. Catalog create/update/delete and assignment mutate = task write (OWNER + EDITOR, including `ownerUserId` OWNER grant). Catalog list / task reads / filter = task read (OWNER, EDITOR, VIEWER).
- Reuse session cookie `devtrack_session`, Zod, error envelope, npm / Node.js 22 / PostgreSQL 16 / Prisma 6, Vitest + Testing Library + SuperTest, modular monolith, Prisma behind owning-domain repositories, and an **additive** migration only.
- Surface labels in the existing workspace UI: board-header Labels Dialog (catalog CRUD), TaskDetail assignment, Kanban card face, and board filter — without redesigning Members Dialog, dashboard, Kanban DnD, comments, or activity beyond the documented label additions.
- Leave checklists (**F**) and app-wide audit (**C**) out of this folder.
- Own catalog + assignment under the existing **`tasks`** domain (no peer `labels` product domain).

## 3. Non-Goals

- Checklists / sub-items (`proposed-features.md` **F**) — out of scope; do not implement.
- App-wide CRUD audit (`proposed-features.md` **C**) — separate later feature ID; do not write `specs/005-audit/`.
- Assignees, attachments, covers, within-column rank (`position`), search, notifications, calendar, invite-by-email (**M**), public share links (**O**), AI.
- Changing Verified comments public HTTP contracts (paths, request/response DTOs, status codes).
- Changing Verified activity public list contract or Decided activity kinds; **no** activity emission for label catalog or assignment changes (Q-089).
- Global / workspace-wide / user-personal label catalogs (catalog is **per project** only).
- Freeform hex colors (color MUST be a fixed named token).
- Soft-delete / restore of catalog labels (hard-delete only; no restore).
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- Production images, CI, or deployment (Q-006, Q-009); probe retention (Q-007); password complexity (Q-015); rate limiting / lockout (Q-017).
- Hard-delete of task or project rows; restore of soft-deleted tasks/comments; `includeArchived` on project list.
- Changing `constitution.md`.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR (task write, including `ownerUserId` OWNER grant), I want to create, list, update, and delete project labels, so that the project has a reusable tag catalog.

### User Story US-002

As an OWNER or EDITOR (task write, including `ownerUserId` OWNER grant), I want to attach many labels to a task and replace that set, so that work can be tagged without inventing one label per task.

### User Story US-003

As an authenticated project member who can read tasks, I want to see assigned labels on the Kanban card face and when viewing a task, so that labels are visible without opening hidden metadata.

### User Story US-004

As an authenticated project member who can list tasks, I want to filter the project task list by a single label, so that I can narrow the board the same way I filter by status or priority.

### User Story US-005

As a VIEWER, I want to see and filter by labels without mutating the catalog or assignments, so that hiding UI is not treated as authorization.

### User Story US-006

As a developer, I want labels owned inside the existing `tasks` domain with narrow ports and no circular domain imports, so that Verified `tasks` / `project-members` / comments / activity invariants stay intact.

### User Story US-007

As a developer, I want Verified comments and activity public contracts, Kanban persistence, membership, and workspace destinations to keep working, so that labels do not replace those slices or implement checklists/audit.

## 5. Functional Requirements

- **FR-001:** The system MUST persist a **per-project label catalog**. Each label MUST belong to exactly one project. There MUST NOT be a global catalog in this feature.
- **FR-002:** A catalog label MUST have a system-assigned unique identity, a system-assigned created time, a `projectId` association, a required name (1–40 characters after trim), and a **required** color from a fixed named token catalog (no freeform hex). Client MUST NOT supply `id` or `createdAt`. Name uniqueness MUST be unique after trim, **case-insensitive**, within the project. Authorized catalog writers MAY `PATCH` name and/or color after create.
- **FR-003:** A task MUST be able to have **many** labels from **its own parent project’s** catalog (many-to-many). Assigning a label from another project MUST fail without creating the association. A task MUST NOT require any labels. There is **no hard cap** on catalog size or labels per task in this feature.
- **FR-004:** Catalog list and item reads MUST require authentication plus project **task-read** authorization via `TaskAuthorizationPort.requireTaskRead` (OWNER, EDITOR, VIEWER, including `ownerUserId` grant). Catalog create/update/delete MUST require **task write** (`requireTaskWrite`: OWNER + EDITOR, including `ownerUserId` OWNER grant). Assignment mutation MUST require the same task write. Unauthenticated callers MUST fail as `401`. Non-members MUST fail as `403` when the parent project exists. Missing project MUST fail as `404` on project-scoped catalog routes.
- **FR-005:** Catalog delete MUST **hard-delete** the label and remove all task assignments for that label; no restore. Assignment mutation MUST be `PUT /api/tasks/:taskId/labels` with replace-set body `{ labelIds: string[] }` (empty array clears all).
- **FR-006:** Public task responses that power the board MUST extend `PublicTaskDto` with `labels: Array<{ id, name, color }>` on create/get/list/update so the card face can render labels. Empty array when none assigned.
- **FR-007:** `GET /api/projects/:projectId/tasks` MUST support an optional single `labelId` query param (tasks that include that label), composed with existing optional `status` and/or `priority` filters (AND across provided filters). Invalid filter values MUST fail validation (`400`). Unknown query parameters MUST fail validation (`400`). Empty authorized match MUST be `200` with an empty collection.
- **FR-008:** Authentication MUST remain distinct from authorization. Protected label and labeled-task operations MUST require a valid `devtrack_session`. `auth` middleware MUST NOT decide membership or label permissions. Frontend-only hiding MUST NOT replace backend checks.
- **FR-009:** The backend MUST remain a modular monolith. Domain ownership MUST be the existing **`tasks`** domain (catalog + assignment). A generic repository MUST NOT be introduced. Circular domain dependencies MUST NOT be introduced. Owning domain MUST NOT import other domains’ Prisma repository implementations. Cross-domain authz MUST use `TaskAuthorizationPort` (and existing narrow ports as needed).
- **FR-010:** Prisma MUST be used only behind owning-domain repositories. Label persistence MUST be an **additive** versioned migration under `backend/prisma/`. MUST NOT use `migrate reset` or delete Docker volumes. Controllers MUST NOT query the database. Services MUST NOT issue ad hoc Prisma queries. Prisma types MUST NOT be domain entities or public DTOs.
- **FR-011:** External input MUST be validated at HTTP boundaries with Zod. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, session ids in JSON, or sensitive database data.
- **FR-012:** Verified `010-task-comments` public HTTP contracts MUST remain intact (no required comments path/DTO/status changes for labels).
- **FR-013:** Verified `011-task-activity` public list contract and Decided activity kinds MUST remain intact. Label catalog and assignment changes MUST NOT create activity events.
- **FR-014:** The React UI MUST: (a) show assigned labels on the Kanban **card face**; (b) support **filter by label** in the existing compact filters above the board; (c) allow authorized assignment changes in the existing task-detail Dialog; (d) provide catalog management via a **board-header Labels Dialog** (Members-like). Call `VITE_API_URL` with `credentials: 'include'`. Do not store a bearer token in JS. Do not redesign Members Dialog, dashboard ownership rules, or Kanban DnD beyond label display/filter needs. Do not implement checklists UI.
- **FR-015:** Archived-parent behavior for catalog mutate and assignment mutate MUST match task writes: authorized `ownerUserId` → `409` `CONFLICT`; other members → `403`. Catalog list and task list/filter reads on archived projects MUST still follow Verified task-read rules.
- **FR-016:** Domain label identity, project association, many-to-many assignment, authz-vs-auth, and filter composition MUST be testable without HTTP or Prisma. API and critical UI behavior MUST be tested with Vitest, Testing Library, and SuperTest as applicable.
- **FR-017:** CORS, session cookie, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and the error envelope MUST stay as verified. `GET /health` and `GET /ready` MUST remain public.
- **FR-018:** This feature MUST NOT implement checklists (**F**) or app-wide audit (**C**). It MUST NOT write `specs/005-audit/`. It MUST NOT change `constitution.md`.
- **FR-019:** Label name length MUST be 1–40 characters after trim. There MUST be no hard cap on catalog size or labels per task in this feature.

### Permission mapping

| Operation | Authorization |
| --- | --- |
| List catalog / see labels on tasks / filter by label | Task read (OWNER, EDITOR, VIEWER) |
| Create / update / delete catalog label | Task write (OWNER + EDITOR, including `ownerUserId` OWNER grant) |
| Assign / replace / remove labels on a task (`PUT` replace-set) | Task write (OWNER + EDITOR, including `ownerUserId` OWNER grant) |
| Non-member on existing project | `403` |
| Missing project (catalog routes) | `404` |
| Soft-deleted or missing task (assignment ops) | `404` |
| Archived parent mutations | `ownerUserId` → `409`; other members → `403`; reads still allowed |

## 6. Acceptance Criteria

### Scenario AC-001: Create catalog label

- Given an authenticated OWNER or EDITOR on an active project
- When they create a label with a valid name (1–40 after trim) and a required fixed color token
- Then a catalog label is persisted for that `projectId` with system-assigned `id` and `createdAt`
- Then an authorized reader can list it via the project catalog list endpoint

### Scenario AC-002: Many labels per task

- Given an OWNER or EDITOR and two live labels in the same project catalog
- When they `PUT` both label ids onto a live task via `{ labelIds }`
- Then both labels are associated with that task
- Then authorized task get/list/create/update responses include those labels as `{ id, name, color }`

### Scenario AC-003: Reject cross-project label assignment

- Given a live label belonging to project A and a live task in project B
- When an otherwise authorized actor tries to assign that label to the task
- Then the API fails without creating the cross-project association

### Scenario AC-004: Card face shows labels

- Given a live task with one or more assigned labels visible to an authorized board viewer
- When the project board renders that task card
- Then the card face shows the assigned label name(s) and color-token affordance

### Scenario AC-005: Filter by label

- Given multiple live tasks on a project, only some assigned a given catalog label
- When an authorized member lists tasks with optional `labelId`, optionally combined with status and/or priority
- Then only matching non-deleted tasks for that project are returned (AND across provided filters)
- When no tasks match
- Then the API responds `200` with an empty task collection

### Scenario AC-006: Unauthenticated and forbidden

- Given no valid session, or a valid session for a non-member of an existing project
- When they attempt catalog list/mutate or label assignment or filtered list
- Then unauthenticated → `401`; non-member on existing project → `403`; no catalog/assignment data leaked beyond the error envelope

### Scenario AC-007: VIEWER read vs write

- Given a VIEWER on an active project
- When they list the catalog, list/filter tasks, and view card/detail labels
- Then those reads succeed under task-read rules
- When they attempt catalog mutate or assignment mutate
- Then the API responds `403` and does not persist changes

### Scenario AC-008: Catalog delete

- Given a catalog label that may or may not be assigned to tasks
- When an authorized OWNER or EDITOR deletes it
- Then the catalog row is hard-deleted and all assignments for that label are removed; no restore

### Scenario AC-009: Comments and activity contracts intact

- Given Verified comments and activity public routes
- When labels are implemented
- Then comments path/DTO/status contracts remain unchanged
- Then activity public list contract and Decided kinds remain unchanged
- Then label catalog and assignment changes do not emit activity events
- Then this folder does not implement checklists or app-wide audit; no `specs/005-audit/`; no constitution change

### Scenario AC-010: Frontend surfaces

- Given an authorized member on a project board
- When labels exist and are assigned
- Then filters include label filtering; card face shows labels; TaskDetail supports assignment for writers; board-header Labels Dialog supports catalog CRUD for writers
- Then credentials are included; no bearer token storage; no Trello branding requirement; no checklists UI

### Scenario AC-011: Validation

- Given an authenticated catalog writer
- When they create/update with empty name after trim, name longer than 40 after trim, unknown fields, server-owned fields, or invalid color token
- Then the API responds `400` `VALIDATION_ERROR` and does not persist invalid changes
- When they create/update with a name that collides case-insensitively within the project
- Then the API responds `409` `CONFLICT`

### Scenario AC-012: Archived parent

- Given an archived parent project
- When catalog mutate or assignment mutate is attempted
- Then `ownerUserId` → `409` `CONFLICT`; other members → `403`
- When catalog list or task list/filter is attempted by an authorized reader
- Then reads still succeed under Verified task-read rules

### Scenario AC-013: Soft-deleted task

- Given a soft-deleted task id
- When assignment mutate or task get is attempted
- Then the API responds `404` for every caller (same pattern as other task item ops)

### Scenario AC-014: Additive migration only

- Given the existing Verified database
- When label persistence is added
- Then only an additive versioned Prisma migration is introduced; no `migrate reset`; no volume delete

### Scenario AC-015: Domain and security boundaries

- Given the modular monolith
- When labels ship
- Then ownership is the `tasks` domain; Prisma stays behind owning repositories; authz is enforced in the backend via `TaskAuthorizationPort`; no secrets/stack traces/hashes in responses

## 7. Business Rules

- Label catalog is **per project** — owning domain: `tasks`
- Many labels per task; labels must come from the task’s project catalog — owning domain: `tasks`
- Catalog writers and assigners = OWNER + EDITOR (task write)
- Color required from fixed named tokens; name unique after trim, case-insensitive within project; name 1–40 after trim; no hard count caps
- Catalog delete hard-deletes label + all assignments; no restore
- Task soft-delete hides assignment API surface (`404`) while join rows may remain in storage until label delete or replace — owning domain: `tasks`
- Authentication ≠ authorization — owning domains: `auth` vs `project-members` / `tasks` label use cases
- Archived parent mutations match task writes (`409` / `403`); reads still allowed
- No checklists, no app-wide audit, no label activity events in this feature
- Comments/activity public contracts preserved

## 8. Data

Business concepts:

- **ProjectLabel (catalog entry):** identity, `projectId`, name, color (fixed named token), `createdAt`; unique after trim case-insensitive within project; hard-delete; name 1–40 after trim
- **TaskLabelAssignment (join):** associates a task with a catalog label in the same project; many labels per task; many tasks per label
- **Task (existing):** public reads include assigned labels as `{ id, name, color }`; no change to status/priority/dueDate enumerations

Lifecycle:

- Catalog create/update/delete on active project by OWNER/EDITOR; archived mutate blocked per FR-015
- Assignment replace-set on live tasks by OWNER/EDITOR via `PUT .../labels`
- Soft-deleted tasks: no HTTP assignment surface (`404`)
- Project delete is out of scope; join cleanup on label hard-delete MUST remove assignments for that label

Do not prescribe Prisma table names here.

## 9. API and Integrations

Expected capabilities (details in `plan.md`):

- Project-scoped catalog: `GET`/`POST`/`PATCH`/`DELETE` under `/api/projects/:projectId/labels`
- Task-scoped assignment: `PUT /api/tasks/:taskId/labels` replace-set `{ labelIds }`
- Task list filter: optional single `labelId` AND with `status`/`priority`
- Task public DTO: `labels: [{ id, name, color }]` on create/get/list/update
- Session cookie auth; membership authz via `TaskAuthorizationPort`
- No mail, no third-party label services; no activity events for labels

## 10. Security

- Session required for all label catalog and assignment routes and for filtered task list (existing task list already session-protected)
- Resource-level checks in backend via Verified membership ports
- Validate name/color/ids at boundary; reject unknown fields
- Do not expose Prisma internals, secrets, or stack traces
- Do not treat frontend filter/card chrome as authorization

## 11. Non-Functional

- Reuse existing stack and Compose topology
- Prefer clear educational patterns over new abstraction layers
- Do not invent numeric latency targets
- Card-face label display MUST remain readable in the existing compact Kanban card

## 12. Dependencies

- Existing features: Verified 001–011 (esp. 004 task list filters, 006/007 Kanban card + filters, 009 membership/`TaskAuthorizationPort`, 010 comments contracts, 011 activity contracts)
- Architectural constraints: constitution Articles I–XIII; additive Prisma only; modular monolith
- External dependencies: none expected beyond current npm stack

## 13. Failures and Edge Cases

- Unauthenticated → `401`
- Non-member → `403` when project exists
- Missing project → `404` on project-scoped catalog routes
- Missing/soft-deleted task → `404` on assignment ops
- Unknown label id in replace-set → `404`
- Cross-project label id on a task → fail without association
- Duplicate name (case-insensitive after trim) → `409` `CONFLICT`
- Empty filter match → `200` empty list
- Archived parent mutations → `ownerUserId` `409`; other members `403`; reads allowed
- Invalid query/body → `400` `VALIDATION_ERROR`

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001, FR-002 | AC-001, AC-011 | Domain + API tests |
| FR-003 | AC-002, AC-003 | Service + API tests |
| FR-004, FR-008 | AC-006, AC-007, AC-015 | Authz API tests |
| FR-005 | AC-008 | API tests |
| FR-006, FR-014 | AC-004, AC-010 | API + frontend tests |
| FR-007 | AC-005 | API + frontend filter tests |
| FR-009–FR-011, FR-016–FR-017 | AC-014, AC-015 | Migration + typecheck + tests |
| FR-012, FR-013, FR-018 | AC-009 | Contract regression + scope check |
| FR-015 | AC-012, AC-013 | Archived + soft-delete tests |
| FR-019 | AC-011 | Validation tests |

## 15. Open Questions

### Decided for this feature (locked — do not reopen unless constitution conflict)

- **Per-project label catalog** (not global).
- **Many labels per task**.
- **Show labels on the card face**.
- **Support filter by label**.
- **Not** checklists (**F**); **not** `specs/005-audit/`; **not** constitution changes.
- Additive Prisma migration only; no reset; no volume delete.
- Reuse Verified `TaskAuthorizationPort` / membership patterns.
- Keep Verified comments and activity public contracts intact; no label activity events.

### Decided — material (Q-080–Q-093; user chose option 1 for each)

- **Q-080:** Domain ownership. Owner: architecture. Status: **Decided** → **1**.
  - Own catalog + assignment under existing `tasks` domain (mirror comments/activity; project-scoped routes still use `TaskAuthorizationPort`).

- **Q-081:** Who may create/update/delete catalog labels? Owner: product + `project-members`. Status: **Decided** → **1**.
  - OWNER + EDITOR (task write), including `ownerUserId` OWNER grant.

- **Q-082:** Who may assign/replace/remove labels on a task? Owner: product + `project-members`. Status: **Decided** → **1**.
  - OWNER + EDITOR (task write), including `ownerUserId` OWNER grant.

- **Q-083:** Label color model. Owner: product + frontend. Status: **Decided** → **1**.
  - Required color from a fixed named catalog of tokens (no freeform hex). Exact token enum is listed in `plan.md` API/persistence sections.

- **Q-084:** Label name uniqueness within a project. Owner: product + `tasks`. Status: **Decided** → **1**.
  - Unique per project after trim, case-insensitive.

- **Q-085:** Catalog delete when labels are assigned. Owner: product + `tasks`. Status: **Decided** → **1**.
  - Hard-delete catalog row and remove all task assignments for that label; no restore.

- **Q-086:** Task↔label mutation API. Owner: product + API. Status: **Decided** → **1**.
  - `PUT /api/tasks/:taskId/labels` replace-set body `{ labelIds: string[] }`.

- **Q-087:** How task responses expose labels for card face. Owner: product + API. Status: **Decided** → **1**.
  - Extend `PublicTaskDto` on create/get/list/update responses with `labels: Array<{ id, name, color }>`.

- **Q-088:** List filter semantics for `GET /api/projects/:projectId/tasks`. Owner: product + API. Status: **Decided** → **1**.
  - Optional single `labelId` query param; return tasks that include that label; AND with optional status/priority.

- **Q-089:** Activity emission for label changes. Owner: product + `tasks`. Status: **Decided** → **1**.
  - No activity events for catalog or assignment changes (preserve Verified 011 kinds and public contract).

- **Q-090:** Catalog management UI placement. Owner: product + frontend. Status: **Decided** → **1**.
  - Board-header Labels Dialog (Members-like) for catalog CRUD + TaskDetail assignment + card face + filter.

- **Q-091:** Rename / recolor after create. Owner: product. Status: **Decided** → **1**.
  - Allow `PATCH` of name and/or color by catalog writers (Q-081).

- **Q-092:** Limits. Owner: product. Status: **Decided** → **1**.
  - Name length 1–40 after trim; no hard cap on catalog size or labels per task in this feature.

- **Q-093:** Archived parent behavior for label catalog mutate and assignment mutate. Owner: product. Status: **Decided** → **1**.
  - Same as task writes: authorized `ownerUserId` → `409`; non-owner members → `403`; catalog list and task list/filter still follow Verified read rules.

### Deferred platform items (unchanged)

- **Q-006:** Dev vs production images. Deferred.
- **Q-007:** Probe list retention. Deferred.
- **Q-009:** CI and deployment. Deferred.
- **Q-015:** Password complexity beyond non-empty. Deferred.
- **Q-017:** Rate limiting and account lockout. Deferred.

### Later product work (do not specify here)

- Checklists (**F**), assignees, attachments, covers, rank, search, notifications, calendar, invite-by-email (**M**), public share links (**O**), AI, app-wide audit (**C**, later ID, **not** `specs/005-audit/`).

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-080–Q-093 Decided (option 1 each)
- Approved for planning: Yes
- Approved for implementation: Yes
