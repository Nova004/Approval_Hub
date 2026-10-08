import { getPool, sql } from '../src/config/database';

interface MatrixConfig {
  section_id: string;
  matrix_name: string;
  steps: {
    step_order: number;
    step_key: string;
    description: string;
    allow_skip: boolean;
    approvers: {
      position_id: string;
      section_id?: string | null;
      member_id?: string | null;
    }[];
  }[];
}

const DEPARTMENT_CONFIGS: MatrixConfig[] = [
  {
    section_id: 'S001',
    matrix_name: 'HR&GA Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน HR&GA (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S001' },
          { position_id: 'P009', section_id: 'S001' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการ HR&GA (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S036' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายบริหาร (GM of Admin)',
        allow_skip: true,
        approvers: [
          { position_id: 'P019', section_id: 'S014' },
        ],
      },
    ],
  },
  {
    section_id: 'S002',
    matrix_name: 'FA Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน FA (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S002' },
          { position_id: 'P009', section_id: 'S002' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการ FA (Manager / Sr.Specialist)',
        allow_skip: true,
        approvers: [
          { position_id: 'P025', section_id: 'S002' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายบริหาร (GM of Admin)',
        allow_skip: true,
        approvers: [
          { position_id: 'P019', section_id: 'S014' },
        ],
      },
    ],
  },
  {
    section_id: 'S003',
    matrix_name: 'QA Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน QA (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S003' },
          { position_id: 'P009', section_id: 'S003' },
          { position_id: 'P008', section_id: 'S029' },
          { position_id: 'P009', section_id: 'S029' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่าย QA (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S029', member_id: '201748' },
          { position_id: 'P006', section_id: 'S029', member_id: '201748' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายโรงงาน (GM of Factory)',
        allow_skip: true,
        approvers: [
          { position_id: 'P018', section_id: 'S014', member_id: '100035' },
        ],
      },
    ],
  },
  {
    section_id: 'S004',
    matrix_name: 'LG&WH Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน LG&WH (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S026' },
          { position_id: 'P009', section_id: 'S026' },
          { position_id: 'P008', section_id: 'S004' },
          { position_id: 'P009', section_id: 'S004' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการ LG&WH (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S004' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายบริหาร (GM of Admin)',
        allow_skip: true,
        approvers: [
          { position_id: 'P019', section_id: 'S014' },
        ],
      },
    ],
  },
  {
    section_id: 'S005',
    matrix_name: 'MN Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน MN (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S005' },
          { position_id: 'P009', section_id: 'S005' },
          { position_id: 'P008', section_id: 'S030' },
          { position_id: 'P009', section_id: 'S030' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการแผนกซ่อมบำรุง (Manager MN)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S005' },
          { position_id: 'P004', section_id: 'S005' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายโรงงาน (GM of Factory)',
        allow_skip: true,
        approvers: [
          { position_id: 'P018', section_id: 'S014', member_id: '100035' },
        ],
      },
    ],
  },
  {
    section_id: 'S008',
    matrix_name: 'IT Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน IT (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S008' },
          { position_id: 'P009', section_id: 'S008' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่าย IT (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S036' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายบริหาร (GM of Admin)',
        allow_skip: true,
        approvers: [
          { position_id: 'P019', section_id: 'S014' },
        ],
      },
    ],
  },
  {
    section_id: 'S010',
    matrix_name: 'Gen Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน Genmatsu (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S010' },
          { position_id: 'P009', section_id: 'S010' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่ายผลิต Genmatsu (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S013', member_id: '200016' },
          { position_id: 'P004', section_id: 'S013', member_id: '200016' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายผลิต (GM of Production)',
        allow_skip: true,
        approvers: [
          { position_id: 'P022', section_id: 'S013', member_id: '200135' },
        ],
      },
    ],
  },
  {
    section_id: 'S011',
    matrix_name: 'PD1 Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน PD1 (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S011' },
          { position_id: 'P009', section_id: 'S011' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่ายผลิต PD1 (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S013', member_id: '200893' },
          { position_id: 'P004', section_id: 'S013', member_id: '200893' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายผลิต (GM of Production)',
        allow_skip: true,
        approvers: [
          { position_id: 'P022', section_id: 'S013', member_id: '200135' },
        ],
      },
    ],
  },
  {
    section_id: 'S012',
    matrix_name: 'PD2 Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน PD2 (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S012' },
          { position_id: 'P009', section_id: 'S012' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่ายผลิต PD2 (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S013', member_id: '200893' },
          { position_id: 'P004', section_id: 'S013', member_id: '200893' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายผลิต (GM of Production)',
        allow_skip: true,
        approvers: [
          { position_id: 'P022', section_id: 'S013', member_id: '200135' },
        ],
      },
    ],
  },
  {
    section_id: 'S013',
    matrix_name: 'PD Office Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่าย PD Office (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S013' },
          { position_id: 'P009', section_id: 'S013' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่ายผลิต (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S013', member_id: '200893' },
          { position_id: 'P004', section_id: 'S013', member_id: '200893' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายผลิต (GM of Production)',
        allow_skip: true,
        approvers: [
          { position_id: 'P022', section_id: 'S013', member_id: '200135' },
        ],
      },
    ],
  },
  {
    section_id: 'S015',
    matrix_name: 'TD Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่าย TD (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S015' },
          { position_id: 'P009', section_id: 'S015' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่าย TD (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S029', member_id: '201748' },
          { position_id: 'P006', section_id: 'S029', member_id: '201748' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายโรงงาน (GM of Factory)',
        allow_skip: true,
        approvers: [
          { position_id: 'P018', section_id: 'S014', member_id: '100035' },
        ],
      },
    ],
  },
  {
    section_id: 'S026',
    matrix_name: 'LG Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่าย Logistics (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S026' },
          { position_id: 'P009', section_id: 'S026' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่าย Logistics (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S004' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายบริหาร (GM of Admin)',
        allow_skip: true,
        approvers: [
          { position_id: 'P019', section_id: 'S014' },
        ],
      },
    ],
  },
  {
    section_id: 'S027',
    matrix_name: 'WH Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่าย Warehouse (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S027' },
          { position_id: 'P009', section_id: 'S027' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่าย Warehouse (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S004' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายบริหาร (GM of Admin)',
        allow_skip: true,
        approvers: [
          { position_id: 'P019', section_id: 'S014' },
        ],
      },
    ],
  },
  {
    section_id: 'S029',
    matrix_name: 'QA&TD Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน QA&TD (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S029' },
          { position_id: 'P009', section_id: 'S029' },
          { position_id: 'P008', section_id: 'S003' },
          { position_id: 'P009', section_id: 'S003' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการ QA&TD (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S029', member_id: '201748' },
          { position_id: 'P006', section_id: 'S029', member_id: '201748' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายโรงงาน (GM of Factory)',
        allow_skip: true,
        approvers: [
          { position_id: 'P018', section_id: 'S014', member_id: '100035' },
        ],
      },
    ],
  },
  {
    section_id: 'S030',
    matrix_name: 'MN&TD Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน MN&TD (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S005' },
          { position_id: 'P009', section_id: 'S005' },
          { position_id: 'P008', section_id: 'S030' },
          { position_id: 'P009', section_id: 'S030' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการ MN&TD (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S005' },
          { position_id: 'P004', section_id: 'S005' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายโรงงาน (GM of Factory)',
        allow_skip: true,
        approvers: [
          { position_id: 'P018', section_id: 'S014', member_id: '100035' },
        ],
      },
    ],
  },
  {
    section_id: 'S032',
    matrix_name: 'Safety Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่าย Safety (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S032' },
          { position_id: 'P009', section_id: 'S032' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่าย Safety (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S032' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายบริหาร (GM of Admin)',
        allow_skip: true,
        approvers: [
          { position_id: 'P019', section_id: 'S014' },
        ],
      },
    ],
  },
  {
    section_id: 'S033',
    matrix_name: 'ISO Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่าย ISO (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S033' },
          { position_id: 'P009', section_id: 'S033' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่าย ISO (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S033' },
          { position_id: 'P004', section_id: 'S033' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายโรงงาน (GM of Factory)',
        allow_skip: true,
        approvers: [
          { position_id: 'P018', section_id: 'S014', member_id: '100035' },
        ],
      },
    ],
  },
  {
    section_id: 'S035',
    matrix_name: 'Gen&PD1,2 Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่ายผลิต (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S010' },
          { position_id: 'P009', section_id: 'S010' },
          { position_id: 'P008', section_id: 'S011' },
          { position_id: 'P009', section_id: 'S011' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่ายผลิต (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S013', member_id: '200016' },
          { position_id: 'P004', section_id: 'S013', member_id: '200016' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายผลิต (GM of Production)',
        allow_skip: true,
        approvers: [
          { position_id: 'P022', section_id: 'S013', member_id: '200135' },
        ],
      },
    ],
  },
  {
    section_id: 'S036',
    matrix_name: 'HR&GA,IT Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่าย HR&GA,IT (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S008' },
          { position_id: 'P009', section_id: 'S008' },
          { position_id: 'P008', section_id: 'S001' },
          { position_id: 'P009', section_id: 'S001' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่าย HR&GA,IT (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S036' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายบริหาร (GM of Admin)',
        allow_skip: true,
        approvers: [
          { position_id: 'P019', section_id: 'S014' },
        ],
      },
    ],
  },
  {
    section_id: 'S037',
    matrix_name: 'Gen-ZET Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่ายผลิต Gen-ZET (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S010' },
          { position_id: 'P009', section_id: 'S010' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่ายผลิต Gen-ZET (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S013', member_id: '200016' },
          { position_id: 'P004', section_id: 'S013', member_id: '200016' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายผลิต (GM of Production)',
        allow_skip: true,
        approvers: [
          { position_id: 'P022', section_id: 'S013', member_id: '200135' },
        ],
      },
    ],
  },
  {
    section_id: 'S038',
    matrix_name: 'PD2-ZET Standard Approval Matrix',
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างานฝ่ายผลิต PD2-ZET (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S012' },
          { position_id: 'P009', section_id: 'S012' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่ายผลิต PD2-ZET (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P006', section_id: 'S013', member_id: '200893' },
          { position_id: 'P004', section_id: 'S013', member_id: '200893' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายผลิต (GM of Production)',
        allow_skip: true,
        approvers: [
          { position_id: 'P022', section_id: 'S013', member_id: '200135' },
        ],
      },
    ],
  },
  // QA sub-sections: S039, S040, S041, S042
  ...['S039', 'S040', 'S041', 'S042'].map(secId => ({
    section_id: secId,
    matrix_name: `${secId} QA Standard Approval Matrix`,
    steps: [
      {
        step_order: 1,
        step_key: 'step1_sup',
        description: 'หัวหน้างาน QA (Supervisor)',
        allow_skip: true,
        approvers: [
          { position_id: 'P008', section_id: 'S003' },
          { position_id: 'P009', section_id: 'S003' },
          { position_id: 'P008', section_id: 'S029' },
          { position_id: 'P009', section_id: 'S029' },
        ],
      },
      {
        step_order: 2,
        step_key: 'step2_mgr',
        description: 'ผู้จัดการฝ่าย QA (Manager)',
        allow_skip: true,
        approvers: [
          { position_id: 'P004', section_id: 'S029', member_id: '201748' },
          { position_id: 'P006', section_id: 'S029', member_id: '201748' },
        ],
      },
      {
        step_order: 3,
        step_key: 'step3_gm',
        description: 'ผู้จัดการทั่วไปฝ่ายโรงงาน (GM of Factory)',
        allow_skip: true,
        approvers: [
          { position_id: 'P018', section_id: 'S014', member_id: '100035' },
        ],
      },
    ],
  })),
];

async function seedMatrices() {
  const pool = await getPool();
  console.log(`Starting to seed ${DEPARTMENT_CONFIGS.length} Department Standard Matrices into agt_approval_matrix...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const cfg of DEPARTMENT_CONFIGS) {
    const secId = cfg.section_id.trim();
    const stepsJson = JSON.stringify(cfg.steps);

    const checkRes = await pool.request()
      .input('sec_id', sql.NVarChar(10), secId)
      .query(`
        SELECT matrix_id FROM dbo.agt_approval_matrix
        WHERE section_id = @sec_id AND (form_code IS NULL OR form_code = '')
      `);

    if (checkRes.recordset.length > 0) {
      // UPDATE existing record
      await pool.request()
        .input('sec_id', sql.NVarChar(10), secId)
        .input('matrix_name', sql.NVarChar(255), cfg.matrix_name)
        .input('approval_steps', sql.NVarChar(sql.MAX), stepsJson)
        .query(`
          UPDATE dbo.agt_approval_matrix
          SET matrix_name = @matrix_name,
              target_positions = '["ALL"]',
              approval_steps = @approval_steps,
              is_active = 1,
              updated_at = GETDATE()
          WHERE section_id = @sec_id AND (form_code IS NULL OR form_code = '')
        `);
      console.log(`[UPDATED] [${secId}] ${cfg.matrix_name}`);
      updatedCount++;
    } else {
      // INSERT new record
      await pool.request()
        .input('sec_id', sql.NVarChar(10), secId)
        .input('matrix_name', sql.NVarChar(255), cfg.matrix_name)
        .input('approval_steps', sql.NVarChar(sql.MAX), stepsJson)
        .query(`
          INSERT INTO dbo.agt_approval_matrix (
            section_id,
            form_code,
            target_positions,
            matrix_name,
            approval_steps,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            @sec_id,
            NULL,
            '["ALL"]',
            @matrix_name,
            @approval_steps,
            1,
            GETDATE(),
            GETDATE()
          )
        `);
      console.log(`[INSERTED] [${secId}] ${cfg.matrix_name}`);
      insertedCount++;
    }
  }

  console.log(`\n✅ Seeding completed! Inserted: ${insertedCount}, Updated: ${updatedCount}`);
  process.exit(0);
}

seedMatrices().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
