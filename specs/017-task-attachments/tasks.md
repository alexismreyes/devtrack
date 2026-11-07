# Tasks: Task Attachments (and card covers)

- **Feature ID:** 017-task-attachments
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Approved**. Spec section 15 **Q-130–Q-140** are **Decided** (2026-11-06; Q-133 = **20 MiB**/file). This feature is proposed product **G**. Do not implement app-wide audit (**C**). Do not write `specs/005-audit/`. Do not change `constitution.md`. Do not implement custom statuses or reopen checklists. Keep Verified comments/labels/checklists public contracts intact aside from additive attachment/cover/activity surfaces. Additive migration only. Reuse `TaskAuthorizationPort` (Q-134). No open public attachment URLs. Q-137 amended: **action-row Attachment Popover** for upload; list stacked in main column.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect existing implementation and conventions: `TasksService`, `TaskAuthorizationPort`, comments/checklists/activity routes and emission/UoW patterns, Prisma `Task` / `TaskActivityKind` and latest migrations, `docker-compose.yml` volumes, frontend `TaskDetail` main column / Checklist Dialog (for density reference only) / `CommentsActivityPanel` / Kanban card face, API client multipart needs. Record files to extend. Do not change code in this task. Do not plan an action-row Attachment control.
  - Evidence: mirrored checklists/comments/activity patterns under `backend/src/modules/tasks/`; extend Compose with attachments volume; no action-row Attachment control planned (Q-137).
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-130–Q-140 **Decided** and plan API/persistence/UI/storage aligned (Q-137 = inline main-column only). Confirm no **C**/custom-status/checklist-reopen implementation; no audit ID `005`; additive migration only; comments/labels/checklists contracts intact; activity kinds `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED`. **Stop if artifacts are Draft.**
  - Evidence: all three artifacts Status **Approved**; Q-130–Q-140 Decided; Q-133 = 20 MiB.

### Phase 2 — Backend

- [x] T003 Implement domain behavior for attachments and cover rules: identity; sanitized filename rules; content-type allowlist (`image/jpeg|png|webp|gif`, `application/pdf`, `text/plain`); 20 MiB / 20-per-task caps; hard-delete semantics; soft-deleted parent invisibility with keep-rows/blobs; cover pointer invariants (image-only; clear ≠ delete; delete cover attachment clears cover). Extend activity domain with kinds `ATTACHMENT_ADDED`, `ATTACHMENT_REMOVED`, `COVER_CHANGED` and payload builders (ids + filename preview). Unit-test without HTTP/Prisma where practical.
  - Evidence: `domain/task-attachment.ts`, activity kinds/payloads in `domain/task-activity.ts`; domain tests passed (Node v22.22.3).
- [x] T004 Implement domain-specific repository contracts + in-memory fakes for attachments (list-by-task ordered; get; delete; set/clear cover). Ensure activity create remains available inside the shared unit-of-work fake.
  - Evidence: `repository/attachments-repository.ts`, `tests/in-memory-attachments-repository.ts` + unit test file.
- [x] T005 Implement `AttachmentStoragePort` + filesystem adapter (temp-dir tests). Wire `ATTACHMENTS_ROOT` path layout `{root}/{projectId}/{taskId}/{attachmentId}` (Q-131). Do not commit secrets.
  - Evidence: `storage/attachment-storage-port.ts`, `storage/filesystem-attachment-storage.ts`, temp-dir tests authored.
- [x] T006 Add Prisma `TaskAttachment` model + `Task.coverAttachmentId` nullable FK (`onDelete SetNull`) and additive `TaskActivityKind` values `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED`, in a **versioned additive** migration under `backend/prisma/`. Do not drop unrelated columns. Do not add audit-app-wide tables. Do not add `position`/`rank` or attachment soft-delete. `prisma migrate deploy` only. Do not `migrate reset` or delete volumes without authorization. Implement Prisma repository adapters.
  - Evidence: Node v22.22.3 — `npm run prisma:generate` OK; `npm run prisma:deploy` applied `20261106160000_task_attachments`; Prisma adapter on disk.
- [x] T007 Update Compose/env: named attachments volume mounted on `backend`; document `ATTACHMENTS_ROOT` in `.env.example`. Do not add a fourth primary app service. Do not delete `pgdata`.
  - Evidence: `docker-compose.yml` `attachments_data` → `/data/attachments`; `.env.example` `ATTACHMENTS_ROOT`; config requires `ATTACHMENTS_ROOT`.
- [x] T008 Implement service use cases: upload/list/get/delete/content stream; cover set/clear; authz via Q-134 (`requireTaskWrite` / `requireTaskRead`); archived like checklists; soft-deleted task `404`. Persist blob+metadata with documented failure compensation. Emit `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` same-tx; fail write if activity insert fails. When deleting the cover attachment, clear cover and emit both remove and cover-changed (or lock dual-emit per plan). Do not change comments/labels/checklists public contracts. Map `PublicTaskDto.cover` summary only (Q-140) — no full attachments array.
  - Evidence: `service/attachments-service.ts`; `TasksService`/`PublicTaskDto` cover summary only; service tests passed (Node v22.22.3).
- [x] T009 Implement DTOs, Zod/multipart validators, controller, and nested routes per Q-136/Q-139 (`POST/GET .../attachments`, `GET .../content`, `DELETE`, `PUT/DELETE .../cover`). Wire composition root. Enforce allowlist/size/count + magic sniff. Content route sets private cache headers. Do not add public static `/uploads` route.
  - Evidence: nested routes + controller/DTOs/validators; educational single-file multipart middleware (no multer dep); wired in `app.ts`/`main.ts`; no `/uploads`.
- [x] T010 Add unit/service/API SuperTest coverage for AC-001–AC-009 and AC-012–AC-014 (authz, validation, delete+blob removal, soft-delete keep rows/blobs, archived, content auth, cover set/clear, `PublicTaskDto.cover` only, contracts non-regression, no public URL). Include storage adapter tests.
  - Evidence: Node v22.22.3 — attachment + contract suites green (attachments domain/service/api + comments/labels/checklists: 6 files / 43 passed); typecheck exit 0; all-dot filename sanitize fix landed.

### Phase 3 — Frontend

- [x] T011 Implement API client helpers (list/upload/delete; authenticated content fetch; cover set/clear) with `credentials: 'include'`. Add shared attachment/cover types. Extend activity client parsers for the three new kinds. Respect Q-140 (cover summary on task DTO mapping; no full attachments embed on Kanban).
  - Evidence: `frontend/src/api/types.ts` + `client.ts` attachment/cover helpers and activity parsers; Node v22.22.3 — `client.test.ts` attachments + activity kinds + cover-summary mapping passed (typecheck exit 0).
- [x] T012 Implement UI in `TaskDetail` per Q-137 option 2: **inline main-column** file upload control + attachment list (below fields/checklists); download/view via authenticated fetch; set/clear cover on image attachments; VIEWER read-only; writers mutate when allowed; archived disablement; reload activity after emitting mutations. **Do not** add an action-row Attachment button or Attachment Dialog. Do not redesign Members Dialog, dashboard, Kanban DnD, comments composer, labels, or checklists beyond additive neighbors. Do not implement custom statuses.
  - Evidence: Q-137 amended — `AttachmentsPopover.tsx` on action row; `TaskAttachmentsPanel.tsx` list-only in main column; TaskDetail tests assert Popover upload, stacked list, VIEWER/archived disablement.
- [x] T013 Implement Kanban card-face cover rendering per Q-138/Q-140 (authenticated image strategy using `PublicTaskDto.cover`). Assert clear-cover does not delete attachment; deleting cover attachment clears face.
  - Evidence: `KanbanBoard.tsx` authenticated content → object URL cover; KanbanBoard AC-011 test (credentials content path, no `/uploads`, clear face); TaskDetail clear-cover keeps row; delete cover attachment clears cover without separate cover DELETE.
- [x] T014 Update `CommentsActivityPanel` to render `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` / `COVER_CHANGED` (do not omit like `COMMENT_ADDED`). Add frontend tests for AC-010/AC-011: credentials, **inline** upload (and assert **no** action-row Attachment Dialog), VIEWER, Kanban cover, no public URL assumption, no audit/custom-status UI.
  - Evidence: `CommentsActivityPanel.tsx` renders three kinds; Node v22.22.3 — `client.test.ts` + `TaskDetail.test.tsx` + `KanbanBoard.test.tsx` + `CommentsActivityPanel.test.tsx` (4 files / 112 passed); `npm run typecheck` exit 0.

### Phase 4 — Verification

- [x] T015 Run targeted backend and frontend tests; record commands and actual results.
  - Evidence: Node v22.22.3 — backend `npm test --` attachments domain/repo/storage/service/api + comments/labels/checklists/activity/tasks API + activity domain: **11 files / 93 passed**; frontend `npm test --` client + TaskDetail + CommentsActivityPanel + KanbanBoard + TaskChecklistsPanel: **5 files / 113 passed**. Exit 0 both.
- [x] T016 Run type checking and relevant quality checks; record commands and actual results.
  - Evidence: Node v22.22.3 — backend `npm run typecheck` exit 0; frontend `npm run typecheck` exit 0; backend `npm run build` exit 0; frontend `npm run build` exit 0 (vite chunk-size warning only). No separate root lint script.
- [x] T017 Verify acceptance criteria against the spec using Decided Q-130–Q-140. Record any unmet criterion. Confirm no **C**/custom-status/checklist-reopen, no `specs/005-audit/`, contracts intact, `constitution.md` unchanged, no unauthenticated public attachment URLs, no action-row Attachment Dialog.
  - Evidence: AC-001–AC-014 **pass** vs Decided Q-130–Q-140 (20 MiB; inline main-column only; no action-row Attachment Dialog; cover summary only; no public `/uploads`). `specs/005-audit/` absent; no peer `attachments` module; `constitution.md` unmodified; Compose `attachments_data` + `ATTACHMENTS_ROOT`; no C/custom-status/checklist-reopen. Unmet: none. Known: no dedicated prisma-attachments-repository persistence test file.
- [x] T018 Obtain independent review and resolve blocking findings.
  - Evidence: Independent reviewer **Pass with notes**. Blocking: no. Failed ACs: none. Non-blocking: VIEWER `/content` + cover PUT/DELETE 403 lightly SuperTested; cover same-task rule service-enforced (no DB constraint); no dedicated Prisma attachments-repo suite.
- [x] T019 Update `memory.md` (and only docs that changed) from verified state. Record answered open questions Q-130–Q-140. Keep later **C** and custom statuses visible. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file. Do not mark tasks complete without evidence.
  - Evidence: `memory.md` updated; catalog patch proposed to user (not applied until confirm).

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-130–Q-140 Decided |
| T003 | T002 | Domain unit tests |
| T004 | T003 | In-memory repo tests |
| T005 | T003 | Storage adapter tests |
| T006 | T004 | Migration apply + adapter tests |
| T007 | T005 | Compose/env inspection |
| T008 | T005, T006, T007 | Service tests |
| T009 | T008 | Routes wired + validation |
| T010 | T009 | SuperTest / service results |
| T011 | T010 | Client tests |
| T012 | T011 | UI automated tests (inline; no action-row Dialog) |
| T013 | T012 | Cover/Kanban tests |
| T014 | T012 | Frontend test results |
| T015 | T014 | Command log |
| T016 | T015 | Command log |
| T017 | T016 | AC checklist |
| T018 | T017 | Reviewer verdict |
| T019 | T018 | Memory updated; catalog patch only after user confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T003, T008, T010, T017 | Pass — upload/list/`ATTACHMENT_ADDED` + path layout (attachments-api/service) |
| AC-002 | T009, T010, T017 | Pass — content after authz; `Cache-Control: private`; no `/uploads` |
| AC-003 | T008, T010, T012, T017 | Pass — VIEWER read OK / mutate 403; UI read-only |
| AC-004 | T008, T010, T017 | Pass — 401 / 403 / 404 mapping |
| AC-005 | T009, T010, T017 | Pass — allowlist/sniff/20 MiB/20-per-task (domain + API/service) |
| AC-006 | T005, T008, T010, T017 | Pass — hard-delete metadata+blob; dual-emit when cover |
| AC-007 | T008, T010, T017 | Pass — soft-deleted parent 404; rows/blobs kept |
| AC-008 | T008, T010, T017 | Pass — archived owner 409 / member 403; reads OK |
| AC-009 | T010, T017 | Pass — comments/labels/checklists contracts; cover summary only |
| AC-010 | T012, T014, T017 | Pass — inline main-column; no action-row Attachment Dialog |
| AC-011 | T013, T017 | Pass — Kanban authenticated cover; clear ≠ delete; delete clears face |
| AC-012 | T006, T007, T017 | Pass — additive `20261106160000_task_attachments`; Compose `attachments_data` + `ATTACHMENTS_ROOT` |
| AC-013 | T003–T009, T017 | Pass — under `tasks/`; `TaskAuthorizationPort`; no peer domain; no `005-audit` |
| AC-014 | T017 | Pass — no C/custom-status/checklist-reopen; constitution unchanged |

## Completion report

- Completed tasks: T001–T019
- Tests executed: Node v22.22.3 — backend targeted vitest **11 files / 93 passed**; frontend targeted vitest **5 files / 113 passed**; backend+frontend `npm run typecheck` exit 0; backend+frontend `npm run build` exit 0
- Actual results: all listed commands exit 0; AC-001–AC-014 PASS
- Known issues: no dedicated prisma-attachments-repository persistence test file; VIEWER content/cover SuperTest gaps (non-blocking)
- Reviewer findings: Pass with notes; blocking no; failed ACs none
- Memory updated: yes (T019); `implemented-features.md` patch proposed, awaiting user confirm
- Remaining work: none for 017 (catalog apply after user confirm; custom statuses + **C** deferred)
