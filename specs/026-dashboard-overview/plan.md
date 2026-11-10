# Implementation Plan: Dashboard Overview

- **Feature ID:** 026-dashboard-overview
- **Specification:** `spec.md`
- **Status:** Verified

Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. **Locked:** Q6 MEMBERSHIP-SCOPED (VIEWER included; SUPERSEDES 008/022 owner-only); Q5=3 checklist % + completed/total; Q-184 pie = task counts by status key; Q-183 empty charts = empty success UI; Q-186 carefully **replace** `GET /api/dashboard` DTO; Team Members distinct across membership set; Due Soon 7 UTC days inclusive `!isCompleted`. No dashboard domain. Keep Recharts. No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms.

## 1. Summary

Rebuild dashboard derived-read + `/dashboard` UI as a membership-scoped overview: four KPIs, Projects pie (task counts by status key), Tasks bars (checklist %), Progress (completed/total), eyecandy cards, Recharts.

## 2. Current State

Inspected 2026-11-10:

- `ProjectAccessPort.listOwnedActiveProjects` used by `tasks-service.getDashboard` (owner-only)
- DTO: `projectCount`, `taskCount`, `pendingCount`, `completedCount`, `overdueCount`, `projects[]` counts
- Frontend: numeric cards + 022 chart mode toggle (stacked bars / pie of pending/completed/overdue)
- Membership + checklists + status catalogs Verified; no project-level status entity
- Template: `templates/dashboard_template.png`

## 3. Domain Boundaries

- Owning aggregations: **`tasks`** use-case
- Ports: extend projects/members access — e.g. `listActiveProjectsForMember(actorId)` and `listDistinctMemberUserIdsForProjectIds(projectIds)` (names illustrative) owned behind existing domains; **do not** import Prisma repos cross-domain
- Checklists/status reads via existing `tasks` repositories
- No `dashboard` module/domain
- Dependency direction: tasks → ports ← projects / project-members adapters

## 4. API Contract

### `GET /api/dashboard`

- Auth: session cookie required; `401` if unauthenticated
- Scope: membership-scoped active projects (FR-001)
- **Replace DTO** (Q-186 Decided):

```
DashboardOverviewResponseDto {
  totalProjects: number
  openTasks: number
  teamMembers: number
  dueSoon: number
  projectsPie: Array<{ statusKey: string; label: string; count: number }>
  tasksBars: Array<{ projectId: string; projectName: string; checklistCompletionPercent: number }>
  progress: Array<{ projectId: string; projectName: string; completedTasks: number; totalTasks: number }>
}
```

- `label` MAY equal display name from a catalog row when unambiguous; if multiple catalogs share a key, use the key or a stable representative name (document in code comments; prefer key as slice id).
- Validation: none beyond auth (no query body).
- Errors: standard envelope; no secrets/hashes/stack traces.
- Breaking: removes prior 008/022 fields; update frontend client/types/tests in this feature.

## 5. Persistence

- No new Prisma models/migrations expected
- Repository methods may add efficient aggregations (group counts, checklist item tallies) behind existing repos
- Transactions: read-only derived path

## 6. Frontend

- Redesign `DashboardPage` toward template composition (KPI row → pie+tasks → progress)
- Gradient/eyecandy cards (consume 023 if shipped)
- Recharts pie + bar/progress visuals; remove 022 mode toggle if incompatible
- Map DTO → charts; empty success UI per Q-183 Decided (not errors)
- Projects pie units = task counts by status key (Q-184)
- `getDashboard()` types updated; `credentials: 'include'`
- Do not N+1 fetch checklists/tasks client-side for aggregates

## 7. Files

- `backend/.../tasks` service/summarize helpers/controller/DTO/validators/tests
- `projects` / `project-members` port + adapter methods
- `frontend` DashboardPage/Charts/client types/tests
- Memory notes on 008 scope supersession

## 8. Dependencies and Config

- Keep `recharts`; no second chart library
- Env/Docker: none

## 9. Security and Failures

- Enforce membership scope server-side
- Team Members is a **count** only (no email list in DTO)
- Empty set → zeros + empty arrays, `200`

## 10. Testing

- Domain/service: membership include VIEWER; exclude non-member; KPI formulas; due soon bounds; checklist %; progress ratio; pie keys
- SuperTest: authz isolation; shape
- Frontend: KPI render; empty; chart mapping from fixture

## 11. Sequence

1. Inspect ports + dashboard summarize + checklist repos
2. Approve gate
3. Extend ports
4. Replace summarize + DTO + tests
5. Frontend redesign + tests
6. Verification + review + memory (catalog propose only)

## 12. Risks

- Breaking DTO replace (Q-186 Decided) — mitigated by single-feature client update
- Cross-project status key collisions — group by key; document
- Performance of checklist aggregation — keep in repository SQL/groupBy educationally; amend only if needed

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Membership port + summarize | Service/API tests |
| AC-002, AC-006 | KPI helpers | Service/API tests |
| AC-003 | projectsPie | Service + UI |
| AC-004–AC-005 | tasksBars/progress | Service + UI |
| AC-007 | Empty DTO/UI | API + UI |
| AC-008 | Architecture gate | Review |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
