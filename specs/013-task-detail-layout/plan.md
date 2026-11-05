# Implementation Plan: Task Detail Layout

- **Feature ID:** 013-task-detail-layout
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Decided: Q-094–Q-101. Implementation may proceed on T001–T012 only. Frontend-focused amend of TaskDetail modeled on `templates/card.png`. Reuse Verified APIs. No Prisma/migration expected. **New documented npm peer dependency for this feature:** `@radix-ui/react-popover` plus copied shadcn `popover` (Q-101 Option 2). Do not implement checklists (**F**). Do not change `constitution.md`.

## 1. Summary

Restructure `frontend/src/tasks/TaskDetail.tsx` (and thin helpers) into a two-column card composition inside the existing `TasksPanel` Dialog: main column for title, Labels action, assigned chips, and existing field editors; side column for a unified “Comments & activity” panel with compose on top and a newest-first interleaved timeline that omits `COMMENT_ADDED` activity rows (Q-100). Replace inline label checkbox + Save labels with a Labels Popover (shadcn + `@radix-ui/react-popover`) that searches, toggles optimistically, edits/creates catalog labels for writers, applies `replaceTaskLabels` on outside-click / Done/close, and discards on Escape (Q-099). Keep `LabelsDialog` on the board header. Flatten redundant nested Card chrome to reduce saturation. No backend contract or schema work.

## 2. Current State

- TaskDetail lives in `frontend/src/tasks/TaskDetail.tsx`, hosted by `TasksPanel` Dialog (`DialogContent` + sr-only title). Uses nested `Card` / `CardHeader` / `CardContent`.
- Labels: chips + full catalog checkbox list + **Save labels** button calling `replaceTaskLabels`. Catalog CRUD is board-header `LabelsDialog` only.
- Comments section and Activity section are separate, stacked; comments list oldest-first (API order); activity newest-first.
- UI primitives present: `button`, `input`, `label`, `card`, `textarea`, `dialog`. **No** Popover primitive yet; **no** `@radix-ui/react-popover` yet (to be added per Q-101).
- Client helpers already exist for comments, activity, labels catalog, and replace-set.
- Verified authz props: `canWrite`, `canManageMembers`, `currentUserId`, `archived`.

## 3. Domain Boundaries

- Owning domain: **`tasks`** (no new domain; no backend module changes expected).
- Other domains: none touched.
- Invariants: unchanged comments/activity/labels rules; no label activity emission.
- Cross-domain interfaces: none new.
- Dependency direction: frontend → HTTP APIs only.
- Controller/service/repository/DTO/routes: **no changes expected**.

## 4. API Contract

No new endpoints and no intentional contract changes. Reuse:

| Method / path | Auth | Notes |
| --- | --- | --- |
| `GET/PATCH/DELETE /api/tasks/:taskId` | session + task read/write | Existing fields |
| `GET/POST/PATCH/DELETE /api/tasks/:taskId/comments` | Verified 010 | Unchanged |
| `GET /api/tasks/:taskId/activity` | Verified 011 | Unchanged; client filters out `COMMENT_ADDED` for interleaved display (Q-100) |
| `GET/POST/PATCH/DELETE /api/projects/:projectId/labels` | Verified 012 | Unchanged; used from popover + LabelsDialog |
| `PUT /api/tasks/:taskId/labels` | Verified 012 | Body `{ labelIds }`; called on Labels popover apply-close (outside click / Done/close), not Escape discard (Q-094, Q-099) |

If implementation discovers a needed contract change, stop and amend this plan before coding.

## 5. Persistence

- Prisma model changes: **none expected**
- Migration implications: **none**
- Repository / transactions: **none**
- Compatibility risks: none for DB; UI must remain compatible with existing DTOs (`PublicTaskDto.labels`, comment/activity shapes)

## 6. Frontend

### Layout shell

- Widen/relax `TasksPanel` `DialogContent` as needed for two columns (still max-height scroll).
- Refactor TaskDetail away from nested Card-in-Card saturation (prefer a single dialog body composition with clear regions).
- CSS grid: `md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]` (or similar); default single column main→side (Q-098).
- Main: heading/title, action row (**Labels** only), `LabelChips`, description + existing editors (title/description/dueDate/status/priority), save/delete task controls for writers.
- Side: “Comments & activity” heading; compose form; interleaved feed.

### Labels popover (Q-094 / Q-095 / Q-097 / Q-099 / Q-101)

- Trigger: Labels button in action row.
- Panel: copied shadcn `Popover` + `@radix-ui/react-popover` (Q-101 Option 2) with search input, filtered checkbox list (color + name), edit affordance opening inline edit (name/color), create-new form/button.
- State: `draftLabelIds` while open; seed from persisted `task.labels` on open.
- On apply-close (outside click, Done/close control if any): if writable and draft ≠ persisted, `replaceTaskLabels`; update chips/`task.labels`; surface errors (Q-099).
- On Escape: discard draft; restore last persisted selection; **no** apply PUT (Q-099).
- Skip PUT when unchanged on apply-close.
- VIEWER: openable read-only list (no checkboxes mutate / no create-edit) or disabled mutation controls.
- Keep `LabelsDialog` wired in `ProjectDetail` board header; after catalog create/edit in popover, refresh local catalog and notify parent board refresh if chips on cards need update (`onUpdated` / existing catalog-changed patterns).
- Nested focus: ensure Popover dismiss does not accidentally close the parent task Dialog; verify Escape closes Popover (discard) without closing Dialog unless Popover is already closed.

### Comments & activity (Q-096 / Q-100)

- Compose at top (writers); preserve create/edit/delete behaviors and authz helpers already in TaskDetail.
- Build a merged timeline array client-side: map live comments and activity (excluding `COMMENT_ADDED`) to a common render model keyed by `createdAt` (+ stable id); sort **descending** (Q-100).
- Preserve loading/error/empty messaging without requiring a backend merge endpoint.

### Visual

- Follow `templates/card.png` structure (columns, Labels popover anatomy, side panel) with DevTrack English copy and existing palette tokens.
- Do not add fake Dates/Checklist/Attachment actions.
- Do not add colorblind-mode control from the reference.

### State / errors

- Keep existing load/action state machines where practical; extract small presentational components if TaskDetail size demands it (`LabelsPopover`, `CommentsActivityPanel`) under `frontend/src/tasks/`.
- Credentials remain `include` via existing client.

## 7. Files

Expected touch set (adjust only as inspection during T001 confirms):

| File | Responsibility |
| --- | --- |
| `frontend/package.json` / lockfile | Add `@radix-ui/react-popover` (Q-101) |
| `frontend/src/components/ui/popover.tsx` (new) | Copied shadcn Popover primitive |
| `frontend/src/tasks/TaskDetail.tsx` | Layout refactor; wire popover + interleaved panel; remove Save labels |
| `frontend/src/tasks/TaskDetail.test.tsx` | Layout/Labels/timeline/regression tests |
| `frontend/src/tasks/LabelsPopover.tsx` (new, optional) | Search, checkboxes, edit/create, apply-close / Escape-discard |
| `frontend/src/tasks/LabelsPopover.test.tsx` (optional) | Popover unit tests |
| `frontend/src/tasks/CommentsActivityPanel.tsx` (new, optional) | Compose + interleaved list (omit `COMMENT_ADDED`) |
| `frontend/src/tasks/LabelsDialog.tsx` | Keep; minor shared helper extract only if needed |
| `frontend/src/tasks/TasksPanel.tsx` | DialogContent sizing for wider card |
| `frontend/src/tasks/LabelChips.tsx` | Reuse; change only if layout needs |
| `frontend/src/api/client.ts` / `types.ts` | **No change expected** |
| `backend/**` | **No change expected** |

## 8. Dependencies and Config

- New packages: **`@radix-ui/react-popover`** as an explicit documented peer dependency for this feature (Q-101 Option 2), plus copied `frontend/src/components/ui/popover.tsx` following the existing Dialog/shadcn pattern. No second CSS framework.
- Env / Docker: unchanged.
- Node 22 for verification (nvm), matching project convention.

## 9. Security and Failures

- Do not weaken VIEWER / archived / 401 handling.
- On failed apply-close PUT: restore or keep draft visible with error; do not update board as success.
- Nested focus: Labels Popover dismiss must not accidentally close the parent task Dialog. Catalog edit subflow should not lose errors on accidental dismiss mid-request.

## 10. Testing

| Area | Approach |
| --- | --- |
| Layout md / stack | Testing Library + class/role assertions and/or resize where practical; document any pure CSS breakpoint limits |
| Labels-only action row | Assert Labels present; Dates/Checklist/Attachment absent |
| Chips | Assigned labels visible without opening popover |
| Popover | Search filter; optimistic toggle without PUT; PUT on outside-click/Done close when changed; Escape discards without PUT; skip when unchanged; writer vs VIEWER |
| Catalog in popover | Create/edit calls existing client helpers; board LabelsDialog still mounts |
| Timeline | Newest-first merge; omit `COMMENT_ADDED` (Q-100); compose on top |
| Authz / archived | Existing disablement + error paths preserved |
| Backend | No new suites; run frontend typecheck/tests; optional smoke that client contracts untouched |

## 11. Sequence

1. Confirm Approval (Q-094–Q-101 already Decided).
2. Inspect TaskDetail/TasksPanel/LabelsDialog tests; extract helpers as needed without behavior change.
3. Add `@radix-ui/react-popover` + copied shadcn `popover` primitive.
4. Flatten chrome + two-column shell (main/side) with stacked fallback.
5. Add Labels Popover; remove inline Save labels; wire apply-on-close + Escape discard.
6. Add catalog create/edit in popover; keep LabelsDialog.
7. Build Comments & activity interleaved panel (omit `COMMENT_ADDED`); move compose.
8. Frontend tests + typecheck; independent review; memory update proposal.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Focus trap: Popover inside Dialog | Use Radix Popover with controlled open; stop propagation; test Escape closes Popover without Dialog |
| Escape closes Dialog instead of popover | Handle per Q-099 discard; verify in tests |
| Duplicate comment/`COMMENT_ADDED` noise | Omit `COMMENT_ADDED` from interleaved list (Q-100) |
| TaskDetail file size / complexity | Extract popover + side panel components |
| Accidental API/schema work | Plan forbids; stop if unavoidable |
| Visual “AI purple” / Trello clone drift | Use existing tokens; English copy; reference structure only |

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Two-column grid `md+` | TaskDetail tests / inspection |
| AC-002 | Stacked grid below `md` | TaskDetail tests / inspection |
| AC-003 | Labels-only action row | TaskDetail tests |
| AC-004 | Main-column chips | TaskDetail tests |
| AC-005 | Labels Popover UX | LabelsPopover/TaskDetail tests |
| AC-006 / AC-007 | Apply-close + Escape discard + optimistic toggles | Client mock assertions |
| AC-008 | Popover + LabelsDialog | ProjectDetail + TaskDetail tests |
| AC-009 | Interleaved panel omit `COMMENT_ADDED` | TaskDetail tests |
| AC-010 | Non-goals / no migration | Review + repo inspection |
| AC-011 | Flatten Card chrome | Inspection + test that Card nesting reduced |
| AC-012 | Authz/archived | Existing + updated UI tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (Q-094–Q-101 Decided)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
