# Tasks: Checklist Item Window

- **Feature ID:** 038-checklist-window
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. **Stop if artifacts are Draft.**

Locked: window of 10; Prev/Next like 025; extend item list API with cursor/limit; checklist list no embedded items + `itemCount`/`checkedCount`; mutate → reset first page. No notes/**C**/constitution/catalog until confirm.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect checklist list DTO/routes, TaskChecklistsPanel, and 025 window stack pattern. Record files. Do not change product code.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-226–Q-230 Decided. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Repository: paginated list items + checklist item counts.
- [x] T004 Service use cases for item list pagination; amend checklist list views (no full items; additive counts).
- [x] T005 DTOs, validators, controller, routes for `GET .../items`.
- [x] T006 Backend tests for AC-004–AC-005 and list DTO amend.

### Phase 3 — Frontend

- [x] T007 API client updates for item pages + checklist DTO.
- [x] T008 TaskChecklistsPanel window UI (≤10, Prev/Next replace, stack, mutate reset).
- [x] T009 Frontend tests for AC-001–AC-003 and reset behavior.

### Phase 4 — Verification

- [x] T010 Run targeted backend + frontend tests; record results.
- [x] T011 Typechecks and relevant suites on Node 22; record results.
- [x] T012 Verify AC-001–AC-007; non-goals held.
- [x] T013 Independent review; resolve blockers.
- [x] T014 Update `memory.md`; propose catalog patch; wait for confirm before `implemented-features.md`.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection |
| T002 | T001 | Approved |
| T003 | T002 | Repo |
| T004 | T003 | Service |
| T005 | T004 | HTTP |
| T006 | T005 | Backend tests |
| T007 | T005 | Client |
| T008 | T007 | UI |
| T009 | T008 | FE tests |
| T010 | T006, T009 | Command log |
| T011 | T010 | Command log |
| T012 | T011 | AC checklist |
| T013 | T012 | Reviewer |
| T014 | T013 | Memory |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T008, T009, T012 | Window 10 — FE panel tests pass |
| AC-002 | T008, T009, T012 | Next replace — FE panel tests pass |
| AC-003 | T008, T009, T012 | Prev stack — FE panel tests pass |
| AC-004 | T003–T006, T012 | Item API — checklists-api/service tests pass |
| AC-005 | T006, T012 | Authz — API VIEWER/stranger/unauth tests pass |
| AC-006 | T012 | Scope — no notes/**C**/constitution/`implemented-features.md`; 025 untouched |
| AC-007 | T002 | Approval gate — artifacts Approved before implement |

## Completion report

- Completed tasks: T001–T014
- Tests executed:
  - Backend (Node 22.22.3): checklists-api, checklists-service, in-memory-checklists-repository, feed-cursor, prisma-checklists-repository — 27 passed
  - Frontend (Node 22.22.3): TaskChecklistsPanel (+ eyecandy), client, TaskDetail — 124 passed
  - `npm run typecheck` backend + frontend — pass
- Actual results: all listed suites and typechecks passed; no migrations
- Known issues: none blocking
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS (Medium: re-run verification if needed — implementer evidence retained; Low: tally-in-JS ok). Blocking: no. Failed ACs: none.
- Memory updated: yes (T014); catalog propose only — wait for confirm before `implemented-features.md`
- Remaining work: none (Verified); catalog patch awaits user confirm
