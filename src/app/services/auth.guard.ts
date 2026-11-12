import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if(authService.requiresPasswordChange())return router.createUrlTree(['/changer-mot-de-passe']);
  return authService.isAuthenticated()
    || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const passwordChangeGuard:CanActivateFn=()=>{
  const auth=inject(AuthService),router=inject(Router);return auth.getToken()!==null||router.createUrlTree(['/login']);
};
