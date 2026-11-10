# Feature Specification: Cover Pointer Cursor

- **ID:** 030-cover-pointer
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** 019-ui-polish (Verified pointer baseline on Button/links); 020-project-covers (Verified Edit cover); 024-project-cover-on-create (Verified Create cover); delivery after Verified `028` → `031` → `029`, then this folder

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product question **Q-196** is **Decided** (section 15). Frontend-only cursor polish on project cover file pickers. Do **not** invent task notes. Within-column rank (**H**) is out of this folder (owned by `031`). Do **not** implement **C** or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms.

This ID is **030-cover-pointer**.

## 1. Problem

Verified 019 applied pointer/hand cursors to product buttons and links, and 023 extended checklist controls. Project **cover upload** file inputs in Create Project and Edit Project dialogs still feel like default text/file controls without a clear pointer cursor, so the upload affordance does not match other interactive product controls.

## 2. Goals

- Apply **`cursor-pointer`** (and file-button pointer as needed) on project cover upload controls in **Create** and **Edit** project dialogs, and any related cover file pickers on those surfaces (Q-196).
- Stay frontend-only: no cover API, storage, MIME, or size changes.

## 3. Non-Goals

- Task notes; within-column rank **H** (owned by `031`); **C**; `specs/005-audit/`.
- Changing `constitution.md`.
- Changing 020/024 cover upload contracts, soft-fail create behavior, allowlist, or 5 MiB limit.
- Redesigning cover preview UI or inventing new cover pickers outside Create/Edit project dialogs.
- Editing `implemented-features.md` in this batch.
- Broad Input-component cursor changes unrelated to cover upload (prefer targeted cover controls unless a shared file-input baseline is clearly scoped to cover pickers only).

## 4. Actors and User Stories

### User Story US-001

As a project writer choosing a cover image, I want the cover file control to show a pointer cursor, so that it feels clickable like other product actions.

## 5. Functional Requirements

- **FR-001:** Create Project Dialog cover file picker MUST present a pointer cursor when enabled/hoverable (Q-196).
- **FR-002:** Edit Project Dialog cover upload file picker MUST present a pointer cursor when enabled/hoverable (Q-196).
- **FR-003:** Any related cover file-picker trigger on those same Create/Edit dialog surfaces MUST also use pointer (Q-196). Disabled/busy states MAY keep non-pointer disabled styling.
- **FR-004:** MUST NOT change cover upload API, Prisma, volumes, or soft-fail create orchestration beyond cursor presentation.
- **FR-005:** Critical pointer presence on Create/Edit cover file controls MUST be covered by frontend tests (class or computed style assert).
- **FR-006:** MUST NOT implement task notes, **H** (out of folder → `031`), **C**, or change `constitution.md`. MUST NOT edit `implemented-features.md` until later user confirm.

## 6. Acceptance Criteria

### Scenario AC-001: Create cover picker pointer

- Given Create Project Dialog open with cover file control enabled
- When the user hovers the cover upload control
- Then the cursor is pointer/hand (`cursor-pointer` and/or `file:cursor-pointer` as implemented)

### Scenario AC-002: Edit cover picker pointer

- Given Edit Project Dialog open with cover upload control enabled
- When the user hovers the cover upload control
- Then the cursor is pointer/hand

### Scenario AC-003: Disabled/busy unchanged safely

- Given cover upload disabled while create/save/upload busy
- When the control is disabled
- Then it does not act as an enabled click target (existing disabled behavior)

### Scenario AC-004: Non-goals / no backend drift

- Given this feature
- When implemented
- Then no Prisma migration and no intentional API contract change
- Then notes / **H** (→ `031`) / **C** / constitution / catalog edits remain out of this folder’s scope

### Scenario AC-005: Approval gate

- Given these artifacts are **Approved** (Q-196 Decided)
- When implementation is requested
- Then work may proceed on the approved task list only

## 7. Business Rules

- Cursor polish is presentation-only — owning domain: frontend.
- Cover mutate authz remains Verified 020 — unchanged.

## 8. Data

No new business data.

## 9. API and Integrations

No new endpoints. No intentional contract changes.

## 10. Security

No new authz. UI cursor is not authorization.

## 11. Non-Functional

Prefer minimal class additions on existing cover file inputs; avoid unrelated Input global churn.

## 12. Dependencies

- Existing features: Verified 019 pointer baseline; 020 Edit cover; 024 Create cover
- Architectural constraints: constitution Article VII; no contract invention
- External dependencies: none new

## 13. Failures and Edge Cases

- Browser native file-button sub-parts may need `file:cursor-pointer` in addition to control `cursor-pointer`.
- VIEWER Edit dialog (if cover mutate hidden) — out of write path; no requirement to invent VIEWER upload.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001 | CreateProjectDialog / ProjectsPage tests |
| FR-002 | AC-002 | EditProjectDialog tests |
| FR-003 | AC-001–AC-002 | Same |
| FR-004–FR-006 | AC-003–AC-005 | Review + process |

## 15. Open Questions

- **Q-196:** Cover pointer scope? Owner: product + frontend. Status: **Decided**. Apply **`cursor-pointer`** on project cover upload controls in **Create** and **Edit** project dialogs (and related cover file pickers on those surfaces).

Cross-cutting locks (record, not reopened): skip task notes; **H** out of 030 → `031`; exclude **C** / `specs/005-audit/`; do not change `constitution.md`; do not edit `implemented-features.md` until later user confirm; delivery order `028` → `031` → `029` → `030`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-196 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T011)
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
