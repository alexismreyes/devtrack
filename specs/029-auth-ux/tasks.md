# Tasks: Auth UX

- **Feature ID:** 029-auth-ux
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Spec **Q-194–Q-195** Decided (locked). Frontend-only. No Prisma/auth API. No task notes / **C**. **H** owned by `031`. Do not change `constitution.md`. Do not edit `implemented-features.md` until later user confirm.

Locked: eye toggle on Login + Register + Profile change-password; guest `/` → `/login` (supersedes guest→register); Register remains via UI links.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect LoginForm, RegisterForm, ProfilePage password fields, RootRedirect, GuestLayout links, and related tests. Record files to change. Confirm no schema/API need. Do not change product code in this task.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-194–Q-195 Decided. Confirm non-goals. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Not applicable — no domain/API/Prisma changes planned. Record “N/A — frontend-only” as evidence when Approved work starts. If a contract gap appears, **stop** and amend artifacts.

### Phase 3 — Frontend

- [x] T004 Implement accessible password visibility eye toggle(s) and wire Login + Register (AC-001, AC-002 / Q-194). Prefer a small shared control.
- [x] T005 Wire independent eye toggles on Profile change-password current, new, and confirm fields (AC-003 / Q-194).
- [x] T006 Change guest `RootRedirect` from `/register` to `/login`; keep authenticated `/` → `/projects`; keep Register reachable via UI links (AC-004–AC-006 / Q-195).
- [x] T007 Add/update frontend tests for AC-001–AC-007 as practical (including guest-root assertion update).

### Phase 4 — Verification

- [x] T008 Run targeted frontend tests; record commands and actual results.
- [x] T009 Run frontend `npm run typecheck` and relevant `npm test` on Node 22; record results.
- [x] T010 Verify AC-001–AC-008 against the spec. Confirm no migration, constitution unchanged, non-goals held.
- [x] T011 Obtain independent review and resolve blocking findings.
  - Evidence: Independent review **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. Failed ACs: none. AC-001–AC-008 verified. Low: `App.test.tsx` (~168) title still says “guest register” while mounting `/register` explicitly (cosmetic; guest→login covered elsewhere). Informational: reviewer did not re-run suites (Ask/readonly); implementer recorded Node 22.22.3 typecheck + targeted 35 + full 329. Informational: `PasswordInput` toggle nested in wrapping `<Label>`; Profile uses distinct `toggleNoun`s.
- [x] T012 Update `memory.md` from verified state. Record Q-194–Q-195 and guest-root supersession. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file.
  - Evidence: `memory.md` updated (Verified 029; Q-194–Q-195; guest `/` → `/login`). Catalog patch proposed in implementer return — `implemented-features.md` not edited.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-194–Q-195 Decided |
| T003 | T002 | N/A evidence |
| T004 | T002 | Login/Register toggle tests |
| T005 | T004 | Profile toggle tests |
| T006 | T002 | RootRedirect / App tests |
| T007 | T004, T005, T006 | Frontend test results |
| T008 | T007 | Command log |
| T009 | T008 | Command log |
| T010 | T009 | AC checklist |
| T011 | T010 | Reviewer verdict |
| T012 | T011 | Memory updated; catalog only after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T007, T010 | Login toggle — LoginForm test passed |
| AC-002 | T004, T007, T010 | Register toggle — RegisterForm test passed |
| AC-003 | T005, T007, T010 | Profile toggles — ProfilePage test passed |
| AC-004 | T006, T007, T010 | Guest `/` → login — App.test updated + passed |
| AC-005 | T006, T007, T010 | Register links — GuestLayout + App login↔register test passed |
| AC-006 | T006, T007, T010 | Auth `/` → projects — App.test passed |
| AC-007 | T003, T010 | No API/schema — N/A frontend-only; no migration; constitution untouched |
| AC-008 | T002 | Approval gate — artifacts Approved; Q-194–Q-195 Decided |

## Completion report

- Completed tasks: T001–T012
- Tests executed:
  - Node 22.22.3 targeted: `npm test -- --run src/auth/LoginForm.test.tsx src/auth/RegisterForm.test.tsx src/users/ProfilePage.test.tsx src/App.test.tsx` → 4 files, 35 passed
  - Node 22.22.3: `npm run typecheck` → pass; `npm test -- --run` → 34 files, 329 passed
- Actual results: All green on Node 22.22.3; guest root → `/login`; PasswordInput on Login/Register/Profile; no Prisma/API; constitution untouched
- Known issues: none blocking. Low: App.test title “guest register” cosmetic mismatch. Catalog awaiting user confirm.
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (T012); catalog propose only — **do not** edit `implemented-features.md` until user confirms
- Remaining work: next Approved delivery `030-cover-pointer`; user confirm catalog patch for 029 (and any pending 019–031 if not yet applied)

### T001 inspection notes

Files to change (no schema/API): `frontend/src/auth/PasswordInput.tsx` (new), `LoginForm.tsx` (+test), `RegisterForm.tsx` (+test), `ProfilePage.tsx` (+test), `RootRedirect.tsx`, `App.test.tsx`. GuestLayout links already cover Register/Login. Confirmed frontend-only.
