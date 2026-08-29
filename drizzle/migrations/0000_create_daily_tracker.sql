-- Single-user personal tracker, no auth: open anon access by design.

CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  maintenance_kcal INT NOT NULL DEFAULT 2200,
  target_kcal INT NOT NULL DEFAULT 2000,
  target_protein INT NOT NULL DEFAULT 120,
  start_weight NUMERIC NOT NULL DEFAULT 70,
  goal TEXT NOT NULL DEFAULT 'lose',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settings_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open settings" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
INSERT INTO public.settings (id) VALUES (1);

CREATE TABLE public.diet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'gram',
  protein_per_unit NUMERIC NOT NULL DEFAULT 0,
  kcal_per_unit NUMERIC NOT NULL DEFAULT 0,
  default_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_templates TO anon, authenticated;
GRANT ALL ON public.diet_templates TO service_role;
ALTER TABLE public.diet_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open diet_templates" ON public.diet_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.diet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'gram',
  amount NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  kcal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX diet_entries_date_idx ON public.diet_entries (entry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_entries TO anon, authenticated;
GRANT ALL ON public.diet_entries TO service_role;
ALTER TABLE public.diet_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open diet_entries" ON public.diet_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.step_logs (
  entry_date DATE PRIMARY KEY,
  steps INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.step_logs TO anon, authenticated;
GRANT ALL ON public.step_logs TO service_role;
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open step_logs" ON public.step_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.habit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'good',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_templates TO anon, authenticated;
GRANT ALL ON public.habit_templates TO service_role;
ALTER TABLE public.habit_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open habit_templates" ON public.habit_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'good',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX habit_entries_date_idx ON public.habit_entries (entry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_entries TO anon, authenticated;
GRANT ALL ON public.habit_entries TO service_role;
ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open habit_entries" ON public.habit_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.study_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 10,
  default_hours NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_templates TO anon, authenticated;
GRANT ALL ON public.study_templates TO service_role;
ALTER TABLE public.study_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open study_templates" ON public.study_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.study_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  name TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 10,
  hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX study_entries_date_idx ON public.study_entries (entry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_entries TO anon, authenticated;
GRANT ALL ON public.study_entries TO service_role;
ALTER TABLE public.study_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open study_entries" ON public.study_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);