import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isApiRequest(req.url) || authService.isPublicAuthRequest(req.url)) {
    return next(req);
  }

  const token = authService.getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Une reponse d'une ancienne session ne doit pas effacer une connexion plus recente.
      if (err.status === 401 && token && authService.getToken() === token) {
        authService.clearToken();
        const returnUrl = router.url.startsWith('/login') ? '/users' : router.url;
        void router.navigate(['/login'], { queryParams: { returnUrl } });
      }
      return throwError(() => err);
    })
  );
};