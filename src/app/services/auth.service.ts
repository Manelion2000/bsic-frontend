import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface BaLoginDto {
  username?: string;
  password?: string;
  rememberMe?: boolean;
}

export interface BaJWTTokenDto {
  access_token?: string;
  token?: string;
  expires_in?: number;
  passwordChangeRequired?: boolean;
}

export interface BaUpdatePasswordDto {
  email?: string;
  username?: string;
  telephone?: string;
  resetKey?: string;
  nouveau?: string;
  confirmer?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${API_BASE_URL}/authenticate`;
  private readonly logoutUrl = `${API_BASE_URL}/logout`;
  private readonly resetRequestUrl = `${API_BASE_URL}/users/request-reset-password`;
  private readonly tokenKey = 'bsic_access_token';

  constructor(private http: HttpClient) {}

  login(payload: BaLoginDto): Observable<BaJWTTokenDto> {
    return this.http.post<BaJWTTokenDto>(this.baseUrl, { ...payload, username: payload.username?.trim() });
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.logoutUrl, {});
  }

  requestResetPassword(email: string): Observable<void> {
    return this.http.put<void>(this.resetRequestUrl, { email: email.trim() });
  }

  storeToken(response?: BaJWTTokenDto, rememberMe = false): boolean {
    const token = response?.access_token || response?.token;
    this.clearToken();
    if (!token || !this.isTokenValid(token)) {
      return false;
    }
    const storage = rememberMe && !this.tokenRequiresChange(token) ? localStorage : sessionStorage;
    storage.setItem(this.tokenKey, token);
    return true;
  }

  getToken(): string | null {
    const token = sessionStorage.getItem(this.tokenKey) || localStorage.getItem(this.tokenKey);
    if (token && this.isTokenValid(token)) {
      return token;
    }
    this.clearToken();
    return null;
  }

  isAuthenticated(): boolean {
    const token=this.getToken();return token!==null&&!this.tokenRequiresChange(token);
  }

  requiresPasswordChange():boolean {const token=this.getToken();return !!token&&this.tokenRequiresChange(token);}
  private tokenRequiresChange(token:string):boolean {
    try{const segment=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(segment.padEnd(Math.ceil(segment.length/4)*4,'='))).purpose==='PASSWORD_SETUP';}catch{return false;}
  }
  completeInitialPassword(nouveau:string,confirmer:string){return this.http.put<void>(`${API_BASE_URL}/users/complete-initial-password`,{nouveau,confirmer});}
  changePassword(ancien:string,nouveau:string,confirmer:string){return this.http.put<void>(`${API_BASE_URL}/users/change-password`,{ancien,nouveau,confirmer});}

  clearToken(): void {
    sessionStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenKey);
  }

  isApiRequest(url: string): boolean {
    try {
      const api = new URL(API_BASE_URL, window.location.origin);
      const target = new URL(url, window.location.origin);
      return target.origin === api.origin
        && (target.pathname === api.pathname || target.pathname.startsWith(api.pathname + '/'));
    } catch {
      return false;
    }
  }

  isPublicAuthRequest(url: string): boolean {
    const path = new URL(url, window.location.origin).pathname;
    const apiPath = new URL(API_BASE_URL, window.location.origin).pathname;
    return path === apiPath + '/authenticate'
      || path === apiPath + '/users/request-reset-password'
      || path === apiPath + '/users/complete-reset-password'
      || path === apiPath + '/public'
      || path.startsWith(apiPath + '/public/');
  }

  private isTokenValid(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || parts.some(part => !part)) {
        return false;
      }
      const segment = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const encoded = segment.padEnd(Math.ceil(segment.length / 4) * 4, '=');
      const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes)) as { exp?: unknown };
      return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
        && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
