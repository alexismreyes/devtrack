# Feature Specification: Dashboard v2

- **ID:** 022-dashboard-v2
- **Status:** Verified
- **Created:** 2026-11-09
- **Related features:** 008-dashboard (Verified; Q-045–Q-050; **charts were non-goals — extended here**); 018-custom-task-statuses (Verified `isCompleted` aggregates); delivery after Approved 019–021 in backlog order

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product questions **Q-169–Q-176** are **Decided** (section 15). T001–T012 complete. Prefer deriving chart series from existing **`GET /api/dashboard`**; extend the API only if the current payload cannot support Decided charts. Keep **owner-scoped** dashboard semantics. Explicit dependency decision: add **Recharts** (or equivalent documented choice). Do **not** invent task notes. Do **not** implement **H**, **C**, or `specs/005-audit/`. Do **not** change `constitution.md`.

This ID is **022-dashboard-v2**.

## 1. Problem

Verified `008-dashboard` shows owner-wide and per-project numeric totals (pending/completed/overdue via catalog `isCompleted` after 018) but explicitly excluded charts (Q-050). Owners still lack a visual breakdown of pending vs completed vs overdue **by project**, plus an optional pie/donut view of overall composition.

## 2. Goals

- Add dashboard **charts** on existing `/dashboard` inside `AuthenticatedLayout` without replacing the `/projects` grid or changing guest/authenticated roots.
- **Default visualization:** stacked bars of pending / completed / overdue **by project**, derived from existing aggregates (Q-169).
- Also offer **pie/donut** rendering (Q-170).
- Add an explicit chart library dependency: **Recharts** (Q-171). Document the decision; do not silently add a second chart library.
- Prefer **`GET /api/dashboard` as-is**; only extend the API if charts need data the current payload cannot provide (Q-172).
- Keep **owner-scoped** semantics (Q-173): membership-only projects remain excluded from dashboard aggregates unless a future Decided change says otherwise.
- Leave task notes, covers, feed pagination, **H**, and **C** out of this folder (consume prior Verified/Approved work only).

## 3. Non-Goals

- Task notes.
- Membership-scoped dashboard (unless Q-173 is later changed — currently Decided owner-scoped).
- Due-soon lists, activity feeds, or new aggregate formulas beyond existing pending/completed/overdue definitions.
- Within-column rank (**H**); app-wide audit (**C**); `specs/005-audit/`.
- Replacing numeric summary cards entirely (charts augment; MUST **keep** existing 008 count summaries visible per Q-175).
- Changing overdue/pending/completed definitions (018 `isCompleted` rules stay).
- Changing `constitution.md`.
- Microservices or a new `dashboard` domain module / Prisma dashboard table.

## 4. Actors and User Stories

### User Story US-001

As an authenticated owner, I want stacked bar charts of pending/completed/overdue by project on `/dashboard`, so that I can compare workload across projects visually.

### User Story US-002

As an authenticated owner, I want to switch to a pie/donut view, so that I can see overall composition at a glance.

### User Story US-003

As a non-owner member, I want `/dashboard` to keep showing only my owned aggregates (zeros if I own nothing), so that ownership semantics stay clear.

### User Story US-004

As a developer, I want charts to prefer the existing dashboard DTO and an explicit Recharts dependency, so that architecture and supply-chain choices stay documented.

## 5. Functional Requirements

- **FR-001:** `/dashboard` MUST render a **stacked bar** chart as the **default** visualization: per active owned project, stacks for **pending**, **completed**, and **overdue** counts from dashboard aggregates (Q-169).
- **FR-002:** The UI MUST also offer **pie** and/or **donut** rendering (Q-170). Chart mode (bars/pie/donut) is **session/page UI state only** — no localStorage/Prisma persistence; default stacked bars on each visit (Q-174). Pie/donut MUST use owner-wide `pendingCount` / `completedCount` / `overdueCount` as three slices (Q-176); note pending∩overdue overlap means slices are categories, not a partition of `taskCount`.
- **FR-003:** Chart library MUST be **Recharts** added as an explicit documented frontend dependency (Q-171). MUST NOT add a second chart library in this feature.
- **FR-004:** Chart data MUST prefer derivation from existing `GET /api/dashboard` fields (`projects[]` with `pendingCount`/`completedCount`/`overdueCount`, plus owner-wide totals) (Q-172). Current payload is sufficient → **no API extension** expected. If and only if a Decided chart cannot be built, an additive API extension MAY be proposed via artifact amendment before coding.
- **FR-005:** Dashboard remains **owner-scoped** (Q-173). Session required. Unauthenticated → login/`401` as Verified. Non-owners do not see others’ owned data.
- **FR-006:** Empty owned data (zeros / empty `projects`) MUST show an empty chart state (not an error), consistent with 008 empty success.
- **FR-007:** Soft-deleted tasks and archived owned projects remain excluded via existing aggregation rules. Pending/completed/overdue meanings follow Verified 008/018 (`isCompleted`, overdue UTC date rules).
- **FR-008:** No new `dashboard` domain; aggregations stay in `tasks` use-case. No Prisma dashboard model. Controllers MUST NOT query DB.
- **FR-009:** Frontend MUST use `credentials: 'include'`. Loading/error/unauthenticated states remain. Chart region MUST have an accessible name; existing numeric summaries remain visible (Q-175). Do not require a full screen-reader chart navigation suite.
- **FR-010:** Critical chart selection + data mapping MUST be tested (Testing Library). Backend tests change only if API is extended (not expected under Decided Q-172).
- **FR-011:** MUST NOT implement task notes, **H**, **C**, project covers, or feed pagination in this folder. MUST NOT change `constitution.md`.

## 6. Acceptance Criteria

### Scenario AC-001: Default stacked bars

- Given an owner with ≥1 active owned project and mixed pending/completed/overdue counts
- When they open `/dashboard`
- Then a stacked bar visualization by project is shown by default using those aggregates

### Scenario AC-002: Pie/donut available

- Given the dashboard charts UI
- When the user selects pie/donut mode
- Then a pie or donut chart renders per Decided Q-174/Q-176 data mapping

### Scenario AC-003: Existing payload sufficient

- Given Decided Q-172 (no API extension)
- When charts render
- Then only `GET /api/dashboard` is used for chart series (no per-project task list composition)

### Scenario AC-004: Owner scope

- Given user B does not own user A’s projects
- When B opens `/dashboard`
- Then B never sees A’s project bars/slices

### Scenario AC-005: Empty state

- Given an owner with zero active owned projects
- When they open `/dashboard`
- Then counts remain zeros and charts show empty success UI (not a hard failure)

### Scenario AC-006: Dependency decision

- Given this feature
- When implemented
- Then `recharts` is present as a documented frontend dependency and no second chart library is added by this folder

### Scenario AC-007: Non-goals / architecture

- Given this feature
- When implemented
- Then no `dashboard` domain module, no dashboard Prisma model, no constitution change, no **H**/**C**/task notes

### Scenario AC-008: Approval gate

- Given these artifacts are **Approved** (Q-169–Q-176 Decided)
- When implementation is requested
- Then work may proceed on T001–T012 only

## 7. Business Rules

- Chart series are derived presentation of owner dashboard aggregates — owning domain: `tasks` (aggregations); frontend presentation
- Overlap pending∩overdue allowed as in 008 — owning domain: `tasks`
- Owner scope — owning domain: `tasks` over projects port

## 8. Data

No new persisted chart entities. Chart mode is UI state only for the session/page (Q-174); not persisted to localStorage or Prisma.

## 9. API and Integrations

- Primary: existing `GET /api/dashboard` (session, owner-scoped).
- Extension: none expected under recommended Q-172; if required, amend artifacts first.

## 10. Security

- Backend owner scope remains authoritative.
- Chart library runs in the browser only; MUST NOT embed secrets.
- Do not fetch other users’ data client-side.

## 11. Non-Functional

Keep dashboard educational and readable. Prefer clear legends/labels over decorative chart chrome. Respect existing whole-UI palettes where practical (map series to semantic colors, not a new purple theme system).

## 12. Dependencies

- Existing: Verified 008 + 018 aggregates; authenticated `/dashboard`
- Architectural constraints: constitution Article VII (documented extra dependency); no microservices
- External: **Recharts** (explicit)

## 13. Failures and Edge Cases

- Projects with all-zero counts: still appear in bar axis if present in `projects[]` (008 includes zero-task projects) — show empty stacks.
- Long project names: truncate/tooltip in chart labels.
- Recharts SSR: Vite SPA only — client render.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-003 | AC-001, AC-002, AC-006 | UI + package.json |
| FR-004–FR-005 | AC-003, AC-004 | Client + existing API tests |
| FR-006–FR-007 | AC-001, AC-005 | UI |
| FR-008–FR-011 | AC-007–AC-008 | Review |

## 15. Open Questions

- **Q-169:** Default visualization. Owner: product. Status: **Decided**. **Stacked bars** of pending/completed/overdue **by project** from existing aggregates.
- **Q-170:** Alternate visualization. Owner: product. Status: **Decided**. Also offer **pie/donut** rendering.
- **Q-171:** Chart library. Owner: frontend + architecture. Status: **Decided**. Add **Recharts** as an explicit documented dependency (equivalent only if Approve amends this to a named alternative before coding).
- **Q-172:** Data source. Owner: architecture. Status: **Decided** (policy). Prefer derive from `GET /api/dashboard`; extend API only if charts need data the current payload cannot provide. **Recommended finding:** current payload **is sufficient** → **no API extension**.
- **Q-173:** Scope. Owner: product. Status: **Decided**. Keep **owner-scoped** dashboard semantics.
- **Q-174:** Chart mode toggle persistence. Owner: product + frontend. Status: **Decided**. **UI state only** for the session/page (no localStorage/Prisma); default stacked bars on each visit.
- **Q-175:** Accessibility baseline. Owner: frontend. Status: **Decided**. Chart region has an accessible name; data also available via existing numeric summaries (008 cards remain visible); do not require full screen-reader chart navigation suite.
- **Q-176:** Pie/donut series. Owner: product. Status: **Decided**. Pie/donut uses **owner-wide** `pendingCount` / `completedCount` / `overdueCount` as three slices (note pending∩overdue overlap means slices are categories, not a partition of `taskCount`).

Cross-cutting locks: skip task notes; exclude **H**; exclude **C** / `specs/005-audit/`; do not change `constitution.md`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-169–Q-176 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes (T001–T012); non-blocking notes in `tasks.md` / `memory.md`
