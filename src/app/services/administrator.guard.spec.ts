import {TestBed} from '@angular/core/testing';
import {provideRouter, Router, UrlTree} from '@angular/router';
import {Observable, of, throwError} from 'rxjs';
import {administratorGuard} from './administrator.guard';
import {UsersService} from './users.service';

describe('Accès aux modules DG et DGA', () => {
  let users: jasmine.SpyObj<UsersService>;
  beforeEach(() => {
    users = jasmine.createSpyObj('UsersService', ['getUserWithMoreInfo']);
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: UsersService, useValue: users}]});
  });
  function run(): Observable<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() => administratorGuard({} as any, {} as any)) as Observable<boolean | UrlTree>;
  }
  it('autorise un administrateur', done => {
    users.getUserWithMoreInfo.and.returnValue(of({roles: [{code: 'BA_ADMIN'}]}));
    run().subscribe(result => { expect(result).toBeTrue(); done(); });
  });
  it('refuse un DG qui ne possède pas le rôle administrateur', done => {
    users.getUserWithMoreInfo.and.returnValue(of({fonction: 'DIRECTEUR_GENERAL', roles: [{code: 'BA_DG'}]}));
    run().subscribe(result => { expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/annuaire/annuaire'); done(); });
  });
  it('refuse un code contenant ADMIN et un simple libellé administrateur', done => {
    users.getUserWithMoreInfo.and.returnValue(of({roles:[{code:'NOT_AN_ADMIN',libelle:'Administrateur de présentation'}]}));
    run().subscribe(result=>{expect(result instanceof UrlTree).toBeTrue();done();});
  });
  it('renvoie vers la connexion si les informations de session ne peuvent pas être obtenues', done => {
    users.getUserWithMoreInfo.and.returnValue(throwError(() => ({status: 401})));
    run().subscribe(result => { expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login'); done(); });
  });
});
