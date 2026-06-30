-- Link public.users to Supabase Auth (auth.users)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMENT ON COLUMN users.auth_id IS 'Supabase Auth user id (auth.users.id)';
COMMENT ON COLUMN users.password_hash IS 'Legacy/local hash; primary auth is Supabase Auth';
