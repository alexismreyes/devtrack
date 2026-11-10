# Tasks: Feed Window

- **Feature ID:** 025-feed-window
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Amend 021 append → Prev/Next window of ≤5. **Locked:** Q-181 FE cursor/window stack (no `prevCursor` unless gap); Q-182 interleave current pages, show ≤5, replace. No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect CommentsActivityPanel, TaskDetail feed load/reset, and 021 API client helpers. Confirm FE cursor-stack Prev is viable. Do not change product code.
- [x] T002 Confirm artifacts **Approved** (Q-181/Q-182 already Decided). **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Not applicable under prefer-keep API. Record “N/A — reuse cursor/limit GETs”. If material Prev gap exists, **stop** and amend artifacts before any API work.

### Phase 3 — Frontend

- [x] T004 Implement window state (≤5) + Q-182 interleave-from-current-pages + replace semantics; remove append Load more UX (AC-001/AC-002).
- [x] T005 Implement Prev/Next via Q-181 FE cursor/window stack and end disablement (AC-003/AC-004); wire mutation/reload reset to newest window (AC-005).
- [x] T006 Add frontend tests for AC-001–AC-006 as practical.

### Phase 4 — Verification

- [x] T007 Run targeted frontend tests; record results.
- [x] T008 Run frontend typecheck and relevant `npm test` on Node 22; backend smoke only if T003 changed. Record results.
- [x] T009 Verify AC-001–AC-007; confirm 021 append UX superseded; constitution untouched.
- [x] T010 Obtain independent review and resolve blocking findings.
  - Evidence: Independent review **PASS WITH NON-BLOCKING FINDINGS** (Pass with notes). Blocking: no. Failed ACs: none. Low: `TaskDetail.test.tsx` AC-005 asserts create→reset after Next; edit/delete/014 reload share `reloadNewestFeedWindow` but lack the same navigate-then-reset assertion. Informational: Q-182 overflow beyond visible ≤5 can be skipped on Next (locked algorithm). Informational: reviewer did not re-execute suites (Ask/readonly). AC-001–AC-007 verified by reviewer (AC-005 create-path tested; edit/delete share helper).
- [x] T011 Update `memory.md`. Document 021 UX supersession. Propose catalog patch; **wait for user confirmation** before editing `implemented-features.md`.
  - Evidence: `memory.md` updated (Verified 025; 021 Load more append UX superseded; Q-181/Q-182). Catalog patch proposed in implementer return — `implemented-features.md` not edited. Catalog last confirmed through 018; 019–025 still awaiting catalog if not applied.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved |
| T003 | T002 | N/A or amend |
| T004 | T002 | Window replace |
| T005 | T004 | Prev/Next + reset |
| T006 | T005 | Test log |
| T007 | T006 | Command log |
| T008 | T007 | Command log |
| T009 | T008 | AC checklist |
| T010 | T009 | Reviewer verdict |
| T011 | T010 | Memory; catalog after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T006, T009 | ≤5 |
| AC-002 | T004, T006, T009 | Next replace |
| AC-003 | T005, T006, T009 | Prev |
| AC-004 | T005, T006, T009 | Ends |
| AC-005 | T005, T006, T009 | Reset |
| AC-006 | T001, T003, T009 | API |
| AC-007 | T009–T010 | Non-goals |

## Completion report

- Completed tasks: T001–T011
- Tests executed (prior implementer T007–T008 + close-out re-run; Node `v22.22.3`):
  - Targeted `CommentsActivityPanel.test.tsx` + `TaskDetail.test.tsx` — 2 files, 39 passed
  - `npm run typecheck` — exit 0
  - Full `vitest run` — 34 files, 300 passed
- Actual results: Load more append superseded by Prev/Next window replace ≤5; API unchanged (cursor/limit reuse); constitution untouched; no migration
- Known issues: Low/Informational non-blocking only (AC-005 edit/delete parallel assert; Q-182 overflow skip; reviewer suite re-run deferred). Catalog `implemented-features.md` awaiting user confirm (last confirmed through 018; 019–024 also pending if not applied).
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (T011)
- Remaining work: none for 025; next Approved delivery `026-dashboard-overview`
