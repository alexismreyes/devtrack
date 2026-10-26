---
name: sdd-workflow
description: Manage DevTrack Spec-Driven Development from requirements through specifications, technical plans, task approval, implementation, independent review, verification, and memory updates. Use for every significant feature, API change, database change, or architectural change.
---

# DevTrack SDD Workflow

Coordinate specification-first development. Prevent unplanned implementation.

You are the parent coordinator. Specialists run in isolated subagents. Keep this conversation small.

## Delegation protocol

Launch a **new** subagent for each stage. Never resume `planner` to implement, `implementer` to review, or `reviewer` to fix.

Pass a short brief only. Subagents have a clean context and read files themselves.

**Pass**

- Goal (1–2 sentences)
- Feature ID
- Artifact paths
- Task IDs (implementer)
- Constraints already decided (bullets)
- What to return

**Do not pass**

- Conversation history
- Contents of constitution, prompt, AGENTS, memory, spec, plan, or tasks
- Diffs, logs, or pasted source

For a large feature, launch several implementer subagents (for example backend, then frontend), not one agent that accumulates the whole feature.

After a subagent returns, keep only its compact result. Do not re-paste working notes.

If named subagents cannot be delegated, follow the same workflow yourself.

## 1. Load context

Read `constitution.md`, `prompt.md`, `AGENTS.md`, and `memory.md`. Inspect the repo and relevant `specs/` paths. Verify status from the repository.

## 2. Classify

New feature, change, defect, architectural decision, docs-only, or small maintenance.

Docs-only and narrow maintenance may be lighter. Behavioral, API, schema, security, or architecture changes need the full workflow.

Update the existing feature folder when the work belongs there.

## 3. Specify

New `planner` subagent.

Path: `specs/<feature-id>-<feature-name>/`  
Templates: `.specify/templates/`  
Required: `spec.md`, `plan.md`, `tasks.md`

Ask the user when a material decision cannot be derived. Do not invent business rules. Keep artifacts Draft until approved.

## 4. Validate and approve

Confirm testable acceptance criteria, domain ownership, Prisma/migration safety, API contracts, tasks matching the plan, and resolved questions.

Present artifacts and wait for explicit approval. An approved plan does not authorize unrelated work.

## 5. Implement

New `implementer` subagent with feature ID, artifact paths, and task IDs.

If design is wrong, pause, update artifacts, re-approve if needed, then launch a new implementer.

Never run destructive database resets or delete persistent volumes without explicit authorization.

## 6. Verify and review

Require real commands and real results. Record skipped checks as unverified.

New `reviewer` subagent. If it blocks, launch a new implementer with finding summaries and paths, then a new reviewer.

## 7. Close and remember

Verified only when acceptance criteria have evidence, blockers are gone, migrations/docs exist, and task status matches reality.

Update `memory.md` with verified status, decisions, migrations, actual results, known issues, and the next approved task. Correct memory when it disagrees with the repo.

States: Draft, In Review, Approved, Implemented, Verified.

## Final report

Feature ID, artifact paths, domains changed, migrations, verification results, reviewer verdict, memory updates, remaining risks.
