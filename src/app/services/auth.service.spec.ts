import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

const key = 'bsic_access_token';
function token(exp: unknown = Math.floor(Date.now() / 1000) + 3600,purpose='ACCESS'): string {
  const data = btoa(JSON.stringify({ sub: 'agent', exp,purpose })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${data}.signature`;
}

describe('AuthService sessions', () => {
  let service: AuthService;
  beforeEach(() => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(AuthService);
  });
  afterEach(() => service.clearToken());

  it('keeps a session in sessionStorage unless rememberMe is selected', () => {
    const jwt = token();
    expect(service.storeToken({ access_token: jwt })).toBeTrue();
    expect(sessionStorage.getItem(key)).toBe(jwt);
    expect(localStorage.getItem(key)).toBeNull();
    expect(service.storeToken({ access_token: jwt }, true)).toBeTrue();
    expect(localStorage.getItem(key)).toBe(jwt);
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('never persists setup access with rememberMe or grants it normal authentication',()=>{
    const jwt=token(Math.floor(Date.now()/1000)+900,'PASSWORD_SETUP');service.storeToken({access_token:jwt,passwordChangeRequired:true},true);
    expect(sessionStorage.getItem(key)).toBe(jwt);expect(localStorage.getItem(key)).toBeNull();expect(service.getToken()).toBe(jwt);
    expect(service.requiresPasswordChange()).toBeTrue();expect(service.isAuthenticated()).toBeFalse();
  });
  it('rejects expired, malformed and non-expiring tokens', () => {
    for (const invalid of ['invalid', token(0), token(null), token('9999999999')]) {
      expect(service.storeToken({ access_token: invalid })).toBeFalse();
      expect(service.isAuthenticated()).toBeFalse();
    }
  });

  it('clears expired tokens already saved by older versions', () => {
    localStorage.setItem(key, token(0));
    expect(service.getToken()).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('handles base64url payloads and clears both storage locations', () => {
    const jwt = token();
    service.storeToken({ access_token: jwt }, true);
    expect(service.isAuthenticated()).toBeTrue();
    sessionStorage.setItem(key, jwt);
    service.clearToken();
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('limits API matching to the exact origin and path boundary', () => {
    expect(service.isApiRequest('/api/users')).toBeTrue();
    expect(service.isApiRequest(window.location.origin + '/api/users')).toBeTrue();
    expect(service.isApiRequest('https://external.example/api/users')).toBeFalse();
    expect(service.isApiRequest('/api-other/users')).toBeFalse();
    expect(service.isPublicAuthRequest('/api/authenticate')).toBeTrue();
  });
});