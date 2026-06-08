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
}

export interface BaUpdatePasswordDto {
  email?: string;
  code?: string;
  newPassword?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${API_BASE_URL}/authenticate`;
  private logoutUrl = `${API_BASE_URL}/logout`;
  private resetRequestUrl = `${API_BASE_URL}/users/request-reset-password`;
  private tokenKey = 'bsic_access_token';

  constructor(private http: HttpClient) {}

  login(payload: BaLoginDto): Observable<BaJWTTokenDto> {
    return this.http.post<BaJWTTokenDto>(this.baseUrl, payload);
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.logoutUrl, {});
  }

  requestResetPassword(email: string): Observable<void> {
    const payload: BaUpdatePasswordDto = { email };
    return this.http.put<void>(this.resetRequestUrl, payload);
  }

  storeToken(response?: BaJWTTokenDto): void {
    const token = response?.access_token || response?.token;
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }
}
