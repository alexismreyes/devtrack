# Feature Specification: Project Cover on Create

- **ID:** 024-project-cover-on-create
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** 020-project-covers (Verified cover API/storage/Edit Dialog); 003/007/009 create-project path (OWNER); delivery after Verified 023

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. §15 questions are **Decided** (locked). Soft-fail cover on create. Reuse Verified **020** cover API/storage. Do **not** invent task notes. Do **not** implement **H**, **C**, or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms.

This ID is **024-project-cover-on-create**.

## 1. Problem

Verified `020-project-covers` allows upload/replace/clear only from **Edit Project** Dialog. Create Project Dialog accepts name/description only, so owners must create then edit to attach a cover.

## 2. Goals

- Allow **optional** cover image selection/upload in **Create Project** Dialog (not Edit-only).
- Reuse existing 020 `PUT /api/projects/:projectId/cover` (+ validation/storage/authz) after successful project create.
- Soft-fail cover upload: if cover upload fails **after** project create succeeds, the **project remains** without a cover (Q-9 recommendation locked).
- Stay on OWNER create path (project create already creates OWNER membership).

## 3. Non-Goals

- Task notes; **H**; **C**; `specs/005-audit/`.
- Changing `constitution.md`.
- New cover storage volume, MIME rules, or size limits (reuse 020 Q-159–Q-161).
- Multipart create-project that embeds cover in `POST /api/projects` (prefer create-then-PUT).
- Allowing non-creators to create projects.
- Feed window (025), dashboard overview (026), password change (027), 023 eyecandy beyond consuming existing UI primitives.
- Editing `implemented-features.md` in this batch.

## 4. Actors and User Stories

### User Story US-001

As a project OWNER creating a project, I want an optional cover upload in Create Project Dialog, so that I do not need a separate edit step.

### User Story US-002

As a creator, I want the project to remain if cover upload fails after create, so that a storage/validation glitch does not undo project creation.

### User Story US-003

As a developer, I want to reuse 020 cover contracts, so that create-path covers stay consistent with Edit.

## 5. Functional Requirements

- **FR-001:** Create Project Dialog MUST offer an **optional** cover image control (same allowlist/size expectations as 020: jpeg/png/webp/gif, **5 MiB**, magic sniff enforced by existing PUT).
- **FR-002:** Successful create MUST continue to use existing `POST /api/projects` (name/description). When a cover file is chosen, client MUST then call existing **020** `PUT /api/projects/:projectId/cover` with `credentials: 'include'` for the new project id (OWNER create path).
- **FR-003:** If `POST` create succeeds and subsequent cover `PUT` fails, the project MUST **remain** created with `cover: null` (soft failure). UI MUST surface non-blocking copy **“Project created, but cover upload failed.”** (Q-179) and still close/refresh as a successful create.
- **FR-004:** If create fails, MUST NOT attempt cover upload. If no file chosen, MUST NOT call cover PUT.
- **FR-005:** Cover mutate authz remains 020 (OWNER+EDITOR). Create path is OWNER of the new project — sufficient for PUT. MUST NOT widen VIEWER mutate rights.
- **FR-006:** MUST NOT change 020 storage root, Prisma `ProjectCover` model, or clear/replace semantics beyond reuse. No new domain.
- **FR-007:** Critical create+optional-cover and soft-failure UX MUST be tested (Testing Library). Backend SuperTest changes only if a real contract gap appears (not expected).
- **FR-008:** MUST NOT implement task notes, **H**, **C**, or change `constitution.md`.

## 6. Acceptance Criteria

### Scenario AC-001: Optional cover on create success

- Given Create Project Dialog with name and an allowlisted image selected
- When the user submits
- Then the project is created and cover PUT succeeds
- Then `/projects` card shows the uploaded cover (authenticated content)

### Scenario AC-002: Create without cover

- Given Create Project Dialog with name and no file
- When submitted
- Then project is created with null cover and name-derived fallback (020 Q-158)

### Scenario AC-003: Soft failure after create

- Given create succeeds and cover PUT fails (validation/network/4xx/5xx)
- When the flow completes
- Then the project still exists without cover
- Then the user sees a non-blocking cover-failure message and create is otherwise treated as success

### Scenario AC-004: Reuse 020 rules

- Given a disallowed or oversized file on create path
- When cover PUT runs after create
- Then 020 validation applies; project remains; soft failure UX applies

### Scenario AC-005: Non-goals

- Given this feature
- When implemented
- Then no multipart create-project API, no new volume, no constitution/**H**/**C**/task notes

## 7. Business Rules

- Project create success is independent of cover success — owning domains: `projects` (create + cover PUT reuse).
- At most one cover per project — 020 unchanged.

## 8. Data

No new entities. Reuse `ProjectCover` + Compose `project_covers_data`.

## 9. API and Integrations

- Reuse: `POST /api/projects`; `PUT /api/projects/:projectId/cover` (020).
- No new endpoints expected.

## 10. Security

- Session + OWNER on new project for cover PUT.
- Same sniff/size allowlist; no public unsigned URLs.
- Do not leak filesystem paths.

## 11. Non-Functional

Prefer sequential create-then-PUT for educational clarity over a new composite API.

## 12. Dependencies

- Existing features: 020 Verified; create Dialog from 007/009
- Architectural constraints: `projects` owns covers; constitution Articles III/VI/VIII
- External dependencies: none new

## 13. Failures and Edge Cases

- Cover PUT 401 mid-flow → soft fail; project remains (session may be gone — show message; parent auth handling may redirect).
- User cancels Dialog while upload in flight — plan: disable dismiss while creating/uploading (match existing creating lock).

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–002  | AC-001, AC-002      | Frontend tests |
| FR-003–004  | AC-003, AC-004      | Frontend tests |
| FR-005–006  | AC-004, AC-005      | Review + reuse 020 |
| FR-007–008  | AC-005              | Tests + review |

## 15. Open Questions

- **Q-179:** Soft-failure user copy. Owner: product + frontend. Status: **Decided (locked)** — after create, show inline/status: “Project created, but cover upload failed.” Keep Dialog close + list refresh behavior of successful create.
- **Q-180:** Create+cover transactionality. Owner: product. Status: **Decided (locked)** — soft failure; project remains without cover (Q9).

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-179, Q-180 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T011)
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes; Q-179/Q-180 locked; non-blocking notes in `tasks.md`
