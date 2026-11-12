import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {NgForm} from '@angular/forms';
import {By} from '@angular/platform-browser';
import {of,Subject,throwError} from 'rxjs';
import {AuthService} from '../../services/auth.service';
import {PasswordChangeComponent} from './password-change.component';
describe('Changement personnel du mot de passe',()=>{
  let auth:jasmine.SpyObj<AuthService>,router:jasmine.SpyObj<Router>;
  beforeEach(async()=>{
    auth=jasmine.createSpyObj('AuthService',['requiresPasswordChange','completeInitialPassword','changePassword','clearToken','logout']);
    auth.requiresPasswordChange.and.returnValue(true);auth.completeInitialPassword.and.returnValue(new Subject<void>());auth.changePassword.and.returnValue(new Subject<void>());auth.logout.and.returnValue(of(undefined));
    router=jasmine.createSpyObj('Router',['navigate','navigateByUrl']);router.navigate.and.resolveTo(true);router.navigateByUrl.and.resolveTo(true);
    await TestBed.configureTestingModule({imports:[PasswordChangeComponent],providers:[{provide:AuthService,useValue:auth},{provide:Router,useValue:router}]}).compileComponents();
  });
  function fixture(){const f=TestBed.createComponent(PasswordChangeComponent);f.detectChanges();return f;}
  it('requires a personal password and confirmation without the already consumed temporary code',async()=>{
    const f=fixture();await f.whenStable();f.detectChanges();
    expect(f.nativeElement.querySelector('[name="ancien"]')).toBeNull();
    const form=f.debugElement.query(By.directive(NgForm)).injector.get(NgForm);expect(form.invalid).toBeTrue();
    f.componentInstance.submit(form);expect(auth.completeInitialPassword).not.toHaveBeenCalled();
  });
  it('submits setup once, clears the ticket and returns to a normal login',()=>{
    const f=fixture(),c=f.componentInstance,response=new Subject<void>();auth.completeInitialPassword.and.returnValue(response);
    c.password=c.confirmation='Personal-test-Password';c.submit({invalid:false} as NgForm);c.submit({invalid:false} as NgForm);
    expect(auth.completeInitialPassword).toHaveBeenCalledOnceWith('Personal-test-Password','Personal-test-Password');expect(auth.changePassword).not.toHaveBeenCalled();
    response.next();expect(auth.clearToken).toHaveBeenCalled();expect(c.password).toBe('');expect(c.confirmation).toBe('');expect(router.navigate).toHaveBeenCalledWith(['/login'],{queryParams:{passwordChanged:true}});
  });
  it('keeps the form usable after a backend validation error',()=>{
    const c=fixture().componentInstance;auth.completeInitialPassword.and.returnValue(throwError(()=>({error:{message:'Mot de passe trop court.'}})));
    c.password=c.confirmation='password';c.submit({invalid:false} as NgForm);expect(c.error).toContain('trop court');expect(c.busy).toBeFalse();expect(auth.clearToken).not.toHaveBeenCalled();
  });
  it('returns an expired setup ticket to login with instructions to request another code',()=>{
    auth.completeInitialPassword.and.returnValue(throwError(()=>({status:401})));const c=fixture().componentInstance;c.password=c.confirmation='Personal-test-Password';c.submit({invalid:false} as NgForm);
    expect(auth.clearToken).toHaveBeenCalled();expect(router.navigate).toHaveBeenCalledWith(['/login'],{queryParams:{temporaryExpired:true}});
  });
  it('clears secrets and ignores a late response after leaving the screen',()=>{
    const f=fixture(),c=f.componentInstance,response=new Subject<void>();auth.completeInitialPassword.and.returnValue(response);c.password=c.confirmation='Personal-test-Password';c.submit({invalid:false} as NgForm);f.destroy();response.next();
    expect(c.password).toBe('');expect(c.confirmation).toBe('');expect(auth.clearToken).not.toHaveBeenCalled();expect(router.navigate).not.toHaveBeenCalled();
  });
  it('asks for the current password when changing normal access',async()=>{
    auth.requiresPasswordChange.and.returnValue(false);const f=fixture(),c=f.componentInstance;await f.whenStable();
    expect(f.nativeElement.querySelector('[name="ancien"]')).not.toBeNull();c.old='current';c.password=c.confirmation='Personal-test-Password';c.submit({invalid:false} as NgForm);
    expect(auth.changePassword).toHaveBeenCalledWith('current','Personal-test-Password','Personal-test-Password');expect(auth.completeInitialPassword).not.toHaveBeenCalled();
  });
});
