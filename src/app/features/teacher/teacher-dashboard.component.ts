import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { McqService } from '../../core/services/mcq.service';
import { TestService } from '../../core/services/test.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { Class, Subject, Chapter, MCQ, Test, UserProfile, TestAttempt } from '../../core/models';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit {
  activeTab: 'mcqs' | 'tests' | 'results' = 'mcqs';

  // Hierarchy
  classes: Class[] = [];
  subjects: Subject[] = [];
  chapters: Chapter[] = [];
  selectedClassId = 0;
  selectedSubjectId = 0;
  selectedChapterId = 0;

  // MCQs
  chapterMcqs: MCQ[] = [];
  loadingMcqs = false;
  showMcqModal = false;
  editingMcqId: number | null = null;
  mcqForm: FormGroup;
  selectedImageFile: File | null = null;
  uploadingImage = false;

  // Tests
  myTests: Test[] = [];
  loadingTests = false;
  showTestModal = false;
  editingTestId: number | null = null;
  testForm: FormGroup;
  availableTestMcqs: MCQ[] = [];
  selectedTestMcqIds = new Set<number>();

  // Test modal cascading selectors
  testModalClassId = 0;
  testModalSubjectId = 0;
  testModalChapterId = 0;
  testModalSubjects: Subject[] = [];
  testModalChapters: Chapter[] = [];
  loadingTestMcqs = false;

  // Students & Invitations
  allStudents: UserProfile[] = [];
  showInviteModal = false;
  currentInvitingTest: Test | null = null;
  invitedStudentIds = new Set<string>();

  // Results Review
  testResults: TestAttempt[] = [];
  selectedResultTest: Test | null = null;
  loadingResults = false;

  // Alerts
  feedbackMessage = '';
  feedbackType: 'success' | 'danger' = 'success';

  constructor(
    private fb: FormBuilder,
    private mcqService: McqService,
    private testService: TestService,
    private userService: UserService,
    public authService: AuthService
  ) {
    // MCQ Form Builder
    this.mcqForm = this.fb.group({
      chapter_id: [null, Validators.required],
      question_text: ['', [Validators.required, Validators.minLength(5)]],
      difficulty: ['medium', Validators.required],
      explanation: [''],
      image_url: [''],
      options: this.fb.array([
        this.createOptionGroup('A', true),
        this.createOptionGroup('B', false),
        this.createOptionGroup('C', false),
        this.createOptionGroup('D', false)
      ])
    });

    // Test Form Builder
    this.testForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      chapter_id: [null],
      time_limit_minutes: [30, [Validators.required, Validators.min(1), Validators.max(240)]],
      is_active: [true]
    });
  }

  createOptionGroup(label: string, isCorrect = false): FormGroup {
    return this.fb.group({
      option_label: [label],
      option_text: ['', Validators.required],
      is_correct: [isCorrect]
    });
  }

  get optionsArray(): FormArray {
    return this.mcqForm.get('options') as FormArray;
  }

  async ngOnInit(): Promise<void> {
    try {
      this.classes = await this.mcqService.getClasses();
      if (this.classes.length > 0) {
        this.selectedClassId = this.classes[0].id;
        this.subjects = await this.mcqService.getSubjectsByClass(this.selectedClassId);
        if (this.subjects.length > 0) {
          this.selectedSubjectId = this.subjects[0].id;
          this.chapters = await this.mcqService.getChaptersBySubject(this.selectedSubjectId);
          if (this.chapters.length > 0) {
            this.selectedChapterId = this.chapters[0].id;
            await this.loadChapterMcqs();
          }
        }
      }
    } catch (err: any) {
      console.error('[TeacherDashboard] Error loading initial hierarchy:', err);
    }

    try {
      await this.loadMyTests();
    } catch (err: any) {
      console.error('[TeacherDashboard] Error loading tests:', err);
    }

    try {
      this.allStudents = await this.userService.getAllStudents();
    } catch (err: any) {
      console.error('[TeacherDashboard] Error loading students:', err);
    }
  }

  // ─── Hierarchy cascading ───────────────────────────────────────────────────

  async onClassChange(classId: number): Promise<void> {
    this.selectedClassId = Number(classId);
    this.selectedSubjectId = 0;
    this.selectedChapterId = 0;
    this.chapters = [];
    this.chapterMcqs = [];

    if (this.selectedClassId) {
      this.subjects = await this.mcqService.getSubjectsByClass(this.selectedClassId);
    } else {
      this.subjects = [];
    }
  }

  async onSubjectChange(subjectId: number): Promise<void> {
    this.selectedSubjectId = Number(subjectId);
    this.selectedChapterId = 0;
    this.chapterMcqs = [];

    if (this.selectedSubjectId) {
      this.chapters = await this.mcqService.getChaptersBySubject(this.selectedSubjectId);
    } else {
      this.chapters = [];
    }
  }

  async onChapterChange(chapterId: number): Promise<void> {
    this.selectedChapterId = Number(chapterId);
    if (this.selectedChapterId) {
      await this.loadChapterMcqs();
    } else {
      this.chapterMcqs = [];
    }
  }

  async loadChapterMcqs(): Promise<void> {
    this.loadingMcqs = true;
    try {
      this.chapterMcqs = await this.mcqService.getMCQsByChapter(this.selectedChapterId);
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    } finally {
      this.loadingMcqs = false;
    }
  }

  // ─── MCQ CRUD ──────────────────────────────────────────────────────────────

  openAddMcqModal(): void {
    this.editingMcqId = null;
    this.selectedImageFile = null;
    this.mcqForm.reset({
      chapter_id: this.selectedChapterId || null,
      difficulty: 'medium',
      image_url: ''
    });

    // Reset options
    const labels = ['A', 'B', 'C', 'D'];
    this.optionsArray.clear();
    labels.forEach((l, idx) => {
      this.optionsArray.push(this.createOptionGroup(l, idx === 0));
    });

    this.showMcqModal = true;
  }

  openEditMcqModal(mcq: MCQ): void {
    this.editingMcqId = mcq.id;
    this.selectedImageFile = null;

    this.mcqForm.patchValue({
      chapter_id: mcq.chapter_id,
      question_text: mcq.question_text,
      difficulty: mcq.difficulty,
      explanation: mcq.explanation || '',
      image_url: mcq.image_url || ''
    });

    this.optionsArray.clear();
    if (mcq.options && mcq.options.length > 0) {
      mcq.options.forEach(opt => {
        this.optionsArray.push(this.fb.group({
          option_label: [opt.option_label],
          option_text: [opt.option_text, Validators.required],
          is_correct: [opt.is_correct]
        }));
      });
    } else {
      ['A', 'B', 'C', 'D'].forEach((l, idx) => {
        this.optionsArray.push(this.createOptionGroup(l, idx === 0));
      });
    }

    this.showMcqModal = true;
  }

  closeMcqModal(): void {
    this.showMcqModal = false;
    this.editingMcqId = null;
  }

  setCorrectOption(index: number): void {
    this.optionsArray.controls.forEach((ctrl, i) => {
      ctrl.patchValue({ is_correct: i === index });
    });
  }

  onImageSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedImageFile = file;
    }
  }

  async saveMcq(): Promise<void> {
    if (this.mcqForm.invalid) {
      this.mcqForm.markAllAsTouched();
      return;
    }

    const hasCorrect = this.optionsArray.controls.some(c => c.value.is_correct);
    if (!hasCorrect) {
      this.showMessage('Please mark one of the options (A, B, C, or D) as correct.', 'danger');
      return;
    }

    this.uploadingImage = true;
    try {
      let imageUrl = this.mcqForm.value.image_url;

      // Handle Image upload to Supabase Storage if file selected
      if (this.selectedImageFile) {
        const path = `questions/${Date.now()}_${this.selectedImageFile.name}`;
        imageUrl = await this.mcqService.uploadImage(this.selectedImageFile, path);
      }

      const mcqPayload = {
        chapter_id: Number(this.mcqForm.value.chapter_id),
        question_text: this.mcqForm.value.question_text,
        difficulty: this.mcqForm.value.difficulty,
        explanation: this.mcqForm.value.explanation,
        image_url: imageUrl
      };

      const optionsPayload = this.optionsArray.value;

      if (this.editingMcqId) {
        await this.mcqService.updateMCQ(this.editingMcqId, mcqPayload, optionsPayload);
        this.showMessage('MCQ updated successfully!', 'success');
      } else {
        await this.mcqService.createMCQ(mcqPayload, optionsPayload);
        this.showMessage('New MCQ created successfully!', 'success');
      }

      this.closeMcqModal();
      await this.loadChapterMcqs();
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    } finally {
      this.uploadingImage = false;
    }
  }

  async deleteMcq(mcq: MCQ): Promise<void> {
    if (!confirm(`Delete MCQ: "${mcq.question_text.substring(0, 40)}..."?`)) return;
    try {
      await this.mcqService.deleteMCQ(mcq.id);
      this.showMessage('MCQ removed.', 'success');
      await this.loadChapterMcqs();
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    }
  }

  // ─── Tests Management ──────────────────────────────────────────────────────

  async loadMyTests(): Promise<void> {
    const user = this.authService.currentUserSnapshot;
    if (!user) return;
    this.loadingTests = true;
    try {
      this.myTests = await this.testService.getTestsByTeacher(user.id);
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    } finally {
      this.loadingTests = false;
    }
  }

  async openAddTestModal(): Promise<void> {
    this.editingTestId = null;
    this.selectedTestMcqIds.clear();
    this.testForm.reset({
      title: '',
      description: '',
      chapter_id: null,
      time_limit_minutes: 45,
      is_active: true
    });

    // Ensure classes are loaded
    if (this.classes.length === 0) {
      try {
        this.classes = await this.mcqService.getClasses();
      } catch (err: any) {
        this.showMessage(err.message, 'danger');
      }
    }

    // Default to active class from dashboard or first available
    this.testModalClassId = this.selectedClassId || this.classes[0]?.id || 0;
    if (this.testModalClassId) {
      await this.onTestModalClassChange(this.testModalClassId);
    }

    this.showTestModal = true;
  }

  async openEditTestModal(test: Test): Promise<void> {
    this.editingTestId = test.id;
    this.selectedTestMcqIds.clear();
    this.testForm.patchValue({
      title: test.title,
      description: test.description || '',
      chapter_id: test.chapter_id || null,
      time_limit_minutes: test.time_limit_minutes,
      is_active: test.is_active
    });

    // Preload MCQs attached to this test
    try {
      const fullTest = await this.testService.getTestByToken(test.invite_token);
      if (fullTest.mcqs) {
        fullTest.mcqs.forEach(m => this.selectedTestMcqIds.add(m.id));
      }
    } catch (err) {
      console.warn('Could not load test MCQs:', err);
    }

    if (this.classes.length === 0) {
      this.classes = await this.mcqService.getClasses();
    }

    this.testModalClassId = this.selectedClassId || this.classes[0]?.id || 0;
    if (this.testModalClassId) {
      await this.onTestModalClassChange(this.testModalClassId);
    }

    this.showTestModal = true;
  }

  async onTestModalClassChange(classId: any): Promise<void> {
    this.testModalClassId = Number(classId);
    this.testModalSubjectId = 0;
    this.testModalChapterId = 0;
    this.testModalSubjects = [];
    this.testModalChapters = [];
    this.availableTestMcqs = [];

    if (!this.testModalClassId) return;

    try {
      this.testModalSubjects = await this.mcqService.getSubjectsByClass(this.testModalClassId);
      if (this.testModalSubjects.length > 0) {
        const targetSubId = (this.selectedSubjectId && this.testModalSubjects.some(s => s.id === this.selectedSubjectId))
          ? this.selectedSubjectId
          : this.testModalSubjects[0].id;
        await this.onTestModalSubjectChange(targetSubId);
      }
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    }
  }

  async onTestModalSubjectChange(subjectId: any): Promise<void> {
    this.testModalSubjectId = Number(subjectId);
    this.testModalChapterId = 0;
    this.testModalChapters = [];
    this.availableTestMcqs = [];

    if (!this.testModalSubjectId) return;

    try {
      this.testModalChapters = await this.mcqService.getChaptersBySubject(this.testModalSubjectId);
      if (this.testModalChapters.length > 0) {
        const targetChapId = (this.selectedChapterId && this.testModalChapters.some(c => c.id === this.selectedChapterId))
          ? this.selectedChapterId
          : this.testModalChapters[0].id;
        await this.onTestModalChapterChange(targetChapId);
      }
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    }
  }

  async onTestModalChapterChange(chapterId: any): Promise<void> {
    this.testModalChapterId = Number(chapterId);
    this.testForm.patchValue({ chapter_id: this.testModalChapterId || null });
    this.availableTestMcqs = [];

    if (!this.testModalChapterId) return;

    this.loadingTestMcqs = true;
    try {
      this.availableTestMcqs = await this.mcqService.getMCQsByChapter(this.testModalChapterId);
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    } finally {
      this.loadingTestMcqs = false;
    }
  }

  toggleTestMcq(mcqId: number): void {
    if (this.selectedTestMcqIds.has(mcqId)) {
      this.selectedTestMcqIds.delete(mcqId);
    } else {
      this.selectedTestMcqIds.add(mcqId);
    }
  }

  selectAllAvailableMcqs(): void {
    this.availableTestMcqs.forEach(m => this.selectedTestMcqIds.add(m.id));
  }

  deselectCurrentChapterMcqs(): void {
    this.availableTestMcqs.forEach(m => this.selectedTestMcqIds.delete(m.id));
  }

  clearAllSelectedTestMcqs(): void {
    this.selectedTestMcqIds.clear();
  }

  async saveTest(): Promise<void> {
    if (this.testForm.invalid) {
      this.testForm.markAllAsTouched();
      this.showMessage('Please provide a test title and valid time limit.', 'danger');
      return;
    }

    const mcqIds = Array.from(this.selectedTestMcqIds);
    if (mcqIds.length === 0) {
      this.showMessage('Please select at least 1 MCQ to include in this online test.', 'danger');
      return;
    }

    const user = this.authService.currentUserSnapshot;
    if (!user) {
      this.showMessage('You must be logged in to create a test.', 'danger');
      return;
    }

    try {
      const payload = {
        title: this.testForm.value.title,
        description: this.testForm.value.description || '',
        chapter_id: this.testForm.value.chapter_id ? Number(this.testForm.value.chapter_id) : (this.testModalChapterId || null),
        time_limit_minutes: Number(this.testForm.value.time_limit_minutes),
        is_active: !!this.testForm.value.is_active,
        created_by: user.id
      };

      if (this.editingTestId) {
        await this.testService.updateTest(this.editingTestId, payload, mcqIds);
        this.showMessage('Online Test updated!', 'success');
      } else {
        await this.testService.createTest(payload, mcqIds);
        this.showMessage('New Online Test created with private invite link!', 'success');
      }

      this.closeTestModal();
      await this.loadMyTests();
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    }
  }

  closeTestModal(): void {
    this.showTestModal = false;
    this.editingTestId = null;
    this.selectedTestMcqIds.clear();
    this.availableTestMcqs = [];
  }

  async deleteTest(test: Test): Promise<void> {
    if (!confirm(`Delete test "${test.title}"? All student attempts will be deleted.`)) return;
    try {
      await this.testService.deleteTest(test.id);
      this.showMessage('Test deleted.', 'success');
      await this.loadMyTests();
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    }
  }

  // ─── Private Link & Student Invitations (Requirement #10) ──────────────────

  async openInviteModal(test: Test): Promise<void> {
    this.currentInvitingTest = test;
    this.showInviteModal = true;
    try {
      const invited = await this.testService.getInvitedStudents(test.id);
      this.invitedStudentIds = new Set(invited.map(s => s.id));
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    }
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
    this.currentInvitingTest = null;
  }

  getPrivateTestLink(test: Test): string {
    const baseUrl = window.location.href.split('#')[0].replace(/\/+$/, '');
    return `${baseUrl}/#/test/${test.invite_token}`;
  }

  copyTestLink(test: Test): void {
    const link = this.getPrivateTestLink(test);
    navigator.clipboard.writeText(link);
    this.showMessage('Private test link copied to clipboard!', 'success');
  }

  async toggleStudentInvite(studentId: string): Promise<void> {
    if (!this.currentInvitingTest) return;

    try {
      if (this.invitedStudentIds.has(studentId)) {
        await this.testService.removeInvitation(this.currentInvitingTest.id, studentId);
        this.invitedStudentIds.delete(studentId);
      } else {
        await this.testService.inviteStudentToTest(this.currentInvitingTest.id, studentId);
        this.invitedStudentIds.add(studentId);
      }
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    }
  }

  async inviteAllStudents(): Promise<void> {
    if (!this.currentInvitingTest) return;
    try {
      for (const student of this.allStudents) {
        if (!this.invitedStudentIds.has(student.id)) {
          await this.testService.inviteStudentToTest(this.currentInvitingTest.id, student.id);
          this.invitedStudentIds.add(student.id);
        }
      }
      this.showMessage('All students invited!', 'success');
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    }
  }

  // ─── Results View ──────────────────────────────────────────────────────────

  async viewTestResults(test: Test): Promise<void> {
    this.selectedResultTest = test;
    this.loadingResults = true;
    this.activeTab = 'results';
    try {
      this.testResults = await this.testService.getAttemptsByTest(test.id);
    } catch (err: any) {
      this.showMessage(err.message, 'danger');
    } finally {
      this.loadingResults = false;
    }
  }

  // ─── Utility ───────────────────────────────────────────────────────────────

  showMessage(msg: string, type: 'success' | 'danger'): void {
    this.feedbackMessage = msg;
    this.feedbackType = type;
    setTimeout(() => {
      this.feedbackMessage = '';
    }, 4500);
  }
}

