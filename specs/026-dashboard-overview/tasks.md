# Tasks: Dashboard Overview

- **Feature ID:** 026-dashboard-overview
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. **Locked:** Q6 MEMBERSHIP-SCOPED (VIEWER included); Q5=3; Q-184 pie task counts by status key; Q-183 empty success UI; Q-186 carefully replace DTO; Team Members distinct; Due Soon 7 UTC days `!isCompleted`. No dashboard domain; keep Recharts. No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect `getDashboard`, `ProjectAccessPort`, membership list APIs, checklist repos, DashboardPage/022 charts, and template. Do not change product code.
- [x] T002 Confirm artifacts **Approved** (Q-183–Q-186 Decided; Q5/Q6 locked). Reconfirm Q6 supersession of 008 owner scope. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Extend projects/members ports for membership-scoped active projects + distinct member user ids (no cross-domain Prisma).
- [x] T004 Implement aggregation helpers: KPIs, due soon, pie-by-status-key, checklist %, progress completed/total (AC-002–AC-006).
- [x] T005 Replace `GET /api/dashboard` DTO/controller mapping per plan (Q-186 Decided); session auth unchanged.
- [x] T006 Add/update domain/service/API tests for AC-001–AC-007 and scope isolation.

### Phase 3 — Frontend

- [x] T007 Update API client types/`getDashboard` for new DTO.
- [x] T008 Redesign `/dashboard` toward template: KPI row, Projects pie (task counts by status key), Tasks bars, Progress; gradient cards; Recharts only; Q-183 empty success UI; remove obsolete 022 toggle if needed (AC-003–AC-005, AC-007).
- [x] T009 Add frontend tests for mapping/empty-success/KPI render as practical.

### Phase 4 — Verification

- [x] T010 Run targeted backend + frontend tests; record results.
- [x] T011 Run typecheck and relevant full suites on Node 22; record results.
- [x] T012 Verify AC-001–AC-008; confirm no dashboard domain/Prisma model; constitution untouched; 008 owner-only superseded.
- [x] T013 Obtain independent review and resolve blocking findings.
  - Evidence: Independent review **PASS WITH NON-BLOCKING FINDINGS** (Pass with notes). Blocking: no. Failed ACs: none. AC-001–AC-008 verified. Low: `memory.md` still documented 008 owner-scoped DTO (resolved by T014). Informational: reviewer did not re-execute suites (Ask/readonly; coverage from test source + T010–T011 logs). Informational: Progress UI primarily % bars with `completed/total` in tooltip (allowed by AC-005).
- [x] T014 Update `memory.md` (explicit 008/022 scope supersession + Q decisions). Propose catalog patch; **wait for user confirmation** before editing `implemented-features.md`.
  - Evidence: `memory.md` updated (Verified 026; 008/022 owner-only scope + DTO/UI superseded; Q6/Q5/Q-183–Q-186). Catalog patch proposed in implementer return — `implemented-features.md` not edited. Catalog last confirmed through 018; 019–026 still awaiting catalog if not applied.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved |
| T003 | T002 | Port methods |
| T004 | T003 | Aggregation helpers |
| T005 | T004 | DTO/route |
| T006 | T005 | Backend test log |
| T007 | T005 | Client types |
| T008 | T007 | UI redesign |
| T009 | T008 | Frontend test log |
| T010 | T006, T009 | Command log |
| T011 | T010 | Command log |
| T012 | T011 | AC checklist |
| T013 | T012 | Reviewer verdict |
| T014 | T013 | Memory; catalog after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T003–T006, T012 | Membership scope |
| AC-002 | T004–T006, T012 | KPIs |
| AC-003 | T004–T005, T008–T009, T012 | Pie |
| AC-004 | T004, T008–T009, T012 | Checklist % |
| AC-005 | T004, T008–T009, T012 | Progress |
| AC-006 | T004–T006, T012 | Due Soon |
| AC-007 | T005–T009, T012 | Empty |
| AC-008 | T003, T012–T013 | Architecture |

## Completion report

- Completed tasks: T001–T014
- Tests executed (Node 22.22.3; prior implementer T010–T011):
  - Frontend targeted: dashboardChartData, DashboardCharts, DashboardPage, client dashboard, App — passed
  - Frontend full: 34 files / 300 tests passed; `npm run typecheck` passed
  - Backend targeted: dashboard-summary.domain, tasks-service, tasks-api — 55 passed; `npm run typecheck` passed
  - Backend full: 419 passed; 1 unrelated fail in `labels-api.test.ts` (comments body expects no `nextCursor`)
- Actual results: Membership-scoped overview DTO + UI Verified; AC-001–AC-008 PASS; no dashboard domain/Prisma model; constitution untouched; Recharts only; 008/022 owner-only scope and DTO/UI superseded
- Known issues: Unrelated backend labels-api assertion drift (not introduced by 026). Reviewer informational: suites not re-run in Ask mode; Progress % + tooltip completed/total. Catalog awaiting user confirm.
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (T014)
- Remaining work: none for 026; next Approved delivery `027-password-change`
