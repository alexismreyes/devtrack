# Feature Specification: Dashboard Overview

- **ID:** 026-dashboard-overview
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** 008-dashboard (Verified; **owner-only scope SUPERSEDED here**); 009-collaboration (Verified membership); 015-task-checklists (Verified; checklist % for Tasks bars); 018-custom-task-statuses (Verified live catalog / `isCompleted`); 022-dashboard-v2 (Verified Recharts; layout superseded by overview); `templates/dashboard_template.png`; delivery after 023–025 in backlog order

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. §15 questions are **Decided** (locked). Redesign `/dashboard` toward `templates/dashboard_template.png` eyecandy overview. **Q6=MEMBERSHIP-SCOPED** (VIEWER included) — **SUPERSEDES Verified 008/022 owner-only**. **Q5=3:** Tasks bars = checklist %; Progress = completed/total. **Q4 option 2 / Q-184:** pie = task counts by live status key. **Q-186:** carefully **replace** `GET /api/dashboard` DTO. Team Members = distinct users across membership set. Due Soon = 7 UTC days inclusive, `!isCompleted`. Empty charts = empty success UI (Q-183). Keep **Recharts**. **No new dashboard domain**; aggregations in **`tasks`**. Do **not** invent task notes. Do **not** implement **H**, **C**, or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms.

This ID is **026-dashboard-overview**.

## 1. Problem

Verified `/dashboard` is owner-scoped numeric cards plus 022 pending/completed/overdue charts. Members who only collaborate see zeros for shared work. Product now needs a membership-scoped eyecandy overview (KPI row, Projects pie by live statuses, Tasks checklist-% bars, Progress completed/total bars) aligned to `templates/dashboard_template.png`.

## 2. Goals

- Redesign `/dashboard` presentation toward the template overview (gradient/eyecandy cards; keep Recharts).
- Scope aggregates to **membership** (Q6): active projects where actor is OWNER/EDITOR/VIEWER (via project-members / existing effective membership), **not** `ownerUserId`-only. VIEWER-only membership projects are **included**.
- KPIs: **Total Projects**, **Open Tasks** (pending / not completed), **Team Members** (distinct member users across the membership-scoped project set), **Due Soon** (`dueDate` within next 7 UTC days, `isCompleted=false`).
- Projects pie: aggregate by **live status catalog keys** (dynamic) — Q4 option 2 (task counts by status key across scoped projects).
- Tasks bars: **checklist completion %** aggregated per project (Q5=3).
- Progress row: **completed/total tasks** per project (Q5=3).
- Extend `GET /api/dashboard` carefully for new series; aggregations in `tasks` use-case over ports; no `dashboard` domain / Prisma dashboard model.
- Soft-deleted tasks and archived projects remain excluded.

## 3. Non-Goals

- Task notes; within-column rank (**H**); app-wide audit (**C**); `specs/005-audit/`.
- Changing `constitution.md`.
- New `dashboard` bounded context or microservices.
- Email/SMTP; password change (027); feed window (025); cover-on-create (024) beyond consuming list covers if shown (not required).
- Restoring owner-only dashboard semantics.
- Persisting chart/KPI UI mode in Prisma/localStorage (session/page state OK if needed; template is fixed composition).
- Editing `implemented-features.md` in this batch.

## 4. Actors and User Stories

### User Story US-001

As a project member (including VIEWER), I want `/dashboard` to summarize projects I belong to, so that shared work is visible (supersedes owner-only zeros for members).

### User Story US-002

As a member, I want KPI cards for Total Projects, Open Tasks, Team Members, and Due Soon, so that I can scan health quickly.

### User Story US-003

As a member, I want Projects/Tasks/Progress visualizations per Decided formulas, so that the overview matches the template intent.

### User Story US-004

As a developer, I want aggregations in `tasks` via ports (no dashboard domain), so that DDD boundaries hold.

## 5. Functional Requirements

Requirements bind to locked Q4/Q5/Q6 and §15 Decided questions.

- **FR-001 (scope SUPERSEDES 008/022):** `GET /api/dashboard` and `/dashboard` UI MUST aggregate **active** projects in the actor’s **membership set** (OWNER/EDITOR/VIEWER via `project-members`, with existing `ownerUserId` OWNER equivalence). Archived projects excluded. Soft-deleted tasks excluded. **VIEWER-only** projects are included. Owner-only (`listOwnedActiveProjects`) MUST NOT remain the sole scope.
- **FR-002:** KPI **Total Projects** = count of projects in that active membership-scoped set.
- **FR-003:** KPI **Open Tasks** = count of non-deleted tasks in scope with catalog `isCompleted=false` (pending / not completed; 018 rules).
- **FR-004:** KPI **Team Members** = count of **distinct user ids** who are members of any project in the scoped set (aligned with Q6). Include the actor when they are a member. Deduplicate users across projects.
- **FR-005:** KPI **Due Soon** = count of non-deleted tasks in scope with non-null `dueDate` whose UTC calendar date is in **[UTC today, UTC today + 7 days] inclusive**, and `isCompleted=false`. Overdue (strictly before UTC today) is not Due Soon.
- **FR-006:** **Projects** pie (Recharts): slices = **task counts** grouped by **live `Task.status` keys** (Q-184 / Q4 option 2). Empty → empty success UI (Q-183), not an error.
- **FR-007:** **Tasks** bars (Q5=3): per scoped project, checklist completion **percent** = (checked checklist items) / (total checklist items) across all checklists on non-deleted tasks in that project; if total items = 0 → **0%**.
- **FR-008:** **Progress** row (Q5=3): per scoped project, completed tasks / total non-deleted tasks (completed = `isCompleted=true`); empty project → 0/0 displayed as empty/0% per plan empty-state default (Q-183).
- **FR-009:** UI MUST redesign `/dashboard` toward `templates/dashboard_template.png`: KPI row; Projects pie + Tasks bars; Progress row; gradient/eyecandy cards (compose with 023 polish if present). Keep **Recharts**; no second chart library. 022 stacked-bar/pie **mode toggle** of pending/completed/overdue MAY be removed/replaced by this fixed overview (document supersession).
- **FR-010:** Carefully **replace** `GET /api/dashboard` response shape (Q-186) so the UI does not N+1 fan-out task/checklist lists. Exact DTO in plan. Session required; unauthenticated → 401/login as Verified.
- **FR-011:** No new `dashboard` domain. Aggregations in `tasks` use-case; narrow ports to `projects` / `project-members` (extend `ProjectAccessPort` or add membership-scoped port methods as needed). Controllers MUST NOT query DB. Prisma types MUST NOT be public DTOs. No dashboard Prisma model. No destructive migrate reset.
- **FR-012:** Frontend `credentials: 'include'`. Loading/empty/error states required. Chart regions accessible names where practical.
- **FR-013:** Domain aggregation helpers and API + critical UI MUST be tested (Vitest/SuperTest/Testing Library).
- **FR-014:** MUST NOT implement task notes, **H**, **C**, or change `constitution.md`.

## 6. Acceptance Criteria

### Scenario AC-001: Membership scope supersedes owner-only

- Given user B is EDITOR or VIEWER on A’s active project (B does not own it)
- When B `GET /api/dashboard` / opens `/dashboard`
- Then B’s aggregates include that project (not forced zeros solely for non-ownership)
- Then A does not see B’s private owned-only projects where A is not a member

### Scenario AC-002: KPI definitions

- Given a known membership-scoped dataset
- When dashboard is fetched
- Then Total Projects, Open Tasks, Team Members, and Due Soon match FR-002–FR-005

### Scenario AC-003: Projects pie dynamic keys

- Given scoped tasks with multiple live status keys (including custom)
- When Projects pie renders
- Then slices reflect those keys’ task counts (not a fixed four-bucket enum)

### Scenario AC-004: Tasks bars checklist %

- Given project P with checklist items 2 checked of 4 across tasks
- When Tasks bars render
- Then P shows 50% (Q5=3)
- Given project with zero checklist items
- Then bar shows 0%

### Scenario AC-005: Progress completed/total

- Given project P with 3 completed of 5 non-deleted tasks
- When Progress renders
- Then P shows 3/5 (or equivalent %)

### Scenario AC-006: Due Soon window

- Given tasks due today, due in 7 UTC days, due yesterday, due in 8 days, completed with due soon
- When Due Soon is computed
- Then only non-completed with due in [today, today+7] count

### Scenario AC-007: Empty membership set

- Given actor with zero active membership projects
- When dashboard loads
- Then KPIs are zero and charts/rows show empty success (not hard failure)

### Scenario AC-008: Architecture / non-goals

- Given this feature
- When implemented
- Then no dashboard domain/Prisma model; aggregations in tasks + ports; Recharts only; no constitution/**H**/**C**/task notes; 008 owner-only scope documented as superseded

## 7. Business Rules

- Membership-scoped active projects — `tasks` aggregation via projects/members ports (SUPERSEDES 008 owner-only).
- Pending/open = `!isCompleted`; completed = `isCompleted` — `tasks` + status catalog (018).
- Due Soon window inclusive UTC today..today+7, not completed — `tasks`.
- Checklist % item-level across project — `tasks` checklists.
- Team Members = distinct user ids across scoped memberships — via members port.

## 8. Data

Derived read only. No new dashboard tables. May read Project, Task, ProjectStatus, checklist/item, ProjectMember via owning repositories/ports.

## 9. API and Integrations

- Evolve `GET /api/dashboard` response to supply KPIs + series for pie/bars/progress (plan owns schema).
- No write routes.

## 10. Security

- Session required. Resource scope = membership visibility only. Do not leak non-member projects/tasks/member emails beyond what Decided DTO needs (prefer counts + project id/name + series; avoid dumping all member PII — display names only if required; Team Members is a count).

## 11. Non-Functional

Prefer one aggregated query path educationally clear over client N+1. Template is visual reference; DevTrack tokens/palettes win over literal template whites.

## 12. Dependencies

- Existing: 008/009/015/018/022 Verified; template image
- Constraints: constitution II–V, VIII; no generic repository
- External: `recharts` already present

## 13. Failures and Edge Cases

- Projects with no OWNER membership row but `ownerUserId` actor — include via existing OWNER equivalence if that already grants membership visibility on list; do not invent a second orphan rule beyond Verified 009.
- Custom status keys collide across projects — pie groups by string key (document).

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001      | AC-001, AC-008      | API + service tests |
| FR-002–005  | AC-002, AC-006–007  | Service/API tests |
| FR-006      | AC-003              | API + UI tests |
| FR-007–008  | AC-004–AC-005       | Service + UI tests |
| FR-009–012  | AC-007–AC-008       | Frontend + review |
| FR-013–014  | AC-008              | Tests + review |

## 15. Open Questions

- **Q-183:** Empty-state presentation for pie/bars/progress when scoped projects exist but series are empty. Owner: product + frontend. Status: **Decided (locked)** — empty success UI (cards with explicit empty copy / zero axes); not an error.
- **Q-184:** Projects pie units. Owner: product. Status: **Decided (locked)** — **task counts** by live status key (not project-status entity; DevTrack has none).
- **Q-185:** Team Members KPI includes users across VIEWER memberships. Owner: product. Status: **Decided (locked by Q6)** — yes; VIEWER-only projects included in scope and thus in distinct member set.
- **Q-186:** Replace vs additive DTO fields on `GET /api/dashboard`. Owner: backend. Status: **Decided (locked)** — carefully **replace** response shape for the new overview (update 008/022 clients in same feature); keep path `GET /api/dashboard`. Document breaking contract in plan.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-183–Q-186 Decided; Q5/Q6 locked)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T014)
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
