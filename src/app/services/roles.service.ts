import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface BaRoleDto {
  id?: string;
  libelle?: string;
  code?: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private baseUrl = `${API_BASE_URL}/roles`;

  constructor(private http: HttpClient) {}

  getRoles(): Observable<BaRoleDto[]> {
    return this.http.get<BaRoleDto[]>(this.baseUrl);
  }

  createRole(role: BaRoleDto): Observable<BaRoleDto> {
    return this.http.post<BaRoleDto>(this.baseUrl, role);
  }

  updateRole(role: BaRoleDto): Observable<BaRoleDto> {
    return this.http.put<BaRoleDto>(this.baseUrl, role);
  }

  deleteRole(id: string): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' });
  }
}
