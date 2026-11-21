# Implementation Plan: Auth UX

- **Feature ID:** 029-auth-ux
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Spec **Q-194–Q-195** are **Decided** (locked). Plan/tasks align. Frontend-only. No Prisma/auth API changes. No task notes / **C**. **H** owned by `031` (out of this folder). Delivery after `028` then `031`. Do not change `constitution.md`. Do not edit `implemented-features.md` until later user confirm.

## 1. Summary

1. Add accessible password show/hide (eye) toggles on Login, Register, and Profile change-password fields (Q-194).
2. Change `RootRedirect` so guests at `/` go to `/login` instead of `/register` (Q-195); keep authenticated `/` → `/projects`; keep Register links.

## 2. Current State

Inspected 2026-11-10 (post Verified 027):

- `frontend/src/auth/LoginForm.tsx` / `RegisterForm.tsx` — `type="password"` inputs; no visibility toggle.
- `frontend/src/users/ProfilePage.tsx` — current / new / confirm-new all `type="password"`; no toggles.
- `frontend/src/routes/RootRedirect.tsx` — guest → `/register`; authenticated → `/projects`.
- `frontend/src/layout/GuestLayout.tsx` — links to `/register` and `/login`.
- `frontend/src/App.test.tsx` — asserts guest `/` lands on Register heading.
- `lucide-react` already available for Eye / EyeOff-style icons.
- No backend change required.

## 3. Domain Boundaries

- Owning domain: **frontend presentation** / shell routing.
- Other domains: none touched for contracts.
- Invariants: Verified auth APIs and 027 password-change rules unchanged.
- Controllers/services/repos: **no changes**.

## 4. API Contract

No new endpoints and no intentional contract changes.

| Method / path | Auth | Notes |
| --- | --- | --- |
| Existing auth/users routes | as Verified | Unchanged |

If a contract gap appears, **stop** and amend artifacts.

## 5. Persistence

- Prisma model changes: **none**
- Migration implications: **none**
- Visibility preference: **not** persisted

## 6. Frontend

### Password visibility (Q-194)

- Prefer a small reusable control (e.g. password input + toggle button) used by Login, Register, and Profile to avoid three divergent implementations.
- Toggle switches `type` between `password` and `text`; accessible name updates (Show/Hide password); preserve value; do not use a new icon library.
- Profile: independent state for current, new, and confirm-new.
- Keep autocomplete attributes (`current-password` / `new-password`) intact.

### Guest root (Q-195)

- Update `RootRedirect` guest branch: `Navigate to="/login"`.
- Update App/root tests that expect Register at `/`.
- Confirm GuestLayout / Login↔Register links still reach `/register`.
- Do not change authenticated root → `/projects` or guest guards that already send protected routes to `/login`.

## 7. Files

Expected touch set (inspect may refine):

- `frontend/src/routes/RootRedirect.tsx`
- `frontend/src/auth/LoginForm.tsx` (+ tests)
- `frontend/src/auth/RegisterForm.tsx` (+ tests)
- `frontend/src/users/ProfilePage.tsx` (+ tests)
- Optional shared component under `frontend/src/auth/` or `frontend/src/components/`
- `frontend/src/App.test.tsx` — guest root assertion

## 8. Dependencies and Config

- New packages: **none** (reuse `lucide-react`)
- Env / Docker: **none**

## 9. Security and Failures

- Never log password values; never put passwords in query strings.
- Revealed text is local UX only.
- Route redirects remain non-authoritative.

## 10. Testing

- Login/Register/Profile: toggle reveals/masks and preserves value; a11y name present.
- App/RootRedirect: guest `/` → Login; authenticated `/` → projects; Register link still works.
- No backend suite expected.

## 11. Sequence

1. Inspect + Approved gate.
2. Shared/password toggle + wire Login/Register/Profile.
3. RootRedirect guest → login + tests.
4. Frontend tests, typecheck, AC verify, review, memory.

## 12. Risks

- Divergent toggle UX across three forms — mitigate with shared control.
- Test debt: existing guest-root Register assertions must be updated deliberately (Q-195 supersession).
- Alternatives considered: guest root stay on Register (rejected Q-195); toggle only on Login (rejected Q-194).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | LoginForm toggle | LoginForm tests |
| AC-002 | RegisterForm toggle | RegisterForm tests |
| AC-003 | ProfilePage toggles | ProfilePage tests |
| AC-004 | RootRedirect → /login | App tests |
| AC-005 | Register links | App/GuestLayout tests |
| AC-006 | Auth root → projects | App tests |
| AC-007 | No API/Prisma | Review |
| AC-008 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (documented)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
