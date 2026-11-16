# Feature Specification: Auth UX

- **ID:** 029-auth-ux
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** 002-authentication (Verified); 005-frontend-shell (Verified guest/auth routing); 027-password-change (Verified profile change-password); delivery after Approved `028` then `031-within-column-rank` (Kanban consecutive), before `030`

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product questions **Q-194–Q-195** are **Decided** (section 15). Frontend-focused auth UX. Do **not** invent task notes. Within-column rank (**H**) is out of this folder (owned by `031`). Do **not** implement **C** or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms.

This ID is **029-auth-ux**.

## 1. Problem

Password fields on Login, Register, and Profile change-password are always masked with no visibility toggle, which makes typos harder to catch. Separately, unauthenticated visitors hitting `/` are redirected to `/register` (005/008 era). Returning users more often want Login first; Register should stay reachable via existing UI links, not as the guest root default.

## 2. Goals

- Add a **password visibility eye toggle** on Login, Register, and Change password (Profile) password fields (Q-194).
- Change guest authenticated-root behavior: unauthenticated `/` → **`/login`** (Q-195), superseding guest → `/register`.
- Keep Register reachable via guest chrome / cross-links (Login ↔ Register).
- Stay frontend-only for these UX changes: no auth API contract, hashing, or session model changes.

## 3. Non-Goals

- Email password reset / SMTP; MFA; OAuth.
- Task notes; within-column rank **H** (owned by `031`); **C**; `specs/005-audit/`.
- Changing `constitution.md`.
- Changing register/login/password-change HTTP contracts, cookie name, Argon2id, or 027 session-revoke policy.
- Removing `/register` as a destination or forcing login-only signup.
- Editing `implemented-features.md` in this batch.
- Rate limiting / lockout (Q-017 still deferred).

## 4. Actors and User Stories

### User Story US-001

As a guest or authenticated user typing a password, I want an eye toggle to show/hide the value, so that I can confirm what I typed on Login, Register, and Change password.

### User Story US-002

As a returning guest opening the app root, I want to land on Login, so that I can sign in without first hitting Register.

### User Story US-003

As a new user, I want Register still available from Login and guest links, so that signup remains discoverable.

## 5. Functional Requirements

- **FR-001:** Login password field MUST include an accessible show/hide (eye) toggle that switches the input between `password` and visible text without clearing the value (Q-194).
- **FR-002:** Register password field MUST include the same style of show/hide toggle (Q-194).
- **FR-003:** Profile Change password fields (**current**, **new**, and **confirm new**) MUST each include a show/hide toggle (Q-194). Toggles are independent per field.
- **FR-004:** Unauthenticated session resolving `/` MUST navigate to **`/login`** (Q-195). Authenticated `/` → `/projects` MUST remain. This **supersedes** prior guest root → `/register` (005/008 Q-045 guest-root clause).
- **FR-005:** `/register` MUST remain a valid guest destination reachable via existing UI links (guest layout / Login “register” link / Register “log in” link as applicable). MUST NOT remove registration.
- **FR-006:** MUST NOT change backend auth routes, Prisma schema, or password hashing. `credentials: 'include'` behavior unchanged.
- **FR-007:** Critical toggle and root-redirect behaviors MUST be covered by frontend tests (Testing Library).
- **FR-008:** MUST NOT implement task notes, **H** (out of folder → `031`), **C**, SMTP reset, or change `constitution.md`. MUST NOT edit `implemented-features.md` until later user confirm.

## 6. Acceptance Criteria

### Scenario AC-001: Login password visibility

- Given the Login form
- When the user activates the password visibility toggle
- Then the password input reveals plaintext (and can be toggled back to masked)
- Then the entered value is preserved across toggles

### Scenario AC-002: Register password visibility

- Given the Register form
- When the user activates the password visibility toggle
- Then the password input reveals/masks as on Login without clearing the value

### Scenario AC-003: Change password visibility

- Given `/profile` change-password form
- When the user toggles visibility on current, new, and confirm fields
- Then each field independently shows/hides without clearing values

### Scenario AC-004: Guest root → login

- Given an unauthenticated session
- When the user opens `/`
- Then the app navigates to `/login` (not `/register`)

### Scenario AC-005: Register still reachable

- Given guest chrome or Login page
- When the user follows the Register link
- Then `/register` is available and usable

### Scenario AC-006: Authenticated root unchanged

- Given an authenticated session
- When the user opens `/`
- Then the app still navigates to `/projects`

### Scenario AC-007: Non-goals / no backend drift

- Given this feature
- When implemented
- Then no Prisma migration and no intentional auth API contract change
- Then notes / **H** (→ `031`) / **C** / constitution edits / catalog edit remain out of this folder’s scope

### Scenario AC-008: Approval gate

- Given these artifacts are **Approved** (Q-194–Q-195 Decided)
- When implementation is requested
- Then work may proceed on the approved task list only

## 7. Business Rules

- Password visibility is presentation-only — owning domain: frontend.
- Guest root redirect is routing presentation — owning domain: frontend shell (supersedes prior guest→register default).
- Auth credentials and sessions remain `auth` domain unchanged.

## 8. Data

No new business data. Visibility state is ephemeral UI state only (not persisted).

## 9. API and Integrations

No new endpoints. No intentional contract changes to register, login, logout, me, or password change.

## 10. Security

- Revealed password text is still only on the user’s device; do not log or echo passwords in errors.
- Toggle MUST NOT weaken hashing, cookie flags, or CSRF/session rules.
- Frontend route redirects are not authorization.

## 11. Non-Functional

Toggles MUST be keyboard-accessible and have an accessible name (e.g. “Show password” / “Hide password”). Prefer lucide-react icons already in the stack over a new icon library.

## 12. Dependencies

- Existing features: Verified 002 auth, 005 shell routing, 027 profile password change
- Architectural constraints: constitution Articles VII/VIII; no contract invention
- External dependencies: none new (reuse `lucide-react`)

## 13. Failures and Edge Cases

- Disabled/saving forms: toggles MAY remain usable or follow disabled field rules; must not submit password in URLs.
- Multiple password fields: independent visibility state per field.
- Deep links to `/register` remain valid after guest root change.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001 | LoginForm tests |
| FR-002 | AC-002 | RegisterForm tests |
| FR-003 | AC-003 | ProfilePage tests |
| FR-004 | AC-004 | RootRedirect / App tests |
| FR-005 | AC-005 | Link navigation tests |
| FR-006–FR-008 | AC-006–AC-008 | Review + process |

## 15. Open Questions

- **Q-194:** Password visibility toggle surfaces? Owner: product + frontend. Status: **Decided**. Eye toggle on **Login + Register + Change password (Profile)** (all password inputs on those surfaces, including confirm-new).
- **Q-195:** Guest root destination? Owner: product + frontend. Status: **Decided**. Unauthenticated `/` → **`/login`**. Supersedes guest → `/register`. Register remains reachable via UI links. Authenticated `/` → `/projects` unchanged.

Cross-cutting locks (record, not reopened): skip task notes; **H** out of 029 → `031`; exclude **C** / `specs/005-audit/`; do not change `constitution.md`; do not edit `implemented-features.md` until later user confirm; delivery order `028` → `031` → `029` → `030`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-194–Q-195 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T012)
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
