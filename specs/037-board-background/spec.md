# Feature Specification: Board Background Image

- **ID:** 037-board-background
- **Status:** Verified
- **Created:** 2026-11-11
- **Related features:** Verified `020-project-covers` (pattern); `006`/`007` Kanban board; delivery after `036`

These artifacts are **Verified**. Locks **Q-219–Q-225** Decided. Separate board background image (not project cover); visible behind Kanban columns; OWNER+EDITOR upload/clear; jpeg/png/webp/gif; 5 MiB; Compose volume separate from covers/attachments; Edit Project or board chrome control; fallback when null. No notes/**C**/constitution/`implemented-features.md` until later confirm.

## 1. Problem

Project covers brand the `/projects` cards, but the Kanban board surface itself has no optional background image behind columns. Users want a distinct board backdrop without reusing the cover blob.

## 2. Goals

- Support a **separate** board background image per project (not reusing project cover storage/rows) (Q-219).
- Show it **behind** Kanban columns when set; fallback when null (Q-220, Q-224).
- OWNER+EDITOR upload/replace/clear; membership read for content (Q-221).
- Allowlist jpeg/png/webp/gif; **5 MiB**; magic sniff (Q-222).
- Compose named volume **separate** from `project_covers_data` and `attachments_data` (Q-223).
- Mutate UI via Edit Project and/or board chrome control (Q-224).

## 3. Non-Goals

- Reusing `ProjectCover` rows/blobs as the board background.
- PDF/text attachments; AV scanning; public unsigned URLs.
- Task notes; **C**; constitution edit; catalog until confirm.
- Microservices; generic repository.
- Changing cover API contracts except coexistence.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR, I want to upload a board background image, so the Kanban area has a custom backdrop.

### User Story US-002

As a project member, I want to see the board background when set, so the board looks consistent for the team.

### User Story US-003

As an OWNER or EDITOR, I want to clear the board background, so I can return to the default surface.

## 5. Functional Requirements

- **FR-001:** At most one active board background image per project, owned by **`projects`** domain (not `tasks`, not peer domain) (Q-219).
- **FR-002:** Binary on Compose volume `project_board_backgrounds_data` with env `PROJECT_BOARD_BACKGROUNDS_ROOT` (name may be refined in plan but MUST be distinct from covers/attachments) (Q-223). Path `{root}/{projectId}/...`.
- **FR-003:** Multipart upload/replace/clear under project routes; authenticated content GET with `Cache-Control: private` (Q-221–Q-223).
- **FR-004:** Mutate authz OWNER+EDITOR (`requireProjectWrite`-style). Read/content for actors who can read the project (membership / list visibility). Unauthenticated → 401; non-member → 403; missing → 404.
- **FR-005:** Allowlist `image/jpeg|png|webp|gif`; max **5 MiB**; magic sniff; no AV (Q-222).
- **FR-006:** Clear removes metadata+blob; replace leaves exactly one active background.
- **FR-007:** `PublicProjectDto` exposes board background summary `| null` (opaque id + content type), separate from `cover`.
- **FR-008:** Kanban board UI renders background behind columns when set; when null, existing board surface fallback (no invented third branding system) (Q-220, Q-224).
- **FR-009:** Mutate UI: Edit Project Dialog control and/or board chrome control (Q-224). **Rec locked in plan:** Edit Project primary; optional board chrome if low-cost.
- **FR-010:** Additive Prisma migration only; no unauthorized reset/volume delete.
- **FR-011:** Domain invariants/API/UI critical paths tested.
- **FR-012:** MUST NOT implement notes/**C** or change `constitution.md`. MUST NOT edit `implemented-features.md` until later confirm.

## 6. Acceptance Criteria

### Scenario AC-001: Upload and display behind columns

- Given OWNER/EDITOR on an active project
- When they upload a valid board background
- Then DTO summary is non-null and the Kanban area shows the image behind columns

### Scenario AC-002: Clear and fallback

- Given a project with board background set
- When clear succeeds
- Then summary is null and the board uses the null fallback surface

### Scenario AC-003: Authz

- Given VIEWER or stranger
- When mutate is attempted
- Then mutate is denied (403/401 as applicable)
- Given a member
- When content GET is authorized
- Then bytes stream with private cache

### Scenario AC-004: Validation

- Given disallowed type or >5 MiB
- When upload is attempted
- Then request is rejected with validation/domain error envelope

### Scenario AC-005: Separate from cover

- Given cover and board background both set or independently cleared
- When inspected
- Then they use distinct storage volume/metadata; clearing one does not clear the other

### Scenario AC-006: Non-goals

- Given Approved artifacts
- When implemented
- Then no notes/**C**/constitution drift; cover contracts preserved

### Scenario AC-007: Approval gate

- Given artifacts are **Approved**
- When implementation is requested
- Then work proceeds on the approved task list only

## 7. Business Rules

- Board background is a project resource — owning domain: `projects`.
- Archived-parent mutate behavior matches project write rules (same as covers).

## 8. Data

- New 1:1 board background metadata concept per project (summary on public DTO).
- Lifecycle: replace/clear hard-delete prior blob; no GC beyond that.

## 9. API and Integrations

- `PUT`/`DELETE` `/api/projects/:projectId/board-background` (exact path in plan)
- `GET` `/api/projects/:projectId/board-background/content`
- Additive `PublicProjectDto.boardBackground` summary `| null`

## 10. Security

Session + resource authz; private content; no path/secret leakage in JSON.

## 11. Non-Functional

Mirror 020 educational storage pattern for clarity.

## 12. Dependencies

- Verified 020 covers pattern; Kanban board layout; Compose Article VI (extra named volume allowed)

## 13. Failures and Edge Cases

- Content fetch failure → keep fallback; show non-blocking error if needed.
- Concurrent replace — last write wins; exactly one active row.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-007, FR-010 | AC-001–AC-005 | API + migration |
| FR-008–FR-009 | AC-001–AC-002 | FE board/Edit tests |
| FR-011–FR-012 | AC-006–AC-007 | Review |

## 15. Open Questions

- **Q-219:** Separate board background (not cover reuse)? Status: **Decided**. Yes.
- **Q-220:** Visible behind Kanban columns? Status: **Decided**. Yes.
- **Q-221:** OWNER+EDITOR upload/clear? Status: **Decided**. Yes.
- **Q-222:** jpeg/png/webp/gif; 5 MiB? Status: **Decided**. Yes.
- **Q-223:** Separate Compose volume? Status: **Decided**. Yes.
- **Q-224:** Edit Project or board chrome; fallback when null? Status: **Decided**. Yes. **Rec for placement:** Edit Project Dialog primary (mirror cover); board chrome optional.
- **Q-225:** Exact route segment `board-background` vs `boardBackground`? Status: **Decided**. Kebab path `board-background` (mirror `cover`).

Cross-cutting: no notes; no **C**; no constitution; no catalog until confirm; after 036.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-219–Q-225 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
