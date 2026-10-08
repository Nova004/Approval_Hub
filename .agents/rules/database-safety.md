# Database Safety & Protection Rules

> **CRITICAL RULE: ACTUAL PRODUCTION DATABASE IN USE (`AGT_SMART_SY`)**
> 
> The database `AGT_SMART_SY` connected to this project is an **active production database** shared with other core enterprise systems. The following rules are absolute and must be followed without exception by all developers and AI agents.

---

## 1. Absolute Prohibition of Destructive DDL
- 🛑 **NEVER execute `DROP DATABASE` or `DROP TABLE`** on any existing organizational tables, including but not limited to:
  - `dbo.agt_member`
  - `dbo.agt_position`
  - `dbo.agt_section`
  - Any table starting with `agt_` not created specifically by Approval Hub.
- 🛑 **NEVER execute `TRUNCATE TABLE`** on any table in the database.
- 🛑 **NEVER execute `ALTER TABLE ... DROP COLUMN`** or destructive constraint changes on legacy organizational tables.

## 2. Read-Only Policy for Legacy Organizational Tables
- The Approval Hub engine has **STRICT READ-ONLY (`SELECT`)** access to:
  - `agt_member`
  - `agt_position`
  - `agt_section`
- 🛑 **NEVER write `INSERT`, `UPDATE`, or `DELETE` statements targeting legacy tables.**
- All employee information, department hierarchy, and job levels are managed exclusively by the core HR system.

## 3. Scope of Approval Hub Schema (`agt_approval_matrix`)
- The Approval Hub project is only authorized to create and manage its own dedicated tables:
  - `dbo.agt_approval_matrix`
  - Any future sub-tables prefixed with `agt_approval_matrix_`
- All future schema migrations MUST:
  - Be non-destructive (`IF NOT EXISTS` or defensive checks before creating tables/columns/indexes).
  - Wrap multi-statement changes in `BEGIN TRY ... BEGIN TRANSACTION ... COMMIT ... END TRY BEGIN CATCH ROLLBACK ... END CATCH`.
  - Never drop data without an explicit, validated data migration and backup step.

## 4. DML Safety (No Unscoped Queries)
- 🛑 **NEVER execute `DELETE` or `UPDATE` without an explicit `WHERE` clause** binding specifically to `matrix_id = @matrix_id`.
- Prefer soft deletes (`is_active = 0`) over hard deletes (`DELETE FROM`) to preserve audit trails for historical approval logs.
