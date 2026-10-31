# MCQ Learning Platform — Angular + Supabase

A modern, responsive, and professional chapter-wise Multiple Choice Question (MCQ) learning and examination website built with **Angular 17+ (Standalone Components)** and **Supabase (PostgreSQL, Authentication & Storage)**.

---

## 🌟 Key Features Implemented

1. **Class XI & Class XII Home Portal**: Dedicated interactive action buttons on the home hero page to navigate to Class XI and Class XII curricula.
2. **Academic Hierarchy**: Class Selection → Subject Catalog (Physics, Chemistry, Math, Biology) → Chapter Listing.
3. **Chapter-Wise MCQs**: Structured four-option practice questions (`A`, `B`, `C`, `D`) with difficulty badges (`Easy`, `Medium`, `Hard`).
4. **Multi-Media & Pedagogy**: Support for question text, question diagrams/images (hosted on Supabase Storage), correct solutions, and in-depth conceptual explanations.
5. **Instant Visual Feedback**:
   - Correct choices highlighted in **Green** (`#16a34a`).
   - Incorrect choices highlighted in **Red** (`#dc2626`).
   - Post-answer explanation panel with conceptual rationale.
6. **Admin Dashboard**: Full CRUD management interface:
   - Students & Teachers: Role modification (`student`, `teacher`, `admin`), profile edits, deletion.
   - Subjects: Creation, edits, icon binding, deletion.
   - Chapters: Order number sorting, subject binding, deletion.
   - MCQs: Centralized overview and deletion.
   - Tests: Status toggling (`ACTIVE` / `INACTIVE`), deletion.
7. **Teacher Dashboard**:
   - Add, edit, and delete teacher's own MCQs with image upload.
   - Build custom timed online tests with selectable MCQ pools.
   - Manage private student invitations.
   - View test score analytics and student attempts.
8. **Student Authentication**: Secure registration and sign-in powered by Supabase Auth with automatic profile sync.
9. **Role-Based Access Control**:
   - Chapter Practice MCQs are protected and accessible only to registered students.
10. **Private Online Tests**:
    - Accessible only via private unique invite tokens (`/test/:token`).
    - Access enforcement restricting attempts exclusively to invited students.
11. **Real-Time Timed Tests**:
    - Live countdown timer with urgent visual warning under 5 minutes.
    - Automatic submission when time reaches `00:00`.
    - Instant automatic result and percentage calculation.
12. **Student Performance Tracking**:
    - "My Results" dashboard listing all past test attempts.
    - Full review modal showing each question, chosen option, correct option, and explanation.
13. **Responsive Footer**:
    - Social links: Facebook, Instagram, YouTube, WhatsApp.
    - Direct contact number (`+92 300 123 4567`) and support details.
14. **Backend Stack**:
    - **Supabase PostgreSQL** for relational schema and indexes.
    - **Row Level Security (RLS)** policies for user privacy and role isolation.
    - **Supabase Auth** session handling.
    - **Supabase Storage** bucket (`mcq-images`) for diagram uploads.

---

## 📁 Project Structure

```
mcq-platform/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/          # authGuard, adminGuard, teacherGuard
│   │   │   ├── models/          # UserProfile, Class, Subject, Chapter, MCQ, Test, TestAttempt
│   │   │   └── services/        # SupabaseService, AuthService, McqService, TestService, UserService
│   │   ├── features/
│   │   │   ├── auth/            # LoginComponent, RegisterComponent
│   │   │   ├── home/            # HomeComponent (Class XI & XII buttons, features)
│   │   │   ├── classes/         # ClassListComponent
│   │   │   ├── subjects/        # SubjectListComponent
│   │   │   ├── chapters/        # ChapterListComponent
│   │   │   ├── mcq-practice/    # McqPracticeComponent (Red/Green feedback, explanations)
│   │   │   ├── online-test/     # OnlineTestComponent (Timer, auto-submit, private token)
│   │   │   ├── results/         # StudentResultsComponent (Attempts history & review)
│   │   │   ├── teacher/         # TeacherDashboardComponent (MCQ CRUD, Test builder, invite)
│   │   │   └── admin/           # AdminDashboardComponent (Full CRUD across all entities)
│   │   ├── shared/
│   │   │   └── components/      # NavbarComponent, FooterComponent (Social links & contact)
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Tables, RLS policies, trigger functions, indexes
│   │   └── 002_storage.sql         # mcq-images storage bucket & storage RLS policies
│   └── seed.sql                    # Seed data for Class XI/XII, Subjects, Chapters
├── angular.json
├── package.json
└── tsconfig.json
```

---

## 🛠️ Manual Supabase Setup Required

Follow these one-time steps in your Supabase project:

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create an account or sign in.
2. Click **New Project**, choose an organization, set a project name (e.g. `mcq-platform`), set a secure database password, and choose your preferred region.

### Step 2: Run the SQL Migrations
1. In the Supabase dashboard, click on **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Copy the entire contents of [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) and paste it into the editor.
4. Click **Run**. This creates:
   - `profiles` table with automatic signup trigger `on_auth_user_created`.
   - `classes`, `subjects`, `chapters`, `mcqs`, `mcq_options`.
   - `tests`, `test_mcqs`, `test_invitations`, `test_attempts`, `test_answers`.
   - Comprehensive Row Level Security (RLS) policies.
5. In another new query, copy and paste [`supabase/migrations/002_storage.sql`](supabase/migrations/002_storage.sql) and click **Run**.
   - This creates the `mcq-images` public storage bucket.
6. (Optional) Run [`supabase/seed.sql`](supabase/seed.sql) to populate initial sample Subjects and Chapters for Class XI and XII.

### Step 3: Configure Authentication
1. Go to **Authentication** → **Providers** → **Email**.
2. For testing convenience: toggle off **Confirm email** so registered users can immediately sign in without waiting for email verification (or leave it on if email server is set up).

### Step 4: Configure Environment Keys in Angular
1. In your Supabase Dashboard, go to **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon public API Key**.
3. Open `src/environments/environment.ts` (and `environment.prod.ts`) and replace the values:
   ```typescript
   export const environment = {
     production: false,
     supabaseUrl: 'https://xyzcompany.supabase.co',
     supabaseKey: 'eyJhbGciOiJIUzI1NiIsIn...'
   };
   ```

### Step 5: Assigning Admin or Teacher Roles
By default, new users registering via the website are assigned the `student` role.
To designate a teacher or admin:
1. Register an account using the website `/register` page.
2. Go to **Supabase Dashboard** → **Table Editor** → **profiles**.
3. Locate your user row and change the `role` column value from `student` to `teacher` or `admin`.

---

## 💻 Commands to Run the Website Locally

Make sure you have Node.js (version 18 or 20 recommended) installed.

### 1. Install Dependencies
Open a terminal in the project directory:
```bash
cd d:\ERPTEST\mcq-platform
npm install
```

### 2. Start the Development Server
```bash
npm start
# or
npx ng serve
```

### 3. Open in Browser
Navigate your browser to:
```
http://localhost:4200
```

### 4. Build for Production
```bash
npm run build
# The compiled bundle will be in dist/mcq-platform/
```

