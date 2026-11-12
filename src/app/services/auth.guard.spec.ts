import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot,RouterStateSnapshot,Router,provideRouter} from '@angular/router';
import {AuthService} from './auth.service';import {authGuard,passwordChangeGuard} from './auth.guard';
describe('Routage des accès temporaires',()=>{
  let auth:jasmine.SpyObj<AuthService>;
  beforeEach(()=>{auth=jasmine.createSpyObj('AuthService',['requiresPasswordChange','isAuthenticated','getToken']);TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:auth}]});});
  it('routes setup access to password change even when opening a module URL directly',()=>{
    auth.requiresPasswordChange.and.returnValue(true);auth.getToken.and.returnValue('setup');
    const result=TestBed.runInInjectionContext(()=>authGuard({} as ActivatedRouteSnapshot,{url:'/users'} as RouterStateSnapshot));expect(result?.toString()).toBe('/changer-mot-de-passe');
    expect(TestBed.runInInjectionContext(()=>passwordChangeGuard({} as ActivatedRouteSnapshot,{} as RouterStateSnapshot))).toBeTrue();
  });
  it('requires a session for the password-change page',()=>{
    auth.getToken.and.returnValue(null);expect(TestBed.runInInjectionContext(()=>passwordChangeGuard({} as ActivatedRouteSnapshot,{} as RouterStateSnapshot))?.toString()).toBe('/login');
  });
});
