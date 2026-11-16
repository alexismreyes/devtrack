# DevTrack — proposed features (later)

Recorded 2026-10-31 so later sessions can pick from this list. **This file is not a specification.** Do not implement from it. Each chosen item still needs Draft `spec.md` / `plan.md` / `tasks.md` and explicit approval.

**Now in focus** (already named in `prompt.md`; specify next, do not treat as done):

- **Dashboard** — **Verified** in `specs/008-dashboard/` (Q-045–Q-050 Decided and implemented).
- **Collaboration** — **Verified** in `specs/009-collaboration/` (Q-051–Q-057 Decided and implemented). Domain `project-members`.

**Already verified (do not re-propose):** foundation, authentication, owner-only projects, tasks, Kanban, workspace UI (shell, palettes, board chrome).

**Deferred platform items (not this list’s job):** Q-006 production images, Q-007 probe retention, Q-009 CI/deployment, Q-015 password complexity, Q-017 rate limit/lockout.

When choosing later work: one SDD feature folder per capability **batch**, not one spec per button. Audit must **not** use IDs `005`–`007` and must not be written as `specs/005-audit/`.

---

## Later candidates (user will prioritize)

IDs below are labels from the 2026-10-31 product discussion, not spec folder IDs.

### Board and task depth

| ID | Feature | Analog | Notes | Size |
| --- | --- | --- | --- | --- |
| D | Comments on a task | Trello/Jira comments | Stronger after collaboration | Medium |
| E | Labels / tags | Trello labels | Filter + card face | Medium |
| F | Checklists / sub-items | Trello checklists | Keep out of Kanban columns at first | Medium |
| G | Card cover / attachments | Trello covers | Needs storage and validation | Large |
| H | Within-column card order | Trello list order | **Verified** in `specs/031-within-column-rank/` | Medium |
| I | Search tasks/projects | Jira/Trello search | Start title/description, authorized scope | Medium |
| J | In-app notifications | Trello/Jira notifications | Better after members + comments | Medium–large |
| K | Calendar / due-date view | Trello/Jira calendar | Uses existing `dueDate` | Medium |
| L | Activity on the card | Trello activity | Can overlap audit | Small–medium |

### Sharing and email

| ID | Feature | Analog | Notes | Size |
| --- | --- | --- | --- | --- |
| M | Invite by email | Trello invite | Needs membership + SMTP; secrets in env only | Large |
| N | Email digest / due reminders | Trello/Jira email | Same mail infra as M | Medium after mail exists |
| O | Public/read-only share link | Trello public board | Security-sensitive | Large |
| P | Email a snapshot to an address | Trello email | Possible without members; spam risk; needs SMTP | Medium |

Do not start with inbound “email to create cards” (Trello email-to-board).

### AI (provider keys on the backend only)

| ID | Feature | Notes | Size |
| --- | --- | --- | --- |
| Q | Suggest project/task description from title | Confirm before save | Small–medium |
| R | Suggest a few tasks from a project/task | Owner confirms; do not auto-create | Medium |
| S | Board assistant chat | Own spec: tools, authz, logging | Large |
| T | Summarize board (overdue / in progress) | Nice after dashboard or calendar | Small–medium |

### Account extras

| ID | Feature | Notes | Size |
| --- | --- | --- | --- |
| C | App-wide CRUD audit log | Later feature ID, not `005`/`006`/`007` | Medium |
| U | Password change / reset | Deferred from `002-authentication` | Medium |
| V | Rate limit / lockout | Q-017 | Medium |
| W | Restore soft-deleted tasks | `deletedAt` exists; no restore API yet | Small |

### Suggested default order after dashboard + collaboration

D comments → Q AI suggest descriptions → M invite by email → E labels and/or K calendar → C audit or L card activity → S assistant chat last among AI.

Skip or delay unless chosen: G attachments, O public boards, H rank, inbound email-to-board.

---

## How to use this file

1. Pick IDs and a priority order in chat.
2. Specify only the next approved item (or a tight batch that belongs together).
3. Move chosen items into `specs/<id>-<name>/` as Draft, then approve, then implement.
4. After a feature is Verified, mark it here as done and point at the spec folder.
