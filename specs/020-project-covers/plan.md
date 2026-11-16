# Implementation Plan: Project Covers

- **Feature ID:** 020-project-covers
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Spec **Q-155–Q-161** Decided (locked). Plan/tasks are aligned to those answers. Reopens 007 name-derived-only covers for image upload. Mirror 017 storage pattern under **`projects`**. No task notes / **H** / **C**. Do not change `constitution.md`.

Locked constraints: OWNER+EDITOR mutate (Q-157); null → name-derived fallback (Q-158); volume `project_covers_data` + `PROJECT_COVERS_ROOT` (Q-159); jpeg/png/webp/gif, 5 MiB, one cover (Q-160); clear removes blob + metadata (Q-161).

## 1. Summary

Add **per-project image covers** for the `/projects` grid:

- Own under existing **`projects`** domain (not `tasks`, not peer `covers`).
- Metadata via additive Prisma; bytes on Compose volume behind a narrow storage port (Q-156).
- Multipart upload/replace + clear + authenticated content GET.
- Public project DTO gains cover summary; UI fetches content with `credentials: 'include'`.
- Null cover → name-derived fallback (Q-158).

## 2. Current State

Inspected 2026-11-09:

- `Project` Prisma model: name, description, ownerUserId, archivedAt — **no cover field**
- Frontend `projectCover.ts` / `ProjectCard.tsx`: name-derived color+initials only (007)
- 017: `AttachmentStoragePort`, volume `attachments_data`, `ATTACHMENTS_ROOT`, path `{root}/{projectId}/{taskId}/{attachmentId}`, multipart + `/content` with `Cache-Control: private`
- Membership: OWNER/EDITOR/VIEWER; EDITOR may PATCH project name/description; archive OWNER-only
- Domains: `system`, `auth`, `users`, `projects`, `tasks`, `project-members`
- No project cover routes or volume today

## 3. Domain Boundaries

- Owning domain: **`projects`** — cover invariants, metadata repository, storage port, use cases, HTTP
- Other domains:
  - `project-members` — authz ports only (extend or reuse project write/read)
  - `auth` — session middleware
  - `tasks` — unchanged (do not store project covers as task attachments)
- Shared infra: filesystem storage adapter (projects-scoped port); MUST NOT become a product domain
- Invariants (locked): single active cover; image allowlist + 5 MiB (Q-160); hard-delete blob on clear/replace (Q-161); no public URLs
- Dependency direction: controllers → services → repository/storage ports; domain objects free of Express/Prisma

## 4. API Contract

Locked shape (attachments-like); exact method choice (`PUT` vs `POST` upload) may refine at Approve without reopening Qs:

### Upload / replace

- `PUT` or `POST` `/api/projects/:projectId/cover` multipart field `file`
- Auth: session + OWNER+EDITOR (`requireProjectWrite`-style) (Q-157)
- Success: `200`/`201` with cover summary DTO
- Errors: `400`, `401`, `403`, `404`, archived mapping

### Clear

- `DELETE /api/projects/:projectId/cover`
- Auth: same mutate role
- Success: `204` or `200` with `cover: null` on project DTO
- Side effect: remove metadata + blob

### Content

- `GET /api/projects/:projectId/cover/content`
- Auth: session + project read/list visibility
- Success: `200` bytes; `Content-Type` from metadata; `Cache-Control: private`
- Errors: `401`, `403`, `404` (including no cover)

### DTO

- Extend `PublicProjectDto` with `cover: { contentType, ... } | null` (no filesystem paths; no bytes)
- List/get projects return the summary so cards can fetch content

Do not change unrelated project/task contracts.

## 5. Persistence

- Additive Prisma: cover metadata fields or `ProjectCover` 1:1 row + nullable pointer on `Project` (choose one cohesive design at Approve; prefer simple nullable columns on `Project` **or** 1:1 table — recommend **1:1 `ProjectCover`** with `projectId` unique for clearer hard-delete, analogous to attachment row)
- Indexes/FKs Restrict or Cascade as appropriate for 1:1
- Migration additive under `backend/prisma/`; `migrate deploy` only
- Repository maps to domain; Prisma types not DTOs
- Disk path `{PROJECT_COVERS_ROOT}/{projectId}/{coverId}` (Q-159)

## 6. Frontend

- `ProjectCard`: if `cover != null`, authenticated image fetch (blob URL pattern like Kanban covers); else name-derived fallback (Q-158)
- Upload/replace/clear controls in Edit Project Dialog (preferred; no new route)
- Loading/error for broken content; VIEWER sees image only
- `credentials: 'include'`; no bearer in JS

## 7. Files

Expected areas:

- `backend/prisma/schema.prisma` + migration
- `backend/src/modules/projects/` domain/repo/service/dto/validators/controller/routes/tests
- Storage port + Compose `docker-compose.yml` volume + env example
- `frontend` API client types, `ProjectCard`, `EditProjectDialog`, tests

## 8. Dependencies and Config

- New npm packages: **none** expected (reuse multipart approach from 017)
- Env: `PROJECT_COVERS_ROOT` (locked Q-159)
- Docker: named volume `project_covers_data` mounted on backend (locked Q-159)
- Justify: volume required for blob persistence per constitution Article VI pattern used in 017

## 9. Security and Failures

- Authz backend-enforced (Q-157)
- Allowlist + size + sniff (Q-160)
- Compensate disk vs DB on failure (document like 017)
- No AV; educational limits only

## 10. Testing

- Domain/service: single cover, clear/replace, authz mapping
- SuperTest: upload/content/clear; 401/403/404/400; DTO summary; isolation
- Storage adapter temp-dir fixture
- Frontend: card image vs fallback; edit Dialog upload/clear; credentials include

## 11. Sequence

1. Confirm Approved gate (T002)
2. Prisma + storage port + Compose volume
3. Use cases + routes
4. Backend tests
5. Frontend DTO + card + Dialog
6. Frontend tests, typecheck, review, memory

Delivery prerequisite: prefer Verified/Approved 019 first (sequential backlog), but 020 does not technically require 019 code.

## 12. Risks

- Domain confusion with task attachments — mitigate by `projects` ownership + separate volume
- Orphan blobs on crash — compensate like 017
- EDITOR mutate locked (Q-157 Decided OWNER+EDITOR)
- Alternatives: color-only (rejected Q-155); store in Postgres bytea (rejected Q-156); reuse task attachment table (rejected — wrong parent)

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | upload + card | SuperTest + UI |
| AC-002 | content route | SuperTest 401/200 |
| AC-003 | authz | SuperTest |
| AC-004 | validators | SuperTest 400 |
| AC-005 | clear/replace/fallback | API + UI |
| AC-006 | isolation | SuperTest |
| AC-007 | migration + volume | Review |
| AC-008–AC-009 | scope/process | Review |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
