-- 001_init_down.sql
-- Drop triggers, functions, indexes, and the todos table.

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_todos_set_timestamps ON todos;
DROP TRIGGER IF EXISTS trg_todos_keep_created_at ON todos;

-- Drop functions
DROP FUNCTION IF EXISTS set_todo_timestamps();
DROP FUNCTION IF EXISTS keep_created_at_immutable();

-- Drop indexes
DROP INDEX IF EXISTS idx_todos_completed;
DROP INDEX IF EXISTS idx_todos_completed_at;
DROP INDEX IF EXISTS idx_todos_created_at;

-- Drop table
DROP TABLE IF EXISTS todos;

COMMIT;
