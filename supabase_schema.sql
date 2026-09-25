-- Tabella per Gestione Interventi Tecnici On-Site
-- Puoi eseguire questa query nell'SQL Editor di Supabase (https://supabase.com/dashboard/project/jdtizqpowttgxptvmxlu/sql)

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

-- Abilita Row Level Security (RLS) ma permette accesso anon/public per l'app
ALTER TABLE interventi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accesso completo per tutti gli utenti anonimi" 
ON interventi FOR ALL 
USING (true) 
WITH CHECK (true);

-- Abilita Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE interventi;
