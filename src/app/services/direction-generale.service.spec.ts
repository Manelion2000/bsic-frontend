import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {DirectionGeneraleService} from './direction-generale.service';
import {API_BASE_URL} from './api.config';

describe('API de la direction générale', () => {
  let service: DirectionGeneraleService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    service = TestBed.inject(DirectionGeneraleService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('crée un DGA et son pôle dans un seul appel indépendant des habilitations', () => {
    const body = {nom: 'Test', prenom: 'DGA', email: 'dga@example.test', telephone: '12345678', sexe: 'MASCULIN' as const, pole: 'OPERATIONS' as const};
    service.create('dga', body).subscribe();
    const request = http.expectOne(`${API_BASE_URL}/direction-generale/dga`);
    expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual(body); request.flush({id: 'dga'});
  });
  it('charge les DG depuis leur API dédiée', () => {
    service.getUsers('dg').subscribe();
    const request = http.expectOne(`${API_BASE_URL}/direction-generale/dg`);
    expect(request.request.method).toBe('GET'); request.flush([]);
  });
  it('modifie une affectation existante et la désactive sans supprimer son compte', () => {
    service.saveAssignment({id: 'assignment', idDga: 'dga', pole: 'DEVELOPPEMENT'}).subscribe();
    const update = http.expectOne(`${API_BASE_URL}/direction-generale/affectations-dga/assignment`);
    expect(update.request.method).toBe('PUT'); update.flush({id: 'assignment'});
    service.deactivateAssignment('assignment').subscribe();
    const remove = http.expectOne(`${API_BASE_URL}/direction-generale/affectations-dga/assignment`);
    expect(remove.request.method).toBe('DELETE'); remove.flush(null);
  });
});
