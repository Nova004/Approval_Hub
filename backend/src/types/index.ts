// ============================================================
// Types: Shared TypeScript interfaces สำหรับทั้งระบบ
// ============================================================

// ── ข้อมูลจากตารางเดิม ─────────────────────────────────────

export interface Section {
  id_section: string;
  name_section: string;
  name_fullsection: string;
  sub_section: string | null; // comma-separated IDs เช่น "S026,S027"
  is_active: boolean;
}

export interface Position {
  agt_position_id: string;
  agt_position_name: string;
  agt_position_type: string;
  agt_position_level: number; // เลขน้อย = ตำแหน่งสูง
}

export interface Member {
  agt_member_id: number;
  agt_member_nameTH: string;
  agt_member_nameEN: string;
  agt_member_nickname: string;
  agt_member_sex: string;
  agt_member_email: string;
  agt_member_position: string;
  agt_member_section: string;
  agt_position_name?: string;
  agt_position_level?: number;
  name_section?: string;
}

// ── Approval Matrix ─────────────────────────────────────────

export interface StepApproverDef {
  position_id: string;
  section_id: string | null; // null = แผนกเดียวกับผู้ขอ
  member_id?: string | null; // รหัสพนักงานเฉพาะเจาะจง (ถ้ามี เพื่อระบุตัวตนกรณีตำแหน่งซ้ำกันหลายคน)
}

export interface ApprovalStep {
  step_order: number;
  step_key?: string; // รหัสอ้างอิงขั้นตอน เช่น "step1_sup_req", "step2_sup_mn"
  approvers: StepApproverDef[];
  description: string;
  allow_skip?: boolean; // default true: ข้ามขั้นตอนเมื่อผู้ขอตำแหน่งสูงกว่า
}

export interface ApprovalMatrix {
  matrix_id: number;
  section_id: string;
  form_code?: string | null;
  section_name?: string;
  section_fullname?: string;
  target_positions: string[];
  matrix_name: string | null;
  approval_steps: ApprovalStep[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalMatrixRow {
  matrix_id: number;
  section_id: string;
  form_code?: string | null;
  target_positions: string;
  matrix_name: string | null;
  approval_steps: string; // raw JSON string จาก DB
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ── CRUD DTOs ───────────────────────────────────────────────

export interface CreateMatrixDto {
  section_id: string;
  form_code?: string | null;
  target_positions: string[];
  matrix_name?: string;
  approval_steps: ApprovalStep[];
  is_active?: boolean;
}

export interface UpdateMatrixDto {
  form_code?: string | null;
  matrix_name?: string;
  approval_steps?: ApprovalStep[];
  is_active?: boolean;
}

// ── API Response ────────────────────────────────────────────

export interface ApproverInfo {
  member_id: string;
  name_th: string;
  name_en: string;
  nickname: string;
  email: string;
  section: {
    id: string;
    name: string;
    full_name: string;
  };
}

export interface StepDefinition {
  position: {
    id: string;
    name: string;
    level: number;
  };
  section: {
    id: string | null;
    name: string | null;
  };
}

export interface ApprovalChainStep {
  step_order: number;
  step_key?: string;
  is_skipped: boolean;
  skip_reason?: string;
  step_definitions: StepDefinition[];
  approvers: ApproverInfo[];
}

export interface RequesterInfo {
  member_id: number;
  name_th: string;
  name_en: string;
  email: string;
  section: {
    id: string;
    name: string;
    full_name: string;
    main_section: {
      id: string;
      name: string;
      full_name: string;
    } | null; // null ถ้าตัวเองเป็น main section
  };
  position: {
    id: string;
    name: string;
    level: number;
    type: string;
  };
}

export interface CalculateResponse {
  success: true;
  is_auto_approved?: boolean;
  status?: 'COMPLETED' | 'AUTO_APPROVED' | 'PENDING';
  message?: string;
  form_code?: string;
  requester: RequesterInfo;
  approval_chain: ApprovalChainStep[];
  approvers_by_key?: Record<string, ApproverInfo[]>;
  total_steps: number;
  skipped_steps: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse = CalculateResponse | ErrorResponse;

// ── Error Codes ─────────────────────────────────────────────
export const ErrorCodes = {
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  MATRIX_NOT_FOUND: 'MATRIX_NOT_FOUND',
  NO_APPROVER_FOUND: 'NO_APPROVER_FOUND',
  ALL_STEPS_SKIPPED: 'ALL_STEPS_SKIPPED',
  INVALID_STEPS_JSON: 'INVALID_STEPS_JSON',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;
