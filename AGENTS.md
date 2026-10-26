# AGENTS.md — DevTrack

## Mission

Build DevTrack as a secure, maintainable educational full-stack app using SDD and DDD.

Before significant work, read `constitution.md`, `prompt.md`, and `memory.md`, then inspect the repository.

## Source of truth

1. Safety and security requirements
2. `constitution.md`
3. Approved feature specs and architectural decisions that comply with the constitution
4. This file and `.cursor/skills/sdd-workflow/SKILL.md`
5. Verified source, tests, and migrations
6. `memory.md` (correct it when stale)
7. Local preferences that do not conflict with the above

Report conflicts instead of guessing.

## Workflow

For significant features:

1. Specify → `specs/<id>-<feature>/spec.md`
2. Plan → `plan.md`
3. Tasks → `tasks.md`
4. Get approval
5. Implement only the approved scope
6. Run relevant checks
7. Independent review
8. Update memory

Use `.cursor/skills/sdd-workflow/SKILL.md`. Never mark planned work as implemented without evidence.

## Specialists

| Agent | Role |
| --- | --- |
| `planner` | Specs, architecture, plans, tasks |
| `implementer` | Approved tasks, code, tests, honest verification |
| `reviewer` | Independent spec, architecture, security, and test review |

The main agent coordinates. Specialists cannot override the constitution.

If delegation is unavailable, follow the same workflow directly.

## Delegation

Launch a new subagent for each stage. Do not resume a planner to implement, an implementer to review, or a reviewer to fix.

Pass a short brief: goal, feature ID, artifact paths, task IDs, decided constraints. Do not paste conversation history, governing docs, specs, diffs, or logs. Subagents read files themselves.

Keep only the compact return in this conversation.

## Agent rules

- Follow `constitution.md` for DDD, Prisma, Docker, TypeScript, and security.
- Preserve existing user work.
- Stay inside approved scope.
- Do not silently change API contracts or schema behavior.
- Never claim tests passed without running them.
- Never run destructive database or Docker operations without explicit authorization.

## Completion report

1. What changed
2. Domains and files
3. Architectural decisions
4. Commands run and actual results
5. Migrations or configuration
6. Known issues and unverified behavior
7. Memory and docs updates
