import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, provideRouter} from '@angular/router';
import {By} from '@angular/platform-browser';
import {NgForm} from '@angular/forms';
import {of, Subject, throwError} from 'rxjs';
import {DirectionGeneraleComponent} from './direction-generale.component';
import {DirectionGeneraleService} from '../../services/direction-generale.service';

describe('Création dédiée des DG et DGA', () => {
  let api: jasmine.SpyObj<DirectionGeneraleService>;
  let kind: 'dg' | 'dga';
  beforeEach(async () => {
    kind = 'dg';
    api = jasmine.createSpyObj('DirectionGeneraleService', ['getUsers', 'getAssignments', 'create', 'saveAssignment', 'deactivateAssignment']);
    api.getUsers.and.returnValue(of([])); api.getAssignments.and.returnValue(of([]));
    api.create.and.returnValue(new Subject()); api.saveAssignment.and.returnValue(new Subject());
    await TestBed.configureTestingModule({imports: [DirectionGeneraleComponent], providers: [
      provideRouter([]), {provide: DirectionGeneraleService, useValue: api},
      {provide: ActivatedRoute, useValue: {get data() { return of({kind}); }}}
    ]}).compileComponents();
  });
  function fixture() {
    const value = TestBed.createComponent(DirectionGeneraleComponent); value.detectChanges();
    value.componentInstance.openCreate();
    Object.assign(value.componentInstance.form, {nom: 'Bakouan', prenom: 'Test', email: 'direction@example.test', telephone: '+22612345678'});
    return value;
  }
  async function form(value: ReturnType<typeof fixture>): Promise<NgForm> {
    value.detectChanges(); await value.whenStable(); value.detectChanges();
    return value.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
  }
  it('crée le DG sans département, service ou supérieur et omet les champs DGA', async () => {
    const value = fixture(); const ref = await form(value);
    expect(ref.valid).toBeTrue(); value.componentInstance.save(ref);
    const [mode, body] = api.create.calls.mostRecent().args;
    expect(mode).toBe('dg'); expect(body.pole).toBeUndefined(); expect(body.dateDebut).toBeUndefined();
    expect((body as any).fonction).toBeUndefined(); expect((body as any).roles).toBeUndefined();
    expect(value.nativeElement.querySelector('[name="idDepartement"]')).toBeNull();
  });
  it('crée un DGA avec le pôle choisi sans nécessiter un compte DG', async () => {
    kind = 'dga'; const value = fixture(); value.componentInstance.form.pole = 'DEVELOPPEMENT';
    const ref = await form(value); expect(ref.valid).toBeTrue(); value.componentInstance.save(ref);
    expect(api.create).toHaveBeenCalledWith('dga', jasmine.objectContaining({pole: 'DEVELOPPEMENT', dateDebut: value.componentInstance.today()}));
    expect(value.nativeElement.textContent).toContain('DGA Opérations');
    expect(value.nativeElement.textContent).toContain('DGA Développement');
  });
  it('exige le pôle et refuse une période inversée', async () => {
    kind = 'dga'; const value = fixture(); value.componentInstance.form.pole = undefined;
    expect((await form(value)).invalid).toBeTrue(); value.componentInstance.save({invalid: false} as NgForm);
    expect(api.create).not.toHaveBeenCalled();
    Object.assign(value.componentInstance.form, {pole: 'OPERATIONS', dateDebut: '2026-10-08', dateFin: '2026-10-07'});
    value.componentInstance.save({invalid: false} as NgForm);
    expect(api.create).not.toHaveBeenCalled(); expect(value.componentInstance.error).toContain('date de fin');
  });
  it('empêche une deuxième soumission pendant la création', () => {
    const value = fixture(); value.componentInstance.save({invalid: false} as NgForm); value.componentInstance.save({invalid: false} as NgForm);
    expect(api.create).toHaveBeenCalledTimes(1); expect(value.componentInstance.busy).toBeTrue();
  });
  it('affiche le conflit du serveur en conservant le formulaire', () => {
    api.create.and.returnValue(throwError(() => ({error: {message: 'Un DG actif existe déjà.'}})));
    const value = fixture(); value.componentInstance.save({invalid: false} as NgForm);
    expect(value.componentInstance.error).toContain('Un DG actif existe déjà');
    expect(value.componentInstance.mode).toBe('creation'); expect(value.componentInstance.busy).toBeFalse();
  });
  it('permet de rattacher un DGA existant sans créer un deuxième compte', async () => {
    kind = 'dga'; api.getUsers.and.returnValue(of([{id: 'dga', prenom: 'Test', activated: true, locked: false}]));
    const value = fixture(); const component = value.componentInstance;
    component.openAssignment(); component.assignment.idDga = 'dga';
    const ref = await form(value); expect(ref.valid).toBeTrue(); component.save(ref);
    expect(api.saveAssignment).toHaveBeenCalledWith(jasmine.objectContaining({idDga: 'dga', pole: 'OPERATIONS'}));
    expect(api.create).not.toHaveBeenCalled();
  });
  it('bloque une nouvelle création DG lorsque le DG actif est déjà présent', () => {
    api.getUsers.and.returnValue(of([{id: 'dg', activated: true, locked: false}]));
    const value = fixture(); expect(value.componentInstance.mode).toBeNull(); expect(value.componentInstance.canCreate).toBeFalse();
  });
});
