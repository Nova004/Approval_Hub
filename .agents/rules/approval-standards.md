# Approval Hub Architectural & Engineering Standards

This document enforces international enterprise standards for the Approval Routing Hub codebase.

---

## 1. Security & Query Parameterization
- **Strict Parameterization (OWASP A03)**:
  - NEVER construct SQL strings via string concatenation or template literals (`${...}`) with user or dynamic data.
  - For `IN (...)` queries in SQL Server, use parameterized requests (e.g. `@sec_0, @sec_1`) or `OPENJSON(@json)`.
- **API Authentication**:
  - The Core Routing Engine must support header-based API authentication (`x-api-key`) when configured in environment variables, protecting internal endpoints from unauthorized intranet scripts.

---

## 2. Approval Routing Logic Standards

### 2.1 Skip-Level Rule (Hierarchical vs Functional)
- **Hierarchy Rule**: Lower numerical level = higher seniority (`level 1` is highest, e.g. CEO/MD; `level 7` is Staff).
- **Intra-Department (Direct Line)**:
  - If a step represents the requester's direct chain of command (`section_id` is null or same as requester), skip if `approver.level >= requester.level`.
- **Cross-Department / Functional Sign-off**:
  - If a step explicitly specifies a different `section_id` (e.g. HR Director, QA Manager, Finance Reviewer), do NOT blindly skip based on the requester's department level.
  - Only skip if the step definition explicitly flags `allow_skip: true`.
- **Top Executive / Auto-Approval**:
  - If all approval steps are legitimately skipped because the requester is the top authority (Level 1 / MD), the service MUST return `is_auto_approved: true` and status `AUTO_APPROVED` with HTTP 200.
  - NEVER throw an unhandled HTTP 422 error on valid high-ranking requesters.

### 2.2 Sub-section Resolution Standard
- When resolving approvers without a specified `section_id` (`section_id: null`):
  1. Search within the requester's `originalSection` first.
  2. If an active approver matching the required position exists in `originalSection`, resolve to them immediately.
  3. If NO active approver exists in `originalSection` (e.g. Manager exists only at Main Section level), expand search to `mainSection`.
  4. DO NOT flatten and search all sibling sub-sections simultaneously, as this incorrectly merges approvers across independent sub-units.

### 2.3 Unresolved Approvers & Fallback
- If an active approver cannot be found for a required step:
  - Report the step as `is_skipped: true` with a clear, descriptive `skip_reason` and flag `unresolved: true`.
  - Maintain audit visibility so calling consumer systems can prompt for manual reviewer delegation.

---

## 3. API Contract & Integration Standard
- The Routing Engine is stateless and must accept context parameters from consumer applications:
  - `member_id` (Required): The requester's employee ID.
  - `form_code` / `workflow_type` (Optional): The document or workflow identifier.
- Responses must always contain:
  - `success: boolean`
  - `requester`: Sanitized requester details (ID, name, department, position, level).
  - `approval_chain`: Ordered array of remaining approval steps and resolved approver details.
  - `is_auto_approved: boolean`: Indicator if no further approval is necessary.
  - `total_steps: number`, `skipped_steps: number`.
