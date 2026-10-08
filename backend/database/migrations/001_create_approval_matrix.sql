-- ============================================================
-- Migration: 001_create_approval_matrix.sql
-- Database:  AGT_SMART_SY
-- Purpose:   สร้างตาราง Approval Matrix สำหรับ Routing Engine
-- ============================================================

USE [AGT_SMART_SY];
GO

-- ── ป้องกัน Error ถ้ารันซ้ำ ──────────────────────────────────
IF OBJECT_ID('dbo.agt_approval_matrix', 'U') IS NOT NULL
BEGIN
    PRINT 'Table agt_approval_matrix already exists. Skipping creation.';
END
ELSE
BEGIN

    CREATE TABLE dbo.agt_approval_matrix (
        matrix_id       INT IDENTITY(1,1)   NOT NULL,
        section_id      NVARCHAR(10) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
        position_id     VARCHAR(10) COLLATE Thai_CI_AS NOT NULL,
        matrix_name     NVARCHAR(300)       NULL,       -- ชื่อ Matrix สำหรับ Admin อ่านง่าย
        approval_steps  NVARCHAR(MAX)       NOT NULL,   -- JSON Array ลำดับขั้นตอนอนุมัติ
        is_active       BIT                 NOT NULL    DEFAULT 1,
        created_at      DATETIME2           NOT NULL    DEFAULT GETDATE(),
        updated_at      DATETIME2           NOT NULL    DEFAULT GETDATE(),

        -- Primary Key
        CONSTRAINT PK_agt_approval_matrix
            PRIMARY KEY CLUSTERED (matrix_id),

        -- Foreign Keys
        CONSTRAINT FK_approval_matrix_section
            FOREIGN KEY (section_id)
            REFERENCES dbo.agt_section (id_section),

        CONSTRAINT FK_approval_matrix_position
            FOREIGN KEY (position_id)
            REFERENCES dbo.agt_position (agt_position_id),

        -- แต่ละ "แผนก + ตำแหน่ง" มีได้แค่ 1 Matrix ที่ active
        CONSTRAINT UQ_matrix_section_position
            UNIQUE (section_id, position_id)
    );

    -- Index เพื่อเร่ง lookup ตอน API คำนวณ
    CREATE NONCLUSTERED INDEX IX_approval_matrix_lookup
        ON dbo.agt_approval_matrix (section_id, position_id, is_active)
        INCLUDE (approval_steps, matrix_name);

    PRINT 'Table agt_approval_matrix created successfully.';

END
GO

-- ============================================================
-- โครงสร้าง JSON ในคอลัมน์ approval_steps:
-- ============================================================
--
-- [
--   {
--     "step_order": 1,
--     "approver_position_id": 3,
--     "approver_section_id": null,    <- null = แผนกเดียวกับผู้ขอ (รวม sub-sections)
--     "description": "หัวหน้าแผนกโดยตรง"
--   },
--   {
--     "step_order": 2,
--     "approver_position_id": 5,
--     "approver_section_id": null,
--     "description": "ผู้จัดการแผนก"
--   },
--   {
--     "step_order": 3,
--     "approver_position_id": 8,
--     "approver_section_id": 2,      <- ระบุ id = ข้ามแผนก (เช่น HR Director เสมอ)
--     "description": "HR Director"
--   }
-- ]
--
-- Skip-Level Rule:
--   agt_position_level: เลขน้อย = ตำแหน่งสูง
--   → Skip step ที่ approver level >= requester level (เท่ากันหรือต่ำกว่า)
--   → Keep step ที่ approver level < requester level (สูงกว่า)
-- ============================================================

-- ── ข้อมูลตัวอย่าง (Seed Data) ───────────────────────────────
-- หมายเหตุ: section_id และ position_id ต้องมีอยู่จริงในตาราง
--           ปรับค่าให้ตรงกับ ID จริงในระบบก่อน run

-- ตัวอย่าง Matrix 1: แผนก LG&WH / ตำแหน่ง Staff
-- (สมมติ section_id='1', position_id='10' คือ Staff, level=5)
/*
INSERT INTO dbo.agt_approval_matrix (section_id, position_id, matrix_name, approval_steps)
VALUES (
    '1',
    '10',
    N'LG&WH Staff Approval Flow',
    N'[
        {"step_order":1,"approver_position_id":"8","approver_section_id":null,"description":"Supervisor แผนกเดียวกัน"},
        {"step_order":2,"approver_position_id":"5","approver_section_id":null,"description":"Manager แผนกเดียวกัน"},
        {"step_order":3,"approver_position_id":"2","approver_section_id":"3","description":"HR Director"}
    ]'
);

-- ตัวอย่าง Matrix 2: แผนก LG&WH / ตำแหน่ง Supervisor
INSERT INTO dbo.agt_approval_matrix (section_id, position_id, matrix_name, approval_steps)
VALUES (
    '1',
    '8',
    N'LG&WH Supervisor Approval Flow',
    N'[
        {"step_order":1,"approver_position_id":"5","approver_section_id":null,"description":"Manager แผนกเดียวกัน"},
        {"step_order":2,"approver_position_id":"2","approver_section_id":"3","description":"HR Director"}
    ]'
);
*/

PRINT 'Migration 001 completed.';
GO
