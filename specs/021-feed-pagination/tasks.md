# Tasks: Feed Pagination

- **Feature ID:** 021-feed-pagination
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. **Q-162–Q-168** Decided (locked). Paginate comments **and** activity; default limit 5; max 50; Load more; supersede 011 full-list. No task notes / **H** / **C**. Do not change `constitution.md`.

Locked: newest-first pages + Load more older (Q-166); one shared Load more for interleaved Comments & activity advancing both feeds (Q-167); max limit 50 (Q-168).

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect comments/activity list services, repositories, SuperTest full-list assertions (incl. 011 AC-016), `CommentsActivityPanel` / client helpers, and indexes. Record files to change. Do not change product code.
  - Evidence: Inspected comments/activity repos/services/controllers/routes/DTOs; FE `client.ts` + `CommentsActivityPanel` + `TaskDetail`; activity `(taskId, createdAt)` index present; comments `taskId` index; 011 AC-016 full-list assertions located.
- [x] T002 Confirm artifacts **Approved** and reconfirm Q-162–Q-168 Decided. Confirm supersession of 011 Q-078/AC-016. **Stop if artifacts are Draft.**
  - Evidence: `spec.md` / `plan.md` / `tasks.md` Status Approved; Q-162–Q-168 Decided; Q-165 supersedes 011 Q-078/AC-016.

### Phase 2 — Backend

- [x] T003 Implement cursor encoding/decoding + repository page queries for comments and activity (tie-break id).
  - Evidence: `domain/feed-cursor.ts`; `listPage` on comments/activity Prisma + in-memory repos; feed-cursor unit tests.
- [x] T004 Implement service list use cases with default limit 5, max cap, authz unchanged.
  - Evidence: `CommentsService` / `ActivityService` return `{ items, nextCursor }` pages; default 5; authz still `requireTaskRead`.
- [x] T005 Implement Zod query validators, DTOs with `nextCursor`, controller/route wiring.
  - Evidence: `validators/feed-pagination-query.ts`; DTO `nextCursor`; GET routes wired with validator.
- [x] T006 Update/add backend tests for AC-001–AC-005; remove/replace full-list-only assertions; keep write-path regressions.
  - Evidence: Node v22.22.3 — comments/activity API+service + feed-cursor: **5 files / 42 passed**.

### Phase 3 — Frontend

- [x] T007 Update API client/types for paginated comments/activity.
  - Evidence: `FeedPaginationQueryDto`; list helpers accept cursor/limit and require `nextCursor`.
- [x] T008 Implement initial page load + one shared Load more advancing both feeds (Q-166/Q-167); reset pages on 014-style reloads.
  - Evidence: `TaskDetail` first-page limit 5 + dual-cursor Load more; comment create/edit/delete and 014 reloads reset via `loadComments`/`loadActivity` (FR-010).
- [x] T009 Add frontend tests for AC-006 and reload reset.
  - Evidence: Panel Load more tests; TaskDetail Load more + comment-create first-page reset (FR-010); client pagination query tests.

### Phase 4 — Verification

- [x] T010 Run targeted backend + frontend tests; record results.
  - Evidence: Node v22.22.3 — backend targeted 5 files / 42 passed; frontend client+CommentsActivityPanel+TaskDetail+TasksPanel 4 files / 139 passed.
- [x] T011 Run typecheck and relevant full suites on Node 22; record results.
  - Evidence: Node v22.22.3 — backend + frontend `npm run typecheck` exit 0; targeted suites above exit 0.
- [x] T012 Verify AC-001–AC-008; document 010/011 contract supersession in memory.
  - Evidence: AC-001–AC-006 covered by SuperTest/FE tests; AC-007 supersession reflected in replaced 011 AC-016 assertions and paginated contracts; AC-008 Approved gate confirmed in T002. Memory file update deferred to T014 (out of this batch).
- [x] T013 Obtain independent review and resolve blocking findings.
  - Evidence: First review PASS WITH NON-BLOCKING (Medium FR-010 comment-mutation reset). Fix shipped; re-review **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. FR-010 resolved. Failed ACs: none. Residual non-blocking: FR-010 multi-page reset asserted for create-path only (edit/delete share same `Promise.all([loadComments(), loadActivity()])`); re-review did not re-run suites.
- [x] T014 Update `memory.md`. Record Q-162–Q-168. Propose catalog patch; **wait for user confirmation** before editing `implemented-features.md`.
  - Evidence: `memory.md` updated (Verified 021, Q-162–Q-168, 010/011 list-contract supersession); catalog patch proposed in implementer return — `implemented-features.md` not edited.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-162–Q-168 Decided |
| T003 | T002 | Repo page tests |
| T004 | T003 | Service tests |
| T005 | T004 | SuperTest contract |
| T006 | T005 | Backend test log |
| T007 | T005 | Client types |
| T008 | T007 | UI Load more |
| T009 | T008 | Frontend test log |
| T010 | T006, T009 | Command log |
| T011 | T010 | Command log |
| T012 | T011 | AC checklist |
| T013 | T012 | Reviewer verdict |
| T014 | T013 | Memory; catalog after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004–T006, T012 | Comments default 5 — SuperTest |
| AC-002 | T004–T006, T012 | Activity default 5 — SuperTest |
| AC-003 | T003–T006, T012 | Cursor pages — SuperTest |
| AC-004 | T005–T006, T012 | Validation — SuperTest |
| AC-005 | T004–T006, T012 | Authz — SuperTest |
| AC-006 | T008–T009, T012 | Load more UI — FE tests |
| AC-007 | T006, T012–T013 | Supersession — tests replace full-list; memory in T014 |
| AC-008 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T014
- Tests executed (T014 close-out, Node v22.22.3):
  - backend: `npm test --` feed-cursor + comments/activity service/api (**5 files / 42 passed**)
  - frontend: `npm test --` client + CommentsActivityPanel + TaskDetail + TasksPanel (**4 files / 140 passed**)
  - backend + frontend `npm run typecheck` exit 0
- Actual results: all listed commands exit 0
- Known issues: comments `taskId` index only (no composite `createdAt`; plan allows no migration). Catalog `implemented-features.md` awaiting user confirm (last confirmed through 018).
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS (re-review); Blocking: no; FR-010 resolved
- Memory updated: yes (T014)
- Remaining work: none for 021; next Approved candidate `022-dashboard-v2`
