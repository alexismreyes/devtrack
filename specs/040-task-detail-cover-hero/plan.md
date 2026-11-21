# Implementation Plan: TaskDetail Cover Hero

- **Feature ID:** 040-task-detail-cover-hero
- **Specification:** `spec.md`
- **Status:** Verified

Inspected 2026-11-11. TaskDetail is rendered inside `TasksPanel` shadcn `Dialog` / `DialogContent` (`max-h-[90vh] … overflow-y-auto`). Cover summary already on `PublicTaskDto.cover`; Kanban uses authenticated `fetchAttachmentContent` + object URL (`KanbanCardCoverImage`, `h-24`). Template: `templates/modal_featured_image.png`. Q-237–Q-242 Decided (`max-h-36` `object-cover`; hero non-interactive).

## 1. Summary

Frontend-only: when TaskDetail’s task has non-null `cover`, render a short full-width hero at the top of the TaskDetail Dialog (flush with dialog top, clipped to dialog top radii). Reuse 017 cover content fetch. Null cover → no hero. No Prisma/API changes.

## 2. Current State

- `TasksPanel.tsx` wraps `<TaskDetail />` in `DialogContent` with default padding and vertical scroll.
- `TaskDetail.tsx` starts with title + Close; cover is applied via `applyCover` / attachments panel but not shown as a top hero.
- Kanban card cover: authenticated blob, `object-cover`, compact height.
- Cover mutate APIs Verified in 017; client helpers already exist.

## 3. Domain Boundaries

- Owning domain: **frontend presentation**.
- Cover invariants remain **`tasks`** (017). No new domain. No repository/API invent.

## 4. API Contract

None new. Reuse:

- Task DTO `cover: { attachmentId, contentType } | null`
- Authenticated attachment content GET used by Kanban cover

## 5. Persistence

None.

## 6. Frontend

- Adjust TaskDetail Dialog shell so hero can be flush-top:
  - Likely `DialogContent` class tweaks: top padding 0 when hero present, `overflow-hidden` on outer + inner scroll region, or move scroll to an inner body under the hero so the image stays pinned/flush while content scrolls (plan preference: outer dialog clips radii; hero first child flush; scrollable body below).
- Extract or mirror `KanbanCardCoverImage` fetch/revoke pattern into a small `TaskDetailCoverHero` (or shared helper) that:
  - Renders only when `cover !== null`
  - Uses Q-241 Decided height (`max-h-36` / ~9rem) + `w-full object-cover`
  - Q-242 Decided: no click handler (non-interactive)
- Wire hero above existing TaskDetail header inside the dialog (either lift hero into `TasksPanel` Dialog children or render at top of `TaskDetail` with DialogContent padding compensation — prefer one clear ownership: **TaskDetail owns hero**; DialogContent padding adjusted via className prop/callback or wrapper).
- On `applyCover(null|summary)`, hero hide/show updates with task state.
- Do not add FEATURED badge or template CTAs.

## 7. Files

- `frontend/src/tasks/TaskDetail.tsx` (+ tests)
- `frontend/src/tasks/TasksPanel.tsx` (DialogContent layout classes as needed)
- Optional `frontend/src/tasks/TaskDetailCoverHero.tsx` (+ tests)
- Possibly share fetch helper with Kanban cover if low-cost (no forced refactor)

## 8. Dependencies and Config

None new.

## 9. Security and Failures

- Authenticated content only; revoke object URLs on unmount/cover change.
- Fetch failure: omit hero (or non-blocking empty) without breaking TaskDetail load.

## 10. Testing

- Cover non-null → hero present with expected test id / role/img alt.
- Cover null → no hero.
- Cover clear/set updates hero.
- Height/class assertions for short band (Q-241 `max-h-36` / `object-cover`).
- Non-interactive hero (Q-242; no click handler).
- No new API client contract tests required unless Dialog layout helpers change types.

## 11. Sequence

1. Approved gate (after 034–039 delivery preference).
2. DialogContent/TaskDetail layout for flush top.
3. Hero component + fetch reuse + tests.
4. Typecheck, AC, review, memory; catalog propose only.

## 12. Risks

- Dialog padding/`overflow-y-auto` fights flush top image — mitigate with inner scroll body.
- Alternatives rejected: second featured-image API (Q-240); empty placeholder when null (Q-239); clickable hero (Q-242).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Hero + short height | TaskDetail tests |
| AC-002 | Null → no hero | TaskDetail tests |
| AC-003 | applyCover updates | TaskDetail tests |
| AC-004 | Auth content fetch | Component/integration test |
| AC-005 | Scope | Review |
| AC-006 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
