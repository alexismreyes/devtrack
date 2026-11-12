# Feature Specification: TaskDetail Cover Hero

- **ID:** 040-task-detail-cover-hero
- **Status:** Verified
- **Created:** 2026-11-11
- **Related features:** Verified `017-task-attachments` (task cover / `PublicTaskDto.cover`); `013`/`014` TaskDetail Dialog; template `templates/modal_featured_image.png`; delivery after Approved batch `034`–`039` (order 034→039→040)

These artifacts are **Verified**. Material locks **Q-237–Q-242** are **Decided** (section 15). Frontend presentation: TaskDetail Dialog top featured/cover image when Verified 017 cover is set. Do **not** invent a second cover system. Do **not** invent notes/**C**. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until later confirm.

## 1. Problem

TaskDetail Dialog has no top featured/cover hero. Kanban cards already show `PublicTaskDto.cover`, but opening the task does not present a modal-top image like `templates/modal_featured_image.png` (full-width top media flush with dialog top corners). Users want that layout with a **shorter** hero than the template example.

## 2. Goals

- When `PublicTaskDto.cover` is set, show a full-width cover hero at the **top** of the TaskDetail Dialog, flush with dialog top edges, top corners matching dialog rounding (Q-237, Q-238).
- Hero height MUST be **shorter** than the template example: fixed band `max-h-36` / ~9rem, full width, `object-cover` (Q-238, Q-241).
- Hero MUST be non-interactive (decorative; no click handler); set/clear remain via existing Attachment/cover UI (Q-242).
- Reuse Verified 017 cover (`coverAttachmentId` / `PublicTaskDto.cover` + authenticated content fetch). When `cover` is null, **no hero** (Q-239).
- Frontend presentation primarily; no second cover persistence/API unless a proven gap requires an Approved amend (Q-240).

## 3. Non-Goals

- New cover storage, Prisma fields, or alternate cover id system.
- Template “FEATURED” badge, marketing CTAs, or template copy/layout below the image.
- Changing Kanban card cover presentation beyond coexistence.
- Changing cover set/clear APIs (017 PUT/DELETE cover).
- Notes; **C**; constitution edit; `implemented-features.md` until later confirm.
- Delivery before 034→039 unless user reorders.

## 4. Actors and User Stories

### User Story US-001

As a task reader, I want the TaskDetail Dialog to show the task cover as a short top hero when set, so the modal matches the featured-image layout and the board card cover.

### User Story US-002

As a task reader, I want no hero when the task has no cover, so empty tasks stay compact.

### User Story US-003

As a task writer, I want cover set/clear via existing Attachment/cover controls to update the hero without a second cover workflow.

## 5. Functional Requirements

- **FR-001:** When TaskDetail opens (or task state updates) with non-null `task.cover`, the Dialog MUST show a full-width hero image at the top of the dialog content, before the existing TaskDetail chrome (title/Close) (Q-237).
- **FR-002:** Hero MUST sit flush with the dialog’s top/left/right edges; top corner radii MUST match the dialog (overflow/clip as needed). Bottom of hero is a clean seam into content (template-like; no inventing overlays/badges) (Q-238).
- **FR-003:** Hero height MUST be shorter than `templates/modal_featured_image.png` (~40% of modal). Exact cap: fixed band `max-h-36` / ~9rem (≈ `h-32`–`h-36`), full width, `object-cover` (Q-241).
- **FR-004:** Image bytes MUST come from the existing authenticated attachment content path for `cover.attachmentId` (same pattern as Kanban card cover). No public unsigned URLs.
- **FR-005:** When `task.cover` is null, MUST render **no** hero band (no subtle empty placeholder) (Q-239).
- **FR-006:** Cover set/clear via existing 017 UI/API MUST update the hero in place (show/hide/replace) without inventing a second cover model (Q-240).
- **FR-007:** Hero MUST be non-interactive decorative media (no click handler to open attachments or cover controls); set/clear remain via existing Attachment/cover UI (Q-242).
- **FR-008:** MUST NOT add Prisma/API cover fields or a parallel “featured image” entity unless Approve amends after a proven gap.
- **FR-009:** Critical hero presence/absence, height/class band, non-interactive behavior, and (as practical) flush layout MUST be covered by frontend tests.
- **FR-010:** MUST NOT implement notes/**C** or change `constitution.md`. MUST NOT edit `implemented-features.md` until later confirm.

## 6. Acceptance Criteria

### Scenario AC-001: Cover set shows short top hero

- Given a task with non-null `cover`
- When TaskDetail Dialog opens
- Then a full-width hero image appears at the top of the dialog
- Then the hero uses `max-h-36` (or equivalent ~9rem band) with `object-cover`
- Then the hero is shorter than the template reference band
- Then top corners follow the dialog rounding
- Then the hero is non-interactive (no click handler)

### Scenario AC-002: Cover null — no hero

- Given a task with `cover: null`
- When TaskDetail Dialog opens
- Then no hero band is rendered
- Then existing TaskDetail content starts as today (title/Close first)

### Scenario AC-003: Cover clear/set updates hero

- Given TaskDetail open with a cover hero
- When cover is cleared via existing controls
- Then the hero disappears
- When a cover is set again
- Then the hero appears/updates without a second cover system

### Scenario AC-004: Auth content fetch

- Given a non-null cover
- When the hero loads
- Then bytes are fetched via the existing authenticated attachment content client (session + authz)

### Scenario AC-005: Non-goals

- Given Approved artifacts
- When implemented
- Then no new cover Prisma/API; no notes/**C**/constitution drift; template badge/CTAs not required

### Scenario AC-006: Approval gate

- Given artifacts are **Approved**
- When implementation is requested
- Then work proceeds on the approved task list only; delivery after 034→039 then 040 unless user reorders

## 7. Business Rules

- Cover identity and authz remain Verified 017 / `tasks` domain.
- Hero is presentation-only — frontend.
- Null cover → no hero (Q-239).

## 8. Data

No new business data. Reuses `PublicTaskDto.cover` summary (`attachmentId`, `contentType`).

## 9. API and Integrations

No new endpoints. Reuse existing cover summary on task DTO + authenticated attachment content GET.

## 10. Security

Hero is not authorization. Content fetch MUST keep session + task/attachment authz. No path/secret leakage.

## 11. Non-Functional

Prefer reusing Kanban cover fetch/revokeObjectURL patterns. Adjust DialogContent padding/overflow only as needed for flush top media.

## 12. Dependencies

- Existing features: Verified 017 cover; TaskDetail Dialog in `TasksPanel`; Approved 034–039 delivery predecessors
- Architectural constraints: constitution Article VII; no contract invention; no second cover system
- External dependencies: none new; visual reference `templates/modal_featured_image.png`

## 13. Failures and Edge Cases

- Content fetch failure → omit hero or keep non-blocking broken-image affordance without blocking TaskDetail (plan picks omit/fallback text sparingly; prefer omit broken band if fetch fails after retries not required).
- Soft-deleted / unauthorized task → existing TaskDetail error paths; no hero.
- Non-image cover types: 017 cover is image-only in practice; if contentType unexpected, omit hero rather than inventing a viewer.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-004, FR-007 | AC-001, AC-004 | TaskDetail / Dialog tests |
| FR-005–FR-006 | AC-002, AC-003 | TaskDetail tests |
| FR-008–FR-010 | AC-005–AC-006 | Review + process |

## 15. Open Questions

- **Q-237:** Show TaskDetail top cover hero when 017 cover set? Owner: product. Status: **Decided**. Yes — full-width top image, dialog top corners.
- **Q-238:** Layout vs template / height? Owner: product. Status: **Decided**. Same flush top-full-width idea as `modal_featured_image.png`, but **shorter** height than the template.
- **Q-239:** Null cover behavior? Owner: product. Status: **Decided**. No hero when `cover` is null (no subtle empty placeholder).
- **Q-240:** Cover system? Owner: product. Status: **Decided**. Reuse Verified 017 only; frontend presentation; no second cover system unless Approved gap amend.
- **Q-241:** Exact max hero height? Owner: product. Status: **Decided** (user Approve lock). Fixed band `max-h-36` / ~9rem (≈ `h-32`–`h-36`), full width, `object-cover`; shorter than template’s ~40% modal height.
- **Q-242:** Click hero opens attachments / cover controls? Owner: product. Status: **Decided** (user Approve lock). Non-interactive decorative hero (no click handler); set/clear remain via existing Attachment/cover UI.

Cross-cutting locks: no notes; no **C**; no constitution edit; no `implemented-features.md` until later confirm; deliver after 034→039 then 040.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-237–Q-242 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
