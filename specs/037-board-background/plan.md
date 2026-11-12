# Implementation Plan: Board Background Image

- **Feature ID:** 037-board-background
- **Specification:** `spec.md`
- **Status:** Verified

Inspected 2026-11-11. Mirror Verified 020 project-covers pattern with a distinct volume and DTO field. Q-219–Q-225 Decided (`board-background` path).

## 1. Summary

Add `ProjectBoardBackground` (name may vary) 1:1 metadata + blob storage on `project_board_backgrounds_data` (`PROJECT_BOARD_BACKGROUNDS_ROOT`). REST under `/api/projects/:projectId/board-background`. Kanban paints authenticated image behind columns; Edit Project Dialog upload/clear; null fallback = current board surface.

## 2. Current State

- Covers: `ProjectCover`, volume `project_covers_data`, routes `.../cover`, DTO `cover`.
- Attachments: separate volume `attachments_data`.
- Kanban board container in `TasksPanel`/`KanbanBoard` — no project background image layer.
- Edit Project Dialog already has cover file picker (030 pointer).

## 3. Domain Boundaries

- Owning domain: **`projects`**.
- Storage port + repository for board backgrounds (parallel to covers), not task attachments.
- Controllers → services → repository/storage; Zod at boundary.

## 4. API Contract

### `PUT /api/projects/:projectId/board-background`

- Auth: session; OWNER+EDITOR write; archived rules like cover mutate.
- Multipart file field (same convention as cover).
- Response: public project DTO including `boardBackground: { id, contentType }`.
- Errors: 401/403/404/409 archived / 400 validation (type/size).

### `DELETE /api/projects/:projectId/board-background`

- Clears metadata+blob; `boardBackground: null` on project DTO.

### `GET /api/projects/:projectId/board-background/content`

- Authz: project read visibility; `Cache-Control: private`; stream bytes.

### DTO

- Additive `PublicProjectDto.boardBackground: { id: string; contentType: string } | null`.
- Keep `cover` unchanged.

## 5. Persistence

- Additive Prisma model 1:1 with Project (id, projectId unique, contentType, createdAt, …).
- Migration additive only.
- Storage path `{PROJECT_BOARD_BACKGROUNDS_ROOT}/{projectId}/{backgroundId}`.
- Compose: named volume + backend mount + env var (document in `.env.example` if present).

## 6. Frontend

- Client helpers: put/delete/fetch content (mirror cover client).
- Edit Project Dialog: board background file input + clear (pointer classes per 030/034 patterns).
- Kanban board wrapper: when `boardBackground` non-null, authenticated blob URL/CSS background behind columns; columns remain readable (overlay/scrim if needed without redesigning architecture).
- Null: existing `bg-*` board surface.

## 7. Files

- `backend/prisma/schema.prisma` + migration
- `backend` projects board-background repository/service/controller/routes/validators/tests
- `docker-compose.yml` volume + env
- `frontend` api client/types, EditProjectDialog, Kanban/TasksPanel background layer + tests

## 8. Dependencies and Config

- New packages: none expected.
- Env: `PROJECT_BOARD_BACKGROUNDS_ROOT`
- Docker: volume `project_board_backgrounds_data`

## 9. Security and Failures

- Magic sniff + size + allowlist; private content; no absolute paths in JSON.

## 10. Testing

- API upload/content/clear/authz/validation/separation from cover.
- FE Edit upload/clear; board renders/fallback.

## 11. Sequence

1. Approved gate + Prisma/migration/Compose.
2. Storage + repository + service + routes + API tests.
3. Frontend client + Edit UI + board layer + tests.
4. Typecheck, AC, review, memory.

## 12. Risks

- Nested Dialog + file input UX — reuse cover patterns.
- Readability over busy images — light scrim acceptable without new theme system.
- Alternatives: reuse cover image (rejected — Q-219).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | PUT + board UI | API + FE |
| AC-002 | DELETE + fallback | API + FE |
| AC-003 | Authz | API tests |
| AC-004 | Validation | API tests |
| AC-005 | Separate volume/DTO | API + Compose review |
| AC-006 | Scope | Review |
| AC-007 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
