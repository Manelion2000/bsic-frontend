import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {RhDemandesService} from './rh-demandes.service';
import {API_BASE_URL} from './api.config';

describe('Décisions RH par API', () => {
  let service:RhDemandesService;let http:HttpTestingController;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});service=TestBed.inject(RhDemandesService);http=TestBed.inject(HttpTestingController);});
  afterEach(()=>http.verify());
  it('transmet la période et le périmètre du tableau de bord RH', () => {
    service.getRhDashboard('2026-01-01', '2026-02-28', {idDepartement: 'D1', idService: 'S1'}).subscribe();
    const request = http.expectOne(r => r.url === API_BASE_URL + '/rh-dashboard');
    expect(request.request.params.get('debut')).toBe('2026-01-01');
    expect(request.request.params.get('fin')).toBe('2026-02-28');
    expect(request.request.params.get('idDepartement')).toBe('D1');
    expect(request.request.params.get('idService')).toBe('S1'); request.flush({});
  });
  it('exporte les mêmes filtres que le registre des absences', () => {
    service.exportRhDashboard('ABSENCES', '2026-01-01', '2026-02-28', {idDepartement: 'D1', statut: 'VALIDEE', recherche: 'Agent'}).subscribe();
    const request = http.expectOne(r => r.url === API_BASE_URL + '/rh-dashboard/export');
    expect(request.request.responseType).toBe('blob');
    expect(request.request.params.get('type')).toBe('ABSENCES');
    expect(request.request.params.get('statut')).toBe('VALIDEE');
    expect(request.request.params.get('recherche')).toBe('Agent');
    expect(request.request.params.get('idDepartement')).toBe('D1'); request.flush(new Blob());
  });
  it('transmet l’étape affichée pour une absence',()=>{
    service.validerAbsence('id',2,'Accord').subscribe();
    const request=http.expectOne(r=>r.url===API_BASE_URL+'/autorisations-absence/id/valider');
    expect(request.request.params.get('etape')).toBe('2');expect(request.request.method).toBe('PUT');request.flush({});
  });
  it('transmet l’étape affichée pour une sortie et un refus',()=>{
    service.rejeterAutorisationSortie('id',1,'Motif').subscribe();
    const request=http.expectOne(r=>r.url===API_BASE_URL+'/autorisation-sorties/id/rejeter');
    expect(request.request.params.get('etape')).toBe('1');expect(request.request.params.get('commentaire')).toBe('Motif');request.flush({});
  });
});
