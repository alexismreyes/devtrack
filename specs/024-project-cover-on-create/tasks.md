# Tasks: Project Cover on Create

- **Feature ID:** 024-project-cover-on-create
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. **Locked:** Q-180 soft-fail; Q-179 copy “Project created, but cover upload failed.” Reuse 020. No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect CreateProjectDialog, create submit host, 020 cover client helpers and Edit dialog patterns. Do not change product code.
- [x] T002 Confirm artifacts **Approved** (Q-179/Q-180 already Decided). **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Not applicable if reusing 020 PUT. Record “N/A — reuse cover API”. If a material contract gap exists, **stop** and amend artifacts.

### Phase 3 — Frontend

- [x] T004 Add optional cover control to Create Project Dialog (AC-001/AC-002).
- [x] T005 Wire create-then-optional-PUT orchestration with soft-failure UX and Q-179 copy “Project created, but cover upload failed.” (AC-003/AC-004); keep dismiss lock while busy.
- [x] T006 Add frontend tests for AC-001–AC-004.

### Phase 4 — Verification

- [x] T007 Run targeted frontend tests; record results.
- [x] T008 Run frontend typecheck and relevant `npm test` on Node 22; record results.
- [x] T009 Verify AC-001–AC-005; confirm no new multipart create API / volume / constitution edits.
- [x] T010 Obtain independent review and resolve blocking findings.
  - Evidence: Independent review **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. Failed ACs: none. Low: `ProjectsPage.test.tsx` does not assert AC-001 cover face on `/projects` home card (create→PUT + sidebar name covered; `ProjectsHome`/`ProjectCard` epoch refresh expected). Informational: reviewer did not re-execute suites (totals from implementer + close-out re-run). AC-001–AC-005 verified by reviewer (AC-001 card UI unverified live).
- [x] T011 Update `memory.md`. Propose catalog patch; **wait for user confirmation** before editing `implemented-features.md`.
  - Evidence: `memory.md` updated (Verified 024, Q-179/Q-180); catalog patch proposed in implementer return — `implemented-features.md` not edited. Catalog last confirmed through 018; 019–024 still awaiting catalog if not applied.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved |
| T003 | T002 | N/A or amend |
| T004 | T002 | Dialog UI |
| T005 | T004 | Orchestration |
| T006 | T005 | Test log |
| T007 | T006 | Command log |
| T008 | T007 | Command log |
| T009 | T008 | AC checklist |
| T010 | T009 | Reviewer verdict |
| T011 | T010 | Memory; catalog after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004–T006, T009 | Create+cover |
| AC-002 | T004–T006, T009 | No file |
| AC-003 | T005–T006, T009 | Soft fail |
| AC-004 | T005–T006, T009 | 020 rules |
| AC-005 | T003, T009–T010 | Non-goals |

## Completion report

- Completed tasks: T001–T011
- Tests executed (prior implementer T007–T008 + close-out re-run; Node `v22.22.3`):
  - `npm test -- src/projects/ProjectsPage.test.tsx` → 14 passed
  - `npm run typecheck` → pass
  - `npm test` → 34 files / 300 passed
- Actual results: Create dialog optional cover; create-then-PUT soft-fail with Q-179 copy; dismiss lock while busy; no backend/API/schema/migration/volume/constitution changes
- Known issues: Low/Informational non-blocking only (no home-card cover assert/E2E; reviewer suite re-run deferred). Catalog `implemented-features.md` awaiting user confirm (last confirmed through 018; 019–023 also pending if not applied).
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (T011)
- Remaining work: none for 024; next Approved delivery `025-feed-window`
