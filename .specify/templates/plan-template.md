# Implementation Plan: [Feature Name]

- **Feature ID:** [Feature ID]
- **Specification:** `spec.md`
- **Status:** Draft | In Review | Approved | Implemented | Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

## 1. Summary

Technical approach and how it satisfies the spec.

## 2. Current State

Existing modules, conventions, dependencies, and limitations.

## 3. Domain Boundaries

- Owning domain:
- Other domains:
- Invariants:
- Cross-domain interfaces:
- Dependency direction:
- Controller, service, repository, DTOs, routes, validators, domain objects:

## 4. API Contract

For each endpoint:

- Method and path
- Auth
- Request DTO
- Response DTO
- Validation and status codes
- Error cases

## 5. Persistence

- Prisma model changes
- Relationships, constraints, indexes
- Migration implications
- Repository contracts
- Transactions
- Compatibility risks

Do not expose Prisma models as domain entities or API DTOs.

## 6. Frontend

Pages, components, API integration, state, loading and error states.

## 7. Files

Expected files and each file's responsibility.

## 8. Dependencies and Config

New packages, env vars, Docker changes. Justify each new dependency.

## 9. Security and Failures

Authorization, validation, data integrity, error mapping.

## 10. Testing

Map requirements to unit, service, repository, API, and frontend tests.

## 11. Sequence

Safe implementation order and prerequisites.

## 12. Risks

Material risks and alternatives considered.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001               | [Use case]     | [Test]       |

## 14. Approval

- Specification reviewed: [Yes/No]
- Architecture reviewed: [Yes/No]
- Risks understood: [Yes/No]
- Approved for task breakdown: [Yes/No]
