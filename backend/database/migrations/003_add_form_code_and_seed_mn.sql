-- ============================================================
-- Migration: 003_add_form_code_and_seed_mn.sql
-- Database:  AGT_SMART_SY
-- Purpose:   เพิ่มคอลัมน์ form_code ใน agt_approval_matrix 
--            และ Seed Approval Matrix มาตรฐาน 8 ขั้นตอนสำหรับ FM-MN-012
-- ============================================================

USE [AGT_SMART_SY];

BEGIN TRY
    BEGIN TRANSACTION;

    PRINT '1. Adding form_code column to agt_approval_matrix if not exists...';
    
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'agt_approval_matrix' AND COLUMN_NAME = 'form_code'
    )
    BEGIN
        ALTER TABLE dbo.agt_approval_matrix ADD form_code NVARCHAR(50) NULL;
        PRINT 'Added column form_code successfully.';
    END
    ELSE
    BEGIN
        PRINT 'Column form_code already exists.';
    END

    PRINT '2. Creating index on (form_code, is_active)...';
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = 'IX_approval_matrix_form_lookup' AND object_id = OBJECT_ID('dbo.agt_approval_matrix')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_approval_matrix_form_lookup
            ON dbo.agt_approval_matrix (form_code, is_active)
            INCLUDE (section_id, target_positions, approval_steps, matrix_name);
        PRINT 'Index IX_approval_matrix_form_lookup created successfully.';
    END

    PRINT '3. Seeding / Updating standard Approval Matrix for FM-MN-012...';

    DECLARE @steps NVARCHAR(MAX) = N'[
      {
        "step_order": 1,
        "step_key": "step1_sup_req",
        "description": "หัวหน้างานผู้ร้องขอ (Supervisor Requester)",
        "allow_skip": true,
        "approvers": [
          { "position_id": "P009", "section_id": null },
          { "position_id": "P008", "section_id": null },
          { "position_id": "P012", "section_id": null }
        ]
      },
      {
        "step_order": 2,
        "step_key": "step2_sup_mn",
        "description": "หัวหน้าช่างซ่อมบำรุง (MN Supervisor)",
        "allow_skip": false,
        "approvers": [
          { "position_id": "P009", "section_id": "S005" },
          { "position_id": "P008", "section_id": "S005" }
        ]
      },
      {
        "step_order": 3,
        "step_key": "step_safety",
        "description": "เจ้าหน้าที่ความปลอดภัย (Safety Section)",
        "allow_skip": false,
        "approvers": [
          { "position_id": "P008", "section_id": "S032" },
          { "position_id": "P009", "section_id": "S032" }
        ]
      },
      {
        "step_order": 4,
        "step_key": "step3_asst_req",
        "description": "ผู้ช่วยผู้จัดการฝ่ายผู้ร้องขอ (Asst. MGR Requester)",
        "allow_skip": true,
        "approvers": [
          { "position_id": "P006", "section_id": null },
          { "position_id": "P004", "section_id": null }
        ]
      },
      {
        "step_order": 5,
        "step_key": "step4_asst_mn",
        "description": "ผู้ช่วยผู้จัดการแผนกซ่อมบำรุง (Asst. MGR MN)",
        "allow_skip": false,
        "approvers": [
          { "position_id": "P006", "section_id": "S005" }
        ]
      },
      {
        "step_order": 6,
        "step_key": "step5_gm_req",
        "description": "ผู้จัดการทั่วไปฝ่ายผู้ร้องขอ (GM Requester)",
        "allow_skip": true,
        "approvers": [
          { "position_id": "P002", "section_id": null },
          { "position_id": "P019", "section_id": "S014" },
          { "position_id": "P022", "section_id": "S013" },
          { "position_id": "P001", "section_id": "S014" }
        ]
      },
      {
        "step_order": 7,
        "step_key": "step6_gm_mn",
        "description": "ผู้จัดการทั่วไปโรงงาน (GM of Factory)",
        "allow_skip": false,
        "approvers": [
          { "position_id": "P018", "section_id": "S014" },
          { "position_id": "P002", "section_id": "S014" }
        ]
      },
      {
        "step_order": 8,
        "step_key": "close_sr_sup",
        "description": "หัวหน้างานซ่อมบำรุงอาวุโสตรวจรับปิดงาน (Sr. Supervisor MN)",
        "allow_skip": false,
        "approvers": [
          { "position_id": "P008", "section_id": "S005" },
          { "position_id": "P009", "section_id": "S005" },
          { "position_id": "P008", "section_id": "S030" },
          { "position_id": "P009", "section_id": "S030" }
        ]
      }
    ]';

    -- ใช้ sp_executesql เพื่อหลีกเลี่ยง compile-time error เรื่อง column name ใน batch เดียวกัน
    EXEC sp_executesql 
        N'IF EXISTS (SELECT 1 FROM dbo.agt_approval_matrix WHERE form_code = @formCode)
        BEGIN
            UPDATE dbo.agt_approval_matrix
            SET approval_steps = @stepData,
                matrix_name = N''FM-MN-012 Maintenance Work Request Standard Matrix'',
                target_positions = ''["ALL"]'',
                is_active = 1,
                updated_at = GETDATE()
            WHERE form_code = @formCode;
            PRINT ''Updated existing FM-MN-012 matrix.'';
        END
        ELSE
        BEGIN
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
                ''S005'',
                @formCode,
                ''["ALL"]'',
                N''FM-MN-012 Maintenance Work Request Standard Matrix'',
                @stepData,
                1,
                GETDATE(),
                GETDATE()
            );
            PRINT ''Inserted new FM-MN-012 matrix.'';
        END',
        N'@formCode NVARCHAR(50), @stepData NVARCHAR(MAX)',
        @formCode = N'FM-MN-012',
        @stepData = @steps;

    COMMIT TRANSACTION;
    PRINT 'Migration 003 completed successfully!';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT 'ERROR during migration:';
    PRINT ERROR_MESSAGE();
    THROW;
END CATCH
