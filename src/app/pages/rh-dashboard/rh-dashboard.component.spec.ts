import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { BaRhDashboardDto, RhDemandesService } from '../../services/rh-demandes.service';
import { RhDashboardComponent } from './rh-dashboard.component';

function dashboard(): BaRhDashboardDto {
  return {
    nomUtilisateur: 'Awa RH', debut: '2026-01-01', fin: '2026-02-28',
    sortiesTotal: 1, sortiesEnAttente: 0, sortiesValidees: 1,
    absencesTotal: 3, absencesEnAttente: 1, absencesValidees: 1, absencesRejetees: 1, absencesAnnulees: 0,
    joursAbsenceValides: 4, joursAbsenceEnAttente: 2, agentsConcernes: 1,
    absentsAujourdHui: 0, absencesAVenir: 0, tauxValidation: 50,
    tendances: [{periode: '2026-01', sorties: 1, absences: 1, joursAbsence: 2}, {periode: '2026-02', sorties: 0, absences: 2, joursAbsence: 2}],
    parDepartement: [{id: 'D1', departement: 'Opérations', sorties: 1, absences: 3, joursAbsence: 4}],
    parAgent: [{id: 'A1', nom: 'Agent Test', matricule: '001', departement: 'Opérations', service: 'Caisse', demandes: 3, validees: 1, enAttente: 1, jours: 4}],
    departements: [{id: 'D1', nom: 'Opérations'}, {id: 'D2', nom: 'Finance'}],
    services: [{id: 'S1', nom: 'Caisse', idDepartement: 'D1'}, {id: 'S2', nom: 'Budget', idDepartement: 'D2'}],
    registre: [
      {id: '1', idDemandeur: 'A1', nomCompletDemandeur: 'Agent Test', matriculeDemandeur: '001', idDepartement: 'D1', departement: 'Opérations', service: 'Caisse', dateDebut: '2026-01-30', dateFin: '2026-02-02', nombreJours: 4, joursPeriode: 4, statutValidation: 'VALIDEE', motif: 'Congé'},
      {id: '2', idDemandeur: 'A1', nomCompletDemandeur: 'Agent Test', matriculeDemandeur: '001', idDepartement: 'D1', departement: 'Opérations', service: 'Caisse', dateDebut: '2026-02-10', dateFin: '2026-02-11', nombreJours: 2, joursPeriode: 2, statutValidation: 'EN_ATTENTE', motif: 'Rendez-vous'},
      {id: '3', idDemandeur: 'A1', nomCompletDemandeur: 'Agent Test', matriculeDemandeur: '001', idDepartement: 'D1', departement: 'Opérations', service: 'Caisse', dateDebut: '2026-02-15', dateFin: '2026-02-15', nombreJours: 1, joursPeriode: 1, statutValidation: 'REJETEE', motif: 'Déplacement'}
    ]
  };
}

describe('Tableau de bord RH', () => {
  let service: jasmine.SpyObj<RhDemandesService>;
  beforeEach(async () => {
    service = jasmine.createSpyObj<RhDemandesService>('RhDemandesService', ['getRhDashboard', 'exportRhDashboard']);
    service.getRhDashboard.and.returnValue(of(dashboard()));
    service.exportRhDashboard.and.returnValue(new Subject<Blob>());
    await TestBed.configureTestingModule({imports: [RhDashboardComponent], providers: [provideRouter([]), {provide: RhDemandesService, useValue: service}]}).compileComponents();
  });
  function component(): RhDashboardComponent {
    const c = TestBed.createComponent(RhDashboardComponent).componentInstance;
    c.debut = '2026-01-01'; c.fin = '2026-02-28'; c.reload(); return c;
  }
  it('affiche les chiffres RH, le registre et le bilan individuel', () => {
    const fixture = TestBed.createComponent(RhDashboardComponent); fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Bonjour Awa RH');
    expect(page.textContent).toContain('Jours d’absence validés');
    expect(page.querySelectorAll('tbody tr').length).toBe(3);
    fixture.componentInstance.view = 'agents'; fixture.detectChanges();
    expect(page.querySelector('tbody')?.textContent).toContain('Agent Test');
    expect(page.querySelector('tfoot')?.textContent).toContain('4 j');
  });
  it('filtre les demandes par statut et recherche sans compter les jours non validés', () => {
    const c = component(); expect(c.registerDays).toBe(4);
    c.statut = 'EN_ATTENTE'; expect(c.filteredRegister.length).toBe(1); expect(c.registerDays).toBe(0);
    c.statut = ''; c.recherche = '  rendez-vous  '; expect(c.filteredRegister.map(r => r.id)).toEqual(['2']);
    c.recherche = '001'; expect(c.filteredRegister.length).toBe(3);
  });
  it('empêche une période inversée d’atteindre le serveur', () => {
    const c = component(); service.getRhDashboard.calls.reset();
    c.debut = '2026-03-01'; c.fin = '2026-02-01'; c.reload();
    expect(service.getRhDashboard).not.toHaveBeenCalled(); expect(c.message).toContain('période valide');
  });
  it('réinitialise le service quand le département change', () => {
    const c = component(); c.idDepartement = 'D2'; c.idService = 'S1'; c.onDepartmentChange();
    expect(c.idService).toBe(''); expect(c.filteredServices.map(s => s.id)).toEqual(['S2']);
    expect(service.getRhDashboard).toHaveBeenCalledWith('2026-01-01', '2026-02-28', jasmine.objectContaining({idDepartement: 'D2', idService: ''}));
  });
  it('exporte le registre avec les mêmes filtres et évite les soumissions multiples', () => {
    const c = component(); c.statut = 'VALIDEE'; c.recherche = 'Agent Test'; c.export('ABSENCES'); c.export('ABSENCES');
    expect(service.exportRhDashboard).toHaveBeenCalledTimes(1);
    expect(service.exportRhDashboard).toHaveBeenCalledWith('ABSENCES', '2026-01-01', '2026-02-28', jasmine.objectContaining({statut: 'VALIDEE', recherche: 'Agent Test'}));
  });
  it('bloque l’export lorsque les nouvelles dates ne sont pas appliquées', () => {
    const c = component(); c.fin = '2026-03-31'; c.export('ABSENCES');
    expect(c.filtersChanged).toBeTrue(); expect(service.exportRhDashboard).not.toHaveBeenCalled();
  });
  it('exporte le bilan de tous les agents sans les filtres locaux du registre', () => {
    const c = component(); c.statut = 'REJETEE'; c.recherche = 'Autre'; c.export('AGENTS');
    const filters = service.exportRhDashboard.calls.mostRecent().args[3];
    expect(filters?.statut).toBeUndefined(); expect(filters?.recherche).toBeUndefined();
  });
  it('ignore une ancienne réponse après un changement de filtre', () => {
    const c = component(), old = new Subject<BaRhDashboardDto>(), latest = new Subject<BaRhDashboardDto>();
    service.getRhDashboard.and.returnValues(old, latest);
    c.reload(); c.idDepartement = 'D2'; c.reload();
    latest.next({...dashboard(), joursAbsenceValides: 10}); old.next(dashboard());
    expect(c.data?.joursAbsenceValides).toBe(10); expect(c.loading).toBeFalse();
  });
  it('retire les données précédentes et indique l’erreur réelle du serveur', () => {
    const c = component(); service.getRhDashboard.and.returnValue(throwError(() => ({error: {message: 'Accès RH requis.'}}))); c.reload();
    expect(c.data).toBeUndefined(); expect(c.loading).toBeFalse(); expect(c.message).toBe('Accès RH requis.');
  });
  it('remet la pagination à zéro lorsque les filtres changent', () => {
    const c = component(); c.page = 5; c.statut = 'REJETEE'; c.filterRegister();
    expect(c.page).toBe(0); expect(c.pagedRegister.map(row => row.id)).toEqual(['3']);
  });
});
