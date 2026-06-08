import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from './error.service';
import { extractErrorMessage } from '../shared/error.utils';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const message = extractErrorMessage(err, err.statusText || `Erreur HTTP ${err.status}`);
      errorService.show(message);
      return throwError(() => err);
    })
  );
};
