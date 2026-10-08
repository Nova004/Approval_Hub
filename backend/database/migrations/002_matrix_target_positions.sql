-- ============================================================
-- Migration: 002_matrix_target_positions.sql
-- Database:  AGT_SMART_SY
-- Purpose:   เปลี่ยนโครงสร้าง agt_approval_matrix ให้รับหลายตำแหน่งผู้ขอได้
-- ============================================================

USE [AGT_SMART_SY];

BEGIN TRY
    BEGIN TRANSACTION;

    PRINT '1. Dropping old constraints and indexes...';
    
    -- Drop Foreign Key
    IF OBJECT_ID('FK_approval_matrix_position', 'F') IS NOT NULL
        ALTER TABLE dbo.agt_approval_matrix DROP CONSTRAINT FK_approval_matrix_position;

    -- Drop Unique Constraint
    IF OBJECT_ID('UQ_matrix_section_position', 'UQ') IS NOT NULL
        ALTER TABLE dbo.agt_approval_matrix DROP CONSTRAINT UQ_matrix_section_position;

    -- Drop Index
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_approval_matrix_lookup' AND object_id = OBJECT_ID('dbo.agt_approval_matrix'))
        DROP INDEX IX_approval_matrix_lookup ON dbo.agt_approval_matrix;

    PRINT '2. Adding new column target_positions...';
    
    -- Add new column (allow NULL temporarily)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'agt_approval_matrix' AND COLUMN_NAME = 'target_positions')
    BEGIN
        ALTER TABLE dbo.agt_approval_matrix ADD target_positions NVARCHAR(MAX) NULL;
    END

    PRINT '3. Migrating data (converting position_id to JSON array)...';
    
    -- Migrate Data
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'agt_approval_matrix' AND COLUMN_NAME = 'position_id')
    BEGIN
        EXEC('UPDATE dbo.agt_approval_matrix SET target_positions = ''["'' + position_id + ''"]'' WHERE position_id IS NOT NULL');
    END

    PRINT '4. Enforcing NOT NULL and dropping old column...';
    
    -- Make NOT NULL
    ALTER TABLE dbo.agt_approval_matrix ALTER COLUMN target_positions NVARCHAR(MAX) NOT NULL;

    -- Drop old column
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'agt_approval_matrix' AND COLUMN_NAME = 'position_id')
    BEGIN
        ALTER TABLE dbo.agt_approval_matrix DROP COLUMN position_id;
    END

    PRINT '5. Creating new index...';
    
    -- สร้าง Index ใหม่ที่ไม่รวม position_id เพราะกลายเป็น JSON ไปแล้ว
    CREATE NONCLUSTERED INDEX IX_approval_matrix_lookup
        ON dbo.agt_approval_matrix (section_id, is_active)
        INCLUDE (target_positions, approval_steps, matrix_name);

    COMMIT TRANSACTION;
    PRINT 'Migration completed successfully!';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT 'ERROR during migration:';
    PRINT ERROR_MESSAGE();
END CATCH
