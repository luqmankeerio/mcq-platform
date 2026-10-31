import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { McqService } from '../../../core/services/mcq.service';
import { Chapter, Subject } from '../../../core/models';

@Component({
  selector: 'app-chapter-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './chapter-list.component.html',
  styleUrls: ['./chapter-list.component.scss']
})
export class ChapterListComponent implements OnInit {
  subjectId!: number;
  currentSubject: Subject | null = null;
  chapters: Chapter[] = [];
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mcqService: McqService
  ) {}

  async ngOnInit(): Promise<void> {
    this.subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
    try {
      this.chapters = await this.mcqService.getChaptersBySubject(this.subjectId);
      if (this.chapters.length > 0 && this.chapters[0].subject) {
        this.currentSubject = this.chapters[0].subject;
      }
    } catch (err: any) {
      this.error = err.message || 'Failed to load chapters';
    } finally {
      this.loading = false;
    }
  }

  startPractice(chapter: Chapter): void {
    this.router.navigate(['/chapters', chapter.id, 'practice']);
  }
}

