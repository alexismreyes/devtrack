# Implementation Plan: Password Change

- **Feature ID:** 027-password-change
- **Specification:** `spec.md`
- **Status:** Approved

Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Implementation may proceed. Authenticated current+new password change in `auth`. Argon2id. No SMTP. **Locked:** Q-187 revoke other sessions / keep current; Q-188 min 8, ≠ current, FE confirm only; Q-189 `POST /api/auth/password` → `204`. No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms.

## 1. Summary

Add `POST /api/auth/password` use-case: verify current hash, validate new password (min 8, ≠ current), Argon2id rehash via existing repository, revoke other sessions, keep current session (Q-187–Q-189 Decided). Profile UI form with FE-only confirm.

## 2. Current State

Inspected 2026-11-10:

- `auth` register/login/logout; Argon2id `hashPassword`/`verifyPassword`
- `AuthRepository.savePasswordHash` / session `revokeSession` (per id); no revoke-others helper yet
- Concurrent sessions allowed; logout revokes current only
- `ProfilePage` updates display name via `PATCH /api/users/me` only

## 3. Domain Boundaries

- Owning domain: **`auth`**
- Users domain: profile UI only (no password hash in users)
- Cross-domain: none for hash storage
- Controller → service → domain hasher + auth repository; routes + Zod validators

## 4. API Contract

### `POST /api/auth/password` (Q-189 Decided)

- Auth: valid `devtrack_session` required → else `401` `UNAUTHENTICATED`
- Body: `{ currentPassword: string, newPassword: string }`
- Success: `204` empty body
- Validation `400` `VALIDATION_ERROR`: missing fields; new length < 8; new equals current; empty after trim policy as coded
- Wrong current: `401` or `403` with stable code — **recommend** `400`/`401` with `INVALID_CREDENTIALS` or dedicated `PASSWORD_CHANGE_FAILED` that does not update hash (lock in implementation to one code; prefer `400` + `INVALID_CREDENTIALS` to avoid implying session death). Exact code: **`400` `INVALID_CREDENTIALS`** with generic message (session remains).
- Never return hash/password

## 5. Persistence

- No migration expected (reuse credential + session tables)
- Add repository method `revokeSessionsForUserExcept(userId, sessionId)` (or equivalent) if missing
- Update password hash then revoke others in a clear service sequence (prefer transaction if both are DB writes)

## 6. Frontend

- Profile page section: current password, new password, confirm new (FE-only match; Q-188)
- Call API with credentials; success/error status; clear fields on success
- Do not log secrets

## 7. Files

- `backend/src/modules/auth/...` service, controller, routes, validators, repository, domain tests, SuperTest
- `frontend` ProfilePage (+ tests), api client/types

## 8. Dependencies and Config

- None new (existing Argon2)

## 9. Security and Failures

- Article VIII hashing; no hash leakage
- Revoke-others (Q-187 Decided) reduces session fixation after compromise
- Do not email passwords

## 10. Testing

- Domain/service: happy path; wrong current; validation; revoke-others keeps current
- SuperTest: 204/400/401; response has no secrets
- Frontend: form validation + success path mocked

## 11. Sequence

Inspect auth repo sessions → Approve → repo revoke-others → service → HTTP → profile UI → tests → review → memory (catalog propose only)

## 12. Risks

- Choosing 401 for wrong current may confuse with session expiry — mitigated by recommended `400 INVALID_CREDENTIALS`
- Missing revoke-all API — add narrow repo method

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | changePassword use-case | Service/API |
| AC-002 | verify failure | Service/API |
| AC-003 | Zod + domain rules | API tests |
| AC-004 | session middleware | API tests |
| AC-005 | revoke others | Service/API |
| AC-006 | Profile UI | Frontend tests |
| AC-007 | Scope | Review |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
