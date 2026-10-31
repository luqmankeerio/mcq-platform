import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUserSnapshot) {
    if (authService.isAdmin()) return true;
    router.navigate(['/']);
    return false;
  }

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user && user.role === 'admin') return true;
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    })
  );
};

