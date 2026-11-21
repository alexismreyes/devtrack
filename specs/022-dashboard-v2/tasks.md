# Tasks: Dashboard v2

- **Feature ID:** 022-dashboard-v2
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. **Q-169–Q-176** Decided (locked). Plan/tasks are aligned. Recharts; stacked bars default; pie/donut; prefer existing `GET /api/dashboard`; owner-scoped. No task notes / **H** / **C**. Do not change `constitution.md`.

Locked: chart mode session/page UI state only (Q-174); labeled chart region + keep numeric summaries (Q-175); pie/donut = owner-wide pending/completed/overdue slices, note overdue∩pending (Q-176).

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect dashboard page/client/`GET /api/dashboard` DTO, 008/018 aggregate meanings, and frontend package.json. Confirm charts can map without API extension (or document gap). Do not change product code.
- [x] T002 Confirm artifacts **Approved** and reconfirm Q-169–Q-176 Decided. Confirm Recharts dependency decision. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Not applicable if Q-172 “no extension” holds. Record “N/A — reuse GET /api/dashboard”. If a real data gap exists, **stop** and amend artifacts before any API work.

### Phase 3 — Frontend

- [x] T004 Add explicit `recharts` dependency to the frontend package (npm install); document in completion notes.
- [x] T005 Implement default stacked-bar chart (pending/completed/overdue by project) from dashboard DTO (AC-001).
- [x] T006 Implement pie/donut mode + session/page-only toggle (Q-174/Q-176); labeled chart region + keep numeric summaries (Q-175); empty/loading/error coherent (AC-005).
- [x] T007 Add frontend tests for AC-001–AC-006 mapping/default/empty/dependency presence as practical.

### Phase 4 — Verification

- [x] T008 Run targeted frontend tests; record results.
- [x] T009 Run frontend typecheck and full frontend `npm test` on Node 22; record results. Backend smoke optional if T003 N/A.
- [x] T010 Verify AC-001–AC-008; confirm owner scope, no dashboard domain/Prisma model, constitution unchanged.
- [x] T011 Obtain independent review and resolve blocking findings.
  - Evidence: Independent review **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. Failed ACs: none. Informational: reviewer did not re-run suites (totals from prior implementer log); AC-004 via unchanged `GET /api/dashboard` + existing tasks tests (expected under Q-172). Close-out re-ran Node v22.22.3 targeted dashboard/deps tests **4 files / 17 passed**; `npm run typecheck` exit 0.
- [x] T012 Update `memory.md`. Record Q-169–Q-176 and Recharts decision. Propose catalog patch; **wait for user confirmation** before editing `implemented-features.md`.
  - Evidence: `memory.md` updated (Verified 022, Q-169–Q-176, Recharts); catalog patch proposed in implementer return — `implemented-features.md` not edited. Note: catalog last confirmed through 018; 019–021 still awaiting catalog if not applied.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-169–Q-176 Decided |
| T003 | T002 | N/A or amended API plan |
| T004 | T002 | package.json has recharts |
| T005 | T004 | Stacked bars UI |
| T006 | T005 | Pie/donut toggle |
| T007 | T005, T006 | Frontend test log |
| T008 | T007 | Command log |
| T009 | T008 | Command log |
| T010 | T009 | AC checklist |
| T011 | T010 | Reviewer verdict |
| T012 | T011 | Memory; catalog after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T005, T007, T010 | Stacked bars |
| AC-002 | T006, T007, T010 | Pie/donut |
| AC-003 | T001, T003, T010 | No API extension |
| AC-004 | T010 | Owner scope |
| AC-005 | T006, T007, T010 | Empty |
| AC-006 | T004, T010 | Recharts |
| AC-007 | T003, T010–T011 | Non-goals |
| AC-008 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T012
- Tests executed (T011/T012 close-out, Node v22.22.3):
  - Prior implementer: targeted DashboardPage / DashboardCharts / dashboardChartData / frontend-deps — 17 passed; `npm run typecheck` pass; full `npm test` — 32 files / 291 passed
  - Close-out re-run: same four targeted files — **4 files / 17 passed**; `npm run typecheck` exit 0
- Actual results: Charts derive from existing `GET /api/dashboard` only; `recharts` ^3.10.1 added; no second chart library; T003 N/A (no API extension). AC-001–AC-008 met. Owner scope unchanged; no dashboard domain/Prisma model; constitution untouched.
- Known issues: Informational only (reviewer suite re-run deferred; AC-004 via existing API). Catalog `implemented-features.md` awaiting user confirm (last confirmed through 018; 019–021 also pending if not applied).
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (T012)
- Remaining work: none for 022; next Approved work: none
