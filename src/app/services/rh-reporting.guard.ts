import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { BaUserDto, UsersService } from './users.service';

export function canAccessRhReporting(user?: BaUserDto): boolean {
  return !!user && (['DIRECTEUR_GENERAL', 'DIRECTEUR_GENERAL_ADJOINT'].includes(user.fonction || '')
    || !!user.roles?.some(role => ['BA_ADMIN', 'RH_CONSULTATION_ABSENCES'].includes(role.code || '')));
}

export const rhReportingGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(UsersService).getUserWithMoreInfo().pipe(
    map(user => canAccessRhReporting(user) || router.createUrlTree(['/autorisations-absence'])),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
