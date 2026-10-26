# Feature Specification: [Feature Name]

- **ID:** [Feature ID]
- **Status:** Draft | In Review | Approved | Implemented | Verified
- **Created:** [YYYY-MM-DD]
- **Related features:** [IDs or None]

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

## 1. Problem

What problem this solves and why it is needed.

## 2. Goals

- [Measurable goal]

## 3. Non-Goals

- [Explicitly excluded behavior]

## 4. Actors and User Stories

### User Story [ID]

As a [actor], I want [capability], so that [benefit].

## 5. Functional Requirements

- **FR-001:** [Required behavior]

## 6. Acceptance Criteria

### Scenario [ID]: [Name]

- Given [initial state]
- When [action]
- Then [observable outcome]

Cover success, validation failures, authorization failures, and relevant edge cases.

## 7. Business Rules

- [Invariant] — owning domain: [domain]

## 8. Data

Business concepts, ownership, uniqueness, lifecycle, and deletion rules. Do not prescribe Prisma details here.

## 9. API and Integrations

Expected capabilities, access rules, and external contracts. HTTP schemas belong in the plan.

## 10. Security

Authentication, resource ownership, role checks, and sensitive data.

## 11. Non-Functional

Relevant performance, reliability, usability, or maintainability needs. Do not invent numeric targets.

## 12. Dependencies

- Existing features:
- Architectural constraints:
- External dependencies:

## 13. Failures and Edge Cases

- [Condition and expected behavior]

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001      | AC-001              | [Test or check] |

## 15. Open Questions

- [Question, owner, status]

## 16. Approval

- Requirements reviewed: [Yes/No]
- Material ambiguities resolved: [Yes/No]
- Approved for planning: [Yes/No]
