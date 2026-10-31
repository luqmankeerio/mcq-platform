import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { McqService } from '../../core/services/mcq.service';
import { MCQ, MCQOption } from '../../core/models';

interface MCQQuestionState {
  mcq: MCQ;
  selectedOptionId: number | null;
  isSubmitted: boolean;
  isCorrect: boolean | null;
}

@Component({
  selector: 'app-mcq-practice',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mcq-practice.component.html',
  styleUrls: ['./mcq-practice.component.scss']
})
export class McqPracticeComponent implements OnInit {
  chapterId!: number;
  questionStates: MCQQuestionState[] = [];
  currentIndex = 0;
  loading = true;
  error = '';
  chapterName = '';

  // Results calculation
  totalCorrect = 0;
  totalAnswered = 0;
  showSummary = false;

  constructor(
    private route: ActivatedRoute,
    private mcqService: McqService
  ) {}

  async ngOnInit(): Promise<void> {
    this.chapterId = Number(this.route.snapshot.paramMap.get('chapterId'));
    try {
      const mcqs = await this.mcqService.getMCQsByChapter(this.chapterId);
      if (mcqs.length > 0 && mcqs[0].chapter) {
        this.chapterName = mcqs[0].chapter.name;
      }
      this.questionStates = mcqs.map(m => ({
        mcq: m,
        selectedOptionId: null,
        isSubmitted: false,
        isCorrect: null
      }));
    } catch (err: any) {
      this.error = err.message || 'Failed to load chapter MCQs';
    } finally {
      this.loading = false;
    }
  }

  get currentState(): MCQQuestionState | null {
    if (this.questionStates.length === 0) return null;
    return this.questionStates[this.currentIndex];
  }

  selectOption(optionId: number): void {
    const s = this.currentState;
    if (!s || s.isSubmitted) return;
    s.selectedOptionId = optionId;
  }

  submitAnswer(): void {
    const s = this.currentState;
    if (!s || s.selectedOptionId === null || s.isSubmitted) return;

    const selectedOption = s.mcq.options?.find(o => o.id === s.selectedOptionId);
    s.isCorrect = !!selectedOption?.is_correct;
    s.isSubmitted = true;

    if (s.isCorrect) {
      this.totalCorrect++;
    }
    this.totalAnswered++;

    if (this.totalAnswered === this.questionStates.length) {
      this.showSummary = true;
    }
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questionStates.length - 1) {
      this.currentIndex++;
    }
  }

  prevQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  goToQuestion(idx: number): void {
    this.currentIndex = idx;
  }

  restart(): void {
    this.questionStates.forEach(s => {
      s.selectedOptionId = null;
      s.isSubmitted = false;
      s.isCorrect = null;
    });
    this.currentIndex = 0;
    this.totalCorrect = 0;
    this.totalAnswered = 0;
    this.showSummary = false;
  }

  // Returns CSS classes: green for correct, red for wrong
  getOptionClass(opt: MCQOption): string {
    const s = this.currentState;
    if (!s) return 'mcq-option';

    if (!s.isSubmitted) {
      return s.selectedOptionId === opt.id ? 'mcq-option selected' : 'mcq-option';
    }

    // Submitted state:
    // Highlight correct answer in green
    if (opt.is_correct) {
      return 'mcq-option submitted correct';
    }

    // If student selected this option and it was wrong: highlight in red
    if (s.selectedOptionId === opt.id && !opt.is_correct) {
      return 'mcq-option submitted wrong';
    }

    return 'mcq-option submitted';
  }

  get scorePercentage(): number {
    if (this.questionStates.length === 0) return 0;
    return Math.round((this.totalCorrect / this.questionStates.length) * 100);
  }
}
