# Tasks: Archived Projects Sidebar

- **Feature ID:** 036-archived-projects
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. **Stop if artifacts are Draft.**

Locked: owner Archived sidebar (section only when count ≥ 1); GET-by-id detail; honor `includeArchived=true` additive for `ownerUserId`; `/projects` grid active-only; non-owners cannot GET archived. No notes/**C**/constitution/catalog until confirm.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect projects list/archive/GET authz, ProjectsPage sidebar, and tests asserting includeArchived ignore. Record files. Do not change product code.
  - Evidence: `ProjectsService.listAuthorized` active-only; controller ignored query; owner GET archived OK; non-owner 403; `ProjectsPage`/`ProjectsHome` filtered `archivedAt === null`; API/FE tests asserted ignore. Approach: `listArchivedByOwnerId` + honor query + sidebar Archived section.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-214–Q-218 Decided. **Stop if artifacts are Draft.**
  - Evidence: All three Status: Approved; Q-214–Q-218 Decided.

### Phase 2 — Backend

- [x] T003 Extend projects repository for listing archived-by-owner (or equivalent) without generic repository.
  - Evidence: `ProjectsRepository.listArchivedByOwnerId`; Prisma + in-memory implementations.
- [x] T004 Implement service listAuthorized(+includeArchived) per FR-004; preserve active-only default.
  - Evidence: `listAuthorized(actorId, { includeArchived })` additive owner archived; default unchanged; dedupe by id.
- [x] T005 Add/update Zod query validation and controller wiring for `includeArchived`.
  - Evidence: `validators/list-projects-query.ts`; route middleware; controller passes flag; invalid → 400.
- [x] T006 Add/update service + API tests for AC-003–AC-004 (and related authz).
  - Evidence: projects-service + projects-api + tasks-api includeArchived expectations updated.

### Phase 3 — Frontend

- [x] T007 Extend API client `listProjects` to pass `includeArchived`.
  - Evidence: optional `{ includeArchived?: boolean }`; client test for query.
- [x] T008 Implement owner Archived sidebar section + navigation (AC-001, AC-002, AC-005).
  - Evidence: `ProjectsPage` fetches `includeArchived: true`; Archived heading/list only when count ≥ 1; click → `onSelectProject`; `/projects` grid unchanged (no flag).
- [x] T009 Add/update frontend tests for section visibility, navigation, and active grid unchanged.
  - Evidence: ProjectsPage + App + client + ProjectsHome tests.

### Phase 4 — Verification

- [x] T010 Run targeted backend + frontend tests; record results.
  - Node 22.22.3: backend projects-service/api + tasks-api → 3 files / 61 passed; frontend ProjectsPage/client/App/ProjectsHome → 4 files / 124 passed.
- [x] T011 Run typechecks and relevant suites on Node 22; record results.
  - Node 22.22.3: backend + frontend `npm run typecheck` exit 0. Full backend `npm test` first pass: 7 timeout flakes under parallel load (429 passed / 7 timed out); re-run of those 7 files → 99 passed. Full frontend `npm test` first pass: 5 timeout flakes (338 passed / 5 timed out); isolated re-run of Login/Register/TaskDetail loading cases → passed.
- [x] T012 Verify AC-001–AC-007; non-goals held.
  - AC-001: Archived section lists owned archived (ProjectsPage tests).
  - AC-002: click archived → select/navigate; Unarchive remains on detail (existing ProjectDetail + App archive test).
  - AC-003: includeArchived additive for owner; default active-only (API/service tests).
  - AC-004: non-owner list/GET archived denied (API/service tests).
  - AC-005: no Archived heading when count 0 (ProjectsPage test).
  - AC-006: no separate archived endpoint; no notes/**C**/constitution/`implemented-features` edits.
  - AC-007: artifacts Approved; Q-214–Q-218 Decided; T001–T012 only (T013–T014 deferred).
- [x] T013 Independent review; resolve blockers.
  - Evidence: Reviewer PASS WITH NOTES; Blocking: no; Failed ACs: none.
- [x] T014 Update `memory.md`; propose catalog patch; wait for confirm before `implemented-features.md`.
  - Evidence: `memory.md` Verified + Q-214–Q-218; catalog patch proposed only (not written).

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection |
| T002 | T001 | Approved |
| T003 | T002 | Repo method |
| T004 | T003 | Service tests |
| T005 | T004 | Validator/controller |
| T006 | T005 | API tests |
| T007 | T002 | Client |
| T008 | T006, T007 | Sidebar UI |
| T009 | T008 | FE tests |
| T010 | T006, T009 | Command log |
| T011 | T010 | Command log |
| T012 | T011 | AC checklist |
| T013 | T012 | Reviewer |
| T014 | T013 | Memory |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T008, T009, T012 | Archived section |
| AC-002 | T008, T009, T012 | Detail + Unarchive |
| AC-003 | T004–T006, T012 | includeArchived |
| AC-004 | T004–T006, T012 | Non-owner denied |
| AC-005 | T008, T009, T012 | Empty behavior |
| AC-006 | T012 | Scope |
| AC-007 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T014
- Tests executed: Node 22.22.3 — targeted BE 61 passed; targeted FE 124 passed; typechecks exit 0; full suites green on re-run after parallel timeout flakes
- Actual results: Honor `includeArchived=true` for `ownerUserId` archived additive; sidebar Archived section when count ≥ 1; grid active-only; no migration
- Known issues: full-suite parallel Argon2/load timeouts (non-deterministic); archive/sidebar epoch refresh still navigation-keyed (pre-existing)
- Reviewer findings: PASS WITH NOTES; Blocking: no; Failed ACs: none
- Memory updated: yes (T014); catalog propose only (await confirm)
- Remaining work: none for 036 (await catalog confirm for `implemented-features.md`)
