import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { AuthService, BaJWTTokenDto } from '../../services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent authentication flow', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  const form = { invalid: false } as NgForm;

  function component(returnUrl = '/reprises-service'): LoginComponent {
    const route = { snapshot: { queryParamMap: convertToParamMap({ returnUrl }) } } as unknown as ActivatedRoute;
    return new LoginComponent(auth, router, route);
  }

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'storeToken', 'requestResetPassword','requiresPasswordChange']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);
  });

  it('redirects temporary access to password setup before the requested module',()=>{
    const login=component('/users');login.form={username:'agent@example.test',password:'temporary'};
    auth.login.and.returnValue(of({access_token:'ticket',passwordChangeRequired:true}));auth.storeToken.and.returnValue(true);auth.requiresPasswordChange.and.returnValue(true);
    login.submit(form);expect(router.navigateByUrl).toHaveBeenCalledWith('/changer-mot-de-passe');expect(login.form.password).toBe('');
  });
  it('directs forgotten passwords to the administrator without email',()=>{
    const login=component();login.resetPassword();expect(login.message).toContain('administrateur');expect(auth.requestResetPassword).not.toHaveBeenCalled();
  });
  it('uses rememberMe and returns to the requested internal page', () => {
    const login = component();
    login.form = { username: 'agent@bsic.bf', password: 'password', rememberMe: true };
    auth.login.and.returnValue(of({ access_token: 'token' }));
    auth.storeToken.and.returnValue(true);
    login.submit(form);
    expect(auth.storeToken).toHaveBeenCalledWith({ access_token: 'token' }, true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/reprises-service');
    expect(login.form.password).toBe('');
  });

  it('rejects external return URLs and invalid server sessions', () => {
    const login = component('//external.example');
    login.form = { username: 'agent@bsic.bf', password: 'password' };
    auth.login.and.returnValue(of({}));
    auth.storeToken.and.returnValue(false);
    login.submit(form);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    auth.storeToken.and.returnValue(true);
    login.submit(form);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/users');
  });

  it('prevents duplicate submissions while a request is pending', () => {
    const response = new Subject<BaJWTTokenDto>();
    auth.login.and.returnValue(response);
    const login = component();
    login.form = { username: 'agent@bsic.bf', password: 'password' };
    login.submit(form);
    login.submit(form);
    login.resetPassword();
    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(auth.requestResetPassword).not.toHaveBeenCalled();
    response.error({ error: { message: 'Trop de tentatives.' } });
    expect(login.loading).toBeFalse();
    expect(login.message).toBe('Trop de tentatives.');
  });
});