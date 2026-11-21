# Feature Specification: Confirm Dialogs

- **ID:** 035-confirm-dialogs
- **Status:** Verified
- **Created:** 2026-11-11
- **Related features:** Verified soft-delete task (`004`/`006`/`007`); logout (`002`/`005`); shadcn Dialog; delivery after Verified `034`

These artifacts are **Verified**. Material locks **Q-211–Q-213** are **Decided** (section 15). Frontend UX: confirm before soft-delete task and before logout using existing shadcn Dialog (Cancel/Confirm). Do **not** use `window.confirm`. Do **not** invent notes/**C**. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until later confirm.

## 1. Problem

Soft-deleting a task and logging out run immediately on click. Accidental clicks destroy task visibility or end the session without a second step.

## 2. Goals

- Confirm before soft-delete task via shadcn Dialog Cancel/Confirm (Q-211).
- Confirm before logout via shadcn Dialog Cancel/Confirm (Q-212).
- Must not use `window.confirm`.
- Soft-delete and logout API contracts unchanged; only gate the call behind Confirm.

## 3. Non-Goals

- Confirm for archive/unarchive, comment delete, attachment delete, cover clear, or other mutations (out of this folder unless already present).
- `window.confirm` / `window.prompt`.
- Changing soft-delete or logout HTTP contracts, session cookie rules, or restore.
- Task notes; **C**; constitution edit; `implemented-features.md` edits.
- New dialog libraries beyond existing `@radix-ui/react-dialog` / shadcn Dialog.

## 4. Actors and User Stories

### User Story US-001

As a task writer, I want to confirm before soft-deleting a task, so I do not delete by mistake.

### User Story US-002

As an authenticated user, I want to confirm before logout, so I do not sign out by mistake.

## 5. Functional Requirements

- **FR-001:** Activating Delete task MUST open a shadcn Dialog with Cancel and Confirm. Confirm MUST call existing `softDeleteTask`; Cancel MUST close without calling the API (Q-211).
- **FR-002:** Activating Log out MUST open a shadcn Dialog with Cancel and Confirm. Confirm MUST call existing `logout`; Cancel MUST close without calling the API (Q-212).
- **FR-003:** MUST NOT use `window.confirm` (or equivalent native confirm).
- **FR-004:** While confirm Dialog is open, Esc / Cancel / overlay dismiss (if Dialog supports) MUST not soft-delete or logout.
- **FR-005:** Busy/disabled states during in-flight delete/logout MUST remain safe (no double-submit).
- **FR-006:** Authz/error mapping for soft-delete and logout remains unchanged after Confirm.
- **FR-007:** Critical cancel-vs-confirm paths MUST be covered by frontend tests.
- **FR-008:** MUST NOT implement notes/**C** or change `constitution.md`. MUST NOT edit `implemented-features.md` until later confirm.

## 6. Acceptance Criteria

### Scenario AC-001: Soft-delete confirm

- Given TaskDetail Delete task available
- When the user activates Delete task
- Then a Dialog appears with Cancel and Confirm
- When Confirm is activated
- Then soft-delete API is called and existing success path runs

### Scenario AC-002: Soft-delete cancel

- Given the delete confirm Dialog is open
- When the user activates Cancel (or dismisses without Confirm)
- Then soft-delete API is not called and the task remains

### Scenario AC-003: Logout confirm

- Given authenticated chrome Log out
- When the user activates Log out
- Then a Dialog appears with Cancel and Confirm
- When Confirm is activated
- Then logout API is called and existing logged-out path runs

### Scenario AC-004: Logout cancel

- Given the logout confirm Dialog is open
- When Cancel / dismiss without Confirm
- Then logout API is not called and the session remains

### Scenario AC-005: No window.confirm

- Given this feature
- When implemented
- Then product code does not call `window.confirm` for these flows

### Scenario AC-006: Non-goals

- Given Approved artifacts
- When implemented
- Then no API/Prisma/constitution drift; other confirms out of scope unless already present

### Scenario AC-007: Approval gate

- Given artifacts are **Approved**
- When implementation is requested
- Then work proceeds on the approved task list only

## 7. Business Rules

- Soft-delete and logout domain rules unchanged — `tasks` / `auth`.
- Confirmation is UI gating only — frontend.

## 8. Data

No new business data.

## 9. API and Integrations

Reuse `DELETE`/`softDelete` task and `POST /api/auth/logout` unchanged.

## 10. Security

Dialog is not authorization. Backend soft-delete and logout authz unchanged.

## 11. Non-Functional

Prefer a small shared confirm Dialog helper if it reduces duplication without inventing a second design system.

## 12. Dependencies

- Existing features: Verified soft-delete UI; LogoutButton; shadcn Dialog
- Architectural constraints: no `window.confirm`; no new dialog framework
- External dependencies: none new

## 13. Failures and Edge Cases

- Confirm while already submitting — disable Confirm or ignore duplicate.
- Unauthenticated during logout confirm — keep existing LogoutButton unauthenticated handling after Confirm attempt.
- Soft-delete 409 archived parent — show existing conflict messaging after Confirm.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001, AC-002 | TaskDetail tests |
| FR-002 | AC-003, AC-004 | LogoutButton / layout tests |
| FR-003 | AC-005 | Code review / grep |
| FR-004–FR-008 | AC-002, AC-004, AC-006–AC-007 | Tests + review |

## 15. Open Questions

- **Q-211:** Confirm soft-delete task? Owner: product. Status: **Decided**. Yes — shadcn Dialog Cancel/Confirm; not `window.confirm`.
- **Q-212:** Confirm logout? Owner: product. Status: **Decided**. Yes — shadcn Dialog Cancel/Confirm; not `window.confirm`.
- **Q-213:** Exact Dialog titles/body copy? Owner: product. Status: **Decided**. Titles “Delete task?” / “Log out?”; short body; Confirm labels “Delete” / “Log out”; Cancel “Cancel”.

Cross-cutting locks: no notes; no **C**; no constitution edit; no catalog edit until confirm; after 034.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-211–Q-213 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
