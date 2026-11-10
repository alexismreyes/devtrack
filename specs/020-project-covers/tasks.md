# Tasks: Project Covers

- **Feature ID:** 020-project-covers
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. **Q-155–Q-161** Decided (locked). Plan/tasks are aligned. Own under `projects`. Attachments-like volume + auth. Reopens 007 name-derived-only. No task notes / **H** / **C**. Do not change `constitution.md`. No `migrate reset` / unauthorized volume delete.

Locked: OWNER+EDITOR mutate; name-derived null fallback; `project_covers_data` + `PROJECT_COVERS_ROOT`; jpeg/png/webp/gif; 5 MiB; one cover; clear removes blob + metadata.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect `projects` module, `PublicProjectDto`, `ProjectCard` / `projectCover.ts`, 017 storage/multipart/content patterns, Compose volumes, membership write rules. Record files to change. Do not change product code.
  - Evidence: inspected projects + 017 attachment patterns; no product code changed in prep.
- [x] T002 Confirm artifacts **Approved** and reconfirm Q-155–Q-161 Decided. Confirm non-goals. **Stop if artifacts are Draft.**
  - Evidence: spec/plan/tasks **Approved**; Q-155–Q-161 Decided; non-goals held.

### Phase 2 — Backend

- [x] T003 Implement domain cover model/invariants (single active image cover; clear/replace rules).
  - Evidence: `project-cover.ts` + domain tests (allowlist, 5 MiB, sniff, storage key).
- [x] T004 Implement repository contract + Prisma mapping + **additive** migration (no reset).
  - Evidence: `ProjectCover` 1:1 + `20261109150000_project_covers`; applied via `prisma migrate deploy`.
- [x] T005 Implement storage port + filesystem adapter + Compose volume `project_covers_data` / `PROJECT_COVERS_ROOT` wiring (Q-159).
  - Evidence: filesystem adapter + Compose `project_covers_data` → `/data/project-covers`; `.env.example` / config.
- [x] T006 Implement upload/replace/clear/content use cases with OWNER+EDITOR authz (Q-157) and archived mapping; clear removes blob + metadata (Q-161).
  - Evidence: `ProjectCoversService` + service tests (replace/clear/authz/archived).
- [x] T007 Implement DTOs, Zod validators, controller, routes; extend public project DTO cover summary.
  - Evidence: PUT/DELETE/GET content routes; `PublicProjectDto.cover` summary `| null`.
- [x] T008 Add backend unit/API/storage tests for AC-001–AC-007 authz/validation/isolation.
  - Evidence: domain/storage/service/API tests green; full backend `npm test` 412 passed.

### Phase 3 — Frontend

- [x] T009 Extend API client/types for cover upload/clear/content and project DTO summary.
  - Evidence: `PublicProjectCoverSummaryDto` on `PublicProjectDto`; `uploadProjectCover` / `clearProjectCover` / `fetchProjectCoverContent`; client tests.
- [x] T010 Render authenticated cover on `ProjectCard` with name-derived fallback when null (Q-158); add upload/replace/clear in Edit Project Dialog.
  - Evidence: `ProjectCard` blob fetch + fallback; `EditProjectDialog` upload/clear; OWNER+EDITOR only via existing edit chrome.
- [x] T011 Add frontend tests for card display/fallback and writer controls / VIEWER read-only.
  - Evidence: `ProjectCard.test.tsx`, `EditProjectDialog.test.tsx`, VIEWER assertions in `ProjectDetail.test.tsx`.

### Phase 4 — Verification

- [x] T012 Run targeted backend + frontend tests; record commands and results.
  - Evidence: frontend targeted 98 passed; backend cover suites 12 passed (Node 22).
- [x] T013 Run typecheck and relevant full suites on Node 22; record results. Apply migration only via `migrate deploy` when authorized.
  - Evidence: frontend typecheck OK + 278/278; backend typecheck OK + 412/412; no migrate reset.
- [x] T014 Verify AC-001–AC-009. Confirm constitution unchanged; non-goals held; 007 superseded only as specified.
  - Evidence: AC checklist below; `constitution.md` unmodified; non-goals held.
- [x] T015 Obtain independent review and resolve blocking findings.
  - Evidence: Independent reviewer **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. Failed ACs: none. Non-blocking: SuperTest missing oversized AC-004 case (size wired + domain/middleware covered); multipart oversized message reuses “Attachment exceeds…” copy; suites/Compose E2E not re-run in review.
- [x] T016 Update `memory.md`. Record Q-155–Q-161. Propose `implemented-features.md` patch; **wait for user confirmation** before editing it.
  - Evidence: `memory.md` updated (Verified 020, Q-155–Q-161, migration `20261109150000_project_covers`, volume `project_covers_data` / `PROJECT_COVERS_ROOT`); catalog patch proposed in implementer return — not edited.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-155–Q-161 Decided |
| T003 | T002 | Domain tests |
| T004 | T003 | Migration exists; deployable |
| T005 | T002 | Storage fixture tests |
| T006 | T003, T004, T005 | Service tests |
| T007 | T006 | SuperTest routes |
| T008 | T007 | Backend test log |
| T009 | T007 | Client types |
| T010 | T009 | UI behavior |
| T011 | T010 | Frontend test log |
| T012 | T008, T011 | Command log |
| T013 | T012 | Command log |
| T014 | T013 | AC checklist |
| T015 | T014 | Reviewer verdict |
| T016 | T015 | Memory; catalog after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T006–T011, T014 | Upload + display — API + ProjectCard/EditDialog tests |
| AC-002 | T007, T008, T014 | Auth content — SuperTest + `fetchProjectCoverContent` credentials |
| AC-003 | T006, T008, T014 | Mutate authz — SuperTest; VIEWER no edit/cover controls |
| AC-004 | T007, T008, T014 | Validation — SuperTest + client-side allowlist guard |
| AC-005 | T006, T010, T014 | Clear/replace/fallback — API + UI tests |
| AC-006 | T008, T014 | Isolation — SuperTest |
| AC-007 | T004, T005, T014 | Migration + volume present; constitution unchanged |
| AC-008 | T014, T015 | Non-goals held — reviewer PASS WITH NON-BLOCKING FINDINGS |
| AC-009 | T002 | Approval gate satisfied |

## Completion report

- Completed tasks: T001–T016
- Tests executed (Node 22.22.3): frontend targeted + full; backend cover suites + full; frontend/backend typecheck
- Actual results: frontend 278/278; backend 412/412; typechecks OK
- Known issues: SuperTest oversized cover case light (non-blocking); multipart oversized copy says “Attachment”; no live Compose browser E2E in this feature
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (T016); `implemented-features.md` catalog patch proposed — await user confirm before edit
- Remaining work: none in this folder; catalog/prompt edits only after explicit user confirmation
