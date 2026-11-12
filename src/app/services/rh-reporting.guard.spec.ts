import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { UsersService } from './users.service';
import { canAccessRhReporting, rhReportingGuard } from './rh-reporting.guard';

describe('Accès au tableau de bord RH', () => {
  it('permet les RH, administrateurs, DG et DGA', () => {
    expect(canAccessRhReporting({roles: [{code: 'RH_CONSULTATION_ABSENCES'}]})).toBeTrue();
    expect(canAccessRhReporting({roles: [{code: 'BA_ADMIN'}]})).toBeTrue();
    expect(canAccessRhReporting({fonction: 'DIRECTEUR_GENERAL'})).toBeTrue();
    expect(canAccessRhReporting({fonction: 'DIRECTEUR_GENERAL_ADJOINT'})).toBeTrue();
  });
  it('ne donne pas le reporting global aux agents ou responsables sans rôle RH', () => {
    expect(canAccessRhReporting({fonction: 'AGENT'})).toBeFalse();
    expect(canAccessRhReporting({fonction: 'DIRECTEUR'})).toBeFalse();
    expect(canAccessRhReporting({roles: [{code: 'BA_CONNECT', libelle: 'RH'}]})).toBeFalse();
    expect(canAccessRhReporting()).toBeFalse();
  });
  it('redirige un agent qui ouvre directement la route du tableau de bord', async () => {
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: UsersService, useValue: {getUserWithMoreInfo: () => of({fonction: 'AGENT'})}}]});
    const result = TestBed.runInInjectionContext(() => rhReportingGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as Observable<boolean | UrlTree>;
    expect((await firstValueFrom(result)).toString()).toBe('/autorisations-absence');
  });
});
