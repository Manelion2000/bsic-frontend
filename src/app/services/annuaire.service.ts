import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface BaServiceDto {
  id?: string;
  code?: string;
  nom?: string;
  idDepartement?: string;
  nomDepartement?: string;
}

export interface BaDepartementDto {
  id?: string;
  code?: string;
  nom?: string;
  dgaPole?: 'OPERATIONS' | 'DEVELOPPEMENT';
  idParentDepartement?: string;
  nomParentDepartement?: string;
  idDgaValidateur?: string;
  nomDgaValidateur?: string;
  idDgaEffectif?: string;
  nomDgaEffectif?: string;
}

export interface BaAgenceDto {
  id?: string;
  code?: string;
  nom?: string;
  adresse?: string;
  telephone?: string;
  telephone1?: string;
  idDepartement?: string;
  nomDepartement?: string;
}

export interface BaUserDto {
  id?: string;
  username?: string;
  password?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  activated?: boolean;
  locked?: boolean;
  telephone?: string;
  matricule?: string;
  fonction?: string;
  emailPro?: string;
  telephoneFixe?: string;
  telephoneMobile?: string;
  idService?: string;
  nomService?: string;
  idDepartement?: string;
  codeDepartement?: string;
  nomDepartement?: string;
  idAgence?: string;
  nomAgence?: string;
  idSuperieur?: string;
  nomCompletSuperieur?: string;
  idSuperieurSecondaire?: string;
  nomCompletSuperieurSecondaire?: string;
  sexe?: 'MASCULIN' | 'FEMININ';
}

export interface BaAnnuaireAgentDto {
  nom?: string;
  prenom?: string;
  fonction?: string;
  email?: string;
  emailPro?: string;
  numeroPoste?: string;
  telephone?: string;
  telephoneSecondaire?: string;
  idService?: string;
  nomService?: string;
  idAgence?: string;
  nomAgence?: string;
}

export interface BaAnnuaireDepartementDto {
  id?: string;
  nom?: string;
  agents?: BaAnnuaireAgentDto[];
}

@Injectable({ providedIn: 'root' })
export class AnnuaireService {
  private baseUrl = `${API_BASE_URL}/annuaires`;
  private publicBaseUrl = `${API_BASE_URL}/public/annuaires`;

  constructor(private http: HttpClient) {}

  getServices(): Observable<BaServiceDto[]> {
    return this.http.get<BaServiceDto[]>(`${this.baseUrl}/services`);
  }

  createService(dto: BaServiceDto): Observable<BaServiceDto> {
    return this.http.post<BaServiceDto>(`${this.baseUrl}/services`, dto);
  }

  updateService(id: string, dto: BaServiceDto): Observable<BaServiceDto> {
    return this.http.put<BaServiceDto>(`${this.baseUrl}/services/${id}`, dto);
  }

  getDepartements(): Observable<BaDepartementDto[]> {
    return this.http.get<BaDepartementDto[]>(`${this.baseUrl}/departements`);
  }

  createDepartement(dto: BaDepartementDto): Observable<BaDepartementDto> {
    return this.http.post<BaDepartementDto>(`${this.baseUrl}/departements`, dto);
  }

  updateDepartement(id: string, dto: BaDepartementDto): Observable<BaDepartementDto> {
    return this.http.put<BaDepartementDto>(`${this.baseUrl}/departements/${id}`, dto);
  }

  getAgences(): Observable<BaAgenceDto[]> {
    return this.http.get<BaAgenceDto[]>(`${this.baseUrl}/agences`);
  }

  createAgence(dto: BaAgenceDto): Observable<BaAgenceDto> {
    return this.http.post<BaAgenceDto>(`${this.baseUrl}/agences`, dto);
  }

  updateAgence(id: string, dto: BaAgenceDto): Observable<BaAgenceDto> {
    return this.http.put<BaAgenceDto>(`${this.baseUrl}/agences/${id}`, dto);
  }

  getAnnuaire(departementId?: string, serviceId?: string, agenceId?: string): Observable<BaAnnuaireDepartementDto[]> {
    let params = new HttpParams();
    if (departementId) params = params.set('departementId', departementId);
    if (serviceId) params = params.set('serviceId', serviceId);
    if (agenceId) params = params.set('agenceId', agenceId);
    return this.http.get<BaAnnuaireDepartementDto[]>(`${this.baseUrl}/annuaire`, { params });
  }

  getPublicServices(): Observable<BaServiceDto[]> {
    return this.http.get<BaServiceDto[]>(`${this.publicBaseUrl}/services`);
  }

  getPublicDepartements(): Observable<BaDepartementDto[]> {
    return this.http.get<BaDepartementDto[]>(`${this.publicBaseUrl}/departements`);
  }

  getPublicAgences(): Observable<BaAgenceDto[]> {
    return this.http.get<BaAgenceDto[]>(`${this.publicBaseUrl}/agences`);
  }

  getPublicAnnuaire(departementId?: string, serviceId?: string, agenceId?: string): Observable<BaAnnuaireDepartementDto[]> {
    let params = new HttpParams();
    if (departementId) params = params.set('departementId', departementId);
    if (serviceId) params = params.set('serviceId', serviceId);
    if (agenceId) params = params.set('agenceId', agenceId);
    return this.http.get<BaAnnuaireDepartementDto[]>(`${this.publicBaseUrl}/annuaire`, { params });
  }
}
