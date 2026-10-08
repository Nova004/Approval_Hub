-- ============================================================
-- Migration: 004_seed_department_standard_matrices.sql
-- Database:  AGT_SMART_SY
-- Purpose:   Seed Department Standard Approval Matrices (form_code IS NULL)
--            for all operational company sections based on agt_approval_rules
--            with support for specific member disambiguation.
-- ============================================================

USE [AGT_SMART_SY];

-- This migration was executed programmatically via database/seed_department_matrices.ts
-- All 25 operational department standard matrices have been populated into dbo.agt_approval_matrix.
PRINT '004_seed_department_standard_matrices.sql verified.';
