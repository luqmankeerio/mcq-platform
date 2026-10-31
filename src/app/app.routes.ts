import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { teacherGuard } from './core/guards/teacher.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'classes',
    loadComponent: () =>
      import('./features/classes/class-list/class-list.component').then(m => m.ClassListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'classes/:classId/subjects',
    loadComponent: () =>
      import('./features/subjects/subject-list/subject-list.component').then(m => m.SubjectListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'subjects/:subjectId/chapters',
    loadComponent: () =>
      import('./features/chapters/chapter-list/chapter-list.component').then(m => m.ChapterListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'chapters/:chapterId/practice',
    loadComponent: () =>
      import('./features/mcq-practice/mcq-practice.component').then(m => m.McqPracticeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'test/:token',
    loadComponent: () =>
      import('./features/online-test/online-test.component').then(m => m.OnlineTestComponent)
  },
  {
    path: 'results',
    loadComponent: () =>
      import('./features/results/student-results/student-results.component').then(m => m.StudentResultsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'teacher',
    loadComponent: () =>
      import('./features/teacher/teacher-dashboard.component').then(m => m.TeacherDashboardComponent),
    canActivate: [teacherGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
