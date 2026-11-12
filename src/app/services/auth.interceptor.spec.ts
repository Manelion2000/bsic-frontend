import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

function token(subject = 'agent'): string {
  const payload = btoa(JSON.stringify({ sub: subject, exp: Math.floor(Date.now() / 1000) + 3600 }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${payload}.signature`;
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let auth: AuthService;
  let navigate: jasmine.Spy;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.clearToken();
    auth.storeToken({ access_token: token() });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(() => {
    requests.verify();
    auth.clearToken();
  });

  it('adds the token only to protected API requests', () => {
    for (const url of ['/api/users', 'https://external.example/api/users', '/api/authenticate', '/api/public/annuaire']) {
      http.get(url).subscribe();
      const request = requests.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(url === '/api/users');
      request.flush({});
    }
  });

  it('clears a rejected session and redirects to login on 401', () => {
    http.get('/api/users').subscribe({ error: () => {} });
    requests.expectOne('/api/users').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.getToken()).toBeNull();
    expect(navigate).toHaveBeenCalled();
  });

  it('keeps the session on 403 and does not react to rejected login credentials', () => {
    http.get('/api/users').subscribe({ error: () => {} });
    requests.expectOne('/api/users').flush({}, { status: 403, statusText: 'Forbidden' });
    http.post('/api/authenticate', {}).subscribe({ error: () => {} });
    requests.expectOne('/api/authenticate').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBeTrue();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not clear a new login because of an old request', () => {
    http.get('/api/users').subscribe({ error: () => {} });
    auth.storeToken({ access_token: token('new-session') });
    requests.expectOne('/api/users').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.getToken()).toBe(token('new-session'));
    expect(navigate).not.toHaveBeenCalled();
  });
});