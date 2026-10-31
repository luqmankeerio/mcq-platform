import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { McqService } from '../../../core/services/mcq.service';
import { Subject, Class } from '../../../core/models';

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './subject-list.component.html',
  styleUrls: ['./subject-list.component.scss']
})
export class SubjectListComponent implements OnInit {
  classId!: number;
  currentClass: Class | null = null;
  subjects: Subject[] = [];
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mcqService: McqService
  ) {}

  async ngOnInit(): Promise<void> {
    this.classId = Number(this.route.snapshot.paramMap.get('classId'));
    try {
      const [allClasses, subjects] = await Promise.all([
        this.mcqService.getClasses(),
        this.mcqService.getSubjectsByClass(this.classId)
      ]);
      this.currentClass = allClasses.find(c => c.id === this.classId) || null;
      this.subjects = subjects;
    } catch (err: any) {
      this.error = err.message || 'Failed to load subjects';
    } finally {
      this.loading = false;
    }
  }

  selectSubject(subject: Subject): void {
    this.router.navigate(['/subjects', subject.id, 'chapters']);
  }
}

