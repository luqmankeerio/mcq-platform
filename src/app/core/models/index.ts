// ─── User / Auth ────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  created_at: string;
  phone?: string;
  avatar_url?: string;
}

// ─── Academic Structure ──────────────────────────────────────────────────────

export interface Class {
  id: number;
  name: string; // e.g. "Class XI", "Class XII"
  description?: string;
  created_at: string;
}

export interface Subject {
  id: number;
  class_id: number;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
  class?: Class;
}

export interface Chapter {
  id: number;
  subject_id: number;
  name: string;
  description?: string;
  order_num: number;
  created_at: string;
  subject?: Subject;
}

// ─── MCQ ────────────────────────────────────────────────────────────────────

export interface MCQ {
  id: number;
  chapter_id: number;
  question_text: string;
  image_url?: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_by: string;
  created_at: string;
  chapter?: Chapter;
  options?: MCQOption[];
}

export interface MCQOption {
  id: number;
  mcq_id: number;
  option_label: string; // A, B, C, D
  option_text: string;
  is_correct: boolean;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

export interface Test {
  id: number;
  title: string;
  description?: string;
  chapter_id?: number | null;
  time_limit_minutes: number;
  created_by: string;
  invite_token: string;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  chapter?: Chapter;
  mcqs?: MCQ[];
}

export interface TestInvitation {
  id: number;
  test_id: number;
  student_id: string;
  created_at: string;
}

export interface TestAttempt {
  id: number;
  test_id: number;
  student_id: string;
  score: number;
  total_questions: number;
  started_at: string;
  submitted_at?: string;
  test?: Test;
  student?: UserProfile;
  answers?: TestAnswer[];
}

export interface TestAnswer {
  id: number;
  attempt_id: number;
  mcq_id: number;
  selected_option_id?: number;
  is_correct: boolean;
  mcq?: MCQ;
  selected_option?: MCQOption;
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
}
