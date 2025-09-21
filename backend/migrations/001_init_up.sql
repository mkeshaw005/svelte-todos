-- 001_init_up.sql
-- Create todos table with timestamps and triggers for updated_at and completed_at.

BEGIN;

CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

-- Ensure created_at remains immutable after insert
CREATE OR REPLACE FUNCTION keep_created_at_immutable()
RETURNS trigger AS $$
BEGIN
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_todos_keep_created_at ON todos;
CREATE TRIGGER trg_todos_keep_created_at
BEFORE UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION keep_created_at_immutable();

-- Unified timestamp logic for updates (title changes and completed toggles)
CREATE OR REPLACE FUNCTION set_todo_timestamps()
RETURNS trigger AS $$
DECLARE
  ts timestamptz := now();
BEGIN
  -- If title changed, bump updated_at
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    NEW.updated_at := ts;
  END IF;

  -- If completed flag changed, set/clear completed_at and bump updated_at
  IF NEW.completed IS DISTINCT FROM OLD.completed THEN
    IF NEW.completed IS TRUE THEN
      NEW.completed_at := ts;
      NEW.updated_at := ts; -- match updated_at to completed_at when completing
    ELSE
      NEW.completed_at := NULL; -- clear when unchecking (state-based)
      NEW.updated_at := ts;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_todos_set_timestamps ON todos;
CREATE TRIGGER trg_todos_set_timestamps
BEFORE UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION set_todo_timestamps();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos (completed);
CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos (completed_at);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos (created_at);

COMMIT;
