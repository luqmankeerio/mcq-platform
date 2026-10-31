import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TestService } from '../../core/services/test.service';
import { AuthService } from '../../core/services/auth.service';
import { Test, MCQ, MCQOption, TestAttempt } from '../../core/models';

@Component({
  selector: 'app-online-test',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './online-test.component.html',
  styleUrls: ['./online-test.component.scss']
})
export class OnlineTestComponent implements OnInit, OnDestroy {
  testToken = '';
  test: Test | null = null;
  attempt: TestAttempt | null = null;
  currentIndex = 0;

  // Question answers map: mcq_id -> selected_option_id
  selectedAnswers = new Map<number, number>();

  // Timer properties
  timeLeftSeconds = 0;
  totalTimeSeconds = 0;
  timerInterval: any = null;
  isSubmitting = false;
  isCompleted = false;

  loading = true;
  error = '';
  accessDenied = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testService: TestService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    this.testToken = this.route.snapshot.paramMap.get('token') || '';
    if (!this.testToken) {
      this.error = 'Invalid test link.';
      this.loading = false;
      return;
    }

    try {
      // 1. Fetch test by private token
      this.test = await this.testService.getTestByToken(this.testToken);
      if (!this.test.is_active) {
        this.error = 'This test is currently inactive or closed by the instructor.';
        this.loading = false;
        return;
      }

      // 2. Validate current student invitation requirement (#10)
      const user = this.authService.currentUserSnapshot;
      if (!user) {
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: `/test/${this.testToken}` }
        });
        return;
      }

      // Check if student is explicitly invited (or if admin/creator)
      const isCreatorOrAdmin = user.role === 'admin' || this.test.created_by === user.id;
      if (!isCreatorOrAdmin) {
        const isInvited = await this.testService.isStudentInvited(this.test.id, user.id);
        if (!isInvited) {
          this.accessDenied = true;
          this.loading = false;
          return;
        }
      }

      // 3. Start or resume attempt
      this.attempt = await this.testService.startAttempt(this.test.id, user.id);

      // 4. Initialize countdown timer (#11)
      this.totalTimeSeconds = (this.test.time_limit_minutes || 60) * 60;
      
      // Calculate remaining time based on started_at
      const startTime = new Date(this.attempt.started_at).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      this.timeLeftSeconds = Math.max(0, this.totalTimeSeconds - elapsedSeconds);

      if (this.timeLeftSeconds <= 0) {
        // Automatically submit if time expired while away
        await this.autoSubmit();
      } else {
        this.startTimer();
      }
    } catch (err: any) {
      this.error = err.message || 'Unable to join test';
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.timeLeftSeconds > 0) {
        this.timeLeftSeconds--;
      } else {
        clearInterval(this.timerInterval);
        this.autoSubmit();
      }
    }, 1000);
  }

  get currentMCQ(): MCQ | null {
    if (!this.test?.mcqs || this.test.mcqs.length === 0) return null;
    return this.test.mcqs[this.currentIndex] || null;
  }

  selectOption(mcqId: number, optionId: number): void {
    if (this.isCompleted || this.isSubmitting) return;
    this.selectedAnswers.set(mcqId, optionId);
  }

  isOptionSelected(mcqId: number, optionId: number): boolean {
    return this.selectedAnswers.get(mcqId) === optionId;
  }

  isQuestionAnswered(mcqId: number): boolean {
    return this.selectedAnswers.has(mcqId);
  }

  goToQuestion(idx: number): void {
    this.currentIndex = idx;
  }

  nextQuestion(): void {
    if (this.test?.mcqs && this.currentIndex < this.test.mcqs.length - 1) {
      this.currentIndex++;
    }
  }

  prevQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  // Automatic submission when timer ends (#11)
  async autoSubmit(): Promise<void> {
    if (this.isSubmitting || this.isCompleted) return;
    await this.submitTest(true);
  }

  // Manual or automatic submission (#11)
  async submitTest(isAuto = false): Promise<void> {
    if (!this.attempt || !this.test?.mcqs) return;

    if (!isAuto) {
      const unanswered = this.test.mcqs.length - this.selectedAnswers.size;
      const msg = unanswered > 0
        ? `You still have ${unanswered} unanswered question(s). Are you sure you want to submit?`
        : 'Are you sure you want to finish and submit the test?';
      if (!confirm(msg)) return;
    }

    this.isSubmitting = true;
    if (this.timerInterval) clearInterval(this.timerInterval);

    try {
      // Build payload for all MCQs in this test
      const payload = this.test.mcqs.map(m => ({
        mcq_id: m.id,
        selected_option_id: this.selectedAnswers.get(m.id) || null
      }));

      this.attempt = await this.testService.submitAttempt(this.attempt.id, payload);
      this.isCompleted = true;
    } catch (err: any) {
      this.error = err.message || 'Failed to submit test.';
    } finally {
      this.isSubmitting = false;
    }
  }

  // Timer format mm:ss or hh:mm:ss
  get formattedTime(): string {
    const hours = Math.floor(this.timeLeftSeconds / 3600);
    const minutes = Math.floor((this.timeLeftSeconds % 3600) / 60);
    const seconds = this.timeLeftSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  get timerUrgent(): boolean {
    return this.timeLeftSeconds <= 300; // Under 5 minutes
  }

  get scorePercentage(): number {
    if (!this.attempt || !this.attempt.total_questions) return 0;
    return Math.round((this.attempt.score / this.attempt.total_questions) * 100);
  }
}
