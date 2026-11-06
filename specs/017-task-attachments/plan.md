# Implementation Plan: Task Attachments (and card covers)

- **Feature ID:** 017-task-attachments
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Spec section 15 **Q-130–Q-140** are **Decided** (2026-11-06; Q-133 = **20 MiB**/file). Technical shapes below match those answers. Implementation may proceed on T001–T019 only. Do **not** invent alternate answers after Approval. Locked constraints: own under `tasks`; reuse `TaskAuthorizationPort` (Q-134); additive Prisma only; no `migrate reset` / unauthorized volume delete; no constitution change; no `specs/005-audit/`; no custom statuses; no checklist reopen; no open public attachment URLs (Q-139).

## 1. Summary

Add **task attachments** plus **cover-from-image-attachment** (proposed backlog **G**), so authorized members can upload allowlisted files to a task, list/download them via authenticated routes, and show a cover on the Kanban card face.

Decided approach:

- Own attachment metadata + use cases inside existing **`tasks`** domain (mirror comments/checklists), not a peer `attachments` domain and not audit **C**.
- Persist `TaskAttachment` via additive Prisma migration; store bytes on a **Compose named volume** behind a narrow `AttachmentStoragePort` (Q-131 option 1); path `{root}/{projectId}/{taskId}/{attachmentId}`.
- HTTP nested under task with **multipart** upload and authenticated content download (Q-136 / Q-139).
- Authorize mutate with `requireTaskWrite`; list/download with `requireTaskRead`; archived like checklists (Q-134).
- Emit `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` same-tx; fail-write if insert fails (Q-135).
- Frontend: **action-row Attachment Popover** for upload + **main-column list** (Q-137 amended); Kanban cover via `PublicTaskDto.cover` summary (Q-130 / Q-138 / Q-140).
- Hard-delete attachment removes metadata + blob; soft-deleted parent → `404`; keep rows/blobs; no GC; no attachment soft-delete (Q-132).

## 2. Current State

Inspected 2026-11-06. `001-foundation` through `016-ui-refinements` are Verified. Folder `specs/017-task-attachments/` is **Approved** with Q-130–Q-140 **Decided** (Q-133 = 20 MiB/file).

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume `pgdata` only today)
- Backend modules `system`, `auth`, `users`, `projects`, `tasks`, `project-members` under `backend/src/modules/`
- Prisma: `User`, `Project`, `ProjectMember`, `Task` (`deletedAt`, status, priority, dueDate), comments, activity, labels, checklists
- `TaskActivityKind` includes task/comment/checklist kinds; no attachment kinds
- `TaskAuthorizationPort`: `requireTaskRead`, `requireTaskWrite`, `requireProjectOwner`
- `PublicTaskDto` embeds `labels`; does **not** embed checklists or attachments
- Frontend TaskDetail action row: Labels Popover + Checklist button (opens `CreateChecklistDialog`); main column fields + checklists; right Comments & activity
- `docker-compose.yml`: backend bind-mounts `./backend/src` and `./backend/prisma` only — **no attachments volume yet**
- No multipart upload middleware/routes; no disk storage port for product files

Absent:

- Attachment tables, storage volume, upload/download routes, cover field, attachment UI
- Malware scanner / object-storage clients (correctly absent)

Limitations to respect:

- Do not implement **C**; do not write `specs/005-audit/`
- Do not reset the database or delete volumes without authorization
- Do not change public comments / labels / checklists contracts except additive surfaces Decided here
- Soft-deleted tasks → `404` on item ops
- `tasks` MUST NOT import other domains’ Prisma repositories
- Constitution Article VI: three primary services; extra named volume for blobs is OK
- Q-137 amended: action-row Attachment Popover for upload; list in main column; no inline upload form

## 3. Domain Boundaries

- Owning domain: **`tasks`** — attachment invariants, metadata repository, storage port usage, use cases, HTTP, cover rules, activity emission
- Other domains:
  - `project-members` — `TaskAuthorizationPort` only; no new role names
  - `auth` — session middleware only
  - `projects` / `users` / `system` — unchanged (cover does not invent project image storage)
- Shared infrastructure: `AttachmentStoragePort` + filesystem adapter under backend infra or tasks adapter folder; MUST NOT become a peer product domain
- Invariants (Decided):
  - Attachment `id` / `createdAt` system-assigned
  - `taskId` immutable from client
  - Storage key opaque; original filename stored as metadata only (sanitized)
  - Allowlist + size/count per Q-133 (`image/jpeg|png|webp|gif`, `application/pdf`, `text/plain`; 20 MiB; 20/task; magic sniff; no AV)
  - Hard-delete removes metadata + blob; no attachment soft-delete
  - Cover points at image attachment on same task or null; clear ≠ delete; delete cover attachment clears cover
- Cross-domain interfaces (acyclic):
  - Attachment use cases depend on `TaskAuthorizationPort` + task existence/`deletedAt`/`projectId` resolution
  - Activity repository / UoW emission helpers (same as checklists)
  - `project-members` MUST NOT import attachment persistence or disk I/O
- Dependency direction: domain objects MUST NOT import Express, HTTP, Prisma Client, or drivers. Controllers → services → repository contracts / storage port.
- Layout: extend `backend/src/modules/tasks/` with attachment domain/repo/service/dto/validators/controller/routes/tests; activity kind extensions. Do not invent peer `attachments` or `audit` modules.

## 4. API Contract

Reuse existing error envelope and codes. Paths match **Q-136 Decided option 1**.

### Authz / archived / soft-delete (Q-134 Decided)

- List / metadata get / content: session + `requireTaskRead`
- Upload / delete / cover mutate: session + `requireTaskWrite`
- Missing/soft-deleted `:taskId` → `404` for every caller
- Archived parent mutations: `ownerUserId` → `409`; other members → `403`; reads follow task-read
- Wrong-task / missing attachment → `404`

### List attachments

- `GET /api/tasks/:taskId/attachments`
- Auth: session + `requireTaskRead`
- Response: `{ attachments: PublicAttachmentDto[] }` ordered by `createdAt` ascending
- Success: `200` including `{ attachments: [] }`
- DTO fields: `id`, `taskId`, `originalFilename`, `contentType`, `sizeBytes`, `createdAt`, `uploadedByUserId` (nullable if unknown), optional `isCover` derived from task cover pointer

### Upload attachment

- `POST /api/tasks/:taskId/attachments`
- Auth: session + `requireTaskWrite`
- Content-Type: `multipart/form-data` with a single file field (name plan-locked at Approve: prefer `file`)
- Validate: allowlist, max 20 MiB, max 20/task, filename sanitization, magic-byte sniff where practical (Q-133)
- Success: `201` PublicAttachmentDto
- Side effect: persist blob + metadata with documented compensation; emit `ATTACHMENT_ADDED` same-tx (Q-135)
- Errors: `400`; `401`; `403`; `404`; archived per Q-134

### Get attachment metadata (optional if list is enough)

- `GET /api/tasks/:taskId/attachments/:attachmentId`
- Auth: session + `requireTaskRead`
- Success: `200` PublicAttachmentDto
- Errors: `401`; `403`; `404`

### Download / view content

- `GET /api/tasks/:taskId/attachments/:attachmentId/content`
- Auth: session + `requireTaskRead`
- Success: `200` with bytes; `Content-Type` from stored metadata; `Content-Disposition` inline for images / attachment for others (lock at Approve); `Cache-Control: private` (Q-139)
- Errors: `401`; `403`; `404`
- MUST NOT be publicly cacheable without auth; no signed public URLs

### Delete attachment

- `DELETE /api/tasks/:taskId/attachments/:attachmentId`
- Auth: session + `requireTaskWrite`
- Behavior: hard-delete metadata + blob; if cover pointed here, clear cover (Q-138)
- Success: `204`
- Side effect: emit `ATTACHMENT_REMOVED` same-tx; if cover cleared as part of delete, also emit `COVER_CHANGED` same-tx (or combine in one event — lock at Approve: prefer separate kinds when cover actually changes)
- Errors: `401`; `403`; `404`; archived per Q-134

### Cover (Q-130 / Q-138 in scope)

- `PUT /api/tasks/:taskId/cover` body `{ attachmentId: string }` — must be image attachment (`image/jpeg|png|webp|gif`) on same task
- `DELETE /api/tasks/:taskId/cover` — clear cover without deleting attachment
- Auth: session + `requireTaskWrite`
- Success: `200` `{ cover: PublicCoverSummaryDto | null }` (align with Q-140 embed shape)
- Side effect: emit `COVER_CHANGED` same-tx (Q-135)

### PublicTaskDto embed (Q-140)

- Add optional `cover: { attachmentId: string; contentType: string } | null` (exact extra fields lock at Approve if needed for Kanban)
- Do **not** embed `attachments: [...]`

Multipart library choice and over-quota error codes finalized at Approve (prefer existing `VALIDATION_ERROR`).

## 5. Persistence

Prisma (Decided Q-130 / Q-138):

- Model `TaskAttachment` / table `task_attachments`:
  - `id` (cuid/uuid), `taskId` FK → Task (prefer Restrict + explicit delete), `uploadedByUserId` FK → User Restrict (nullable or required — prefer required from session actor), `originalFilename` string, `contentType` string, `sizeBytes` int, `storageKey` string unique, `createdAt`
  - Index on `taskId`, `(taskId, createdAt)`
- Cover:
  - `Task.coverAttachmentId` nullable FK → `TaskAttachment` with `onDelete SetNull`
- Additive migration only under `backend/prisma/migrations/`
- Additive `TaskActivityKind` values: `ATTACHMENT_ADDED`, `ATTACHMENT_REMOVED`, `COVER_CHANGED`
- Repository contract: create/list/get/delete by task; resolve storage key; set/clear cover helpers
- Transactions: metadata + activity in DB transaction; blob write ordering documented (prefer write blob then insert metadata, or insert then blob with delete compensation on failure)
- Soft-deleted parent: attachment rows remain FK’d; no cascade delete; no GC
- Compatibility: no drop of existing columns; no `migrate reset`

Do not expose Prisma models as domain entities or API DTOs.

## 6. Frontend

Decided Q-137 option 2 / Q-138 / Q-140:

- API client helpers with `credentials: 'include'` for list/upload/delete/content URL builders (blob fetch, not `<img src>` to unauthenticated static path)
- `TaskDetail` action-row **Attachment** Popover for upload; attachment list stacked in main column; download/view via authenticated fetch; set/clear cover on image attachments; VIEWER read-only; archived disablement
- **MUST NOT** keep an inline main-column upload form
- Kanban card face shows cover via authenticated fetch → object URL (or equivalent) using cover summary from `PublicTaskDto`
- Extend `CommentsActivityPanel` for `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` (do not omit)
- Do not redesign Members Dialog, dashboard, Kanban DnD core, labels, or checklist flows beyond additive neighbors
- Tests: Popover upload, stacked list, VIEWER, archived, credentials, no public URL assumption; Kanban cover

## 7. Files

Expected (illustrative; do not create until Approved implementation):

- `backend/prisma/schema.prisma` + additive migration
- `backend/src/modules/tasks/domain/` attachment + cover + activity kinds
- `backend/src/modules/tasks/repository/` attachment repo + in-memory fake
- `backend/src/modules/tasks/service/attachments-service.ts`
- `backend/src/modules/tasks/controller|routes|dto|validators/` attachment HTTP
- Backend infra: `attachment-storage-port` + `filesystem-attachment-storage`
- `docker-compose.yml` + `.env.example`: `ATTACHMENTS_ROOT`, named volume mount on backend
- `frontend/src/api/client.ts` + types
- `frontend/src/tasks/` inline Attachments panel + TaskDetail main-column wiring; Kanban card cover
- Tests under backend/frontend Vitest suites

## 8. Dependencies and Config

- New packages: multipart parser for Express (e.g. `multer` or equivalent) — justify at Approve; pin versions; keep educational
- Env: `ATTACHMENTS_ROOT` (required in Compose backend)
- Docker: named volume `attachments_data` mounted at `ATTACHMENTS_ROOT`; **not** a fourth primary service
- No S3 SDK (Q-131)
- No ClamAV sidecar (Q-133)

## 9. Security and Failures

- Session + resource-level authz on every content route
- Multipart limits aligned with Q-133; reject unknown fields/extra files per plan
- Filename sanitization; storage key path segments = `projectId/taskId/attachmentId` only
- Do not symlink-follow user input; do not accept client storage paths
- Map domain errors to existing envelope codes
- On storage failure: fail request; avoid durable DB row without blob (or compensate)
- Activity emission: fail write when activity insert fails (011 Q-077 / Q-135)

## 10. Testing

- Domain: filename/content-type/size invariants; cover pointer rules (image-only; clear vs delete)
- Storage adapter: temp dir write/read/delete
- Service: authz, archived, soft-delete, count cap, emission matrix / fail-write for three kinds
- API SuperTest: multipart upload, content download 401/403/404, delete, cover set/clear, contracts non-regression, `PublicTaskDto.cover` only
- Frontend: inline main-column upload/list, **no** action-row Attachment Dialog, VIEWER, credentials include, Kanban cover
- Do not claim tests passed without running them (implementation phase)

## 11. Sequence

1. Product Approves artifacts (Q-130–Q-140 already Decided)
2. T001–T002 inspection + approval gate
3. Domain + repo contracts + storage port
4. Additive migration + Prisma adapter + Compose volume
5. Service + validators + routes
6. API tests
7. Frontend client + TaskDetail **inline** UI
8. Cover/Kanban
9. Activity UI for three kinds
10. Verification + independent review + memory (catalog patch only after user confirm)

## 12. Risks

- **Blob vs DB consistency:** mitigate with ordered write + compensation and tests
- **Multipart dependency surface:** keep one well-known parser; size limits at parser and app layers
- **Orphan blobs after soft-delete (Q-132):** educational debt; document GC as later work
- **Kanban `<img>` auth:** prefer same-origin/`VITE_API_URL` + `credentials` fetch → object URL over raw `<img src>` to API
- **Delete cover attachment activity:** clarify at Approve whether delete emits both `ATTACHMENT_REMOVED` and `COVER_CHANGED` when cover clears — plan prefers both when cover actually changes
- **Scope size:** attachments + covers + storage + activity in one Approve cycle is large but Decided

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Upload use case + storage + ATTACHMENT_ADDED | API + storage tests |
| AC-002 | Content route + authz | SuperTest download auth |
| AC-003 | VIEWER authz | API + UI tests |
| AC-004 | Authz mapping | SuperTest |
| AC-005 | Validators + sniff | API validation tests |
| AC-006 | Delete + cover clear + ATTACHMENT_REMOVED | Service/API tests |
| AC-007 | Soft-delete parent keep rows/blobs | API tests |
| AC-008 | Archived mapping | API tests |
| AC-009 | Regression suites | Targeted comments/labels/checklists/activity |
| AC-010 | Inline TaskDetail UI (no action-row Dialog) | Frontend tests |
| AC-011 | Cover + Kanban | Frontend/API |
| AC-012 | Migration + Compose volume | migrate deploy + config inspection |
| AC-013 | `tasks` ownership | Structure review |
| AC-014 | Scope / constitution | Diff / inspection |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (documented; delete-cover-attachment emits ATTACHMENT_REMOVED + COVER_CHANGED)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
