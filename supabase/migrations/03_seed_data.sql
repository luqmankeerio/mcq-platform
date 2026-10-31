-- ============================================================================
-- STEP 3 OF 3: SEED DATA & ADMIN ROLE ASSIGNMENT
-- Paste and run this file THIRD in Supabase SQL Editor.
-- ============================================================================

-- 1. Insert Classes
INSERT INTO public.classes (name, description) VALUES
  ('Class XI', 'Intermediate Part 1 - First Year Higher Secondary'),
  ('Class XII', 'Intermediate Part 2 - Second Year Higher Secondary')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Subjects for Class XI
INSERT INTO public.subjects (class_id, name, description, icon)
SELECT id, 'Physics', 'Mechanics, Thermodynamics, Waves and Optics', 'fa-atom'
FROM public.classes WHERE name = 'Class XI'
ON CONFLICT DO NOTHING;

INSERT INTO public.subjects (class_id, name, description, icon)
SELECT id, 'Chemistry', 'Atomic Structure, Chemical Bonding, Stoichiometry', 'fa-flask-vial'
FROM public.classes WHERE name = 'Class XI'
ON CONFLICT DO NOTHING;

INSERT INTO public.subjects (class_id, name, description, icon)
SELECT id, 'Mathematics', 'Trigonometry, Matrices, Vectors, Complex Numbers', 'fa-square-root-variable'
FROM public.classes WHERE name = 'Class XI'
ON CONFLICT DO NOTHING;

INSERT INTO public.subjects (class_id, name, description, icon)
SELECT id, 'Biology', 'Cell Structure, Biological Molecules, Enzymes', 'fa-dna'
FROM public.classes WHERE name = 'Class XI'
ON CONFLICT DO NOTHING;

-- 3. Insert Subjects for Class XII
INSERT INTO public.subjects (class_id, name, description, icon)
SELECT id, 'Physics', 'Electrostatics, Current Electricity, Electromagnetism', 'fa-bolt'
FROM public.classes WHERE name = 'Class XII'
ON CONFLICT DO NOTHING;

INSERT INTO public.subjects (class_id, name, description, icon)
SELECT id, 'Chemistry', 'Organic Reactions, Periodic Table, Electrochemistry', 'fa-vial'
FROM public.classes WHERE name = 'Class XII'
ON CONFLICT DO NOTHING;

INSERT INTO public.subjects (class_id, name, description, icon)
SELECT id, 'Mathematics', 'Calculus, Differentiation, Integration, Analytic Geometry', 'fa-calculator'
FROM public.classes WHERE name = 'Class XII'
ON CONFLICT DO NOTHING;

INSERT INTO public.subjects (class_id, name, description, icon)
SELECT id, 'Biology', 'Genetics, Evolution, Biotechnology, Ecology', 'fa-seedling'
FROM public.classes WHERE name = 'Class XII'
ON CONFLICT DO NOTHING;

-- 4. Insert Sample Chapters for Class XI Physics
INSERT INTO public.chapters (subject_id, name, description, order_num)
SELECT s.id, 'Vectors and Equilibrium', 'Scalar & vector products, conditions of equilibrium, torque', 1
FROM public.subjects s JOIN public.classes c ON s.class_id = c.id
WHERE c.name = 'Class XI' AND s.name = 'Physics'
ON CONFLICT DO NOTHING;

INSERT INTO public.chapters (subject_id, name, description, order_num)
SELECT s.id, 'Force and Motion', 'Newton laws, linear momentum, elastic collisions, projectile motion', 2
FROM public.subjects s JOIN public.classes c ON s.class_id = c.id
WHERE c.name = 'Class XI' AND s.name = 'Physics'
ON CONFLICT DO NOTHING;

INSERT INTO public.chapters (subject_id, name, description, order_num)
SELECT s.id, 'Work and Energy', 'Work done by constant & variable force, kinetic energy, potential energy', 3
FROM public.subjects s JOIN public.classes c ON s.class_id = c.id
WHERE c.name = 'Class XI' AND s.name = 'Physics'
ON CONFLICT DO NOTHING;

-- 5. Insert Sample Chapters for Class XII Physics
INSERT INTO public.chapters (subject_id, name, description, order_num)
SELECT s.id, 'Electrostatics', 'Coulomb law, electric field intensity, Gauss law, capacitors', 1
FROM public.subjects s JOIN public.classes c ON s.class_id = c.id
WHERE c.name = 'Class XII' AND s.name = 'Physics'
ON CONFLICT DO NOTHING;

INSERT INTO public.chapters (subject_id, name, description, order_num)
SELECT s.id, 'Current Electricity', 'Ohm law, Kirchhoff rules, potentiometer, Wheatstone bridge', 2
FROM public.subjects s JOIN public.classes c ON s.class_id = c.id
WHERE c.name = 'Class XII' AND s.name = 'Physics'
ON CONFLICT DO NOTHING;

-- 6. PROMOTE EXISTING USERS TO ADMIN (so you have full dashboard management)
-- Any user who has signed up so far will be granted admin privileges:
UPDATE public.profiles
SET role = 'admin'
WHERE role = 'student' OR role IS NULL;

