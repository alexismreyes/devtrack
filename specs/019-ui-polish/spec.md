# Feature Specification: UI Polish

- **ID:** 019-ui-polish
- **Status:** Verified
- **Created:** 2026-11-09
- **Related features:** 001-foundation through 018-custom-task-statuses (Verified); next in delivery order before 020–022

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product questions **Q-151–Q-154** are **Decided** (section 15). Do **not** invent task notes. Do **not** implement within-column rank (**H**), app-wide audit (**C**), or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** invent project cover uploads (020) or feed pagination (021) or dashboard charts (022) here.

This ID is **019-ui-polish**. Frontend-focused polish only.

## 1. Problem

Verified DevTrack (through `018-custom-task-statuses`) has a mature authenticated shell, Kanban, and TaskDetail. Three small UX gaps remain before larger storage/pagination/chart work:

1. Interactive **buttons and links** do not consistently show a hand/pointer cursor (copied shadcn `Button` variants omit `cursor-pointer`; some links inherit default text cursor).
2. Kanban **task detail** opens only from the **title** control inside the card face, while priority, due date, labels, and cover are not part of that hit target — users expect the **entire card** to open detail.
3. The top app bar has **Dashboard** → `/dashboard` but no peer **Projects** → `/projects` text nav (only the DevTrack brand links to `/projects`).

## 2. Goals

- Apply a consistent **pointer/hand cursor** on product **buttons** and **links** (Q-151).
- Make the **entire Kanban task card** the primary control that opens TaskDetail for authorized viewers, not title-only (Q-152), without breaking status-only drag-and-drop.
- Add a top-app-bar nav link **Projects** → `/projects` alongside **Dashboard** (Q-153). Keep the DevTrack brand link to `/projects`.
- Stay frontend-only: no Prisma/schema/API contract changes; no new domains; no task notes; no cover uploads; no pagination; no charts.

## 3. Non-Goals

- Task notes field (non-goal across 019–022).
- Project cover image upload (`020-project-covers`).
- Comments/activity pagination (`021-feed-pagination`).
- Dashboard charts / Recharts (`022-dashboard-v2`).
- Within-column task rank (**H**); app-wide audit (**C**); `specs/005-audit/`.
- Changing `constitution.md`.
- New destinations beyond the existing `/projects` link; nested task-detail URLs; redesign of board chrome, Members/Statuses/Labels Dialogs, palettes, or TaskDetail layout.
- Changing HTTP contracts, cookie auth, membership, dashboard ownership, Kanban status PATCH semantics, or `@dnd-kit/core` library choice.
- Adding `@dnd-kit/sortable`, a second CSS framework, DropdownMenu, or Trello branding.

## 4. Actors and User Stories

### User Story US-001

As any user of product chrome, I want buttons and links to show a pointer cursor, so that interactive controls feel clickable.

### User Story US-002

As a collaborator on a board, I want to click anywhere on a Kanban task card to open TaskDetail, so that I do not have to aim only at the title.

### User Story US-003

As an authenticated user, I want a **Projects** nav link next to **Dashboard**, so that I can return to the project grid without relying only on the brand name.

## 5. Functional Requirements

- **FR-001:** Product UI **buttons** (including copied shadcn `Button` and native `<button>` used as product controls) and **anchor/router links** MUST present a pointer/hand cursor when enabled/hoverable (Q-151). Disabled controls MAY keep non-pointer disabled styling.
- **FR-002:** On `/projects/:projectId`, activating (click/keyboard activation as implemented today for open) the **Kanban task card as a whole** MUST open the existing TaskDetail Dialog for that task (Q-152). Title-only hit targeting MUST NOT be the sole open path when a select handler is present.
- **FR-003:** Drag-and-drop status moves MUST remain Verified `@dnd-kit/core` status-only behavior. Opening detail MUST NOT fire as a successful drag move. Interaction MUST use `@dnd-kit` activation-distance / cancel-on-click so a completed drag (including cross-column status move) MUST NOT open TaskDetail (Q-154).
- **FR-004:** Authenticated top app bar MUST include a nav **Projects** link to `/projects` alongside the existing **Dashboard** link (Q-153). DevTrack brand MUST still link to `/projects`. Guest chrome unchanged.
- **FR-005:** MUST NOT change backend routes, Prisma schema, or public API contracts. MUST call existing APIs with `credentials: 'include'` only if already doing so; this feature adds no new fetches.
- **FR-006:** Critical polish behaviors (pointer on Button/Link baselines, whole-card open, Projects nav href) MUST be covered by frontend tests (Testing Library).
- **FR-007:** This feature MUST NOT add task notes, project covers, feed pagination, dashboard charts, rank (**H**), or audit (**C**). MUST NOT change `constitution.md`.

## 6. Acceptance Criteria

### Scenario AC-001: Pointer on buttons and links

- Given authenticated product chrome with shadcn `Button` and router `Link` controls
- When the user hovers an enabled button or link
- Then the cursor is pointer/hand (not the default text I-beam)
- Then disabled buttons do not act as enabled click targets

### Scenario AC-002: Whole Kanban card opens detail

- Given a board with a task card showing title, priority, and optional due/labels/cover
- When the user activates the card outside the title-only control (e.g. priority/due/cover area) without completing a column drag
- Then TaskDetail opens for that task

### Scenario AC-003: Drag still changes status

- Given a writable board
- When the user completes a cross-column drag
- Then status PATCH behavior remains as Verified and TaskDetail does not spuriously open solely because of the drag gesture (per Q-154)

### Scenario AC-004: Projects nav

- Given an authenticated session
- When the top app bar renders
- Then a **Projects** link navigates to `/projects`
- Then **Dashboard** still navigates to `/dashboard`
- Then the DevTrack brand still navigates to `/projects`

### Scenario AC-005: No backend/schema drift

- Given this feature
- When implemented
- Then no Prisma migration and no intentional API contract change are introduced
- Then task notes, covers, pagination, charts, **H**, and **C** remain unimplemented by this folder

### Scenario AC-006: Approval gate

- Given these artifacts are **Approved** (Q-151–Q-154 Decided)
- When implementation is requested
- Then work may proceed on T001–T012 only

## 7. Business Rules

- Pointer cursor on interactive buttons/links is presentation-only — owning domain: frontend (no backend domain).
- Whole-card open MUST NOT invent new authz; TaskDetail load still uses Verified task APIs — owning domain: `tasks` (unchanged contracts).
- Projects nav is a route link only — owning domain: frontend shell.

## 8. Data

No new business data. No persisted UI preference for this polish.

## 9. API and Integrations

No new endpoints. No intentional contract changes.

## 10. Security

No new authz. Frontend-only hiding remains non-authoritative. Existing session cookie behavior unchanged.

## 11. Non-Functional

Polish must not regress Kanban drag reliability or accessibility of open-task activation. Prefer shared Button/Link baseline styles over one-off class spam.

## 12. Dependencies

- Existing features: Verified 005–007 shell/workspace, 006 Kanban, 018 statuses
- Architectural constraints: constitution Articles VII (TypeScript), no contract invention
- External dependencies: none new

## 13. Failures and Edge Cases

- Card with cover image: cover area is part of the open hit target unless reserved exclusively for drag by Q-154.
- VIEWER boards: open detail still allowed; drag remains disabled as Verified.
- Overlay/DragOverlay: must not leave a stuck open Dialog from a completed drag.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001 | Frontend tests / class or computed style assert |
| FR-002 | AC-002 | KanbanBoard / TasksPanel tests |
| FR-003 | AC-003 | DnD + open interaction tests |
| FR-004 | AC-004 | AuthenticatedLayout / App tests |
| FR-005–FR-007 | AC-005–AC-006 | Review + no migration |

## 15. Open Questions

- **Q-151:** Pointer cursor on buttons and links. Owner: product + frontend. Status: **Decided**. Enabled buttons and links in product UI MUST use pointer/hand cursor.
- **Q-152:** Kanban open-task hit target. Owner: product + frontend. Status: **Decided**. Entire task card is selectable to open detail (not title-only).
- **Q-153:** Projects nav. Owner: product + frontend. Status: **Decided**. Add header nav link **Projects** → `/projects` alongside **Dashboard**. Keep DevTrack brand → `/projects`.
- **Q-154:** Drag vs click on Kanban cards. Owner: product + frontend. Status: **Decided**. Use `@dnd-kit` **activation-distance** / cancel-on-click: click-to-open when the pointer gesture does not complete a meaningful drag; completed drag (including cross-column status move) MUST NOT open TaskDetail.

Cross-cutting locks (record, not reopened): skip task notes; exclude **H**; exclude **C** / `specs/005-audit/`; do not change `constitution.md`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-151–Q-154 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
