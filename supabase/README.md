# Supabase Database Setup & Migrations

To set up the database for the MCQ Learning Platform, run these **3 files in order** in the **Supabase Dashboard -> SQL Editor**:

---

### Step 1: `01_schema_and_policies.sql`
- Creates all 11 core tables (`profiles`, `classes`, `subjects`, `chapters`, `mcqs`, `mcq_options`, `tests`, `test_mcqs`, `test_invitations`, `test_attempts`, `test_answers`).
- Creates user signup trigger (`handle_new_user`).
- Creates role resolution function with `row_security = off` to eliminate all infinite recursion.
- Sets up all Row Level Security (RLS) policies cleanly without cross-table circular dependencies.
- Configures foreign key indexes and schema permissions.

---

### Step 2: `02_storage.sql`
- Creates the public `mcq-images` storage bucket.
- Sets up storage security policies for uploading and viewing question diagrams and images.

---

### Step 3: `03_seed_data.sql`
- Seeds initial classes: **Class XI** and **Class XII**.
- Seeds core subjects: **Physics**, **Chemistry**, **Mathematics**, **Biology**.
- Seeds initial chapters with order numbers.
- Grants **admin role** to existing user accounts.

---

### That's it!
No other fix scripts are needed. All previous bugfixes and recursion prevention rules are baked directly into these 3 files.

