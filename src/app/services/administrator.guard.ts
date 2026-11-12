import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {catchError, map, of} from 'rxjs';
import {BaUserDto, UsersService} from './users.service';

export function isAdministrator(user?: BaUserDto): boolean {
  return !!user?.roles?.some(role => role.code?.toUpperCase() === 'BA_ADMIN');
}

export const administratorGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(UsersService).getUserWithMoreInfo().pipe(
    map(user => isAdministrator(user) || router.createUrlTree(['/annuaire/annuaire'])),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
