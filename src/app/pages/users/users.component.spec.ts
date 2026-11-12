import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NgForm} from '@angular/forms';
import {Subject,of,throwError} from 'rxjs';
import {UsersComponent} from './users.component';
import {UsersService} from '../../services/users.service';
import {RolesService} from '../../services/roles.service';
import {ProfilsService} from '../../services/profils.service';
import {UserRoleManagementService} from '../../services/user-role-management.service';
import {NotificationService} from '../../services/notification.service';
import {AnnuaireService} from '../../services/annuaire.service';
import {AuthService} from '../../services/auth.service';

describe('Création des utilisateurs avec un organigramme incomplet',()=>{
  let users:jasmine.SpyObj<UsersService>;
  let notifications:jasmine.SpyObj<NotificationService>;
  beforeEach(async()=>{
    users=jasmine.createSpyObj('UsersService',['createUser','updateUser','resetAccess','getUsers']);
    users.createUser.and.returnValue(new Subject<void>());users.updateUser.and.returnValue(new Subject<void>());
    users.getUsers.and.returnValue(of([]));
    notifications=jasmine.createSpyObj('NotificationService',['showWarning','showError','showSuccess']);
    await TestBed.configureTestingModule({imports:[UsersComponent],providers:[
      {provide:UsersService,useValue:users},{provide:RolesService,useValue:{}},{provide:ProfilsService,useValue:{}},
      {provide:UserRoleManagementService,useValue:{resetUserRoleState:()=>{}}},{provide:NotificationService,useValue:notifications},
      {provide:AnnuaireService,useValue:{}},{provide:AuthService,useValue:{getToken:()=>null}}
    ]}).compileComponents();
  });

  function fixture(){
    const f=TestBed.createComponent(UsersComponent);const c=f.componentInstance;
    c.currentUser={id:'admin',roles:[{code:'BA_ADMIN'}]};
    c.departements=[{id:'department',nom:'Département'}];c.services=[{id:'service',nom:'Service',idDepartement:'department'}];
    c.form={nom:'Agent',prenom:'Test',email:'agent@example.test',telephone:'12345678',sexe:'MASCULIN',fonction:'AGENT',idDepartement:'department',idService:'service'};
    c.showCreateForm=true;return f;
  }

  it('shows the administrator reset action directly in the user list',()=>{
    const f=fixture(),c=f.componentInstance;c.showCreateForm=false;c.users=[{id:'agent',nom:'Agent',activated:true,locked:false,version:1}];f.detectChanges();
    const button=f.nativeElement.querySelector('[aria-label="Réinitialiser l’accès"]') as HTMLButtonElement;expect(button).not.toBeNull();expect(button.disabled).toBeFalse();button.click();f.detectChanges();
    expect(c.resetTarget?.id).toBe('agent');expect(f.nativeElement.querySelector('dialog.reset-access-dialog').open).toBeTrue();
    c.closeResetAccess();expect(users.resetAccess).not.toHaveBeenCalled();
    c.currentUser={id:'chief',fonction:'CHEF_SERVICE',roles:[]};f.detectChanges();expect(f.nativeElement.querySelector('[aria-label="Réinitialiser l’accès"]')).toBeNull();
  });
  it('uses the server capability for administration inherited from an active profile',()=>{
    const f=fixture(),c=f.componentInstance;c.showCreateForm=false;c.currentUser={id:'profile-admin',roles:[],canResetUserAccess:true};c.users=[{id:'agent',activated:true,locked:false}];f.detectChanges();
    expect(f.nativeElement.querySelector('[aria-label="Réinitialiser l’accès"]')).not.toBeNull();
    c.currentUser.canResetUserAccess=false;f.detectChanges();expect(f.nativeElement.querySelector('[aria-label="Réinitialiser l’accès"]')).toBeNull();
  });
  it('requires a reason, prevents duplicate reset and displays credentials once',()=>{
    const f=fixture(),c=f.componentInstance;c.form={id:'agent',nom:'Agent',activated:true,locked:false,version:1};c.selectedId='agent';f.detectChanges();
    c.beginResetAccess();c.resetAccess();expect(users.resetAccess).not.toHaveBeenCalled();expect(c.resetError).toContain('motif');
    const response=new Subject<any>();users.resetAccess.and.returnValue(response);c.resetReason='  Identité vérifiée  ';c.resetAccess();c.resetAccess();expect(users.resetAccess).toHaveBeenCalledTimes(1);
    expect(users.resetAccess).toHaveBeenCalledWith(jasmine.objectContaining({id:'agent',version:1}),'Identité vérifiée');
    response.next({username:'agent@example.test',temporaryPassword:'One-time-Secret',expiresAt:'2026-10-13T12:00:00Z',userVersion:2});expect(c.credential?.temporaryPassword).toBe('One-time-Secret');expect(c.form.version).toBe(2);expect(c.resetTarget).toBeUndefined();
  });
  it('prevents self-reset and keeps a stale-form error visible without a credential',()=>{
    const f=fixture(),c=f.componentInstance;f.detectChanges();c.beginResetAccess({id:'admin',activated:true});expect(c.resetTarget).toBeUndefined();
    c.beginResetAccess({id:'agent',activated:true,version:1});c.resetReason='Vérification';users.resetAccess.and.returnValue(throwError(()=>({error:{message:'Le compte a changé. Rechargez sa fiche.'}})));c.resetAccess();
    expect(c.resetError).toContain('Rechargez');expect(c.resetting).toBeFalse();expect(c.credential).toBeUndefined();expect(c.resetTarget?.id).toBe('agent');
  });
  it('rend le formulaire valide sans chef ni directeur et transmet la création',async()=>{
    const f=fixture();f.detectChanges();await f.whenStable();f.detectChanges();
    const form=f.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    expect(form.valid).toBeTrue();
    f.componentInstance.createUser(form);
    expect(users.createUser).toHaveBeenCalledWith(jasmine.objectContaining({fonction:'AGENT',idDepartement:'department',idService:'service'}));
    const payload=users.createUser.calls.mostRecent().args[0];
    expect(payload.idSuperieur).toBeUndefined();expect(payload.idSuperieurSecondaire).toBeUndefined();
  });

  it('récupère le chef du service en N+1 puis le directeur en N+2 et transmet leurs identifiants',async()=>{
    const f=fixture();const c=f.componentInstance;
    c.users=[{id:'director',fonction:'DIRECTEUR',idDepartement:'department',activated:true},{id:'chief',fonction:'CHEF_SERVICE',idService:'service',idDepartement:'department',activated:true},{id:'other-chief',fonction:'CHEF_SERVICE',idService:'other',idDepartement:'department',activated:true}];
    c.onFonctionChange();
    f.detectChanges();await f.whenStable();f.detectChanges();expect(f.nativeElement.textContent).toContain('Supérieur N+1 · Chef de service');expect(f.nativeElement.textContent).toContain('Supérieur N+2 · Directeur');
    expect(f.nativeElement.querySelector('[name="idSuperieur"]').disabled).toBeTrue();
    c.createUser({invalid:false} as NgForm);
    const payload=users.createUser.calls.mostRecent().args[0];
    expect(payload.idSuperieur).toBe('chief');expect(payload.idSuperieurSecondaire).toBe('director');
  });

  it('actualise les deux niveaux quand le service ou le département change',()=>{
    const f=fixture(),c=f.componentInstance;
    c.services.push({id:'second',idDepartement:'department'},{id:'foreign-service',idDepartement:'foreign'});
    c.users=[{id:'c1',fonction:'CHEF_SERVICE',idService:'service',idDepartement:'department',activated:true},{id:'c2',fonction:'CHEF_SERVICE',idService:'second',idDepartement:'department',activated:true},{id:'d1',fonction:'DIRECTEUR',idDepartement:'department',activated:true},{id:'d2',fonction:'DIRECTEUR',idDepartement:'foreign',activated:true}];
    c.onServiceChange();expect(c.form.idSuperieur).toBe('c1');expect(c.form.idSuperieurSecondaire).toBe('d1');c.form.idService='second';c.onServiceChange();expect(c.form.idSuperieur).toBe('c2');expect(c.form.idSuperieurSecondaire).toBe('d1');
    c.form.idDepartement='foreign';c.onDepartementChange();expect(c.form.idSuperieur).toBeUndefined();expect(c.form.idService).toBeUndefined();expect(c.form.idSuperieurSecondaire).toBe('d2');
  });

  it('laisse choisir les titulaires multiples et ignore les comptes indisponibles',()=>{
    const f=fixture(),c=f.componentInstance;c.users=[{id:'c1',fonction:'CHEF_SERVICE',idService:'service',idDepartement:'department',activated:true},{id:'c2',fonction:'CHEF_SERVICE',idService:'service',idDepartement:'department',activated:true},{id:'locked',fonction:'CHEF_SERVICE',idService:'service',idDepartement:'department',activated:true,locked:true},{id:'inactive',fonction:'DIRECTEUR',idDepartement:'department',activated:false}];
    c.onServiceChange();f.detectChanges();expect(c.form.idSuperieur).toBeUndefined();expect(c.form.idSuperieurSecondaire).toBeUndefined();expect(c.availableChefsService.map(u=>u.id)).toEqual(['c1','c2']);expect(f.nativeElement.querySelector('[name="idSuperieur"]').disabled).toBeFalse();expect(f.nativeElement.textContent).toContain('Plusieurs chefs disponibles');
    c.form.idSuperieur='c2';c.fillHierarchy();expect(c.form.idSuperieur).toBe('c2');
  });

  it('complète les responsables lorsque le référentiel arrive après la saisie',()=>{
    const f=fixture(),c=f.componentInstance;const response=new Subject<any[]>();users.getUsers.and.returnValue(response);c.loadUsers();expect(c.form.idSuperieur).toBeUndefined();
    response.next([{id:'chief',fonction:'CHEF_SERVICE',idService:'service',activated:true},{id:'director',fonction:'DIRECTEUR',idDepartement:'department',activated:true}]);expect(c.form.idSuperieur).toBe('chief');expect(c.form.idSuperieurSecondaire).toBe('director');
  });

  it('bloque un service appartenant à un autre département',()=>{
    const c=fixture().componentInstance;c.services[0].idDepartement='other';
    c.createUser({invalid:false} as NgForm);
    expect(users.createUser).not.toHaveBeenCalled();expect(notifications.showWarning).toHaveBeenCalled();
  });

  it('permet de modifier un agent sans supérieur configuré',()=>{
    const c=fixture().componentInstance;c.selectedId='agent';c.form.id='agent';
    c.updateUser({invalid:false} as NgForm);
    expect(users.updateUser).toHaveBeenCalledWith('agent',jasmine.objectContaining({idDepartement:'department',idService:'service'}));
  });

  it('conserve la restriction de création aux gestionnaires',()=>{
    const c=fixture().componentInstance;c.currentUser={fonction:'AGENT',roles:[]};
    c.createUser({invalid:false} as NgForm);
    expect(users.createUser).not.toHaveBeenCalled();expect(notifications.showError).toHaveBeenCalled();
  });
});
