# Implementation Plan: Cover Pointer Cursor

- **Feature ID:** 030-cover-pointer
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Spec **Q-196** is **Decided** (locked). Plan/tasks align. Frontend-only. No Prisma/API. No task notes / **C**. **H** owned by `031` (out of this folder). Delivery after `028` → `031` → `029`. Do not change `constitution.md`. Do not edit `implemented-features.md` until later user confirm.

## 1. Summary

Add pointer cursor classes to project cover **file** controls in Create Project Dialog and Edit Project Dialog (Q-196). No API or storage changes.

## 2. Current State

Inspected 2026-11-10 (post Verified 024/027):

- `frontend/src/projects/CreateProjectDialog.tsx` — `Input type="file"` cover picker; no `cursor-pointer` / `file:cursor-pointer`.
- `frontend/src/projects/EditProjectDialog.tsx` — cover `Input type="file"` upload; Clear cover uses `Button` (already pointer via 019).
- Shared `frontend/src/components/ui/input.tsx` — no default pointer on file inputs.
- 019 baseline covers Button/links, not these file inputs.

## 3. Domain Boundaries

- Owning domain: **frontend presentation** only.
- Other domains: none.
- Controllers/services/repos: **no changes**.

## 4. API Contract

No new endpoints and no intentional contract changes. Reuse Verified 020/024 cover flows unchanged.

## 5. Persistence

- Prisma model changes: **none**
- Migration implications: **none**

## 6. Frontend

- On Create and Edit cover `input[type=file]` (and any related cover file-picker trigger on those dialogs), add `cursor-pointer` and `file:cursor-pointer` (or equivalent) so the control and native file button show pointer when enabled.
- Do not globally force all Inputs to pointer unless narrowly justified and still limited to cover pickers’ needs.
- Leave Clear cover Button as-is (already pointer).
- Disabled/busy: keep existing `disabled` behavior.

## 7. Files

Expected touch set (inspect may refine):

- `frontend/src/projects/CreateProjectDialog.tsx`
- `frontend/src/projects/EditProjectDialog.tsx`
- Related tests: `CreateProjectDialog` / `ProjectsPage.test.tsx`, `EditProjectDialog.test.tsx`

## 8. Dependencies and Config

- New packages: **none**
- Env / Docker: **none**

## 9. Security and Failures

- No new authz surface.

## 10. Testing

- Assert pointer/file-pointer classes on Create and Edit cover file inputs when enabled.
- No backend suite expected.

## 11. Sequence

1. Inspect + Approved gate.
2. Apply cursor classes on Create/Edit cover pickers.
3. Frontend tests, typecheck, AC verify, review, memory.

## 12. Risks

- Native file input styling differs by browser — mitigate with both control and `file:` cursor utilities.
- Alternatives considered: global Input pointer for all types (rejected as broader than Q-196).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Create cover Input classes | ProjectsPage / Create tests |
| AC-002 | Edit cover Input classes | EditProjectDialog tests |
| AC-003 | Disabled path unchanged | Existing disabled coverage |
| AC-004 | No API/Prisma | Review |
| AC-005 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (documented)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
