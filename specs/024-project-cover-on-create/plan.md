# Implementation Plan: Project Cover on Create

- **Feature ID:** 024-project-cover-on-create
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Reuse 020 cover API. **Locked:** Q-180 soft-fail (project remains); Q-179 copy “Project created, but cover upload failed.” No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms.

## 1. Summary

Extend Create Project Dialog + create submit flow: optional file → `POST /api/projects` → on success optional `PUT .../cover`. On PUT failure, keep project, show non-blocking message, refresh lists.

## 2. Current State

Inspected 2026-11-10:

- `CreateProjectDialog.tsx`: name + description only
- `EditProjectDialog` already uploads/clears via 020 client helpers
- Backend `PUT /api/projects/:projectId/cover` OWNER+EDITOR; create inserts OWNER membership
- No composite create+cover endpoint

## 3. Domain Boundaries

- Owning domain: **`projects`** (reuse cover use-case; no new domain)
- Frontend orchestrates create-then-cover
- No tasks/auth changes

## 4. API Contract

No new endpoints. Reuse:

- `POST /api/projects` `{ name, description? }` → public project DTO (include `cover: null` initially)
- `PUT /api/projects/:projectId/cover` multipart (020) → `{ cover }`

Statuses/errors unchanged from Verified create + 020.

## 5. Persistence

None new. Existing `ProjectCover` + volume.

## 6. Frontend

- Add optional file input to `CreateProjectDialog` (mirror Edit affordance labels where practical)
- Parent submit handler (AuthenticatedLayout / projects create flow): create → if file, `putProjectCover`/`uploadProjectCover` with credentials
- Soft fail: catch cover errors; set status message **“Project created, but cover upload failed.”** (Q-179 Decided); still bump list epoch / close dialog
- Disable dismiss while creating/uploading
- Clear selected file on successful close

## 7. Files

- `frontend/src/projects/CreateProjectDialog.tsx` (+ tests)
- Create-submit host (layout/projects page) wiring
- Reuse existing API client cover helpers from 020
- Backend: N/A unless gap discovered (stop and amend)

## 8. Dependencies and Config

- None new

## 9. Security and Failures

- Do not upload before create succeeds
- Do not ignore 020 validation
- Soft failure must not delete the project

## 10. Testing

- Frontend: create with cover success; create without file; create success + mocked cover failure message; creating lock
- Backend: optional smoke only

## 11. Sequence

Inspect → Approve gate → Dialog UI → submit orchestration → tests → review → memory (catalog propose only)

## 12. Risks

- Partial success UX confusion — clear soft-fail copy (Q-179)
- Race dismiss during upload — keep creating lock

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Dialog + PUT after create | Frontend test |
| AC-002 | No file path | Frontend test |
| AC-003 | Soft fail | Frontend test |
| AC-004 | 020 validation reuse | Frontend + review |
| AC-005 | Scope | Review |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
