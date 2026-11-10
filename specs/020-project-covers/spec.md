# Feature Specification: Project Covers

- **ID:** 020-project-covers
- **Status:** Verified
- **Created:** 2026-11-09
- **Related features:** 007-workspace-ui (Verified; Q-036/Q-039 name-derived covers — **reopened** here); 017-task-attachments (Verified storage pattern); 009-collaboration (Verified membership); 018-custom-task-statuses (Verified); delivery after Verified 019

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product questions **Q-155–Q-161** are **Decided** (section 15). This feature **reopens** Verified 007’s name-derived-only project cover decision (Q-036 / Q-039) for **uploaded image** covers. Follow the **attachments-like** storage pattern (Compose named volume + authenticated content). Do **not** invent task notes. Do **not** implement **H**, **C**, or `specs/005-audit/`. Do **not** change `constitution.md`.

This ID is **020-project-covers**.

## 1. Problem

`/projects` cards still use **name-derived color + initials** covers only (007 Q-036 / Q-039). Users want a real **project cover image** (not color-only), stored and served safely like task attachments (017): bytes on a Compose volume, metadata in PostgreSQL, download only after session + resource authz.

## 2. Goals

- Let authorized actors upload, replace, clear, and view a **single image cover** per project (Q-155).
- Persist metadata in PostgreSQL and binary content on a **Compose named volume** with **authenticated** content routes (Q-156; attachments-like).
- Show uploaded covers on the `/projects` card grid; when no cover is set, fall back per Decided answer to Q-158.
- Own cover rules under the **`projects`** domain (project resource), reusing membership authz ports — not a peer `covers` domain and not task attachments.
- Additive Prisma migration only; no `migrate reset` / unauthorized volume delete.
- Leave task notes, task attachment reopen beyond pattern reuse, feed pagination, dashboard charts, **H**, and **C** out of this folder.

## 3. Non-Goals

- Task notes.
- Color-only project covers as the primary product (image is required capability); name-derived remains fallback only when cover is null (Q-158).
- Reusing task attachment rows as project covers (different parent resource).
- Production object storage / CDN; antivirus gateway.
- Within-column rank (**H**); app-wide audit (**C**); `specs/005-audit/`.
- Comments/activity pagination (021); dashboard charts (022); UI polish owned by 019 except consuming cover on cards.
- Changing `constitution.md`.
- Soft-delete of cover blobs with GC policies beyond Decided clear/replace/delete rules.
- Microservices or generic repository.

## 4. Actors and User Stories

### User Story US-001

As an authorized project writer, I want to upload an image as the project cover, so that the `/projects` grid is visually distinctive.

### User Story US-002

As a member who can see a project on the list, I want to see that project’s cover image (authenticated), so that covers are not public unsigned URLs.

### User Story US-003

As an authorized writer, I want to clear or replace the cover, so that I can update branding without deleting the project.

### User Story US-004

As a developer, I want project covers owned by `projects` with an attachments-like storage port, so that 017 patterns stay educational and domain boundaries stay clear.

## 5. Functional Requirements

Requirements bind to Decided Q-155–Q-161.

- **FR-001:** The system MUST support **at most one** active image cover per project (replace overwrites or replaces prior blob+metadata per plan). Client MUST NOT supply cover identity/createdAt.
- **FR-002:** Cover binary MUST live on Compose named volume `project_covers_data` with env `PROJECT_COVERS_ROOT` (Q-159); metadata in PostgreSQL via Prisma behind the owning **`projects`** repository. Path layout MUST follow attachments-like `{PROJECT_COVERS_ROOT}/{projectId}/...` (exact key shape in plan).
- **FR-003:** Upload MUST be multipart under the project. Content GET MUST stream bytes only after authentication + resource authorization. Responses MUST use `Cache-Control: private` (or equivalent non-public caching). No open public/unsigned cover URLs.
- **FR-004:** Mutate authz MUST be OWNER+EDITOR (`requireProjectWrite`-style) per Decided Q-157. Read/list/content MUST follow project read / list visibility already used for `/projects` cards (membership-authorized listed projects). Unauthenticated → `401`. Non-member on existing project → `403`. Missing project → `404`.
- **FR-005:** Archived-parent mutation behavior MUST match existing project write rules for OWNER+EDITOR mutators (Q-157; same as project name/description PATCH).
- **FR-006:** Allowlist, max size, and sniffing MUST follow Decided Q-160: `image/jpeg|png|webp|gif` only; **5 MiB** max; magic sniff; no AV; images only (no PDF/text).
- **FR-007:** Clear cover MUST follow Decided Q-161: explicit clear removes active cover metadata + blob without deleting the project. Replace MUST hard-delete the prior blob and leave exactly one active cover.
- **FR-008:** When no cover is stored, `/projects` card presentation MUST use **name-derived color + initials** fallback (Q-158).
- **FR-009:** Public project DTOs used by the grid MUST expose a cover summary suitable for authenticated content fetch (opaque id + content type), not raw filesystem paths and not embedded bytes.
- **FR-010:** Modular monolith: **`projects`** owns cover invariants/use cases/storage port usage. `tasks` MUST NOT own project covers. No circular domain imports. Controllers MUST NOT query DB or disk ad hoc beyond ports.
- **FR-011:** Additive versioned Prisma migration only. No `migrate reset` / volume delete without authorization. Prisma types MUST NOT be public DTOs.
- **FR-012:** External input validated with Zod at HTTP boundaries. Error envelope `{ error: { code, message } }`. No secrets/stack traces/hashes/absolute host paths in JSON.
- **FR-013:** React `/projects` grid MUST render uploaded covers via authenticated fetch (`credentials: 'include'`). Writers get upload/clear/replace UI (placement: project edit Dialog and/or card affordance — lock in plan without inventing a new destination).
- **FR-014:** Domain cover identity, project association, authz-vs-auth, and storage key invariants MUST be testable without HTTP where practical. API + critical UI tested with Vitest / Testing Library / SuperTest.
- **FR-015:** MUST NOT implement task notes, **H**, **C**, 021 pagination, or 022 charts. MUST NOT change `constitution.md`. Compose remains three primary services; an additional named volume for cover blobs is allowed (Article VI).

## 6. Acceptance Criteria

### Scenario AC-001: Upload and display

- Given an authorized writer on an active project
- When they upload an allowlisted image as the project cover
- Then metadata is persisted and bytes are stored on the Compose volume path layout
- Then `/projects` card for that project shows the image via authenticated content

### Scenario AC-002: Authenticated content only

- Given a project with a cover
- When a member authorized to see the project requests content
- Then bytes are returned after session + resource checks
- When unauthenticated
- Then `401` and no public unsigned URL serves the file

### Scenario AC-003: Mutate authz

- Given Decided Q-157 roles
- When a caller lacking mutate permission uploads/clears/replaces
- Then `403` (or mapped archived behavior)
- When a permitted writer mutates
- Then success

### Scenario AC-004: Validation

- Given Decided allowlist/size (Q-160)
- When disallowed type or oversized upload is sent
- Then `400` `VALIDATION_ERROR` and no persisted cover blob/metadata

### Scenario AC-005: Clear / replace / fallback

- Given a project with a cover
- When cover is cleared (Q-161)
- Then content is gone from the card and fallback (Q-158) applies
- When cover is replaced
- Then only the new image is active

### Scenario AC-006: Isolation

- Given project A with a cover owned/shared per membership rules
- When user B is not authorized on A
- Then B cannot read A’s cover content (`403`/`404` as mapped)

### Scenario AC-007: Additive migration + volume

- Given schema + Compose changes
- When applied
- Then migration is additive; `migrate deploy` only; no reset/unauthorized volume delete
- Then `constitution.md` unmodified

### Scenario AC-008: Non-goals hold

- Given this feature
- When implemented
- Then task notes, **H**, **C**, 021, and 022 are not implemented by this folder
- Then 007 name-derived-only decision is superseded only for projects that have an uploaded cover (fallback per Q-158)

### Scenario AC-009: Approval gate

- Given these artifacts are **Approved** (Q-155–Q-161 Decided)
- When implementation is requested
- Then work may proceed on T001–T016 only

## 7. Business Rules

- At most one active project cover image — owning domain: `projects`
- Cover bytes are not publicly cacheable without auth — owning domain: `projects`
- Name-derived cover remains non-persisted presentation unless/until a cover exists (Q-158) — owning domain: frontend + `projects` summary

## 8. Data

- Business concept: Project cover image (metadata + blob), 0..1 per project.
- Lifecycle: upload creates/replaces; clear removes active cover; project archive/delete rules do not invent GC beyond Decided mutate/clear (record orphan policy in plan: hard-delete blob on clear/replace).
- Uniqueness: one active cover pointer/row per project.

## 9. API and Integrations

Expected capabilities (HTTP schemas in plan):

- Authenticated multipart upload / replace under `/api/projects/:projectId/...`
- Authenticated clear
- Authenticated content GET
- Additive cover summary on public project DTO used by list/get

## 10. Security

- Session cookie `devtrack_session` required for mutate and content.
- Resource-level authz in backend (Q-157). Frontend hiding is not authorization.
- Magic sniff + allowlist; do not trust client `Content-Type` alone when sniff is practical.
- No secrets in responses; `Cache-Control: private` on content.

## 11. Non-Functional

Educational clarity over enterprise DLP. Prefer mirroring 017 storage port patterns for teachability.

## 12. Dependencies

- Existing features: 003/007/009 projects+UI+membership; 017 attachments storage pattern
- Architectural constraints: constitution Articles II–VI, VIII
- External dependencies: none beyond existing multipart/fs patterns; no new chart libs

## 13. Failures and Edge Cases

- Replace failure after blob write: compensate / transactional story in plan (metadata vs disk), matching 017 educational approach.
- Soft-deleted tasks irrelevant; project missing → 404.
- Theme retint of name-derived fallback may remain (007 known issue) when fallback is shown.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-003 | AC-001, AC-002, AC-007 | SuperTest + storage fixture |
| FR-004–FR-005 | AC-003, AC-006 | SuperTest authz |
| FR-006 | AC-004 | Validation tests |
| FR-007–FR-009 | AC-001, AC-005 | API + UI |
| FR-010–FR-015 | AC-007–AC-009 | Review |

## 15. Open Questions

- **Q-155:** Cover medium. Owner: product. Status: **Decided**. Project cover is an **IMAGE upload** (not color-only). Reopens/supersedes 007 Q-036/Q-039 name-derived-only as the sole cover mechanism.
- **Q-156:** Storage. Owner: architecture. Status: **Decided**. Follow attachments-like pattern: Compose named volume + authenticated content routes; metadata in PostgreSQL; no public unsigned URLs.
- **Q-157:** Who may upload/replace/clear. Owner: product + `projects`. Status: **Decided**. Same as project name/description write — **OWNER + EDITOR** (`requireProjectWrite`-style); VIEWER read-only; archived mutations match project PATCH rules.
- **Q-158:** Null cover presentation. Owner: product + frontend. Status: **Decided**. Keep **name-derived color + initials** fallback when no cover image is set.
- **Q-159:** Volume / env. Owner: architecture. Status: **Decided**. Dedicated Compose volume `project_covers_data` + env `PROJECT_COVERS_ROOT` (do not store project covers under task `attachments_data` paths).
- **Q-160:** Allowlist and size. Owner: product + security. Status: **Decided**. `image/jpeg|png|webp|gif` only; **5 MiB** max; magic sniff; no AV; exactly one cover per project (replace).
- **Q-161:** Clear vs delete. Owner: product. Status: **Decided**. Explicit **clear** removes active cover metadata + blob without deleting the project; replace hard-deletes prior blob.

Cross-cutting locks: skip task notes; exclude **H**; exclude **C** / `specs/005-audit/`; do not change `constitution.md`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-155–Q-161 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes (T001–T016); non-blocking notes in `tasks.md` / `memory.md`
