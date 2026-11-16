# Feature Specification: Status Drag Reorder

- **ID:** 028-status-drag-reorder
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** 018-custom-task-statuses (Verified catalog + reorder API); 006-kanban (Verified `@dnd-kit/core` status-only card moves); 019-ui-polish (Verified drag/click); Approved `031-within-column-rank` (owns proposed **H**); delivery before 031 then 029/030

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product questions **Q-190–Q-193** are **Decided** (section 15). Frontend-focused catalog **column** reorder UX. Reuse existing status reorder API. Do **not** invent task notes. Within-column task rank (**H**) is **out of this folder** and owned by Approved `031-within-column-rank` — not forbidden globally. Do **not** implement **C** or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms.

This ID is **028-status-drag-reorder**.

## 1. Problem

Verified `018` lets OWNER/EDITOR reorder the per-project status catalog via `Move up` / `Move down` in the Statuses Dialog, calling the existing reorder API. Catalog column order already follows persisted `ProjectStatus.position`, but users cannot drag columns on the board. Kanban already uses `@dnd-kit/core` for **task** cross-column status moves. This feature adds **Kanban column** drag-reorder (primary) while leaving task-card status PATCH drag unchanged. Within-column task rank (**H**) remains a no-op same-column drop in **this** feature and is specified separately in `031`. Statuses Dialog may keep existing Move up/down as a secondary path.

## 2. Goals

- Let OWNER/EDITOR **drag-reorder Kanban columns** on the project board (Q-190).
- Persist order through the **existing** reorder API (`reorderStatuses` / full `statusIds` list); no new endpoint.
- Add `@dnd-kit/sortable` for **Kanban columns only** in this feature (Q-191). MUST NOT add sortable to task cards here; that belongs to `031`.
- Show open-hand hover (`cursor-grab`) and grabbing while dragging (`cursor-grabbing`) on **column chrome** (headers/handles) without conflicting with task-card drag cursors (Q-192).
- Keep Statuses Dialog **Move up / Move down** as a secondary reorder path; Kanban columns are the primary drag surface (Q-193).
- Leave task within-column rank (**H**), task notes, and audit (**C**) out of **this** folder (`031` owns **H**).

## 3. Non-Goals

- Within-column **task** rank / `position` / `@dnd-kit/sortable` on task cards (**H**) — **out of 028**; owned by `specs/031-within-column-rank/` (Q-191 amended).
- Replacing or removing Statuses Dialog Move up/down (Q-193: keep as secondary).
- Requiring Statuses Dialog drag-reorder (optional later; not in this scope).
- Changing existing task-card cross-column drag / status PATCH semantics (006/019). Same-column drop remains a **no-op** until `031`.
- Task notes; app-wide audit (**C**); `specs/005-audit/`.
- Changing `constitution.md`.
- New reorder HTTP contract, Prisma schema, or migration.
- Adding a second DnD library beyond the documented `@dnd-kit` packages.
- Editing `implemented-features.md` in this batch.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR, I want to drag Kanban columns to set catalog order, so that board column order matches my workflow without only using Statuses Dialog Move up/down.

### User Story US-002

As a VIEWER (or any non-writer), I want Kanban columns to remain non-reorderable by drag, so that drag reorder is not offered when I cannot write.

### User Story US-003

As a developer, I want column reorder to call the existing reorder API and leave task-card DnD (status PATCH) unchanged in this folder, so that **H** is deferred to `031` and column/card drags do not fight.

## 5. Functional Requirements

- **FR-001:** When `canWrite` is true on the project board, the user MUST be able to drag-reorder **Kanban columns** (Q-190). Dropping a new column order MUST call the existing reorder API with the full ordered `statusIds` list and refresh catalog consumers so columns follow persisted `ProjectStatus.position`.
- **FR-002:** Existing **task-card** drag between columns MUST remain unchanged in this feature: cross-column drop continues to PATCH task `status`; same-column drop remains a no-op; no task `position`/`rank` in **028** (owned by `031`).
- **FR-003:** Implementation MUST add `@dnd-kit/sortable` (and required `@dnd-kit` peers such as `@dnd-kit/utilities`) for **Kanban columns only** (Q-191). MUST NOT add sortable behavior to Kanban task cards in this feature. Task-card sortable is owned by `031`.
- **FR-004:** Column drag affordances MUST use `cursor-grab` on hover when idle/draggable and `cursor-grabbing` while actively dragging on **column chrome** (headers and/or dedicated handles) (Q-192). Task-card pointer/cursor behavior from 019 MUST NOT be broken by column chrome cursors.
- **FR-005:** Column drag vs task-card drag MUST be disambiguated (dedicated column handles and/or activation constraints / drag data types) so starting a drag on a card does not reorder columns and starting a column drag does not move a task.
- **FR-006:** Statuses Dialog MUST keep existing Move up / Move down reorder controls as a secondary path (Q-193). Dialog drag-reorder is **not** required in this feature.
- **FR-007:** VIEWER / non-write sessions MUST NOT be able to drag-reorder columns. Authz remains backend `requireTaskWrite`; UI hiding is non-authoritative.
- **FR-008:** Failed reorder (network/4xx/409) MUST leave a consistent column order: revert optimistic UI or reload from server; surface existing user-facing error patterns.
- **FR-009:** Critical column drag-reorder success path and write-gate MUST be covered by frontend tests (Testing Library). No backend suite required unless accidental API touch (not expected).
- **FR-010:** MUST NOT implement task notes, **H** (in this folder), **C**, or change `constitution.md`. MUST NOT edit `implemented-features.md` until later user confirm. MUST NOT change task status PATCH semantics. MUST leave a clear handoff to `031` for within-column rank.

## 6. Acceptance Criteria

### Scenario AC-001: Column drag reorder persists catalog order

- Given an OWNER/EDITOR board with at least two status columns
- When the user drags a Kanban column to a new position and the drop completes
- Then the existing reorder API is called with the full new `statusIds` order
- Then board columns reflect the persisted catalog order (`ProjectStatus.position`)

### Scenario AC-002: Task-card status drag unchanged (028)

- Given a project board with task cards
- When the user drags a task card to another column
- Then behavior remains status PATCH (cross-column) / no-op (same-column) as Verified 006/019
- Then no task-card sortable / within-column rank is introduced **in 028** (`031` owns **H**)

### Scenario AC-003: Column vs card DnD conflict

- Given a writable board with column drag and task-card drag both present
- When the user starts a drag from column chrome (header/handle)
- Then columns reorder (sortable), not a task move
- When the user starts a drag from a task card
- Then task status DnD runs as today, not column reorder

### Scenario AC-004: Grab / grabbing on column chrome

- Given a writable board
- When the pointer hovers a draggable column header/handle
- Then the cursor is grab (`cursor-grab`)
- When actively dragging a column
- Then the cursor is grabbing (`cursor-grabbing`)

### Scenario AC-005: Non-writer cannot reorder columns

- Given a VIEWER (or `canWrite=false`) board
- When columns are shown
- Then column drag reorder is not available

### Scenario AC-006: Dialog Move up/down kept

- Given a writable Statuses Dialog after this feature
- When the status list renders
- Then Move up / Move down reorder controls remain available as a secondary path (Q-193)
- Then Dialog drag-reorder is not required by this feature

### Scenario AC-007: Non-goals / no backend drift

- Given this feature
- When implemented
- Then no Prisma migration and no intentional API contract change
- Then task notes, **H** (in this folder), **C**, and constitution edits remain out of scope
- Then task-card status PATCH semantics are unchanged; same-column remains no-op until `031`

### Scenario AC-008: Approval gate

- Given these artifacts are **Approved** (Q-190–Q-193 Decided)
- When implementation is requested
- Then work may proceed on the approved task list only

## 7. Business Rules

- Catalog order remains `ProjectStatus.position` via existing reorder use-case — owning domain: `tasks` (unchanged contracts).
- Column drag UX is presentation-only — owning domain: frontend.
- Task within-column order remains non-persisted in **028**; persistence and same-column DnD are owned by `031` (**H**).
- Task cross-column moves remain status-key PATCH only in this feature.

## 8. Data

No new business data. Reuses existing catalog `position` via reorder API.

## 9. API and Integrations

No new endpoints. Reuse existing project statuses reorder (Verified 018): full-list `statusIds` with session cookie + task write authz.

## 10. Security

No new authz. Frontend column drag MUST NOT bypass backend write checks. Existing session cookie behavior unchanged.

## 11. Non-Functional

Prefer keyboard-accessible sortable behavior provided by `@dnd-kit/sortable` for columns where practical. Do not regress Statuses Dialog create/edit/delete or Kanban task open-on-click / activation-distance polish (019).

## 12. Dependencies

- Existing features: Verified 018 Statuses Dialog + reorder API; 006 `@dnd-kit/core` Kanban; 019 card DnD polish
- Follow-on: Approved `031-within-column-rank` (proposed **H**)
- Architectural constraints: constitution Articles VII/IX; no contract invention; no generic repository
- External dependencies: add `@dnd-kit/sortable` (+ `@dnd-kit/utilities` as required peer) — documented decision

## 13. Failures and Edge Cases

- Reorder while another catalog mutation is in flight: keep existing busy/disabled patterns.
- Single-column board: drag affordance may be inert; no API call needed if order unchanged.
- Optimistic column reorder failure: restore previous order or reload catalog; show error/conflict message as today.
- Nested interactive controls on column headers (Add task, etc.): use handle and/or activation constraints so clicks still work.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001 | Kanban column tests + reorder client call |
| FR-002 | AC-002, AC-007 | Card DnD regression / review |
| FR-003 | AC-002, AC-007 | package.json + no task sortable in 028 |
| FR-004 | AC-004 | Cursor class asserts on column chrome |
| FR-005 | AC-003 | Conflict / activation tests or review |
| FR-006 | AC-006 | StatusesDialog still has Move up/down |
| FR-007 | AC-005 | canWrite=false tests |
| FR-008 | AC-001 (failure path) | Error/revert tests as practical |
| FR-009–FR-010 | AC-007–AC-008 | Tests + review + process |

## 15. Open Questions

- **Q-190:** Where may status catalog drag reorder appear? Owner: product + frontend. Status: **Decided** (amended). **Kanban column reorder on the board is in scope and required.** Supersedes prior “Statuses Dialog only.”
- **Q-191:** DnD library for catalog reorder? Owner: frontend. Status: **Decided** (amended). Add **`@dnd-kit/sortable`** (with existing `@dnd-kit/core`) for **Kanban columns only in 028**. Task-card sortable / within-column rank **H** is **out of 028** and owned by `031-within-column-rank` (not a global forever-ban).
- **Q-192:** Drag cursors? Owner: frontend. Status: **Decided**. Open-hand hover **`cursor-grab`**; while dragging **`cursor-grabbing`** on **column chrome** (headers/handles). Must not conflict with task-card drag cursors.
- **Q-193:** Statuses Dialog Move up/down vs dialog drag? Owner: product + frontend. Status: **Decided** (amended). **Kanban columns are the primary reorder surface.** Dialog **may keep existing Move up/down** as secondary. Dialog drag-reorder is **not** required. Prior “replace Move up/down with dialog drag” is superseded.

Cross-cutting locks (record, not reopened): skip task notes; **H** out of 028 → `031`; exclude **C** / `specs/005-audit/`; do not change `constitution.md`; do not edit `implemented-features.md` until later user confirm; task-card cross-column status PATCH unchanged in 028; same-column remains no-op until `031`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-190–Q-193 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T014)
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
