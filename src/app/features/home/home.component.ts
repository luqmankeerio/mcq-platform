import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { McqService } from '../../core/services/mcq.service';
import { Class } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  classes: Class[] = [];
  loadingClasses = true;

  features = [
    {
      icon: 'fa-solid fa-list-check',
      title: 'Chapter-Wise MCQs',
      desc: 'Master every single chapter with structured 4-option multiple-choice questions curated by senior educators.'
    },
    {
      icon: 'fa-solid fa-stopwatch',
      title: 'Timed Online Tests',
      desc: 'Experience real exam pressure with countdown timers, auto-submission, and real-time score calculation.'
    },
    {
      icon: 'fa-solid fa-circle-check',
      title: 'Instant Visual Feedback',
      desc: 'Clear green highlights for correct choices, red for incorrect options, plus in-depth pedagogical explanations.'
    },
    {
      icon: 'fa-solid fa-chart-pie',
      title: 'Attempt History & Analytics',
      desc: 'Keep track of all your past tests, percentage scores, and review detailed answer sheets at any time.'
    }
  ];

  constructor(
    public authService: AuthService,
    private mcqService: McqService,
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    try {
      this.classes = await this.mcqService.getClasses();
    } catch (err) {
      console.warn('Could not load classes yet:', err);
    } finally {
      this.loadingClasses = false;
    }
  }

  selectClass(className: string): void {
    const matched = this.classes.find(c => c.name.toLowerCase().includes(className.toLowerCase()));
    if (matched) {
      this.router.navigate(['/classes', matched.id, 'subjects']);
    } else {
      this.router.navigate(['/classes']);
    }
  }
}
