---
name: approval-engine
description: Architectural specification, database schema, routing flow, and consumer integration guide for Approval Hub.
---

# Approval Hub Skill: Enterprise Approval Routing Engine

Approval Hub is a centralized, stateless approval routing service designed to compute dynamic, organizational-aware approval chains for enterprise consumer applications (e.g. ERP, Purchase Orders, Leave Requests, Quality Documents).

---

## 1. System Architecture & Database Schema

### Database: `AGT_SMART_SY`

#### 1. Legacy Organizational Tables (STRICT READ-ONLY)
- **`dbo.agt_member`**: Employees list.
  - Key columns: `agt_member_id` (PK, INT), `agt_member_nameTH`, `agt_member_email`, `agt_member_position` (FK), `agt_member_section` (FK), `agt_status_job` (`'Working'`).
- **`dbo.agt_position`**: Job positions and levels.
  - Key columns: `agt_position_id` (PK), `agt_position_name`, `agt_position_level` (INT: lower = higher seniority; e.g. 1 = MD, 7 = Staff).
- **`dbo.agt_section`**: Departments & Sections.
  - Key columns: `id_section` (PK), `name_section`, `name_fullsection`, `sub_section` (comma-separated IDs).

#### 2. Approval Hub Tables (Managed by this project)
- **`dbo.agt_approval_matrix`**:
  - `matrix_id`: INT IDENTITY PRIMARY KEY
  - `section_id`: NVARCHAR(10) REFERENCES `agt_section(id_section)`
  - `target_positions`: NVARCHAR(MAX) (JSON array of requester position IDs or `["ALL"]`)
  - `matrix_name`: NVARCHAR(300)
  - `approval_steps`: NVARCHAR(MAX) (JSON array of `ApprovalStep`)
  - `is_active`: BIT DEFAULT 1
  - `created_at`, `updated_at`: DATETIME2

---

## 2. Approval Steps JSON Specification

Each step in `approval_steps` follows this schema:
```json
[
  {
    "step_order": 1,
    "step_key": "step1_sup_req",
    "description": "หัวหน้างานโดยตรง",
    "allow_skip": true,
    "approvers": [
      {
        "position_id": "P009",
        "section_id": null
      }
    ]
  },
  {
    "step_order": 2,
    "step_key": "step2_sup_mn",
    "description": "หัวหน้าช่างซ่อมบำรุง (MN Sup)",
    "allow_skip": false,
    "approvers": [
      {
        "position_id": "P009",
        "section_id": "S005"
      }
    ]
  }
]
```
- `step_key`: Optional string identifier for consumer services to map approval steps directly to business state machines (e.g. `step1_sup_req`, `step2_sup_mn`, `step_safety`).
- `section_id: null` indicates the approver belongs to the requester's department.
- `section_id: "..."` indicates a cross-department reviewer.
- `allow_skip: true` enables hierarchical skip-level logic.
- `allow_skip: false` guarantees that this sign-off cannot be skipped, regardless of requester level.

---

## 3. Core Routing Algorithm (`calculateApprovalChain`)

1. **Requester Lookup**: Fetch member, position, and section where `agt_status_job = 'Working'`.
2. **Section Hierarchy**: Determine if requester is in a sub-section using `resolveMainSection()`.
3. **Matrix Lookup**:
   - Query `agt_approval_matrix` for active matrix matching requester's section and position.
   - If not found and requester is in a sub-section, fallback to the main section's matrix.
4. **Step-by-Step Resolution**:
   - For each step, evaluate `allow_skip`. If within direct line and `approver.level >= requester.level`, skip.
   - For `section_id: null`, attempt resolution in `originalSection` first; fallback to `mainSection` if none found.
   - For explicit `section_id`, query approvers in that specific section.
   - If `step_key` is present, record the resolved approvers under `approvers_by_key[step_key]`.
5. **Auto-Approval Evaluation**:
   - If all steps are skipped because the requester has top-level authority, return `is_auto_approved: true` and `status: 'AUTO_APPROVED'`.
6. **Return Sanitized Result**: Return JSON containing requester details, clean ordered approval steps, and `approvers_by_key` dictionary.

---

## 4. Integration Guide for Consumer Services

### API Endpoint:
```http
GET /api/approval/calculate?member_id={employee_id}&form_code={form_code}
Headers:
  x-api-key: {optional_api_key}
```

### Successful Response Format:
```json
{
  "success": true,
  "is_auto_approved": false,
  "status": "PENDING",
  "form_code": "FM-MN-012",
  "requester": {
    "member_id": 105,
    "name_th": "สมชาย ใจดี",
    "email": "somchai@company.com",
    "section": { "id": "S001", "name": "Production 1" },
    "position": { "id": "P011", "name": "Staff", "level": 9 }
  },
  "approval_chain": [
    {
      "step_order": 1,
      "step_key": "step1_sup_req",
      "is_skipped": false,
      "description": "หัวหน้าแผนก",
      "approvers": [
        {
          "member_id": 20,
          "name_th": "ประสิทธิ์ มั่งมี",
          "email": "prasit@company.com",
          "section": { "id": "S001", "name": "Production 1" }
        }
      ]
    }
  ],
  "approvers_by_key": {
    "step1_sup_req": [
      {
        "member_id": 20,
        "name_th": "ประสิทธิ์ มั่งมี",
        "email": "prasit@company.com",
        "section": { "id": "S001", "name": "Production 1" }
      }
    ]
  },
  "total_steps": 1,
  "skipped_steps": 0
}
```
