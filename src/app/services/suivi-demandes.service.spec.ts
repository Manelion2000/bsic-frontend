import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { SuiviDemandesService, suiviDemandesGuard } from './suivi-demandes.service';

describe('API et protection du suivi des demandes', () => {
  let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]});http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('transmet les filtres et la pagination à l’API dédiée en GET', () => {
    TestBed.inject(SuiviDemandesService).list({module: 'ABSENCE', etat: 'EN_ATTENTE', recherche: 'Agent + exemple', departementId: 'dept', page: 1, size: 20}).subscribe();
    const r = http.expectOne(r => r.url === '/api/suivi-demandes');expect(r.request.method).toBe('GET');
    expect(r.request.params.get('recherche')).toBe('Agent + exemple');expect(r.request.params.get('page')).toBe('1');r.flush({content: []});
  });
  it('encode les identifiants et ne consulte pas les détails complets du module métier', () => {
    TestBed.inject(SuiviDemandesService).detail({module: 'DEMARCHE', id: 'id/a+b'} as any).subscribe();
    const r = http.expectOne('/api/suivi-demandes/DEMARCHE/id%2Fa%2Bb');expect(r.request.method).toBe('GET');r.flush({});
  });
  function guard() { let result: any; const call = TestBed.runInInjectionContext(() => suiviDemandesGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));(call as Observable<any>).subscribe(value => result = value);return () => result; }
  it('autorise la route uniquement selon la réponse de permission du serveur', () => {
    const result = guard();http.expectOne('/api/suivi-demandes/configuration').flush({autorise: true});expect(result()).toBeTrue();
    const denied = guard();http.expectOne('/api/suivi-demandes/configuration').flush({autorise: false});expect(TestBed.inject(Router).serializeUrl(denied())).toBe('/demarches');
  });
  it('refuse une entrée directe après révocation ou expiration de la connexion', () => {
    const denied = guard();http.expectOne('/api/suivi-demandes/configuration').flush({}, {status: 403, statusText: 'Forbidden'});expect(TestBed.inject(Router).serializeUrl(denied())).toBe('/demarches');
    const expired = guard();http.expectOne('/api/suivi-demandes/configuration').flush({}, {status: 401, statusText: 'Unauthorized'});expect(TestBed.inject(Router).serializeUrl(expired())).toBe('/login');
  });
});
