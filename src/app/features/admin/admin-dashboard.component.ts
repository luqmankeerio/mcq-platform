import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { McqService } from '../../core/services/mcq.service';
import { TestService } from '../../core/services/test.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile, Class, Subject, Chapter, MCQ, Test } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  activeTab: 'users' | 'subjects' | 'chapters' | 'mcqs' | 'tests' = 'users';

  // Quick Stats
  stats = { students: 0, teachers: 0, classes: 0, subjects: 0, chapters: 0, tests: 0 };

  // ─── 1. Users ───────────────────────────────────────────────────────────────
  users: UserProfile[] = [];
  userFilter: 'all' | 'student' | 'teacher' | 'admin' = 'all';
  searchUserQuery = '';
  editingUser: UserProfile | null = null;
  userForm: FormGroup;
  showUserModal = false;

  // ─── 2. Subjects ────────────────────────────────────────────────────────────
  classes: Class[] = [];
  allSubjects: Subject[] = [];           // all subjects from DB
  subjects: Subject[] = [];             // displayed subjects (filtered by class)
  subjectFilterClassId = 0;             // 0 = all classes
  subjectForm: FormGroup;
  showSubjectModal = false;
  editingSubjectId: number | null = null;

  // ─── 3. Chapters ────────────────────────────────────────────────────────────
  allChapters: Chapter[] = [];          // all chapters from DB
  chapters: Chapter[] = [];            // displayed chapters (filtered by subject)
  chapterFilterClassId = 0;
  chapterFilterSubjectId = 0;
  chapterSubjectsForFilter: Subject[] = [];  // subjects for chapters filter dropdown
  chapterForm: FormGroup;
  showChapterModal = false;
  editingChapterId: number | null = null;
  // subjects visible inside the "Add/Edit Chapter" modal (filtered by chosen class)
  chapterModalSubjects: Subject[] = [];
  chapterModalClassId = 0;

  // ─── 4. MCQs ────────────────────────────────────────────────────────────────
  mcqs: MCQ[] = [];
  loadingMcqs = false;
  mcqFilterClassId = 0;
  mcqFilterSubjectId = 0;
  mcqFilterChapterId = 0;
  mcqFilterSubjects: Subject[] = [];
  mcqFilterChapters: Chapter[] = [];

  // ─── 5. Tests ───────────────────────────────────────────────────────────────
  tests: Test[] = [];

  // Feedback
  feedbackMsg = '';
  feedbackType: 'success' | 'danger' = 'success';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private mcqService: McqService,
    private testService: TestService,
    private authService: AuthService
  ) {
    this.userForm = this.fb.group({
      full_name: ['', Validators.required],
      role: ['student', Validators.required],
      phone: ['']
    });

    this.subjectForm = this.fb.group({
      class_id: [null, Validators.required],
      name: ['', Validators.required],
      description: [''],
      icon: ['fa-book-atlas']
    });

    this.chapterForm = this.fb.group({
      class_id: [null, Validators.required],
      subject_id: [null, Validators.required],
      name: ['', Validators.required],
      description: [''],
      order_num: [1, [Validators.required, Validators.min(1)]]
    });
  }

  async ngOnInit(): Promise<void> {
    // Wait for Supabase to rehydrate the session from localStorage before
    // making any RLS-protected queries. Without this, queries run as 'anon'
    // and RLS blocks them even if the user is logged in.
    await this.authService.getSession();
    await this.refreshAllData();
  }

  async refreshAllData(): Promise<void> {
    const errors: string[] = [];

    // 1. Classes
    try {
      this.classes = await this.mcqService.getClasses();
      this.stats.classes = this.classes.length;
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to load classes:', err);
      errors.push('Classes: ' + (err.message || 'Error'));
    }

    // 2. Subjects
    try {
      this.allSubjects = await this.mcqService.getAllSubjects();
      this.stats.subjects = this.allSubjects.length;
      this.applySubjectFilter();
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to load subjects:', err);
      errors.push('Subjects: ' + (err.message || 'Error'));
    }

    // 3. Chapters
    try {
      this.allChapters = await this.mcqService.getAllChapters();
      this.stats.chapters = this.allChapters.length;
      this.applyChapterFilter();
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to load chapters:', err);
      errors.push('Chapters: ' + (err.message || 'Error'));
    }

    // 4. Users (Profiles)
    try {
      this.users = await this.userService.getAllUsers();
      this.stats.students = this.users.filter(u => u.role === 'student').length;
      this.stats.teachers = this.users.filter(u => u.role === 'teacher').length;
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to load users:', err);
      errors.push('Users: ' + (err.message || 'Error'));
    }

    // 5. Tests
    try {
      this.tests = await this.testService.getAllTests();
      this.stats.tests = this.tests.length;
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to load tests:', err);
      errors.push('Tests: ' + (err.message || 'Error'));
    }

    this.applyMcqFilters();

    if (errors.length > 0) {
      this.notify('Some data could not be loaded: ' + errors.join(' | '), 'danger');
    }
  }

  // ─── Subjects Tab ───────────────────────────────────────────────────────────

  applySubjectFilter(): void {
    if (this.subjectFilterClassId === 0) {
      this.subjects = [...this.allSubjects];
    } else {
      this.subjects = this.allSubjects.filter(s => s.class_id === this.subjectFilterClassId);
    }
  }

  onSubjectFilterClassChange(classId: any): void {
    this.subjectFilterClassId = Number(classId);
    this.applySubjectFilter();
  }

  openAddSubject(): void {
    this.editingSubjectId = null;
    this.subjectForm.reset({
      class_id: this.subjectFilterClassId || this.classes[0]?.id || null,
      icon: 'fa-book-atlas'
    });
    this.showSubjectModal = true;
  }

  openEditSubject(sub: Subject): void {
    this.editingSubjectId = sub.id;
    this.subjectForm.patchValue({
      class_id: sub.class_id,
      name: sub.name,
      description: sub.description || '',
      icon: sub.icon || 'fa-book-atlas'
    });
    this.showSubjectModal = true;
  }

  closeSubjectModal(): void {
    this.showSubjectModal = false;
    this.editingSubjectId = null;
  }

  async saveSubject(): Promise<void> {
    if (this.subjectForm.invalid) return;
    try {
      const val = this.subjectForm.value;
      const payload = {
        class_id: Number(val.class_id),
        name: val.name,
        description: val.description,
        icon: val.icon
      };
      if (this.editingSubjectId) {
        await this.mcqService.updateSubject(this.editingSubjectId, payload);
        this.notify('Subject updated!', 'success');
      } else {
        await this.mcqService.createSubject(payload as any);
        this.notify('Subject created!', 'success');
      }
      this.closeSubjectModal();
      await this.refreshAllData();
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  async deleteSubject(sub: Subject): Promise<void> {
    if (!confirm(`Delete subject "${sub.name}" and all its chapters/MCQs?`)) return;
    try {
      await this.mcqService.deleteSubject(sub.id);
      this.notify('Subject deleted', 'success');
      await this.refreshAllData();
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  // ─── Chapters Tab ───────────────────────────────────────────────────────────

  applyChapterFilter(): void {
    this.chapterSubjectsForFilter = this.chapterFilterClassId
      ? this.allSubjects.filter(s => s.class_id === this.chapterFilterClassId)
      : [];

    if (!this.chapterFilterSubjectId) {
      this.chapters = [];
    } else {
      this.chapters = this.allChapters.filter(ch => ch.subject_id === this.chapterFilterSubjectId);
    }
  }

  onChapterFilterClassChange(classId: any): void {
    this.chapterFilterClassId = Number(classId);
    this.chapterFilterSubjectId = 0;
    this.chapters = [];
    this.chapterSubjectsForFilter = this.chapterFilterClassId
      ? this.allSubjects.filter(s => s.class_id === this.chapterFilterClassId)
      : [];
  }

  onChapterFilterSubjectChange(subId: any): void {
    this.chapterFilterSubjectId = Number(subId);
    this.chapters = this.chapterFilterSubjectId
      ? this.allChapters.filter(ch => ch.subject_id === this.chapterFilterSubjectId)
      : [];
  }

  // When admin changes class inside the chapter ADD/EDIT modal → update subject dropdown
  onChapterModalClassChange(classId: any): void {
    this.chapterModalClassId = Number(classId);
    this.chapterModalSubjects = this.allSubjects.filter(s => s.class_id === this.chapterModalClassId);
    this.chapterForm.patchValue({ subject_id: null });
  }

  openAddChapter(): void {
    this.editingChapterId = null;
    this.chapterModalClassId = this.chapterFilterClassId || this.classes[0]?.id || 0;
    this.chapterModalSubjects = this.chapterModalClassId
      ? this.allSubjects.filter(s => s.class_id === this.chapterModalClassId)
      : [];
    this.chapterForm.reset({
      class_id: this.chapterModalClassId || null,
      subject_id: this.chapterFilterSubjectId || this.chapterModalSubjects[0]?.id || null,
      order_num: this.chapters.length + 1
    });
    this.showChapterModal = true;
  }

  openEditChapter(chap: Chapter): void {
    this.editingChapterId = chap.id;
    // Determine class from the subject join
    const parentSubject = this.allSubjects.find(s => s.id === chap.subject_id);
    this.chapterModalClassId = parentSubject?.class_id || 0;
    this.chapterModalSubjects = this.chapterModalClassId
      ? this.allSubjects.filter(s => s.class_id === this.chapterModalClassId)
      : this.allSubjects;
    this.chapterForm.patchValue({
      class_id: this.chapterModalClassId || null,
      subject_id: chap.subject_id,
      name: chap.name,
      description: chap.description || '',
      order_num: chap.order_num
    });
    this.showChapterModal = true;
  }

  closeChapterModal(): void {
    this.showChapterModal = false;
    this.editingChapterId = null;
  }

  async saveChapter(): Promise<void> {
    if (this.chapterForm.invalid) return;
    try {
      const val = this.chapterForm.value;
      const payload = {
        subject_id: Number(val.subject_id),
        name: val.name,
        description: val.description,
        order_num: Number(val.order_num)
      };
      if (this.editingChapterId) {
        await this.mcqService.updateChapter(this.editingChapterId, payload);
        this.notify('Chapter updated!', 'success');
      } else {
        await this.mcqService.createChapter(payload as any);
        this.notify('Chapter created!', 'success');
      }
      this.closeChapterModal();
      await this.refreshAllData();
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  async deleteChapter(chap: Chapter): Promise<void> {
    if (!confirm(`Delete chapter "${chap.name}" and all its MCQs?`)) return;
    try {
      await this.mcqService.deleteChapter(chap.id);
      this.notify('Chapter deleted', 'success');
      await this.refreshAllData();
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  // ─── MCQs Tab ───────────────────────────────────────────────────────────────

  applyMcqFilters(): void {
    this.mcqFilterSubjects = this.mcqFilterClassId
      ? this.allSubjects.filter(s => s.class_id === this.mcqFilterClassId)
      : [];
    this.mcqFilterChapters = this.mcqFilterSubjectId
      ? this.allChapters.filter(ch => ch.subject_id === this.mcqFilterSubjectId)
      : [];
  }

  onMcqFilterClassChange(classId: any): void {
    this.mcqFilterClassId = Number(classId);
    this.mcqFilterSubjectId = 0;
    this.mcqFilterChapterId = 0;
    this.mcqs = [];
    this.mcqFilterSubjects = this.mcqFilterClassId
      ? this.allSubjects.filter(s => s.class_id === this.mcqFilterClassId)
      : [];
    this.mcqFilterChapters = [];
  }

  onMcqFilterSubjectChange(subId: any): void {
    this.mcqFilterSubjectId = Number(subId);
    this.mcqFilterChapterId = 0;
    this.mcqs = [];
    this.mcqFilterChapters = this.mcqFilterSubjectId
      ? this.allChapters.filter(ch => ch.subject_id === this.mcqFilterSubjectId)
      : [];
  }

  async onMcqFilterChapterChange(chapId: any): Promise<void> {
    this.mcqFilterChapterId = Number(chapId);
    if (!this.mcqFilterChapterId) { this.mcqs = []; return; }
    this.loadingMcqs = true;
    try {
      this.mcqs = await this.mcqService.getMCQsByChapter(this.mcqFilterChapterId);
    } catch (err: any) {
      this.notify(err.message, 'danger');
    } finally {
      this.loadingMcqs = false;
    }
  }

  async deleteAdminMcq(m: MCQ): Promise<void> {
    if (!confirm('Permanently delete this MCQ?')) return;
    try {
      await this.mcqService.deleteMCQ(m.id);
      this.notify('MCQ removed.', 'success');
      this.mcqs = this.mcqs.filter(item => item.id !== m.id);
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  // ─── Tests Tab ──────────────────────────────────────────────────────────────

  async toggleTestStatus(test: Test): Promise<void> {
    try {
      const updated = await this.testService.updateTest(test.id, { is_active: !test.is_active });
      test.is_active = updated.is_active;
      this.notify(`Test is now ${test.is_active ? 'ACTIVE' : 'INACTIVE'}`, 'success');
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  async deleteAdminTest(test: Test): Promise<void> {
    if (!confirm(`Delete test "${test.title}"?`)) return;
    try {
      await this.testService.deleteTest(test.id);
      this.notify('Test deleted', 'success');
      this.tests = this.tests.filter(t => t.id !== test.id);
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  // ─── Users Tab ──────────────────────────────────────────────────────────────

  get filteredUsers(): UserProfile[] {
    return this.users.filter(u => {
      const matchRole = this.userFilter === 'all' || u.role === this.userFilter;
      const matchSearch = !this.searchUserQuery ||
        u.full_name?.toLowerCase().includes(this.searchUserQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(this.searchUserQuery.toLowerCase());
      return matchRole && matchSearch;
    });
  }

  openEditUser(user: UserProfile): void {
    this.editingUser = user;
    this.userForm.patchValue({ full_name: user.full_name, role: user.role, phone: user.phone || '' });
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.editingUser = null;
  }

  async saveUser(): Promise<void> {
    if (!this.editingUser || this.userForm.invalid) return;
    try {
      await this.userService.updateUser(this.editingUser.id, this.userForm.value);
      this.notify('User updated successfully', 'success');
      this.closeUserModal();
      this.users = await this.userService.getAllUsers();
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  async changeRole(user: UserProfile, role: 'student' | 'teacher' | 'admin'): Promise<void> {
    try {
      await this.userService.changeUserRole(user.id, role);
      user.role = role;
      this.notify(`Role updated to ${role}`, 'success');
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  async deleteUser(user: UserProfile): Promise<void> {
    if (!confirm(`Delete user ${user.full_name} (${user.email})?`)) return;
    try {
      await this.userService.deleteUser(user.id);
      this.notify('User deleted', 'success');
      this.users = this.users.filter(u => u.id !== user.id);
    } catch (err: any) {
      this.notify(err.message, 'danger');
    }
  }

  notify(msg: string, type: 'success' | 'danger'): void {
    this.feedbackMsg = msg;
    this.feedbackType = type;
    setTimeout(() => { this.feedbackMsg = ''; }, 4500);
  }
}
