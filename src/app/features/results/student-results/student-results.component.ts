import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TestService } from '../../../core/services/test.service';
import { AuthService } from '../../../core/services/auth.service';
import { TestAttempt } from '../../../core/models';

@Component({
  selector: 'app-student-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-results.component.html',
  styleUrls: ['./student-results.component.scss']
})
export class StudentResultsComponent implements OnInit {
  attempts: TestAttempt[] = [];
  selectedAttempt: TestAttempt | null = null;
  loading = true;
  loadingDetail = false;
  error = '';

  constructor(
    private testService: TestService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.authService.currentUserSnapshot;
    if (!user) return;

    try {
      this.attempts = await this.testService.getAttemptsByStudent(user.id);
    } catch (err: any) {
      this.error = err.message || 'Failed to load test history';
    } finally {
      this.loading = false;
    }
  }

  async viewDetails(attempt: TestAttempt): Promise<void> {
    this.loadingDetail = true;
    try {
      this.selectedAttempt = await this.testService.getAttemptById(attempt.id);
    } catch (err: any) {
      alert('Could not load attempt details: ' + err.message);
    } finally {
      this.loadingDetail = false;
    }
  }

  closeDetails(): void {
    this.selectedAttempt = null;
  }

  getPercentage(score: number, total: number): number {
    if (!total) return 0;
    return Math.round((score / total) * 100);
  }
}
