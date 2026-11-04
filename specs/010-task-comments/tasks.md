# Tasks: Task Comments

- **Feature ID:** 010-task-comments
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Q-058–Q-065 are **Decided** in `spec.md` section 15; follow those answers. This feature is **comments only** (proposed ID **D**). Do not implement card activity (**L**) or labels (**E**). Do not write `specs/005-audit/`. Do not change `constitution.md`.

Recorded constraints still in force:

- Authz: create = task write; list = task read (`TaskAuthorizationPort`). Edit = author-only (`PATCH`). Soft-delete = author OR effective project OWNER (`DELETE` sets `deletedAt`; no restore).
- Owning domain: `tasks` (not a new peer comments domain).
- HTTP: `POST` / `GET /api/tasks/:taskId/comments`; `PATCH` / `DELETE /api/tasks/:taskId/comments/:commentId`.
- Public comment DTO: `id`, `taskId`, `authorUserId`, `authorDisplayName`, `body`, `createdAt` (omit `deletedAt`). List `{ comments }` oldest-first among live comments.
- Body: plain text only (Q-061). No mentions (Q-060).
- Additive Prisma migration only (`deletedAt` on comments). No `migrate reset`. No volume delete.
- UI: comments inside existing `TaskDetail` Dialog. No workspace redesign. No new npm dependency.
- Deferred next work (record only): **L** task events only (created, field changes, soft-delete, comments added); **E** per-project label catalog, many labels per task, show on card + filter.
- Q-006, Q-007, Q-009, Q-015, Q-017 stay deferred.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect existing implementation and conventions: `TasksService`, `TaskAuthorizationPort`, task routes/controller, Prisma `Task`/`User`/`ProjectMember`, `UsersIdentityPort`, `resolveEffectiveRole`, frontend `TaskDetail` / API client, soft-delete and archived authz tests. Record files to extend (including how OWNER chrome is detected on the board for delete UI). Do not change code in this task. Do not specify activity or labels beyond deferred notes already in the spec.
  - Inspection: extend `tasks` module (domain/repo/service/dto/validators/controller/routes/tests), `TaskAuthorizationPort` + adapter + fake, `schema.prisma` + additive migration, `app.ts`/`main.ts`, error-handler. OWNER chrome today: `canManageMembers(actorRole)` via `resolveActorProjectRole` in `ProjectDetail`; `TaskDetail` only receives `canWrite` (later UI will need OWNER signal for delete chrome).

- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved. Reconfirm Q-058–Q-065 remain Decided: author-only PATCH; soft-delete via `deletedAt` by author or OWNER; no restore; mentions out of scope; plain text only; create/list via task read/write; comments only; no **L**/**E** implementation; no audit ID `005`; additive migration only. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Implement `tasks` comment domain behavior: comment entity; required non-empty body (after trim); system id/createdAt; immutable `taskId`; author binding; nullable `deletedAt` soft-delete with no restore; author-only edit eligibility helpers as needed; oldest-first live-list ordering helpers as needed. Unit-test without HTTP or Prisma. Do not add HTTP or Prisma. Do not invent mention/rich-text rules.

- [x] T004 Implement the comment repository contract and an in-memory fake: create (`deletedAt` null); findById (including deleted); listByTaskId live-only ascending by `createdAt`; updateBody (live only); softDelete (set `deletedAt`). No Prisma in this task.

- [x] T005 Add Prisma comment model (`TaskComment` / `task_comments`: `id`, `taskId`, `authorUserId`, `body`, `createdAt`, nullable `deletedAt`; FKs `Restrict`; `taskId` index) and a **versioned additive** migration under `backend/prisma/`. Do not drop columns. Do not add activity/label/audit/mention tables. `prisma migrate deploy` only. Do not `migrate reset` or delete volumes. Implement the Prisma repository adapter.

- [x] T006 Extend `project-members` authorization surface with a narrow OWNER check usable by comment soft-delete (extend `TaskAuthorizationPort` or additive sibling reusing effective OWNER / `ownerUserId` grant). Do not invent new roles. Keep create/list on existing requireTaskRead/requireTaskWrite. Unit-test the port behavior without leaking Prisma into `tasks`.

- [x] T007 Implement comment service use cases: create (session author, `requireTaskWrite`, live task check, archived `409`/`403` parity with task writes, identity lookup for display name); list (`requireTaskRead`, live task check, live comments oldest-first); updateBody (author-only, live comment/task, archived parity); softDelete (author or OWNER, set `deletedAt`, archived parity, already-deleted → not found). Do not import other domains’ Prisma repositories. Do not add HTTP in this task.

- [x] T008 Implement comment HTTP: public comment DTO (omit `deletedAt`) + `{ comments }` list; Zod validators (strict create/patch `{ body }`); controller and routes `POST`/`GET /api/tasks/:taskId/comments` and `PATCH`/`DELETE /api/tasks/:taskId/comments/:commentId`; `requireAuth`; DELETE → `204` empty body; existing error envelope. Wire in `createApp`. Reject unknown fields. Do not alter existing task/project DTO field sets. Do not add a restore route.

- [x] T009 Add backend tests for AC-001–AC-008, AC-011, AC-014–AC-016: create 201, validation 400, 401, VIEWER create 403 + list 200, non-member 403, missing/deleted task 404, soft-deleted comment omitted from list and item 404, archived 409/403, ordering, author attribution, author PATCH 200, non-author PATCH 403, author soft-delete 204, OWNER soft-delete of others 204, EDITOR non-author soft-delete 403, no secrets / no `deletedAt` in DTOs. Reuse Vitest/SuperTest.

### Phase 3 — Frontend

- [x] T010 Implement API integration: typed `listTaskComments` / `createTaskComment` / `updateTaskComment` / `deleteTaskComment` helpers with `credentials: 'include'`. No bearer token storage. No new npm dependency.

- [x] T011 Implement UI in existing `TaskDetail` Dialog: live comments list as plain text; create form when `canWrite`; edit control only for own comments; soft-delete for author or OWNER chrome; loading/empty/success/error/401/403/404/409 states as applicable; no restore UI. VIEWER list-only create chrome. Do not redesign board, Members Dialog, Kanban, or dashboard. Do not implement labels, activity feeds, Markdown rendering, or mention UI.

- [x] T012 Add frontend tests for AC-009 and AC-010 (and edit/delete chrome): credentials, no token storage, TaskDetail comments section, writer create path, author edit path, author/OWNER soft-delete chrome, viewer without successful create bypass, plain text bodies, existing Dialog/board still present, no Trello branding, no activity/labels/mentions UI from this feature.

### Phase 4 — Verification

- [x] T013 Run `backend` `npm run typecheck` and `npm test`, and `frontend` `npm run typecheck` and `npm test`. Report actual results. Do not run `prisma migrate reset` or delete Docker volumes. Do not claim checks passed without running them.
  - Ran 2026-11-04 with Node `v22.22.3` (`C:\Users\MAManzano\AppData\Local\nvm\v22.22.3`): `backend` typecheck exit 0; `backend` `npm test` 31 files / 260 tests passed; `frontend` typecheck exit 0; `frontend` `npm test` 19 files / 179 tests passed. No migrate reset; no volume delete.

- [x] T014 Verify acceptance criteria AC-001–AC-016 against the spec, using recorded answers to Q-058–Q-065. Record any unmet criterion. Confirm no **L**/**E** implementation, no `specs/005-audit/`, comments-only scope, no restore API, plain text / no mentions.
  - AC-001–AC-007, AC-011, AC-014–AC-016: covered by `comments-api.test.ts` / `comments-service.test.ts` (create 201, 401, validation 400, oldest-first live list, VIEWER 403/200, non-member 403, missing/deleted 404, archived 409/403, author PATCH, non-author PATCH 403, author/OWNER soft-delete 204, EDITOR non-author 403, no `deletedAt`/secrets on DTO).
  - AC-008: comments live under `tasks` (routes → controller → service → comments repository → Prisma); authz via `TaskAuthorizationPort` (`requireTaskWrite`/`requireTaskRead`/`requireProjectOwner`); identity via `UsersIdentityPort`; public DTO omits `deletedAt`.
  - AC-009 / Q-062–Q-065: no `specs/005-audit/`; no activity/labels feature folders; schema has `TaskComment` only (no label/activity models); comments-only scope held.
  - AC-010 / Q-060–Q-061: `TaskDetail` comments UI + tests (credentials include, plain text, no restore/mentions/markdown/activity chrome); client helpers for create/list/PATCH/DELETE only.
  - AC-012: satisfied by T013 command results above.
  - AC-013: artifacts **Approved** (gate already cleared).
  - Q-058–Q-059: author-only PATCH; soft-delete author or OWNER; DELETE only (no restore route in `comments-routes.ts`).
  - Unmet criteria: none observed.

- [x] T015 Obtain independent review and resolve blocking findings with a new implementation pass if needed. Do not treat implementer claims as proof.
  - Independent reviewer (fresh subagent): **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. AC-001–AC-011, AC-013–AC-016 verified from artifacts/code/tests. AC-012 not re-executed in Ask-mode reviewer shell; coordinator evidence below. Non-blocking: no Prisma `TaskComment` persistence integration test; list cross-task exclusion only implicit via `listByTaskId`; archived owner PATCH relies on shared `assertParentWritable` path. Scope: no L/E/audit/restore/mentions. Flake-stability fixes kept: fake timers in project-members in-memory ordering test; `App.test.tsx` dashboard totals uses `findByRole`.

- [x] T016 Update `memory.md` (and only docs that changed) from verified state. Record answered open questions Q-058–Q-061. Keep deferred **L**/**E** decisions visible. Keep Q-006/007/009/015/017 deferred. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file. Do not mark tasks complete without evidence.
  - `memory.md` updated to Verified for `010-task-comments`. Catalog patch proposed below; `implemented-features.md` not edited pending user confirmation.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes; no code changes |
| T002 | T001 | Artifacts Approved; Q-058–Q-065 Decided |
| T003 | T002 | Domain tests; no HTTP/Prisma |
| T004 | T003 | Repository contract + in-memory fake |
| T005 | T004 | Additive migration applied; no reset |
| T006 | T002 | OWNER check port; unit tests |
| T007 | T005, T006 | Comment create/list/update/softDelete use cases |
| T008 | T007 | Comment HTTP contract |
| T009 | T008 | Backend tests for applicable ACs |
| T010 | T008, T009 | Client `credentials: 'include'` |
| T011 | T010 | TaskDetail comments UI |
| T012 | T011 | Frontend tests for applicable ACs |
| T013 | T009, T012 | Actual typecheck/test results |
| T014 | T013 | AC-001–AC-016 evidence |
| T015 | T014 | Independent review |
| T016 | T015 | `memory.md` matches repo; catalog patch only if user confirms |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T007, T008, T009 | Create 201 |
| AC-002 | T008, T009 | 401 |
| AC-003 | T008, T009 | Validation 400 |
| AC-004 | T007, T008, T009 | List oldest-first live only |
| AC-005 | T007, T009, T011 | VIEWER 403 create / 200 list |
| AC-006 | T007, T009 | Non-member 403; deleted 404 |
| AC-007 | T007, T009 | Archived 409/403 |
| AC-008 | T003–T008, T014 | `tasks` ownership; ports |
| AC-009 | T011, T012, T014 | Existing slices; no L/E/audit |
| AC-010 | T010–T012 | TaskDetail comments |
| AC-011 | T008, T009 | Envelope; no secrets; omit `deletedAt` |
| AC-012 | T013 | Executed commands |
| AC-013 | T002 | Stop if Draft |
| AC-014 | T007, T008, T009 | Author PATCH 200 |
| AC-015 | T007, T009 | Non-author PATCH 403 |
| AC-016 | T007, T008, T009 | Soft-delete author/OWNER; EDITOR 403 |

## Completion report

- Completed tasks: T001–T016
- Tests executed (T013 + T015 close-out, Node `v22.22.3`): `backend` `npm run typecheck`; `backend` `npm test`; `frontend` `npm run typecheck`; `frontend` `npm test`
- Actual results (coordinator after flake fixes): backend typecheck exit 0; backend 31 files / 260 tests passed; frontend typecheck exit 0; frontend 19 files / 179 tests passed
- Known issues: no dedicated Prisma persistence integration test for comments repository (domain/service/HTTP + in-memory); SuperTest list does not explicitly assert cross-task exclusion; archived owner PATCH not separately SuperTest-asserted (shared writable path)
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none (AC-012 closed by coordinator suite evidence)
- Memory updated: yes (`memory.md`); `implemented-features.md` catalog patch proposed, awaiting user confirmation
- Remaining work: none for 010; deferred next product work is **L** (task events) then **E** (labels) as separate specs
