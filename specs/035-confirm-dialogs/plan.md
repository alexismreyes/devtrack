# Implementation Plan: Confirm Dialogs

- **Feature ID:** 035-confirm-dialogs
- **Specification:** `spec.md`
- **Status:** Verified

Inspected 2026-11-11. Frontend-only gating over existing soft-delete and logout APIs. Q-211–Q-213 Decided.

## 1. Summary

Wrap TaskDetail soft-delete and LogoutButton logout behind shadcn Dialog Cancel/Confirm. No `window.confirm`. No API changes.

## 2. Current State

- `TaskDetail.tsx` `onDelete` calls `softDeleteTask` immediately from Delete task button.
- `LogoutButton.tsx` calls `logout` immediately on click.
- Copied shadcn Dialog + `@radix-ui/react-dialog` already used for create/edit/task-detail.
- No AlertDialog primitive required if Dialog Cancel/Confirm buttons suffice.

## 3. Domain Boundaries

- Owning domain: **frontend presentation**.
- Soft-delete remains `tasks`; logout remains `auth` — no backend changes.

## 4. API Contract

None new. Reuse existing soft-delete and logout clients.

## 5. Persistence

None.

## 6. Frontend

- TaskDetail: open confirm Dialog on Delete; Confirm → existing `onDelete`; Cancel → close.
- LogoutButton: open confirm Dialog on Log out; Confirm → existing logout path; Cancel → close.
- Optional small shared `ConfirmDialog` component under `frontend/src/components/` if both flows share structure; otherwise inline two Dialogs matching existing Dialog patterns.
- Copy per Q-213 Decided: titles “Delete task?” / “Log out?”; Confirm “Delete” / “Log out”; Cancel “Cancel”.
- Ensure no `window.confirm` usage for these flows.

## 7. Files

- `frontend/src/tasks/TaskDetail.tsx` (+ tests)
- `frontend/src/auth/LogoutButton.tsx` (+ tests; App/layout coverage as needed)
- Optional `frontend/src/components/ConfirmDialog.tsx`

## 8. Dependencies and Config

None new.

## 9. Security and Failures

- Confirm does not change authz.
- Preserve unauthenticated logout handling and soft-delete conflict/error paths after Confirm.

## 10. Testing

- Delete: Dialog opens; Cancel no fetch; Confirm calls soft-delete.
- Logout: Dialog opens; Cancel no fetch; Confirm calls logout.
- Assert absence of `window.confirm` for these paths where practical.

## 11. Sequence

1. Inspect + Approved gate.
2. Soft-delete confirm.
3. Logout confirm.
4. Tests, typecheck, AC, review, memory.

## 12. Risks

- Nested Dialog (TaskDetail already Dialog) — use nested Dialog carefully or portaled confirm; verify focus trap. Mitigate with Radix nested Dialog patterns already available.
- Alternatives: `window.confirm` (rejected — Q-211/Q-212).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001–AC-002 | TaskDetail confirm | TaskDetail tests |
| AC-003–AC-004 | LogoutButton confirm | Logout / App tests |
| AC-005 | No window.confirm | Review |
| AC-006 | Scope | Review |
| AC-007 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
