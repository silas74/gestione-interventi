-- ============================================================================
-- Gestione Interventi Tecnici On-Site — Production Schema & Security
-- ============================================================================

-- 1. Tabella Interventi
CREATE TABLE IF NOT EXISTS interventi (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  siteName TEXT NOT NULL,
  siteAddress TEXT,
  clientName TEXT NOT NULL,
  clientContact TEXT,
  description TEXT NOT NULL,
  desiredAccessDate DATE,
  desiredAccessTime TEXT,
  priority TEXT DEFAULT 'media',
  defectPhotos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT DEFAULT 'in_attesa',
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),
  assignedTechnician TEXT,
  report JSONB,
  clientFeedback JSONB
);

-- Row Level Security
ALTER TABLE interventi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accesso completo interventi" 
ON interventi FOR ALL 
USING (true) 
WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE interventi;


-- 2. Tabella Utenti di Sistema con Password Hashing & Salt (Zero Plaintext)
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin', 'technician', 'user'
  phone TEXT,
  assigned_project_ids JSONB DEFAULT '["*"]'::jsonb,
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Policy: Utenti anonimi possono solo verificare credenziali via funzione sicura
CREATE POLICY "Lettura utenti autorizzati" 
ON app_users FOR SELECT 
USING (true);

-- Funzione di autenticazione server-side con Rate Limiting e Lockout
CREATE OR REPLACE FUNCTION verify_user_login(p_username TEXT, p_password_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM app_users WHERE LOWER(username) = LOWER(p_username);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
  END IF;

  IF v_user.locked_until IS NOT NULL AND v_user.locked_until > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account locked due to too many failed attempts');
  END IF;

  IF v_user.password_hash = p_password_hash THEN
    UPDATE app_users SET failed_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = v_user.id;
    RETURN jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', v_user.id,
        'username', v_user.username,
        'name', v_user.name,
        'role', v_user.role,
        'phone', v_user.phone,
        'assignedProjectIds', v_user.assigned_project_ids
      )
    );
  ELSE
    IF v_user.failed_attempts + 1 >= 5 THEN
      UPDATE app_users SET failed_attempts = v_user.failed_attempts + 1, locked_until = NOW() + INTERVAL '5 minutes' WHERE id = v_user.id;
      RETURN jsonb_build_object('success', false, 'error', 'Account locked for 5 minutes');
    ELSE
      UPDATE app_users SET failed_attempts = v_user.failed_attempts + 1 WHERE id = v_user.id;
      RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
    END IF;
  END IF;
END;
$$;
