# Feature Specification: Task Attachments (and card covers)

- **ID:** 017-task-attachments
- **Status:** Verified
- **Created:** 2026-11-06
- **Related features:** 001-foundation through 016-ui-refinements (Verified); proposed backlog **G**; app-wide audit **C** deferred separately (not this folder); custom user-defined statuses deferred separately (not 016)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Material product questions in section 15 (**Q-130–Q-140**) are **Decided** (2026-11-06; Q-133 size amended to **20 MiB**/file) and bind plan/tasks. Implementation may proceed on T001–T019 only. Do **not** invent alternate answers at implementation time. Do **not** write `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** reopen custom statuses, checklist reopen, or Verified comments/labels/checklist public contracts beyond additive attachment/cover surfaces. Prefer folder `specs/017-task-attachments/` (covers ship in this folder per Q-130 option 1).

This ID is **017-task-attachments** (proposed product ID **G**). Prior sequencing **Q-105** (F before G) is already Decided and Verified in 015. Prior **Q-107 / Q-108** deferred local Compose storage direction into this feature; Q-131 Decides that path.

## 1. Problem

Verified slices persist membership-authorized projects and tasks, Kanban, comments, activity, labels, checklists, and a polished two-column TaskDetail. Collaborators can discuss, tag, and check off work, but there is **no way to attach files to a task** or show a **card cover** image on the Kanban face.

`proposed-features.md` lists this as item **G** (“Card cover / attachments”; needs storage and validation). App-wide audit (**C**) and custom statuses remain separate later features.

## 2. Goals

- Persist **file attachments on a live task**, with metadata in PostgreSQL and binary content on a local Compose named volume (Q-131).
- Authorize list/download/view via task **read** and upload/delete/cover-mutate via task **write** through Verified `TaskAuthorizationPort` (Q-134).
- Serve download/view only through **authenticated, authorized** HTTP — **no open public URLs** without session + resource checks (Q-139).
- Own persistence and use cases under the existing **`tasks`** domain.
- Surface attachments in existing TaskDetail (013–016): **action-row Attachment Popover** for upload (Labels-like) + **main-column attachment list** only (Q-137 amended), without redesigning Members Dialog, dashboard ownership, Kanban DnD core, or checklist flows.
- Support **card cover** from an image attachment in this folder (Q-130 / Q-138 / Q-140).
- Reuse session cookie `devtrack_session`, Zod, error envelope, npm / Node.js 22 / PostgreSQL 16 / Prisma 6, Vitest + Testing Library + SuperTest, modular monolith, Prisma behind owning-domain repositories, and an **additive** migration only.
- Leave app-wide audit (**C**), custom statuses, checklist reopen, assignees, rank (**H**), public share links (**O**), and AI out of this folder.

## 3. Non-Goals

- App-wide CRUD audit (`proposed-features.md` **C**) — separate later feature ID; do not write `specs/005-audit/`.
- Custom user-defined task statuses (deferred after 016).
- Reopening Verified checklist product rules (015/016).
- Assignees, within-column rank (`position` on tasks), search, notifications, calendar, invite-by-email (**M**), public share links (**O**), AI.
- Soft-delete / restore of tasks or comments (existing rules unchanged).
- Soft-delete of attachments or GC of orphans after parent soft-delete (Q-132).
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- Production object storage / CDN (Q-131 Decided local volume).
- Full antivirus gateway / commercial malware platform (Q-133: allowlist + size limits only).
- Changing `constitution.md`.
- `migrate reset`, Docker volume delete, or destructive DB operations without explicit authorization.
- Unauthenticated or unsigned publicly cacheable attachment URLs.
- Inline main-column upload control (upload lives in the Attachment Popover only; list stays stacked in the main column).
- Solid-color task covers; separate cover-only upload field distinct from attachments.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR (task write, including `ownerUserId` OWNER grant), I want to upload files onto a live task, so that supporting documents and images live with the work item.

### User Story US-002

As an authenticated project member who can read tasks, I want to list and download/view attachments I am authorized to see, so that collaboration does not require side-channel file sharing.

### User Story US-003

As a VIEWER, I want to see and download attachments without uploading or deleting them, so that hiding UI is not treated as authorization.

### User Story US-004

As an OWNER or EDITOR, I want to designate a cover for a task from an image attachment, so that the Kanban card face communicates the card visually.

### User Story US-005

As a developer, I want attachments owned inside the existing `tasks` domain with narrow ports, filesystem/storage isolation behind a repository/port, and no circular domain imports, so that Verified membership / comments / activity / labels / checklists stay intact.

### User Story US-006

As a security-conscious operator of an educational Compose app, I want MIME allowlists, size limits, and authenticated download, so that uploads are practical to reason about without pretending to be enterprise DLP.

## 5. Functional Requirements

Requirements below bind to Decided Q-130–Q-140.

- **FR-001:** The system MUST persist **zero or more attachments per live task**. Each attachment MUST belong to exactly one task. Client MUST NOT supply attachment `id` or `createdAt`.
- **FR-002:** Each attachment MUST store durable **metadata** (at least: identity, parent `taskId`, original filename / display name rules per plan, content type, byte size, created time, storage key/path) in PostgreSQL via Prisma behind a `tasks` repository. Binary bytes MUST live on the local Compose named volume per Q-131 (not as unbounded Postgres `bytea` for primary content).
- **FR-003:** Upload MUST accept **multipart** HTTP input nested under the task (Q-136). List MUST return metadata suitable for TaskDetail without embedding file bytes. Download/view MUST stream bytes only after authz (Q-139).
- **FR-004:** Attachment **list / download / view** MUST require authentication plus task **read** via `TaskAuthorizationPort.requireTaskRead` (Q-134). **Upload / delete / cover-mutate** MUST require task **write** via `requireTaskWrite` (Q-134). Unauthenticated → `401`. Soft-deleted or missing task → `404`. Non-members on an existing live parent → `403` when authorization fails.
- **FR-005:** Archived-parent behavior for attachment mutations MUST match task writes / checklists / labels (Q-134): `ownerUserId` → `409` `CONFLICT`; other members → `403`; reads follow Verified task-read rules.
- **FR-006:** Allowed content types MUST be `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`, `text/plain`; max **20 MiB** per file; max **20** attachments per task; magic-byte sniff where practical; **no** AV engine; reject non-allowlisted types; sanitize filenames (Q-133). Validation MUST NOT trust client `Content-Type` alone when a practical magic-byte / sniff check is feasible.
- **FR-007:** Storage path layout MUST be `{root}/{projectId}/{taskId}/{attachmentId}` with Compose named volume + `ATTACHMENTS_ROOT` (Q-131). Hard-delete of an attachment MUST remove metadata row and blob; soft-deleted tasks MUST expose no attachment HTTP surface (`404`); keep attachment rows/blobs under soft-deleted parents; **no** GC in this feature; **no** attachment soft-delete column (Q-132).
- **FR-008:** Authentication MUST remain distinct from authorization. Frontend-only hiding MUST NOT replace backend checks. Download/view endpoints MUST NOT be publicly cacheable without auth.
- **FR-009:** The backend MUST remain a modular monolith. Domain ownership MUST be the existing **`tasks`** domain. A generic repository MUST NOT be introduced. Circular domain dependencies MUST NOT be introduced. Binary I/O MUST sit behind a narrow storage port used by `tasks` services (not Express controllers talking to disk ad hoc beyond the port adapter).
- **FR-010:** Prisma MUST be used only behind owning-domain repositories. Attachment metadata persistence MUST be an **additive** versioned migration under `backend/prisma/`. MUST NOT use `migrate reset` or delete Docker volumes without explicit authorization. Controllers MUST NOT query the database. Services MUST NOT issue ad hoc Prisma queries. Prisma types MUST NOT be domain entities or public DTOs. Extending `TaskActivityKind` MUST be additive (Q-135).
- **FR-011:** External input MUST be validated at HTTP boundaries. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, session ids in JSON, absolute host filesystem paths that leak deployment layout beyond an opaque storage key if required, or sensitive database data.
- **FR-012:** Verified comments, labels, checklists, and activity **path/envelope** public contracts MUST remain intact aside from additive attachment/cover surfaces and additive activity kinds `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` (Q-135).
- **FR-013:** MUST NOT embed a full attachments array on `PublicTaskDto`. MUST embed optional cover summary `cover: { attachmentId, contentType, ... } | null` for Kanban when set (Q-140). TaskDetail MUST load the full attachment list via dedicated GET.
- **FR-014:** Cover MUST be a nullable pointer to one **image** attachment on the same task. Kanban card face MUST show the cover. Clearing cover MUST NOT delete the attachment. Deleting the cover attachment MUST clear cover (Q-130 / Q-138).
- **FR-015:** TaskDetail UI MUST provide an action-row **Attachment** control that opens a **Popover** (Labels-like) for upload, and MUST render the **attachment list stacked in the main column** (Q-137 amended). MUST **NOT** keep an inline main-column upload form. MUST NOT add fake Dates placeholders. MUST call `VITE_API_URL` with `credentials: 'include'`. Do not store a bearer token in JS.
- **FR-016:** The system MUST emit `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` in the **same DB transaction** as the corresponding write; fail the write if activity insert fails (Q-135; match 011 Q-077).
- **FR-017:** Domain attachment identity, task association, authz-vs-auth, storage key invariants, and delete/retention rules MUST be testable without HTTP where practical. API and critical UI behavior MUST be tested with Vitest, Testing Library, and SuperTest as applicable. Storage adapter tests MAY use a temp directory fixture.
- **FR-018:** CORS, session cookie, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and the error envelope MUST stay as verified. `GET /health` and `GET /ready` MUST remain public. Compose remains three primary services; an **additional named volume** for attachment blobs is required (Q-131) — not a fourth app service.
- **FR-019:** This feature MUST NOT implement app-wide audit (**C**). It MUST NOT write `specs/005-audit/`. It MUST NOT change `constitution.md`. Work MUST live under `specs/017-task-attachments/`.

### Permission mapping (Q-134 Decided option 1)

| Operation | Authorization |
| --- | --- |
| List / download / view attachment | Task read (OWNER, EDITOR, VIEWER) |
| Upload / delete attachment | Task write (OWNER + EDITOR, including `ownerUserId` OWNER grant) |
| Set / clear cover | Task write |
| Non-member on existing project | `403` |
| Missing / soft-deleted task | `404` |
| Archived parent mutations | `ownerUserId` → `409`; other members → `403`; reads allowed per task-read |

## 6. Acceptance Criteria

Scenarios bind to Decided Q-130–Q-140.

### Scenario AC-001: Upload and list

- Given a live task and a writer session
- When the writer uploads an allowlisted file via nested multipart
- Then metadata is persisted and the file is stored under `{root}/{projectId}/{taskId}/{attachmentId}`
- Then list returns the new attachment metadata without raw bytes
- Then an `ATTACHMENT_ADDED` activity event is recorded in the same transaction as metadata persistence

### Scenario AC-002: Download / view authorized

- Given an attachment on a live task
- When a member with task read requests download/view
- Then bytes are returned only after session + `requireTaskRead`
- Then no unauthenticated public URL serves the file

### Scenario AC-003: VIEWER cannot mutate

- Given a VIEWER session
- When the VIEWER lists/downloads
- Then success for read paths
- When the VIEWER uploads or deletes or sets/clears cover
- Then `403`

### Scenario AC-004: Auth failures

- Given missing session / non-member / soft-deleted task
- When attachment routes are called
- Then `401` / `403` / `404` respectively as mapped in FR-004

### Scenario AC-005: Validation and safety policy

- Given allowlist jpeg/png/webp/gif/pdf/text/plain, 20 MiB max, 20/task, magic sniff, no AV (Q-133)
- When a caller uploads disallowed type, oversized file, or over count cap
- Then `400` `VALIDATION_ERROR` (or Decided status codes in plan) and no persisted metadata/blob

### Scenario AC-006: Hard-delete attachment

- Given an existing attachment
- When a writer deletes it
- Then metadata row and blob are removed
- Then an `ATTACHMENT_REMOVED` activity event is recorded same-tx
- Then if that attachment was the cover, cover clears (Q-138)

### Scenario AC-007: Soft-deleted parent

- Given a soft-deleted task
- When any attachment route is called
- Then `404` for every caller
- Then attachment rows and blobs remain (no GC; no attachment soft-delete)

### Scenario AC-008: Archived parent

- Given a task under an archived project
- When a writer mutates attachments or cover
- Then `ownerUserId` → `409`; other members → `403`
- Then authorized reads follow task-read

### Scenario AC-009: Contracts non-regression

- Given Verified comments / labels / checklists / activity path-envelope
- When attachment work lands
- Then those public contracts remain intact aside from additive attachment/cover routes, `PublicTaskDto.cover` summary, and activity kinds `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED`

### Scenario AC-010: TaskDetail UI (Popover upload + stacked list)

- Given TaskDetail opens on a live task
- When attachments are shown
- Then an action-row **Attachment** control opens a **Popover** with the upload control (Labels-like)
- Then the **attachment list** is stacked in the **main column** (no inline main-column upload form)
- Then VIEWER is read-only; writers can upload/delete when allowed; archived disablement matches other writes
- Then set/clear cover controls are available to writers on eligible image attachments

### Scenario AC-011: Cover + Kanban

- Given a writer sets an image attachment as cover
- When the board renders the task
- Then Kanban card face shows the cover via cover summary on `PublicTaskDto` and authenticated content strategy
- When cover is cleared (without deleting the attachment) or the cover attachment is deleted
- Then card face no longer shows that cover

### Scenario AC-012: Additive migration + Compose storage

- Given Q-131 local volume
- When migration and Compose changes apply
- Then Prisma migration is additive; `migrate deploy` only; no reset/volume delete without auth
- Then backend can read/write `ATTACHMENTS_ROOT` with path `{root}/{projectId}/{taskId}/{attachmentId}`
- Then `constitution.md` is unmodified

### Scenario AC-013: Domain ownership

- Given the modular monolith
- When attachment code lands
- Then it lives under `backend/src/modules/tasks/` (+ shared infra adapter for disk if needed)
- Then authz uses `TaskAuthorizationPort`
- Then no peer `attachments` product domain and no `specs/005-audit/`

### Scenario AC-014: Scope / constitution

- Given this feature folder
- When scope is inspected
- Then no custom statuses, checklist reopen, or audit **C** implementation appears
- Then `constitution.md` is unmodified by this feature

## 7. Business Rules

- Attachments belong to a live task; soft-deleted parent hides HTTP surface (`404`); rows/blobs kept; no GC — owning domain: `tasks` (Q-132)
- List/download/view = task read; upload/delete/cover = task write via `TaskAuthorizationPort` (Q-134) — owning domains: `tasks` + `project-members` port
- No open public attachment URLs without auth (Q-139) — owning domain: `tasks` HTTP
- MIME/size/count/safety policy per Q-133 — owning domain: `tasks` boundary validation + storage port
- Storage layout + Compose volume per Q-131 — owning domain: `tasks` + storage adapter
- Cover = nullable image-attachment pointer; clear ≠ delete attachment; delete cover attachment clears cover (Q-138)
- Activity: `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` same-tx fail-write (Q-135)
- `PublicTaskDto` gets cover summary only; not full attachments array (Q-140)
- TaskDetail: action-row Attachment Popover for upload; list stacked in main column (Q-137 amended)
- Comments / labels / checklists public contracts preserved; activity path/envelope preserved with additive kinds only
- No app-wide audit (**C**); no constitution change; additive Prisma only

## 8. Data

Business concepts (Prisma names belong in the plan):

- **TaskAttachment:** identity, parent `taskId`, original filename / display name, content type, byte size, storage key, `createdAt`, optional uploader user id; hard-delete lifecycle for the attachment row (Q-132)
- **Task cover:** nullable `coverAttachmentId` on Task pointing at an image attachment on the same task (Q-138)
- **TaskActivityEvent (existing):** additive kinds `ATTACHMENT_ADDED`, `ATTACHMENT_REMOVED`, `COVER_CHANGED` (Q-135)
- **Task (existing):** soft-delete continues to hide attachment HTTP; `PublicTaskDto` embeds cover summary only (Q-140)

Lifecycle:

- Create/list/download/delete on live tasks by authz mapping
- Soft-deleted tasks: no HTTP attachment surface (`404`); keep rows/blobs; no GC
- Project archive: mutations per archived mapping
- Cover clear on attachment delete if that attachment was cover; clear cover alone does not delete attachment

## 9. API and Integrations

Nested REST (Q-136 Decided option 1):

- `GET` / `POST` `/api/tasks/:taskId/attachments` (POST multipart)
- `GET` `/api/tasks/:taskId/attachments/:attachmentId` (metadata) and/or list-only if plan drops single-get
- `GET` `/api/tasks/:taskId/attachments/:attachmentId/content` (bytes; session + `requireTaskRead`)
- `DELETE` `/api/tasks/:taskId/attachments/:attachmentId`
- Cover: `PUT` / `DELETE` `/api/tasks/:taskId/cover` (`PUT` body `{ attachmentId }` for image attachment on same task; `DELETE` clears without deleting attachment)
- Session cookie auth; membership authz via `TaskAuthorizationPort`
- Activity: reuse `GET /api/tasks/:taskId/activity` with additive kinds

Exact DTO field lists and status codes belong in `plan.md`.

## 10. Security

- Session required for all attachment routes
- Resource-level checks in backend via Verified membership ports
- Validate multipart size, allowlisted types, filename sanitization (no path traversal in stored names/keys)
- Do not expose absolute server paths, secrets, or stack traces
- Do not treat frontend chrome as authorization
- Do not serve attachments from a static public Compose bind without auth middleware
- Practical malware stance: allowlist + size/count + sniff; no AV (Q-133)
- Content responses: `Cache-Control: private` (or no-store); no signed long-lived public URLs (Q-139)

## 11. Non-Functional

- Reuse existing stack and three primary Compose services
- Prefer clear educational patterns (disk port + metadata repo) over premature object-storage abstraction
- Do not invent numeric latency targets
- TaskDetail attachment UI MUST remain usable inside existing Dialog density (Popover upload + stacked list)
- Justify any new npm dependency (e.g. multipart parser) in the plan

## 12. Dependencies

- Existing features: Verified 001–016 (esp. 004 tasks, 009 `TaskAuthorizationPort`, 010–012 comments/activity/labels, 015 checklists, 013–016 TaskDetail UI)
- Architectural constraints: constitution Articles I–XIII; additive Prisma only; modular monolith; Article VI Compose topology (extra **volume** OK; fourth app service not OK)
- External dependencies: none beyond current npm stack until plan justifies multipart/parser helpers
- Product direction from deferred Q-107/Q-108: local Compose storage — Decided in Q-131
- Prior sequencing: Q-105 F before G (done)

## 13. Failures and Edge Cases

- Unauthenticated → `401`
- Non-member → `403` when task/project exists and authz fails
- Missing / soft-deleted task → `404`
- Missing attachment or wrong-task association → `404`
- Invalid multipart / type / size / count → validation error
- Archived parent mutations → archived mapping
- Empty list → `200` with empty collection
- Non-image attachment used as cover → validation error
- Storage write failure after DB insert (or reverse) → transactional/compensation semantics defined in plan (must not leave silent durable orphans without a documented stance)
- Activity insert failure → fail write same-tx

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-003 | AC-001, AC-002 | Domain + API + storage tests |
| FR-004–FR-005, FR-008 | AC-003, AC-004, AC-008 | Authz API tests |
| FR-006 | AC-005 | Validation tests |
| FR-007 | AC-006, AC-007, AC-012 | Delete + retention + Compose |
| FR-012–FR-013 | AC-009, AC-011 | Contract + DTO / Kanban tests |
| FR-014–FR-015 | AC-010, AC-011 | Frontend tests |
| FR-016 | AC-001, AC-006 | Activity tests |
| FR-009–FR-011, FR-017–FR-019 | AC-012, AC-013, AC-014 | Migration + ownership + scope |

## 15. Open Questions

All below are **Decided** (2026-11-06; Q-133 amended to 20 MiB/file). Plan and tasks MUST match these answers.

### Q-130: Scope split — attachments only vs attachments + card covers

- Owner: product
- Status: **Decided** (2026-11-06)
- Options:
  1. **This folder ships attachments + covers** (cover = designate one allowlisted image attachment, or clear). Solid-color covers out of scope.
  2. **Attachments only** in `017-task-attachments`; card covers deferred to a later folder (e.g. `018-task-covers`).
  3. **Covers only** first (image-or-color on Task) without general attachments — contradicts proposed **G** bundling and prior storage direction.
- **Recommendation: Option 1.**
- **Decided: Option 1** — attachments + cover-from-image-attachment; solid colors out of scope.

### Q-131: Storage backend, path layout, Compose wiring

- Owner: product + infra
- Status: **Decided** (2026-11-06)
- Options:
  1. **Local Compose named volume** mounted on `backend` (e.g. `attachments_data:/data/attachments`); env `ATTACHMENTS_ROOT=/data/attachments`; path layout `{root}/{projectId}/{taskId}/{attachmentId}` (opaque id filename; original name only in DB).
  2. Store primary bytes in PostgreSQL `bytea` / large object.
  3. External S3-compatible object storage (new deps + secrets).
- **Recommendation: Option 1.**
- **Decided: Option 1** — local Compose named volume; path `{root}/{projectId}/{taskId}/{attachmentId}`.

### Q-132: Retention on attachment hard-delete and task soft-delete

- Owner: product + `tasks`
- Status: **Decided** (2026-11-06)
- Options:
  1. Hard-delete attachment → delete DB row + delete blob immediately. Task soft-delete → HTTP `404` only; **leave blobs/metadata rows**; no automatic blob purge in this feature; no attachment soft-delete column.
  2. Hard-delete attachment → delete row + blob. Task soft-delete → also delete all attachment rows + blobs in the same soft-delete transaction.
  3. Soft-delete attachments (`deletedAt`) mirroring comments; separate restore later.
- **Recommendation: Option 1.**
- **Decided: Option 1** — hard-delete row+blob; soft-deleted task → `404`; keep rows/blobs; no GC; no attachment soft-delete.

### Q-133: Allowed MIME/types, size limits, malware policy

- Owner: product + security (educational)
- Status: **Decided** (2026-11-06)
- Options:
  1. Allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`, `text/plain`; max **20 MiB**/file; max **20** attachments/task; sniff magic bytes where practical; **no** AV engine; reject executable/archive types; sanitize filenames.
  2. Images only (no PDF/text); same size/count.
  3. Broad allowlist + ClamAV sidecar (fourth-ish operational complexity).
- **Recommendation: Option 1.**
- **Decided: Option 1 (amended 2026-11-06)** — jpeg/png/webp/gif + pdf + text/plain; **20 MiB**/file (was 5 MiB); 20/task; magic sniff; no AV.

### Q-134: Authz and archived behavior

- Owner: product + `project-members`
- Status: **Decided** (2026-11-06)
- Options:
  1. Same as checklists/labels: mutate = `requireTaskWrite`; list/download = `requireTaskRead`; archived mutate `ownerUserId` → `409`, others → `403`; reads per task-read.
  2. Download restricted to writers only (VIEWER cannot download).
  3. Upload allowed for VIEWER (not recommended).
- **Recommendation: Option 1.**
- **Decided: Option 1** — write mutate / read list+download; archived like checklists.

### Q-135: Activity kinds

- Owner: product + `tasks`
- Status: **Decided** (2026-11-06)
- Options:
  1. Emit `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` same-tx; fail write if insert fails; payload ids + filename preview; render in Comments & activity (do not omit).
  2. Emit add/remove only; no cover activity (cover reflected only on card face).
  3. No attachment/cover activity events (like labels Q-089).
- **Recommendation: Option 1.**
- **Decided: Option 1** — `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` same-tx.

### Q-136: API shape

- Owner: product + API
- Status: **Decided** (2026-11-06)
- Options:
  1. Nested under tasks: multipart `POST /api/tasks/:taskId/attachments`; `GET` list; `GET .../attachments/:id/content` for bytes; `DELETE .../:id`; cover `PUT/DELETE /api/tasks/:taskId/cover`.
  2. Top-level `/api/attachments` with `taskId` body/query.
  3. Base64 JSON upload (no multipart).
- **Recommendation: Option 1.**
- **Decided: Option 1** — nested multipart under tasks + authenticated `/content`.

### Q-137: TaskDetail UI placement

- Owner: product + frontend
- Status: **Decided** (2026-11-06; **amended 2026-11-06**)
- Options:
  1. Action-row **Attachment** button opens a Dialog (mirror create-checklist Dialog pattern from 016) for upload; attachment list renders in **main column** below checklists/fields.
  2. Inline main-column upload only (no action-row control).
  3. Right-panel “Attachments & activity” redesign.
  4. Action-row **Attachment** opens a **Popover** (Labels-like) for upload; attachment list stays stacked in the **main column**.
- **Recommendation: Option 1** (original); product later chose Labels-like Popover.
- **Decided: Option 4 (amended)** — action-row Attachment **Popover** for upload; list stacked in main column; **no** inline main-column upload form.

### Q-138: Cover vs attachment relationship; Kanban card face

- Owner: product + frontend
- Status: **Decided** (2026-11-06)
- Options:
  1. Cover is a nullable pointer to one **image** attachment on the same task; Kanban card shows cover image via authenticated content URL or cover summary; clearing cover does not delete the attachment; deleting cover attachment clears cover.
  2. Separate cover image upload field distinct from attachments list.
  3. Solid color cover field on Task (no image).
- **Recommendation: Option 1.**
- **Decided: Option 1** — nullable pointer to image attachment; Kanban card face; clear cover ≠ delete attachment; delete cover attachment clears cover.

### Q-139: Download/view auth

- Owner: product + security
- Status: **Decided** (2026-11-06)
- Options:
  1. Bytes only via session cookie + `requireTaskRead` on nested content route; `Cache-Control: private` (or no-store); no signed long-lived public URLs in this feature.
  2. Short-lived signed URLs without session cookie.
  3. Static `/uploads` path served publicly from Compose.
- **Recommendation: Option 1.**
- **Decided: Option 1** — session + `requireTaskRead`; no public/unsigned URLs.

### Q-140: Embed attachment summary on `PublicTaskDto`

- Owner: product + API
- Status: **Decided** (2026-11-06)
- Options:
  1. Do **not** embed full attachments array on `PublicTaskDto`. If covers in scope, embed optional `cover: { attachmentId, contentType, ... } | null` for Kanban. TaskDetail loads full list via dedicated GET.
  2. Embed full `attachments: [...]` metadata on every task list/get.
  3. Embed nothing ever (Kanban cover requires a separate batch endpoint).
- **Recommendation: Option 1.**
- **Decided: Option 1** — cover summary on `PublicTaskDto` only; not full attachments array.

### Locked constraints (not open; already directed)

- Domain ownership under existing **`tasks`** unless a constitution conflict is reported.
- Reuse `TaskAuthorizationPort` patterns (Q-134 Decided).
- Additive Prisma only; no `migrate reset`; no constitution change; no `specs/005-audit/`; no custom statuses; no checklist reopen.
- Verified through `016-ui-refinements`; catalog includes 015–016.
- Q-105 F before G already done.

### Deferred platform items (unchanged)

- **Q-006:** Dev vs production images. Deferred.
- **Q-007:** Probe list retention. Deferred.
- **Q-009:** CI and deployment. Deferred.
- **Q-015:** Password complexity beyond non-empty. Deferred.
- **Q-017:** Rate limiting and account lockout. Deferred.

### Later product work (do not specify here)

- App-wide audit (**C**, later ID, **not** `specs/005-audit/`), custom statuses, assignees, rank (**H**), search, notifications, calendar, invite-by-email (**M**), public share links (**O**), AI, solid-color task covers, attachment GC job for soft-deleted-parent orphans (Q-132).

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-130–Q-140 Decided (Q-133 = 20 MiB/file)
- Approved for planning: Yes
- Approved for implementation: Yes
