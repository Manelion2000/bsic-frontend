import {TestBed,fakeAsync,flushMicrotasks} from '@angular/core/testing';
import {TemporaryPasswordComponent} from './temporary-password.component';
describe('Remise privée du code temporaire',()=>{
  const receipt={username:'agent@example.test',temporaryPassword:'Temporary-example-Secret',expiresAt:'2026-10-12T12:00:00Z',userVersion:2};
  beforeEach(async()=>{await TestBed.configureTestingModule({imports:[TemporaryPasswordComponent]}).compileComponents();});
  it('masks the code, opens once and drops it when closed',fakeAsync(()=>{
    const f=TestBed.createComponent(TemporaryPasswordComponent);f.componentRef.setInput('credential',receipt);f.detectChanges();flushMicrotasks();f.detectChanges();
    const dialog=f.nativeElement.querySelector('dialog') as HTMLDialogElement;expect(dialog.open).toBeTrue();expect(f.nativeElement.querySelector('input').type).toBe('password');
    const storage=spyOn(Storage.prototype,'setItem');const closed=spyOn(f.componentInstance.closed,'emit');f.componentInstance.close();f.detectChanges();
    expect(closed).toHaveBeenCalled();expect(dialog.open).toBeFalse();expect(f.componentInstance.credential).toBeUndefined();expect(f.nativeElement.querySelector('input')).toBeNull();expect(storage).not.toHaveBeenCalled();
  }));
  it('displays only the supplied username and validity with the mandatory-change instruction',fakeAsync(()=>{
    const f=TestBed.createComponent(TemporaryPasswordComponent);f.componentRef.setInput('credential',receipt);f.detectChanges();flushMicrotasks();
    expect(f.nativeElement.textContent).toContain('agent@example.test');expect(f.nativeElement.textContent).toContain('première connexion');expect(f.nativeElement.textContent).toContain('mot de passe personnel');
    f.destroy();expect(f.componentInstance.credential).toBeUndefined();
  }));
});
