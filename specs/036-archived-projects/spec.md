# Feature Specification: Archived Projects Sidebar

- **ID:** 036-archived-projects
- **Status:** Verified
- **Created:** 2026-11-11
- **Related features:** Verified `003-projects` archive/unarchive; `009-collaboration` (archived GET = `ownerUserId` only); `007` sidebar; delivery after `035`

These artifacts are **Verified**. Locks **Q-214–Q-218** Decided (section 15). Owner-only Archived section in sidebar; click opens archived detail with Unarchive. Prefer existing GET-by-id; list archived via additive query (inspection found gap). Non-owners still cannot GET archived. No notes/**C**/constitution/`implemented-features.md` until later confirm.

## 1. Problem

Owners can archive projects and GET/unarchive by id, but the sidebar/`GET /api/projects` only surfaces active projects. `?includeArchived=true` is currently ignored even for owners, so there is no discoverable Archived list in product UI.

## 2. Goals

- Owner-only **Archived** section in the project sidebar (Q-214).
- Clicking an archived entry opens archived project detail (existing route) with **Unarchive** (Q-215).
- List archived for the owner via **additive** `GET /api/projects?includeArchived=true` (honor previously ignored query for `ownerUserId` archived rows). Do not invent a separate endpoint unless Approved later (Q-216).
- Non-owners (including non-`ownerUserId` members) still cannot GET archived projects (existing rule).
- Prefer GET-by-id for detail (already works for `ownerUserId`).

## 3. Non-Goals

- Letting EDITOR/VIEWER/extra OWNER members list or GET archived projects.
- Hard-delete projects; restore of soft-deleted tasks; notes; **C**.
- Changing archive/unarchive HTTP methods beyond list query semantics.
- Constitution edit; catalog edit until confirm.
- Showing archived projects in `/projects` card grid (Q-218 Decided: grid stays active-only; sidebar Archived only).

## 4. Actors and User Stories

### User Story US-001

As a project owner (`ownerUserId`), I want an Archived section in the sidebar, so I can find and reopen archived projects.

### User Story US-002

As a project owner, I want to open an archived project and Unarchive it, so I can restore it to the active list.

### User Story US-003

As a non-owner collaborator, I want archived projects to stay inaccessible, so archive remains owner-scoped.

## 5. Functional Requirements

- **FR-001:** Authenticated sidebar MUST show an **Archived** section **only when** archived count ≥ 1 for projects the actor owns as `ownerUserId`. Entries are archived projects only (Q-214, Q-217).
- **FR-002:** Clicking an archived sidebar entry MUST navigate to `/projects/:projectId` and load via existing GET-by-id (owner succeeds; non-owner 403) (Q-215).
- **FR-003:** Archived detail MUST continue to expose Unarchive for authorized owner; unarchive restores active list behavior (Verified).
- **FR-004:** **Chosen list approach (Q-216):** Honor `GET /api/projects?includeArchived=true` for the authenticated actor by including projects where `ownerUserId === actor` and `archivedAt !== null`, **in addition to** the normal active authorized list. When `includeArchived` is absent/false, behavior remains active-only (current). Non-owners requesting the query MUST NOT receive other users’ archived projects and MUST NOT gain GET access to archived ids they do not own. Do **not** add a separate archived-only endpoint in this feature.
- **FR-005:** Default `GET /api/projects` (no flag) MUST remain active-only for all actors.
- **FR-006:** Frontend MUST call the additive query (or equivalent client helper) to populate Archived; active sidebar list stays active-only. `/projects` main card grid MUST remain active-only (Q-218).
- **FR-007:** Domain ownership remains **`projects`**. No new domain. Additive API behavior only; no destructive migration.
- **FR-008:** API + sidebar/detail critical paths MUST be tested.
- **FR-009:** MUST NOT implement notes/**C** or change `constitution.md`. MUST NOT edit `implemented-features.md` until later confirm.

## 6. Acceptance Criteria

### Scenario AC-001: Owner sees Archived section

- Given the actor owns at least one archived project
- When the authenticated sidebar loads with includeArchived list
- Then an Archived section lists those projects by name

### Scenario AC-002: Open archived detail + Unarchive

- Given an archived entry in the sidebar
- When the owner clicks it
- Then project detail loads (GET-by-id 200) and Unarchive is available
- When Unarchive succeeds
- Then the project leaves Archived and returns to the active list

### Scenario AC-003: includeArchived additive for owner

- Given an owner with active A and archived B
- When `GET /api/projects?includeArchived=true`
- Then the response includes A and B (B with non-null `archivedAt`)
- When `GET /api/projects`
- Then only A is returned

### Scenario AC-004: Non-owner cannot access archived

- Given a non-`ownerUserId` member of an archived project
- When they GET the project by id or list with includeArchived
- Then they do not receive that archived project (403 on GET-by-id; not present in list)

### Scenario AC-005: Empty / no archived

- Given an owner with no archived projects
- When sidebar loads
- Then the Archived section is not shown (count ≥ 1 required)

### Scenario AC-006: Non-goals

- Given Approved artifacts
- When implemented
- Then no separate archived endpoint; no notes/**C**/constitution drift

### Scenario AC-007: Approval gate

- Given artifacts are **Approved**
- When implementation is requested
- Then work proceeds on the approved task list only

## 7. Business Rules

- Archive/unarchive/GET archived remain `ownerUserId`-scoped — owning domain: `projects`.
- Active list authorization (membership) unchanged for non-archived rows.

## 8. Data

No new Prisma models. Uses existing `Project.archivedAt` / `ownerUserId`.

## 9. API and Integrations

- Amend list: `GET /api/projects?includeArchived=true` (session required) — see FR-004.
- Reuse `GET /api/projects/:id`, `POST .../unarchive`.

## 10. Security

- Backend must enforce owner-only archived inclusion and GET.
- UI hiding is not authorization.

## 11. Non-Functional

Prefer one list request that returns active+owned-archived over N GET-by-id probes.

## 12. Dependencies

- Verified archive/unarchive/GET-by-id owner rules; sidebar ProjectsPage
- Constitution: modular monolith; validate query at HTTP boundary

## 13. Failures and Edge Cases

- Stale sidebar after archive/unarchive — refresh list (existing epoch/reload patterns).
- Deep link to archived id as non-owner — 403 UI as today.
- `includeArchived` with invalid values — validation error or coerce false (plan).

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-003, FR-006 | AC-001, AC-002, AC-005 | FE + API |
| FR-004–FR-005 | AC-003, AC-004 | projects API tests |
| FR-007–FR-009 | AC-006–AC-007 | Review |

## 15. Open Questions

- **Q-214:** Owner-only Archived sidebar section? Status: **Decided**. Yes.
- **Q-215:** Click opens archived detail with Unarchive? Status: **Decided**. Yes; GET-by-id.
- **Q-216:** List approach? Status: **Decided**. Inspection gap: `includeArchived` ignored today. **Honor `?includeArchived=true`** for `ownerUserId` archived rows additive to active list; no separate endpoint.
- **Q-217:** Always show Archived heading when empty? Status: **Decided**. Show Archived section only when archived count ≥ 1.
- **Q-218:** Include archived in `/projects` main grid? Status: **Decided**. No — sidebar only; `/projects` grid stays active-only.

Cross-cutting: no notes; no **C**; no constitution; no catalog until confirm; after 035.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-214–Q-218 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
