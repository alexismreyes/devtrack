# Tasks: Board Background Image

- **Feature ID:** 037-board-background
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. **Stop if artifacts are Draft.**

Locked: separate board background; behind columns; OWNER+EDITOR; image allowlist 5 MiB; separate Compose volume; path `board-background`; Edit Project primary; null fallback. No notes/**C**/constitution/catalog until confirm. No destructive migrate reset / volume delete without auth.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect 020 cover stack, Compose volumes, PublicProjectDto, Kanban board container, EditProjectDialog. Record files. Do not change product code.
  - Evidence: Covers stack under `projects` (domain/storage/repo/service/controller/routes); Compose `project_covers_data`; DTO `cover`; Kanban in `KanbanBoard`/`TasksPanel`; Edit cover controls in `EditProjectDialog`.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-219–Q-225 Decided. **Stop if artifacts are Draft.**
  - Evidence: All three Status: Approved; Q-219–Q-225 Decided.

### Phase 2 — Backend

- [x] T003 Add Prisma model + additive migration for board background metadata.
  - Evidence: `ProjectBoardBackground` + migration `20261111160000_project_board_backgrounds`; `prisma migrate deploy` applied.
- [x] T004 Implement storage port + repository (domain-specific).
  - Evidence: domain + filesystem/in-memory storage + Prisma/in-memory repositories.
- [x] T005 Implement service use cases (put/clear/content) with authz + validation.
  - Evidence: `ProjectBoardBackgroundsService` mirrors cover authz/validation.
- [x] T006 DTOs, Zod validators, controller, routes.
  - Evidence: additive `boardBackground` on `PublicProjectDto`; routes under `.../board-background`.
- [x] T007 Wire Compose volume + `PROJECT_BOARD_BACKGROUNDS_ROOT`; document env.
  - Evidence: `docker-compose.yml` volume/env; `.env.example`; config/env defaults.
- [x] T008 Add unit/API tests for AC-001–AC-005 backend aspects (incl. cover independence).
  - Evidence: domain/storage/service/API tests including AC-005 cover independence.

### Phase 3 — Frontend

- [x] T009 API client + types for board background.
  - Evidence: upload/clear/content helpers + DTO field on `PublicProjectDto`.
- [x] T010 Edit Project Dialog upload/clear UI.
  - Evidence: board background file input + clear beside cover controls.
- [x] T011 Kanban board background layer + null fallback.
  - Evidence: `KanbanBoard` authenticated background layer; `data-board-background` fallback/image.
- [x] T012 Frontend tests for Edit + board display/fallback.
  - Evidence: EditProjectDialog + KanbanBoard + client tests.

### Phase 4 — Verification

- [x] T013 Run targeted backend + frontend tests; record results (apply migration via deploy workflow only — no reset).
  - Node 22.22.3: backend projects suite → 12 files / 66 passed; FE Edit/Kanban/client/Projects* /App/TasksPanel → 9 files / 214 passed; `prisma:deploy` applied `20261111160000_project_board_backgrounds`.
- [x] T014 Typechecks and relevant suites on Node 22; record results.
  - Node 22.22.3: backend + frontend `npm run typecheck` exit 0. Full backend `npm test` first pass: 442 passed / 7 timed out under parallel load; isolated re-run of 6 files → 55 passed. Full frontend `npm test` first pass: 339 passed / 10 timed out; isolated re-run of 8 files → 95 passed.
- [x] T015 Verify AC-001–AC-007; non-goals held.
  - AC-001: upload + DTO + Kanban image layer (API + FE tests).
  - AC-002: clear + null fallback (API + FE tests).
  - AC-003: VIEWER/stranger mutate denied; content private (API tests).
  - AC-004: type/size validation (API/domain tests).
  - AC-005: cover independence + separate volume/env (API + Compose).
  - AC-006: no notes/**C**/constitution/`implemented-features` edits; cover contracts preserved.
  - AC-007: artifacts Approved; Q-219–Q-225 Decided; stopped before T016 review.
- [x] T016 Independent review; resolve blockers.
  - Evidence: Reviewer PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none.
- [x] T017 Update `memory.md`; propose catalog patch; wait for confirm before `implemented-features.md`.
  - Evidence: `memory.md` records Verified + Q-219–Q-225; catalog propose only (034 + 035 + 036 + 037); `implemented-features.md` not edited.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection |
| T002 | T001 | Approved |
| T003 | T002 | Migration |
| T004 | T003 | Repo/storage |
| T005 | T004 | Service |
| T006 | T005 | HTTP |
| T007 | T002 | Compose/env |
| T008 | T006, T007 | Backend tests |
| T009 | T006 | Client |
| T010 | T009 | Edit UI |
| T011 | T009 | Board UI |
| T012 | T010, T011 | FE tests |
| T013 | T008, T012 | Command log |
| T014 | T013 | Command log |
| T015 | T014 | AC checklist |
| T016 | T015 | Reviewer |
| T017 | T016 | Memory |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T005–T012, T015 | Upload + display |
| AC-002 | T005–T012, T015 | Clear + fallback |
| AC-003 | T005–T008, T015 | Authz |
| AC-004 | T005–T008, T015 | Validation |
| AC-005 | T003, T007, T008, T015 | Separate from cover |
| AC-006 | T015 | Scope |
| AC-007 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T017
- Tests executed: Node 22.22.3 — backend projects 66 passed; FE targeted 214 passed; typechecks exit 0; full suites recorded after flake re-runs
- Actual results: Separate board background volume/DTO/API; Edit Project upload/clear; Kanban behind-columns image with null fallback; additive migration only
- Known issues: full-suite parallel Argon2/load timeouts (non-deterministic, same class as prior features)
- Reviewer findings: PASS WITH NON-BLOCKING; Blocking: no
- Memory updated: yes (T017); catalog proposed only — awaiting confirm for `implemented-features.md`
- Remaining work: none for 037 (await catalog confirm)
