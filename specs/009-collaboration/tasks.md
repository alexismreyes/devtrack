# Tasks: Collaboration

- **Feature ID:** 009-collaboration
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Approved**. Implement after `008-dashboard` is Verified. T002 MUST stop if artifacts are not Approved. Q-051–Q-057 are **Decided** in `spec.md` section 15; follow those answers. Do not invent additional roles, SMTP, invite tokens, public share links, extra DTO fields, a members page, `includeArchived`, or owner transfer.

This ID is **009-collaboration**. Do not write `specs/005-audit/`. Do not reuse IDs `005`–`007`. Do not specify or implement dashboard in this folder. Do not add SMTP, comments, notifications, AI, Kanban redesign, or workspace-ui redesign.

Recorded constraints still in force:

- Roles: `OWNER`, `EDITOR`, `VIEWER`. Matrix and `ownerUserId` OWNER grant as in `spec.md`.
- New domain: `project-members`. Keep `Project.ownerUserId`. Client cannot set owner. Insert creating owner as OWNER membership.
- Add member by email of an existing user: `POST { email, role }`. No mail. Unknown email `404`. Duplicate `409`.
- HTTP: `GET`/`POST /api/projects/:projectId/members`; `PATCH`/`DELETE .../members/:userId`. Prisma `ProjectMember` as in the plan. Member DTO: `id`, `userId`, `email`, `displayName`, `role`, `createdAt`.
- Member management UI: Dialog on the project board header. No members page. No workspace-ui redesign.
- Non-owner members MUST NOT GET archived projects. Only `ownerUserId` may. No `includeArchived`.
- Additive Prisma migration only. No `migrate reset`. No volume delete.
- Acyclic ports: `project-members` → projects snapshot / users identity; `tasks` → project-members authz; `projects` MUST NOT import `project-members` internals (consumer-owned port in `projects`, implemented by `project-members`).
- Q-006, Q-007, Q-009, Q-015, Q-017 stay deferred.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect existing implementation and conventions: `ProjectsService` / `assertProjectOwner`, `listByOwnerId`, `ProjectAccessPort.requireOwnedProject`, `TasksService`, `createApp`, Prisma `Project`/`User`/`Task`, `UsersIdentityPort.findByEmail`, frontend `GET /api/projects` list in sidebar and grid, board-header Back/Edit/Archive, owner-only SuperTest cases. Record files to extend. Do not change code in this task. Do not specify dashboard.

- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved. Reconfirm Q-051–Q-057 remain recorded as Decided. Reconfirm: `project-members` domain; roles `OWNER`/`EDITOR`/`VIEWER`; add-by-email without SMTP; no public share links; no dashboard in this folder; no audit ID `005`–`007`; no `specs/005-audit/`; board-header Dialog only (no members page, no workspace-ui redesign); additive migration only; Q-006/007/009/015/017 deferred. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Implement `project-members` domain behavior: membership entity; uniqueness per project+user; existing-user-only; role enum `OWNER`/`EDITOR`/`VIEWER`; permission policy from the spec matrix; `ownerUserId` OWNER grant; cannot remove/demote `ownerUserId`; cannot leave zero OWNER; archived GET only for `ownerUserId`. Unit-test without HTTP or Prisma. Do not add HTTP or Prisma. Do not send mail.

- [x] T004 Implement the `project-members` repository contract and an in-memory fake: create, list-by-project, find-by-project-and-user, list-project-ids-by-user, remove, update role. No Prisma in this task.

- [x] T005 Add Prisma `ProjectMember` (`id`, `projectId`, `userId`, `ProjectMemberRole` enum, `createdAt`, unique (`projectId`, `userId`), `userId` index, FKs `Restrict`, `@@map("project_members")`) and a **versioned additive** migration under `backend/prisma/`. Keep `Project.ownerUserId`. Do not drop columns. Do not add invite/token/audit/dashboard tables. `prisma migrate deploy` only. Do not `migrate reset` or delete volumes. Implement the Prisma repository adapter.

- [x] T006 Implement membership service use cases: add by email (`UsersIdentityPort.findByEmail`, canonical email, unknown → not-found, duplicate → conflict, no mail, no user create); list; remove; change role; owner-row invariants (`409` domain equivalent). Use the projects snapshot port. Do not import other domains’ Prisma repositories. Do not add HTTP in this task. Do not call SMTP.

- [x] T007 Implement membership HTTP: DTOs (`PublicMemberDto` with `id`, `userId`, `email`, `displayName`, `role`, `createdAt`; list `{ members }`; POST `{ email, role }`; PATCH `{ role }`), Zod validators (strict; `z.email`; role enum), controller, routes matching Q-055, `requireAuth`, existing error envelope (`404` unknown email/member, `409` duplicate and owner-row, `403` non-OWNER admin, `204` on DELETE). Wire the router in `createApp`. Reject unknown fields. Do not alter existing project/task DTO field sets.

- [x] T008 Replace owner-only project authorization: consumer-owned port interface in `projects`, implemented by `project-members`; `GET /api/projects` lists active projects the actor is authorized to see; GET/PATCH/archive/unarchive use the matrix; archived GET only `ownerUserId` (Q-057). `projects` MUST NOT import `project-members` Prisma. Create-project still sets `ownerUserId` to the actor and inserts OWNER membership **atomically** via the consumer-owned write port / infrastructure transaction. Do not add `includeArchived`.

- [x] T009 Point `tasks` at the `project-members` authorization port. Stop using `requireOwnedProject` as the sole grant. OWNER/EDITOR: full task CRUD; VIEWER: GET/list only; non-owner members on archived parent: `403`; authorized `ownerUserId` writes on archived parent: `409`. Keep task field rules, soft-delete `404`, and `PATCH /api/tasks/:id` `{ status }` as the Kanban persistence path. `tasks` MUST NOT import Prisma repositories of other domains.

- [x] T010 Add backend tests for AC-001–AC-009, AC-012, AC-015–AC-017: member access, 401, non-member 403, missing 404, matrix cases, add-by-email without mail, uniqueness `409`, unknown email `404`, task 201/403/409, owner create + OWNER row, archived GET, owner-row `409`, no secrets. Update former owner-only tests so they still forbid **non-members**. Reuse Vitest/SuperTest.

### Phase 3 — Frontend

- [x] T011 Implement API integration: existing `listProjects` / task helpers keep `credentials: 'include'`. Add typed membership client helpers for GET/POST members and PATCH/DELETE member. No bearer token storage. No new npm dependency. No mailer.

- [x] T012 Implement UI: existing `/projects` grid, sidebar, and `/projects/:projectId` board MUST work for authorized members using the updated list/task APIs. Add a Members Dialog on the project board header (no new page, no workspace-ui redesign, no dashboard destination). Apply role chrome: OWNER sees Edit, Archive/Unarchive, Members admin, full task writes; EDITOR sees Edit and task writes, not Archive or membership admin; VIEWER is read/list only. Cover loading, empty, success, 401, 403, 404, 409, and validation errors on the Dialog. Do not change guest login/register. Do not add comments, notifications, or share links.

- [x] T013 Add frontend tests for AC-001 (list shows a shared project), AC-010, AC-011: credentials, no token storage, existing destinations remain, Members Dialog on the board header, no members page, Kanban/Dialogs still present, role chrome, no Trello branding, no extra CSS framework, no dashboard from this folder. Rewrite only asserts this feature supersedes (owner-only list exclusivity).

### Phase 4 — Verification

- [x] T014 Run `backend` `npm run typecheck` and `npm test`, and `frontend` `npm run typecheck` and `npm test`. Report actual results. Do not run `prisma migrate reset` or delete Docker volumes. Do not claim checks passed without running them.

- [x] T015 Verify acceptance criteria AC-001–AC-017 against the spec, using the recorded answers to Q-051–Q-057. Record any unmet criterion. Confirm no dashboard specified in this folder, no `specs/005-audit/`, no SMTP, roles match Q-051.

- [x] T016 Obtain independent review and resolve blocking findings with a new implementation pass if needed. Do not treat implementer claims as proof.

- [x] T017 Update `memory.md` (and only docs that changed) from verified state. Record answered Q-051–Q-057. Keep Q-006, Q-007, Q-009, Q-015, and Q-017 deferred. Keep dashboard as `008-dashboard` (not this folder). Keep later audit **not** ID `005` and **not** `specs/005-audit/`. Do not mark tasks complete without evidence.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes; no code changes |
| T002 | T001 | Artifacts Approved; Q-051–Q-057 remain Decided |
| T003 | T002 | Domain tests; no HTTP/Prisma |
| T004 | T003 | Repository contract + in-memory fake |
| T005 | T004 | Additive migration applied; no reset |
| T006 | T005 | Membership use cases; no mail |
| T007 | T006 | Membership HTTP matches Q-055 |
| T008 | T006 | Project list/authz membership-aware; no cycle |
| T009 | T008 | Tasks use members authz port |
| T010 | T007, T008, T009 | Backend tests for applicable ACs |
| T011 | T007, T010 | Client `credentials: 'include'` |
| T012 | T011 | Existing screens + board-header Dialog |
| T013 | T012 | Frontend tests for applicable ACs |
| T014 | T010, T013 | Actual typecheck/test results |
| T015 | T014 | AC-001–AC-017 evidence |
| T016 | T015 | Independent review |
| T017 | T016 | `memory.md` matches repo |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T008, T010, T012, T013 | Member list/GET |
| AC-002 | T007, T010 | 401 |
| AC-003 | T008, T009, T010 | Non-member 403 |
| AC-004 | T007, T010 | 404 missing project |
| AC-005 | T003, T010 | Matrix from Q-051/Q-052 |
| AC-006 | T006, T007, T010 | Add by email; no mail; 404/409 |
| AC-007 | T009, T010 | Task authz |
| AC-008 | T008, T010 | Create owner + OWNER row |
| AC-009 | T003–T009, T015 | `project-members`; acyclic ports |
| AC-010 | T012, T013, T015 | Existing slices; no dashboard/audit/mail |
| AC-011 | T011–T013 | Credentials; board-header Dialog |
| AC-012 | T007, T010 | Envelope; no secrets |
| AC-013 | T014 | Executed commands |
| AC-014 | T002 | Stop if Draft |
| AC-015 | T008, T010 | Archived GET `ownerUserId` only |
| AC-016 | T003, T006, T010 | Owner-row / last-OWNER `409` |
| AC-017 | T007, T010 | Membership HTTP contract |

## Completion report

- Completed tasks: T001–T017
- Tests executed: Coordinator independently re-ran Compose `backend`/`frontend` `npm run typecheck` and `npm test` (Node v22.23.4)
- Actual results: backend typecheck exit 0; backend `npm test` 26 files / 228 tests passed. Frontend typecheck exit 0; frontend `npm test` 19 files / 169 tests passed. Additive migration `20261031120000_project_members` applied with `migrate deploy`. No reset. No volume delete. No SMTP. No `specs/005-audit/`. Dashboard remains owner-only.
- T015: AC-001–AC-017 met. Live browser: owner Members Dialog; add existing user as EDITOR; editor sees shared project; EDITOR chrome has Edit and Add task, not Archive/Members; editor dashboard stays zeros.
- Known issues: projects created before 009 may have no OWNER membership row (`No members yet`) while `ownerUserId` still grants OWNER. Extra OWNER who archives then cannot GET archived (Q-057). Non-blocking leftover `requireOwnedProject` on the old port. Live Compose needed frontend rebuild and backend restart.
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none.
- Memory updated: yes
- Remaining work: none for 009. Later items only in `proposed-features.md`.
