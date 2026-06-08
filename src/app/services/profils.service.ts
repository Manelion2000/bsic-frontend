import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface BaRoleDto {
  id?: string;
  libelle?: string;
  code?: string;
}

export interface BaProfilDto {
  id?: string;
  libelle?: string;
  description?: string;
  roles?: BaRoleDto[];
}

@Injectable({ providedIn: 'root' })
export class ProfilsService {
  private baseUrl = `${API_BASE_URL}/profils`;

  constructor(private http: HttpClient) {}

  getProfils(): Observable<BaProfilDto[]> {
    return this.http.get<BaProfilDto[]>(this.baseUrl);
  }

  createProfil(profil: BaProfilDto): Observable<BaProfilDto> {
    return this.http.post<BaProfilDto>(this.baseUrl, profil);
  }

  updateProfil(profil: BaProfilDto): Observable<BaProfilDto> {
    return this.http.put<BaProfilDto>(this.baseUrl, profil);
  }

  deleteProfil(id: string): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' });
  }
}
