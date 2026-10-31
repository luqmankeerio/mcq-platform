import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { McqService } from '../../../core/services/mcq.service';
import { Class } from '../../../core/models';

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './class-list.component.html',
  styleUrls: ['./class-list.component.scss']
})
export class ClassListComponent implements OnInit {
  classes: Class[] = [];
  loading = true;
  error = '';

  constructor(
    private mcqService: McqService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.classes = await this.mcqService.getClasses();
    } catch (err: any) {
      this.error = err.message || 'Failed to load classes';
    } finally {
      this.loading = false;
    }
  }

  selectClass(cls: Class): void {
    this.router.navigate(['/classes', cls.id, 'subjects']);
  }
}

