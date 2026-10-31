-- ============================================================================
-- STEP 1 OF 3: COMPLETE SCHEMA, POLICIES, FUNCTIONS & TRIGGERS
-- Paste and run this file FIRST in Supabase SQL Editor.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLES DEFINITION
-- ============================================================================

-- Profiles table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'fa-book',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_num INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MCQs table
CREATE TABLE IF NOT EXISTS public.mcqs (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  image_url TEXT,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MCQ Options table (A, B, C, D)
CREATE TABLE IF NOT EXISTS public.mcq_options (
  id SERIAL PRIMARY KEY,
  mcq_id INTEGER NOT NULL REFERENCES public.mcqs(id) ON DELETE CASCADE,
  option_label TEXT NOT NULL CHECK (option_label IN ('A', 'B', 'C', 'D', 'E')),
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Online Tests table
CREATE TABLE IF NOT EXISTS public.tests (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  chapter_id INTEGER REFERENCES public.chapters(id) ON DELETE SET NULL,
  time_limit_minutes INTEGER NOT NULL DEFAULT 60,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test MCQs Join table
CREATE TABLE IF NOT EXISTS public.test_mcqs (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  mcq_id INTEGER NOT NULL REFERENCES public.mcqs(id) ON DELETE CASCADE,
  order_num INTEGER DEFAULT 1,
  UNIQUE(test_id, mcq_id)
);

-- Test Invitations table
CREATE TABLE IF NOT EXISTS public.test_invitations (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, student_id)
);

-- Test Attempts table
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  is_submitted BOOLEAN DEFAULT FALSE
);

-- Test Answers table
CREATE TABLE IF NOT EXISTS public.test_answers (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  mcq_id INTEGER NOT NULL REFERENCES public.mcqs(id) ON DELETE CASCADE,
  selected_option_id INTEGER REFERENCES public.mcq_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  UNIQUE(attempt_id, mcq_id)
);

-- ============================================================================
-- 2. HELPER FUNCTIONS & TRIGGERS (Safe, Non-Recursive)
-- ============================================================================

-- Function to safely fetch user role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'student');
END;
$$;

-- Trigger to automatically insert a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_mcqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to guarantee idempotent clean execution
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users or admin can update profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view classes" ON public.classes;
DROP POLICY IF EXISTS "Anyone authenticated can view classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;

DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Anyone authenticated can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;

DROP POLICY IF EXISTS "Anyone can view chapters" ON public.chapters;
DROP POLICY IF EXISTS "Anyone authenticated can view chapters" ON public.chapters;
DROP POLICY IF EXISTS "Admins can manage chapters" ON public.chapters;

DROP POLICY IF EXISTS "Authenticated can view mcqs" ON public.mcqs;
DROP POLICY IF EXISTS "Teachers can create mcqs" ON public.mcqs;
DROP POLICY IF EXISTS "Teachers can update own mcqs" ON public.mcqs;
DROP POLICY IF EXISTS "Teachers can delete own mcqs" ON public.mcqs;

DROP POLICY IF EXISTS "Authenticated can view options" ON public.mcq_options;
DROP POLICY IF EXISTS "Teachers and admins can manage options" ON public.mcq_options;

DROP POLICY IF EXISTS "Authenticated can view tests" ON public.tests;
DROP POLICY IF EXISTS "Public can view active tests" ON public.tests;
DROP POLICY IF EXISTS "Anyone can view test by token" ON public.tests;
DROP POLICY IF EXISTS "Teachers can view own tests" ON public.tests;
DROP POLICY IF EXISTS "Students can view tests they're invited to" ON public.tests;
DROP POLICY IF EXISTS "Teachers can create tests" ON public.tests;
DROP POLICY IF EXISTS "Teachers can update own tests" ON public.tests;
DROP POLICY IF EXISTS "Teachers can delete own tests" ON public.tests;

DROP POLICY IF EXISTS "Authenticated can view test mcqs" ON public.test_mcqs;
DROP POLICY IF EXISTS "Teachers and admins can manage test mcqs" ON public.test_mcqs;

DROP POLICY IF EXISTS "Teachers can manage invitations for own tests" ON public.test_invitations;
DROP POLICY IF EXISTS "Teachers and admins can manage invitations" ON public.test_invitations;
DROP POLICY IF EXISTS "Students can view own invitations" ON public.test_invitations;

DROP POLICY IF EXISTS "Students can manage own attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Teachers can view attempts for own tests" ON public.test_attempts;
DROP POLICY IF EXISTS "Teachers and admins can view attempts" ON public.test_attempts;

DROP POLICY IF EXISTS "Students can manage own answers" ON public.test_answers;
DROP POLICY IF EXISTS "Teachers can view answers for own test attempts" ON public.test_answers;
DROP POLICY IF EXISTS "Teachers and admins can view answers" ON public.test_answers;

-- --- PROFILES POLICIES ---
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated can view profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users or admin can update profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.get_user_role() = 'admin');

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.get_user_role() = 'admin');

-- --- CLASSES POLICIES (Public catalog read, Admin write) ---
CREATE POLICY "Anyone can view classes" ON public.classes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage classes" ON public.classes
  FOR ALL USING (public.get_user_role() = 'admin');

-- --- SUBJECTS POLICIES (Public catalog read, Admin write) ---
CREATE POLICY "Anyone can view subjects" ON public.subjects
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage subjects" ON public.subjects
  FOR ALL USING (public.get_user_role() = 'admin');

-- --- CHAPTERS POLICIES (Public catalog read, Admin write) ---
CREATE POLICY "Anyone can view chapters" ON public.chapters
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage chapters" ON public.chapters
  FOR ALL USING (public.get_user_role() = 'admin');

-- --- MCQS POLICIES ---
CREATE POLICY "Authenticated can view mcqs" ON public.mcqs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can create mcqs" ON public.mcqs
  FOR INSERT WITH CHECK (public.get_user_role() IN ('teacher', 'admin'));

CREATE POLICY "Teachers can update own mcqs" ON public.mcqs
  FOR UPDATE USING (created_by = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "Teachers can delete own mcqs" ON public.mcqs
  FOR DELETE USING (created_by = auth.uid() OR public.get_user_role() = 'admin');

-- --- MCQ OPTIONS POLICIES ---
CREATE POLICY "Authenticated can view options" ON public.mcq_options
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers and admins can manage options" ON public.mcq_options
  FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

-- --- TESTS POLICIES (Non-recursive) ---
CREATE POLICY "Authenticated can view tests" ON public.tests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view active tests" ON public.tests
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Teachers can create tests" ON public.tests
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    (public.get_user_role() IN ('teacher', 'admin') OR created_by = auth.uid())
  );

CREATE POLICY "Teachers can update own tests" ON public.tests
  FOR UPDATE USING (created_by = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "Teachers can delete own tests" ON public.tests
  FOR DELETE USING (created_by = auth.uid() OR public.get_user_role() = 'admin');

-- --- TEST MCQS POLICIES ---
CREATE POLICY "Authenticated can view test mcqs" ON public.test_mcqs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers and admins can manage test mcqs" ON public.test_mcqs
  FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

-- --- TEST INVITATIONS POLICIES (Direct role check, no circular join) ---
CREATE POLICY "Teachers and admins can manage invitations" ON public.test_invitations
  FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

CREATE POLICY "Students can view own invitations" ON public.test_invitations
  FOR SELECT USING (student_id = auth.uid());

-- --- TEST ATTEMPTS POLICIES ---
CREATE POLICY "Students can manage own attempts" ON public.test_attempts
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers and admins can view attempts" ON public.test_attempts
  FOR SELECT USING (public.get_user_role() IN ('teacher', 'admin'));

-- --- TEST ANSWERS POLICIES ---
CREATE POLICY "Students can manage own answers" ON public.test_answers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.test_attempts WHERE id = attempt_id AND student_id = auth.uid())
  );

CREATE POLICY "Teachers and admins can view answers" ON public.test_answers
  FOR SELECT USING (public.get_user_role() IN ('teacher', 'admin'));

-- ============================================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_mcqs_chapter_id ON public.mcqs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_mcq_options_mcq_id ON public.mcq_options(mcq_id);
CREATE INDEX IF NOT EXISTS idx_tests_invite_token ON public.tests(invite_token);
CREATE INDEX IF NOT EXISTS idx_test_mcqs_test_id ON public.test_mcqs(test_id);
CREATE INDEX IF NOT EXISTS idx_test_invitations_test_id ON public.test_invitations(test_id);
CREATE INDEX IF NOT EXISTS idx_test_invitations_student_id ON public.test_invitations(student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student_id ON public.test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON public.test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_attempt_id ON public.test_answers(attempt_id);

-- ============================================================================
-- 5. GRANTS & ROLES PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT ALL ON public.classes TO authenticated;
GRANT ALL ON public.subjects TO authenticated;
GRANT ALL ON public.chapters TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.mcqs TO authenticated;
GRANT ALL ON public.mcq_options TO authenticated;
GRANT ALL ON public.tests TO authenticated;
GRANT ALL ON public.test_mcqs TO authenticated;
GRANT ALL ON public.test_invitations TO authenticated;
GRANT ALL ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_answers TO authenticated;

GRANT SELECT ON public.classes TO anon;
GRANT SELECT ON public.subjects TO anon;
GRANT SELECT ON public.chapters TO anon;
GRANT SELECT ON public.tests TO anon;
GRANT SELECT ON public.test_mcqs TO anon;
GRANT SELECT ON public.mcqs TO anon;
GRANT SELECT ON public.mcq_options TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

