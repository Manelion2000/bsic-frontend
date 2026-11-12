import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersComponent } from './users.component';
import { BaRoleDto, BaUserDto } from '../../services/users.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { AnnuaireService } from '../../services/annuaire.service';
import { ProfilsService } from '../../services/profils.service';

describe('Assignation de rôles depuis le formulaire utilisateur', () => {
  const connect: BaRoleDto = {id: 'connect', code: 'BA_CONNECT', libelle: 'Connexion'};
  const validate: BaRoleDto = {id: 'validate', code: 'PROCESSUS_VALIDER', libelle: 'Valider les démarches'};
  let http: HttpTestingController;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    notifications = jasmine.createSpyObj('NotificationService', ['showError', 'showSuccess', 'showWarning']);
    await TestBed.configureTestingModule({imports: [UsersComponent], providers: [
      provideHttpClient(), provideHttpClientTesting(),
      {provide: NotificationService, useValue: notifications},
      {provide: AuthService, useValue: {getToken: () => null}},
      {provide: AnnuaireService, useValue: {}}, {provide: ProfilsService, useValue: {}}
    ]}).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function open(roles: BaRoleDto[] = [connect]) {
    const f = TestBed.createComponent(UsersComponent);
    const c = f.componentInstance;
    c.currentUser = {id: 'admin', roles: [{code: 'BA_ADMIN'}]};
    c.departements = [{id: 'dept', nom: 'Département'}];
    c.services = [{id: 'svc', nom: 'Service', idDepartement: 'dept'}];
    const user: BaUserDto = {id: 'agent', nom: 'Agent', prenom: 'Test', email: 'agent@example.test',
      telephone: '12345678', sexe: 'MASCULIN', fonction: 'AGENT', idDepartement: 'dept', idService: 'svc',
      activated: true, locked: false, roles};
    c.users = [user];
    f.detectChanges();
    c.selectUser(user);
    http.expectOne('/api/roles').flush([connect, validate]);
    http.expectOne('/api/users/agent/roles').flush(roles);
    f.detectChanges();
    return f;
  }
  async function update(f: ReturnType<typeof open>) {
    await f.whenStable();
    f.detectChanges();
    f.nativeElement.querySelector('button[type="submit"]').click();
    const request = http.expectOne('/api/users/agent');
    expect(request.request.method).toBe('PUT');
    return request;
  }

  it('conserve le rôle confirmé après une mise à jour des informations sans perdre la saisie', async () => {
    const f = open();
    f.componentInstance.form.prenom = 'Modifié';
    f.nativeElement.querySelector('button[title="Assigner ce role"]').click();
    const grant = http.expectOne('/api/users/agent/roles/validate');
    grant.flush({...f.componentInstance.form, roles: [connect, validate]});
    const save = await update(f);
    expect(save.request.body.roles.map((r: BaRoleDto) => r.id)).toEqual(['connect', 'validate']);
    expect(save.request.body.prenom).toBe('Modifié');
    save.flush(null);
    http.expectOne('/api/users').flush([]);
  });

  it('ne réattribue pas un rôle retiré lors de la sauvegarde du formulaire', async () => {
    const f = open([connect, validate]);
    f.componentInstance.removeRoleFromUser(validate);
    http.expectOne('/api/users/agent/roles/validate').flush({...f.componentInstance.form, roles: [connect]});
    const save = await update(f);
    expect(save.request.body.roles.map((r: BaRoleDto) => r.id)).toEqual(['connect']);
    save.flush(null);
    http.expectOne('/api/users').flush([]);
  });

  it('affiche le motif serveur et conserve les rôles confirmés lorsque l’ajout est refusé', () => {
    const f = open();
    f.componentInstance.addRoleToUser(validate);
    http.expectOne('/api/users/agent/roles/validate').flush({message: 'Action réservée aux administrateurs actifs.'}, {status: 403, statusText: 'Forbidden'});
    f.detectChanges();
    expect(notifications.showError).toHaveBeenCalledWith(jasmine.any(String), 'Action réservée aux administrateurs actifs.');
    expect(f.componentInstance.form.roles).toEqual([connect]);
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('empêche une sauvegarde et un second ajout pendant la confirmation du rôle', async () => {
    const f = open();
    const c = f.componentInstance;
    c.addRoleToUser(validate);
    c.addRoleToUser(validate);
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
    const requests = http.match('/api/users/agent/roles/validate');
    expect(requests.length).toBe(1);
    c.updateUser({invalid: false} as any);
    http.expectNone(request => request.method === 'PUT');
    requests[0].flush({...c.form, roles: [connect, validate]});
  });

  it('réconcilie une assignation multiple partiellement refusée avant de réactiver la sauvegarde', async () => {
    const f = open();
    const c = f.componentInstance;
    const exportRole: BaRoleDto = {id: 'export', code: 'PROCESSUS_EXPORTER', libelle: 'Exporter'};
    // Recharger le catalogue qui inclut les deux rôles à attribuer.
    c.selectUser(c.users[0]);
    http.expectOne('/api/roles').flush([connect, validate, exportRole]);
    http.expectOne('/api/users/agent/roles').flush([connect]);
    c.assignMultipleRoles(['validate', 'validate', 'export']);
    http.expectOne('/api/users/agent/roles/validate').flush({...c.form, roles: [connect, validate]});
    expect(c.roleManagementLoading).toBeTrue();
    http.expectOne('/api/users/agent/roles/export').flush({message: 'Attribution refusée.'}, {status: 403, statusText: 'Forbidden'});
    expect(c.roleManagementLoading).toBeTrue();
    http.expectOne('/api/roles').flush([connect, validate, exportRole]);
    http.expectOne('/api/users/agent/roles').flush([connect, validate]);
    expect(c.roleManagementLoading).toBeFalse();
    expect(notifications.showError).toHaveBeenCalledWith(jasmine.any(String), 'Attribution refusée.');
    expect(c.form.roles).toEqual([connect, validate]);
    const save = await update(f);
    expect(save.request.body.roles).toEqual([connect, validate]);
    save.flush(null);
    http.expectOne('/api/users').flush([]);
  });
});
