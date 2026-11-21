# Implementation Plan: Archived Projects Sidebar

- **Feature ID:** 036-archived-projects
- **Specification:** `spec.md`
- **Status:** Verified

Inspected 2026-11-11. Gap: `GET /api/projects?includeArchived=true` ignored for all actors; owner GET-by-id archived works; unarchive works. Chosen approach: honor additive `includeArchived` for `ownerUserId` archived projects.

## 1. Summary

Backend: when `includeArchived=true`, append/include projects owned by the actor (`ownerUserId`) with non-null `archivedAt` alongside the existing active authorized list. Frontend: owner sidebar Archived section from that list; navigate to detail; reuse Unarchive.

## 2. Current State

- `ProjectsService.listAuthorized` — active only; query flag ignored (API tests assert ignore).
- Owner `GET /api/projects/:id` archived → 200; non-owner → 403.
- `ProjectsPage` filters `archivedAt === null` for sidebar/list UI.
- `ProjectDetail` already shows Unarchive when archived + canArchive.

## 3. Domain Boundaries

- Owning domain: **`projects`**.
- No new domain. Membership ports may be reused for active ids; archived inclusion is ownerUserId-only.
- Controllers validate query; services enforce invariants; repositories encapsulate Prisma.

## 4. API Contract

### `GET /api/projects`

- Auth: session required.
- Query: optional `includeArchived` boolean (`true`/`false`; absent = false). Zod at boundary.
- Response: `{ projects: PublicProjectDto[] }` unchanged shape.
- When `includeArchived=false|absent`: active authorized projects only (unchanged).
- When `includeArchived=true`: active authorized projects **plus** archived projects where `ownerUserId === actorId` (dedupe by id).
- Errors: `401` unauthenticated; `400` validation if query invalid.
- Non-owners never receive archived rows they do not own as `ownerUserId`.

### Unchanged

- `GET /api/projects/:id` (owner archived OK)
- `POST /api/projects/:id/archive|unarchive`

## 5. Persistence

- No Prisma schema change expected.
- Repository may need `listArchivedByOwnerId(ownerUserId)` or extend list helpers — domain-specific, not generic repository.

## 6. Frontend

- Client: `listProjects({ includeArchived?: boolean })` additive optional param.
- Sidebar `ProjectsPage`: fetch with `includeArchived: true` (or parallel active + filter); split active vs archived; render Archived section only when count ≥ 1 (Q-217 Decided).
- Click archived → `navigate(/projects/:id)`; detail/unarchive already present.
- Main `/projects` grid stays active-only (Q-218 Decided).
- Refresh on archive/unarchive via existing reload epoch.

## 7. Files

- Backend: projects service/controller/validators/repository (+ API/service tests)
- Frontend: `api/client.ts`, `ProjectsPage.tsx` (+ tests), possibly layout copy
- Update tests that currently expect `includeArchived` ignored for owners

## 8. Dependencies and Config

None new. No Compose/env changes.

## 9. Security and Failures

- Enforce ownerUserId for archived inclusion server-side.
- Do not leak archived projects to members via list or GET.

## 10. Testing

- API: owner includeArchived includes owned archived; default list excludes; member includeArchived still excludes others’ archived; GET archived 403 for non-owner.
- FE: Archived section visibility; navigation; unarchive moves entry.

## 11. Sequence

1. Inspect + Approved gate.
2. Repository/service/list query + tests.
3. Controller/validator + API tests.
4. Frontend client + sidebar section + tests.
5. Typecheck, AC, review, memory.

## 12. Risks

- Amending “ignored includeArchived” tests — intentional contract unlock.
- Alternatives: separate `/api/projects/archived` (rejected for this feature — Q-216).
- Dedupe if an active row somehow overlaps — use id set.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001, AC-005 | Sidebar section | ProjectsPage tests |
| AC-002 | Navigate + Unarchive | ProjectDetail / App tests |
| AC-003–AC-004 | List query | projects-api tests |
| AC-006 | Scope | Review |
| AC-007 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
