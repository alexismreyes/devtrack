# Implementation Plan: Task Detail Polish

- **Feature ID:** 014-task-detail-polish
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Decided: Q-102–Q-104. Implementation may proceed on T001–T013 only. Frontend-focused polish of Verified 013 TaskDetail / Labels UX. Reuse Verified APIs. No Prisma/migration. No new npm dependency expected. Do not implement checklists (**F**). Do not change `constitution.md`. Do not reopen Verified `013-task-detail-layout` as Draft (Q-104).

## 1. Summary

Polish TaskDetail timeline and Labels UX: (1) reload `GET` activity after successful task Save and after comment create/edit/delete so the right-panel interleaved timeline updates while the Dialog stays open (Q-102); (2) improve timeline spacing so comments and activity read as one Trello-like feed; (3) replace bulky comment Edit/Delete buttons with compact text links; (4) add missing `--popover` / `--popover-foreground` (and `@theme` mappings) across all palettes so `bg-popover` paints an opaque Labels Popover; (5) replace color `<select>` with a nine-token swatch grid + checkmark in LabelsPopover and LabelsDialog (Q-103). No backend work.

## 2. Current State

- `TaskDetail.tsx` loads comments + activity on open; `onSave` updates task + form status only — **does not** call `loadActivity`. Comment create/edit/delete update local `comments` only — **do not** reload activity (`memory.md` known issue).
- `CommentsActivityPanel.tsx` already interleaves comments + non-`COMMENT_ADDED` activity newest-first; list uses `grid gap-3`; Edit/Delete use `Button` `size="sm"` outline/destructive.
- `components/ui/popover.tsx` uses `bg-popover text-popover-foreground`.
- `frontend/src/index.css` defines palette tokens for background/card/etc. but **no** `--popover` / `--popover-foreground`, and `@theme inline` has **no** `--color-popover*` mappings — root cause of translucent Labels popover.
- `LabelsPopover.tsx` and `LabelsDialog.tsx` both use native `<select>` over `LABEL_COLORS` (nine tokens in `labelColors.ts`).
- References present: `templates/card.png`, `templates/tag_modal_issue.png`, `templates/tagcolors.png`.
- Popover peer `@radix-ui/react-popover` already present from 013.

## 3. Domain Boundaries

- Owning domain: **`tasks`** (no new domain; no backend module changes expected).
- Other domains: none touched.
- Invariants: unchanged comments/activity/labels rules; still no label activity emission; still no activity emit on comment edit/delete.
- Cross-domain interfaces: none new.
- Dependency direction: frontend → HTTP APIs only.
- Controller/service/repository/DTO/routes: **no changes expected**.

## 4. API Contract

No new endpoints and no intentional contract changes. Reuse:

| Method / path | Auth | Notes |
| --- | --- | --- |
| `PATCH /api/tasks/:taskId` | session + task write | Existing; after success, client reloads activity (Q-102) |
| `POST/PATCH/DELETE /api/tasks/:taskId/comments` | Verified 010 | Existing; after success, keep comments sync + reload activity (Q-102) |
| `GET /api/tasks/:taskId/activity` | Verified 011 | Existing; client still filters out `COMMENT_ADDED` for display (Q-100) |
| Labels catalog / replace-set | Verified 012 | Unchanged; color body still one of nine tokens |

If implementation discovers a needed contract change, stop and amend this plan before coding.

## 5. Persistence

- Prisma model changes: **none expected**
- Migration implications: **none**
- Repository / transactions: **none**
- Compatibility risks: none for DB; UI must remain compatible with existing DTOs and nine color tokens

## 6. Frontend

### Live activity reload (Q-102)

- In `TaskDetail.tsx`, after successful `onSave`, call existing `loadActivity()` (await or fire-and-track errors without rolling back the saved task).
- After successful `onCreateComment`, `onSaveComment`, and `onDeleteComment`, keep current comments list updates and additionally call `loadActivity()`.
- Prefer not introducing a full TaskDetail remount; reuse the existing `loadActivity` callback.
- Failed activity reload: set `activityLoadState` error/status; do not revert successful task/comment local state (AC-010).

### Timeline spacing (FR-003)

- In `CommentsActivityPanel`, increase vertical rhythm / separators (e.g. larger gap, subtle dividers, or padded items) so comment and activity rows are easier to scan. Keep newest-first merge and omit `COMMENT_ADDED`. Do not split back into two sections.

### Comment action links (FR-004)

- Replace idle Edit / Delete `Button`s with compact text-link controls (`button` elements styled as links, or `variant="link"` if the existing Button primitive supports a true compact link look without bulky padding). Preserve accessible names (“Edit comment”, “Delete comment”), disabled states, and destructive emphasis for Delete (e.g. destructive text color).
- Cancel edit: prefer text link; Save comment may remain a small button.

### Opaque popover tokens (FR-005)

- In `index.css` `@theme inline`, add `--color-popover` / `--color-popover-foreground` mapping to `var(--popover)` / `var(--popover-foreground)`.
- For `:root` and every `[data-palette="…"]` block, define `--popover` and `--popover-foreground`. Default approach: mirror `--card` / `--card-foreground` (opaque surface) unless a palette needs a distinct solid. Ensure gradient palettes still get solid popover values (not transparent).
- Do not add a second CSS framework. No `next-themes`.

### Swatch color picker (Q-103)

- Add a small shared presentational control (e.g. `LabelColorSwatchPicker` under `frontend/src/tasks/`) that renders the nine `LABEL_COLORS` as buttons/radiogroup swatches using existing `labelChipClassName` colors, shows a checkmark (lucide `Check` already available via `lucide-react`) on the selected token, and calls `onChange(LabelColor)`.
- Replace create/edit `<select>`s in `LabelsPopover.tsx` and `LabelsDialog.tsx` with that control.
- Keep submitting the same token strings via existing `createLabel` / `updateLabel` clients.
- Update tests that currently `user.selectOptions` on color selects to click swatches instead.

### Out of scope visuals

- Do not redesign the 013 two-column shell, Labels apply-on-close / Escape discard, or board Labels Dialog presence beyond color picker + any incidental shared helper.

## 7. Files

Expected touch set (adjust only as inspection during T001 confirms):

| File | Responsibility |
| --- | --- |
| `frontend/src/tasks/TaskDetail.tsx` | Call `loadActivity` after Save + comment mutations |
| `frontend/src/tasks/TaskDetail.test.tsx` | Assert activity GET after Save / comment create (and edit/delete) |
| `frontend/src/tasks/CommentsActivityPanel.tsx` | Timeline spacing; comment action text links |
| `frontend/src/tasks/CommentsActivityPanel.test.tsx` | Link affordances + timeline structure |
| `frontend/src/tasks/LabelsPopover.tsx` | Swatch picker instead of color select |
| `frontend/src/tasks/LabelsPopover.test.tsx` | Swatch selection instead of selectOptions |
| `frontend/src/tasks/LabelsDialog.tsx` | Same swatch picker |
| `frontend/src/tasks/LabelsDialog.test.tsx` | Swatch selection |
| `frontend/src/tasks/LabelColorSwatchPicker.tsx` (new, preferred) | Shared nine-token grid + checkmark |
| `frontend/src/tasks/labelColors.ts` | Reuse; change only if swatch helper belongs here |
| `frontend/src/index.css` | `--popover` / `--popover-foreground` + `@theme` mappings for all palettes |
| `frontend/src/components/ui/popover.tsx` | **No change expected** (already uses `bg-popover`) |
| `frontend/src/api/client.ts` / `types.ts` | **No change expected** |
| `backend/**` | **No change expected** |

## 8. Dependencies and Config

- New packages: **none expected**.
- Env / Docker: unchanged.
- Node 22 for verification (nvm), matching project convention.

## 9. Security and Failures

- Do not weaken VIEWER / archived / 401 handling.
- Activity reload failure must not undo successful mutations.
- Swatch controls must remain disabled when catalog mutations are busy or actor cannot write.
- Escape discard / apply-on-close Labels behavior from 013 must remain intact.

## 10. Testing

| Area | Approach |
| --- | --- |
| Activity after Save | Mock `PATCH` success then assert `GET .../activity` and timeline shows new event |
| Activity after comment create/edit/delete | Assert activity GET after each successful mutation; comments list still updates |
| Timeline spacing / structure | Role/list assertions; omit `COMMENT_ADDED` regression |
| Comment links | Query by role/name; assert not bulky dual outline buttons for idle Edit/Delete |
| Popover tokens | Assert CSS variables present on document/palette (unit or style check) and/or that popover content uses opaque resolved background |
| Swatches | Click token; assert selected checkmark / aria; create/update payloads still use token strings; no color `<select>` in popover/dialog forms |
| Authz / archived | Existing disablement paths preserved |
| Backend | No new suites; frontend typecheck/tests only |

## 11. Sequence

1. Confirm Approval (Q-102–Q-104 already Decided; artifacts leave Draft).
2. Inspect TaskDetail / CommentsActivityPanel / Labels* / index.css / tests (T001).
3. Add popover CSS tokens across palettes.
4. Wire activity reload after Save + comment mutations; update TaskDetail tests.
5. Timeline spacing + comment text links.
6. Shared swatch picker; replace selects in LabelsPopover + LabelsDialog; update tests.
7. Frontend typecheck + tests; AC checklist; independent review; memory update proposal.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Activity reload races with rapid Save/comment | Serialize via existing action busy flags; last successful load wins |
| Double-fetch noise after comment create (COMMENT_ADDED omitted) | Accept harmless reload for consistency (Q-102) |
| Popover token contrast on dark/gradient palettes | Derive from card/foreground; spot-check Midnight/Twilight/Magma |
| Breaking Labels apply-close / Escape while editing color UI | Keep swatch inside existing create/edit forms; no Popover API change |
| Accidental API/schema work | Plan forbids; stop if unavoidable |
| Test churn on selectOptions helpers | Update Labels* tests explicitly to swatch clicks |

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | `loadActivity` after task Save | TaskDetail tests |
| AC-002 / AC-003 | `loadActivity` after comment mutations | TaskDetail tests |
| AC-004 | CommentsActivityPanel spacing | Panel / TaskDetail tests + inspection |
| AC-005 | Text-link Edit/Delete | CommentsActivityPanel tests |
| AC-006 | `index.css` popover tokens + theme map | CSS/theme tests or inspection |
| AC-007 / AC-008 | Shared swatch in Popover + Dialog | LabelsPopover / LabelsDialog tests |
| AC-009 | Non-goals / no migration / 014 folder | Review + repo inspection |
| AC-010 | Authz + failed reload handling | Existing + updated UI tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (Q-102–Q-104 Decided)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
