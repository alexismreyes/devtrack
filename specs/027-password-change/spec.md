# Feature Specification: Password Change

- **ID:** 027-password-change
- **Status:** Approved
- **Created:** 2026-11-10
- **Related features:** 002-authentication (Verified Argon2id + sessions); users profile (`/profile`); delivery after 023–026 in backlog order

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Implementation may proceed. §15 questions are **Decided** (locked). Authenticated **change password** with **current + new** (proposed **U**). **No** email reset / SMTP. Follow `auth` domain patterns; Argon2id; revoke other sessions / keep current (Q-187); new password min 8, ≠ current, FE confirm only (Q-188); `POST /api/auth/password` → `204` (Q-189). Do **not** invent task notes. Do **not** implement **H**, **C**, or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms.

This ID is **027-password-change**.

## 1. Problem

Verified auth supports register/login/logout and profile display-name update, but an authenticated user cannot change their password without inventing email reset. Users need a current+new password change on an authenticated path.

## 2. Goals

- Let an authenticated user change password by submitting **current password** and **new password**.
- Verify current with Argon2id verify; store new hash with Argon2id (same as register).
- Own under existing **`auth`** domain patterns (credentials/sessions); profile UI entry on `/profile` (or adjacent authenticated chrome) without SMTP.
- Session policy on success: revoke all other sessions; keep current (Q-187 Decided).
- Leave email reset, lockout, and full complexity policy beyond Decided minimums out unless Approve extends.

## 3. Non-Goals

- Email password reset, SMTP, magic links, or out-of-band recovery.
- Task notes; **H**; **C**; `specs/005-audit/`.
- Changing `constitution.md`.
- OAuth/social login; MFA.
- Changing register/login cookie name or absolute 7-day expiry model beyond session-revoke policy for this flow.
- Rate limiting / lockout (Q-017 still deferred) unless Approve adds it here.
- Editing `implemented-features.md` in this batch.

## 4. Actors and User Stories

### User Story US-001

As an authenticated user, I want to change my password by proving the current one and setting a new one, so that I can rotate credentials without email reset.

### User Story US-002

As a security-conscious user, I want other sessions handled per Decided policy after change, so that stolen sessions are limited.

### User Story US-003

As a developer, I want the flow in `auth` with Argon2id and no password hashes in responses, so that Article VIII holds.

## 5. Functional Requirements

- **FR-001:** Authenticated callers MUST be able to change password via `POST /api/auth/password` accepting `{ currentPassword, newPassword }` → `204` (Q-189). Unauthenticated → `401`.
- **FR-002:** Current password MUST be verified against stored Argon2id hash. Wrong current → safe authz/validation failure (do not reveal whether hash missing beyond existing patterns; prefer generic failure code distinct from unauthenticated).
- **FR-003:** New password MUST be hashed with Argon2id and replace the stored credential hash. Responses MUST NOT include plaintext passwords or password hashes.
- **FR-004:** New password MUST meet Decided policy (Q-188): non-empty after trim; **minimum length 8**; MUST differ from current password. Confirm-new is **FE-only** (not a server field). Invalid → `400` `VALIDATION_ERROR`.
- **FR-005:** On success MUST **revoke all other sessions** and **keep the current session** valid (Q-187). Logout behavior otherwise unchanged.
- **FR-006:** `/profile` (or clearly linked profile section) MUST expose the change-password form (current + new + FE confirm-new). Loading/success/error states required. `credentials: 'include'`.
- **FR-007:** Runtime Zod validation at HTTP boundary. Error envelope `{ error: { code, message } }`. Controllers do not query DB; services use auth repository contracts.
- **FR-008:** Domain/service/API + critical UI MUST be tested. No Prisma schema change expected if `AuthPasswordCredential` already stores the hash (Verified 002).
- **FR-009:** MUST NOT implement SMTP/email reset, task notes, **H**, **C**, or change `constitution.md`.

## 6. Acceptance Criteria

### Scenario AC-001: Successful change

- Given an authenticated user with known password
- When they submit correct current + valid new password
- Then hash is updated; subsequent login works with new password; old password fails login

### Scenario AC-002: Wrong current password

- Given an authenticated session
- When current password is wrong
- Then change fails without updating hash; appropriate error (not 401 unless session invalid)

### Scenario AC-003: Validation

- Given authenticated session
- When new password is too short, empty, or equals current
- Then `400` `VALIDATION_ERROR` and hash unchanged

### Scenario AC-004: Unauthenticated

- Given no valid session
- When change password is called
- Then `401`

### Scenario AC-005: Session policy

- Given authenticated user with at least one other active session
- When password change succeeds
- Then other sessions are revoked; current session remains usable (Q-187)

### Scenario AC-006: UI on profile

- Given `/profile`
- When user submits the change-password form successfully
- Then success feedback is shown and no hash/secret appears in the DOM/network JSON body

### Scenario AC-007: Non-goals

- Given this feature
- When implemented
- Then no SMTP/email reset; no constitution/**H**/**C**/task notes

## 7. Business Rules

- Password hashes Argon2id only — owning domain: `auth`.
- Authenticated change requires current password proof — `auth`.
- Session revoke policy per Decided Q — `auth`.

## 8. Data

Reuse existing password credential + session persistence. No email tokens. No new user profile password fields beyond credential table.

## 9. API and Integrations

- Additive auth route (Q-189 Decided): `POST /api/auth/password` with `{ currentPassword, newPassword }` → `204 No Content`.
- No mailer integration.

## 10. Security

- AuthN via session; AuthZ: only self credential.
- Constant-ish failure messaging for wrong current (avoid user enumeration beyond session identity already known).
- No hashes/stack traces in responses.
- HTTPS assumed at deployment; not configured here.

## 11. Non-Functional

Educational clarity over elaborate recovery flows.

## 12. Dependencies

- Existing: 002 auth Verified; profile page
- Constraints: constitution VIII; auth domain boundaries
- External: existing Argon2 dependency

## 13. Failures and Edge Cases

- Missing credential row for user → safe failure (should not happen for normal registered users).
- Concurrent change from two sessions — last write wins; revoke-others still applies after each success.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–003  | AC-001–AC-002, AC-004 | Service/API tests |
| FR-004      | AC-003              | Validator/API tests |
| FR-005      | AC-005              | Service/API tests |
| FR-006      | AC-006              | Frontend tests |
| FR-007–009  | AC-007              | Review + tests |

## 15. Open Questions

- **Q-187:** Session policy after successful password change. Owner: auth + product. Status: **Decided (locked)** — revoke **all other** sessions for the user; **keep** the current session active (re-login not required).
- **Q-188:** New password minimum length / complexity. Owner: product + auth. Status: **Decided (locked)** — minimum **8** characters after trim; must be non-empty; must differ from current; no further complexity classes (Q-015 still deferred beyond this minimum). Confirm field on FE only.
- **Q-189:** HTTP path/method. Owner: auth. Status: **Decided (locked)** — `POST /api/auth/password` body `{ currentPassword, newPassword }` → `204 No Content`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-187–Q-189 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
