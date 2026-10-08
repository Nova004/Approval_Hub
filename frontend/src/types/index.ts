// ============================================================
// Shared Types (Frontend mirror of backend types)
// ============================================================

export interface Section {
  id_section: string;
  name_section: string;
  name_fullsection: string;
  sub_section: string | null;
  is_active: boolean;
}

export interface Position {
  agt_position_id: string;
  agt_position_name: string;
  agt_position_type: string;
  agt_position_level: number;
}

export interface Member {
  agt_member_id: string | number;
  agt_member_nameTH: string;
  agt_member_nameEN: string;
  agt_member_nickname: string;
  agt_member_email: string;
  agt_member_position: string;
  agt_member_section: string;
  agt_position_name?: string;
  agt_position_level?: number;
  name_section?: string;
  name_fullsection?: string;
}

export interface StepApproverDef {
  position_id: string;
  section_id: string | null;
  member_id?: string | null;
}

export interface ApprovalStep {
  id?: string;
  step_order: number;
  step_key?: string;
  approvers: StepApproverDef[];
  description: string;
  allow_skip?: boolean;
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
  created_at: string;
  updated_at: string;
}

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

export interface ApproverInfo {
  member_id: string;
  name_th: string;
  name_en: string;
  nickname: string;
  email: string;
  section: { id: string; name: string; full_name: string };
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

export interface CalculateResponse {
  success: true;
  is_auto_approved?: boolean;
  status?: 'COMPLETED' | 'AUTO_APPROVED' | 'PENDING';
  message?: string;
  form_code?: string;
  requester: {
    member_id: string;
    name_th: string;
    name_en: string;
    email: string;
    section: {
      id: string;
      name: string;
      full_name: string;
      main_section: { id: string; name: string; full_name: string } | null;
    };
    position: { id: string; name: string; level: number; type: string };
  };
  approval_chain: ApprovalChainStep[];
  approvers_by_key?: Record<string, ApproverInfo[]>;
  total_steps: number;
  skipped_steps: number;
}
