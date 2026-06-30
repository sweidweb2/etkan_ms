-- Role enum for application users
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'customer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'customer';

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Allow authenticated users to read their own row (middleware + session role resolution)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

COMMENT ON COLUMN users.role IS 'Application role: admin or customer';
