import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { SuiviDemandesComponent } from './suivi-demandes.component';
import { SuiviConfiguration, SuiviDemande, SuiviDemandesService, SuiviDetail, SuiviPage } from '../../services/suivi-demandes.service';

describe('Suivi des demandes en lecture seule', () => {
  let api: jasmine.SpyObj<SuiviDemandesService>;
  const config: SuiviConfiguration = {autorise: true, perimetre: 'DEPARTEMENT', departement: {id: 'dept', nom: 'Direction Opérations'},
    departements: [{id: 'dept', nom: 'Direction Opérations'}], modules: ['DEMARCHE', 'ABSENCE']};
  const row: SuiviDemande = {module: 'ABSENCE', id: 'request', agent: 'Agent Exemple', departementId: 'dept', departement: 'Direction Opérations', service: 'Service 2',
    etat: 'EN_ATTENTE', soumiseLe: '2026-10-11T10:00:00Z', etapeActive: 'Directeur', etapesValidees: 1, etapesTotal: 3};
  const page: SuiviPage = {content: [row], totalElements: 21, totalPages: 2, number: 0, size: 20};
  const detail: SuiviDetail = {demande: row, circuit: {dgObligatoire: false, etapeCourante: 1, statut: 'EN_ATTENTE', peutDecider: false, historique: [],
    etapes: [{type: 'CHEF_SERVICE', libelle: 'Chef', statut: 'VALIDEE', validateurs: [], nomSignataire: 'Chef Exemple'},
      {type: 'DIRECTEUR', libelle: 'Directeur', statut: 'EN_ATTENTE', validateurs: [{id: 'director', nom: 'Directeur Exemple'}]}]}};
  beforeEach(async () => {
    api = jasmine.createSpyObj('SuiviDemandesService', ['configuration', 'list', 'detail']);
    api.configuration.and.returnValue(of(config)); api.list.and.returnValue(of(page)); api.detail.and.returnValue(of(detail));
    await TestBed.configureTestingModule({imports: [SuiviDemandesComponent], providers: [{provide: SuiviDemandesService, useValue: api}]}).compileComponents();
  });
  function fixture() { const f = TestBed.createComponent(SuiviDemandesComponent); f.detectChanges(); return f; }
  it('applique le département du serveur et affiche l’étape active sans actions métier', () => {
    const f = fixture();expect(api.list).toHaveBeenCalledWith(jasmine.objectContaining({etat: 'EN_ATTENTE', departementId: 'dept', page: 0, size: 20}));
    expect(f.nativeElement.querySelector('select[name="departementId"]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Directeur');expect(f.nativeElement.textContent).toContain('1 / 3');
    expect(f.nativeElement.textContent).not.toContain('Approuver');expect(f.nativeElement.textContent).not.toContain('Justificatif');
  });
  it('offre le filtre département uniquement pour le périmètre global', () => {
    api.configuration.and.returnValue(of({...config, perimetre: 'GLOBAL', departements: [...config.departements, {id: 'other', nom: 'Autre direction'}]}));
    const f = fixture();expect(f.nativeElement.querySelector('select[name="departementId"]')).toBeTruthy();
    const c = f.componentInstance;c.departementId = 'other';c.module = 'DEMARCHE';c.recherche = ' Agent ';c.reload();
    expect(api.list.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({departementId: 'other', module: 'DEMARCHE', recherche: 'Agent'}));
  });
  it('ouvre le circuit réellement retourné dans la fenêtre en lecture seule', () => {
    const f = fixture();const c = f.componentInstance;
    (f.nativeElement.querySelector('tbody button') as HTMLButtonElement).click();f.detectChanges();
    expect(api.detail).toHaveBeenCalledOnceWith(row);expect(c.workflow!.readOnly).toBeTrue();
    expect(f.nativeElement.querySelector('.workflow-dialog').open).toBeTrue();expect(f.nativeElement.querySelector('.workflow-node.approved')).toBeTruthy();
    expect(f.nativeElement.querySelector('.workflow-dialog .node-grip')).toBeNull();
    c.workflow!.move(0,1);expect(c.workflow!.nodes[0].label).toBe('Chef');c.workflow!.close();
  });
  it('relit les droits et efface les anciens dossiers après une révocation', () => {
    const f = fixture();const c = f.componentInstance;expect(c.data).toBeTruthy();
    api.configuration.and.returnValue(of({...config, autorise: false}));c.reload();f.detectChanges();
    expect(api.configuration).toHaveBeenCalledTimes(2);expect(api.list).toHaveBeenCalledTimes(1);expect(c.data).toBeUndefined();
    expect(f.nativeElement.textContent).not.toContain('Agent Exemple');expect(c.error).toContain('permission');
  });
  it('explique un rattachement manquant et ne charge aucune liste', () => {
    api.configuration.and.returnValue(of({...config, departement: undefined, blocage: 'Rattachez votre compte à un département.'}));
    const f = fixture();expect(api.list).not.toHaveBeenCalled();expect(f.nativeElement.textContent).toContain('Rattachez votre compte');
  });
  it('récalcule le périmètre après mutation et revient à la première page sur un filtre', () => {
    const f = fixture();const c = f.componentInstance;c.reload(1);expect(api.list.calls.mostRecent().args[0].page).toBe(1);
    api.configuration.and.returnValue(of({...config, departement: {id: 'new-dept', nom: 'Nouvelle direction'}}));c.etat = 'APPROUVEE';c.reload();
    expect(api.list.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({etat: 'APPROUVEE', departementId: 'new-dept', page: 0}));
  });
  it('empêche deux ouvertures simultanées et masque la liste après un refus de périmètre', () => {
    const f = fixture();const c = f.componentInstance;const pending = new Subject<SuiviDetail>();api.detail.and.returnValue(pending);
    c.show(row);c.show(row);expect(api.detail).toHaveBeenCalledTimes(1);expect(c.opening).toBeTrue();
    pending.error({status: 404, error: {message: 'Demande introuvable dans votre périmètre.'}});f.detectChanges();
    expect(c.opening).toBeFalse();expect(c.data).toBeUndefined();expect(c.error).toContain('périmètre');
  });
  it('abandonne une requête ancienne afin qu’elle ne remplace pas un nouveau périmètre', () => {
    const f = fixture();const c = f.componentInstance;const obsolete = new Subject<SuiviPage>();api.list.and.returnValue(obsolete);c.reload();
    api.list.and.returnValue(of({...page, content: [], totalElements: 0}));c.reload();obsolete.next(page);obsolete.complete();
    expect(c.data!.content).toEqual([]);api.configuration.and.returnValue(throwError(() => ({status: 403})));c.reload();expect(c.data).toBeUndefined();
  });
  it('affiche le traitement d’une extraction sans inventer de signature ou ouvrir son contenu',()=>{
    api.configuration.and.returnValue(of({...config,modules:['EXTRACTION']}));api.list.and.returnValue(of({...page,content:[{...row,module:'EXTRACTION',etapeActive:'Traitement informatique',etapesTotal:0,etapesValidees:0}]}));const f=fixture();expect(f.nativeElement.textContent).toContain('Extraction Oracle');expect(f.nativeElement.textContent).toContain('Traitement informatique sans circuit de signature');expect(f.nativeElement.querySelector('tbody button')).toBeNull();expect(f.nativeElement.querySelector('tbody progress')).toBeNull();expect(api.detail).not.toHaveBeenCalled();
  });
});
