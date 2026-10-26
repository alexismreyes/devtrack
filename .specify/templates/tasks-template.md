# Tasks: [Feature Name]

- **Feature ID:** [Feature ID]
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Not Started | In Progress | Blocked | Complete

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

Remove tasks that do not apply. Do not create empty components to satisfy this template.

## Checklist

### Phase 1 — Preparation

- [ ] T001 Inspect existing implementation and conventions.
- [ ] T002 Confirm prerequisites and specification approval.

### Phase 2 — Backend

- [ ] T003 Implement or update domain behavior.
- [ ] T004 Implement domain-specific repository contract.
- [ ] T005 Implement Prisma mapping and required migration.
- [ ] T006 Implement service use cases.
- [ ] T007 Implement DTOs and runtime validators.
- [ ] T008 Implement controller and routes.
- [ ] T009 Add unit and integration tests.

### Phase 3 — Frontend

- [ ] T010 Implement API integration.
- [ ] T011 Implement UI and interaction states.
- [ ] T012 Add relevant frontend tests.

### Phase 4 — Verification

- [ ] T013 Run targeted tests.
- [ ] T014 Run type checking and relevant quality checks.
- [ ] T015 Verify acceptance criteria.
- [ ] T016 Obtain independent review and resolve blocking findings.
- [ ] T017 Update documentation and project memory.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T003 | T002       | [Evidence]   |

## Acceptance coverage

| Criterion | Task(s)    | Evidence      |
| --------- | ---------- | ------------- |
| AC-001    | T003, T009 | [Test result] |

## Completion report

- Completed tasks:
- Tests executed:
- Actual results:
- Known issues:
- Reviewer findings:
- Memory updated:
- Remaining work:
