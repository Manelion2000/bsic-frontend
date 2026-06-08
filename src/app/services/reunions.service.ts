import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface BaReunionDto {
  id?: string;
  titre?: string;
  objet?: string;
  dateHeure?: string;
  procesVerbalId?: string;
  valideParDirecteur?: boolean;
  idDepartement?: string;
  nomDepartement?: string;
  idAgence?: string;
  nomAgence?: string;
  idService?: string;
  nomService?: string;
}

export interface BaReunionParticipantDto {
  id?: string;
  idReunion?: string;
  idEmploye?: string;
  matriculeEmploye?: string;
  nomCompletEmploye?: string;
  participantExterne?: string;
}

export interface BaReunionActionDto {
  id?: string;
  idReunion?: string;
  libelle?: string;
  idResponsable?: string;
  nomResponsable?: string;
  dateLimite?: string;
  terminee?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReunionsService {
  private baseUrl = `${API_BASE_URL}/reunions`;

  constructor(private http: HttpClient) {}

  getReunions(): Observable<BaReunionDto[]> {
    return this.http.get<BaReunionDto[]>(this.baseUrl);
  }

  createReunion(dto: BaReunionDto): Observable<BaReunionDto> {
    return this.http.post<BaReunionDto>(this.baseUrl, dto);
  }

  updateReunion(id: string, dto: BaReunionDto): Observable<BaReunionDto> {
    return this.http.put<BaReunionDto>(`${this.baseUrl}/${id}`, dto);
  }

  uploadDocument(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${API_BASE_URL}/documents`, formData, { responseType: 'text' });
  }

  addParticipant(dto: BaReunionParticipantDto): Observable<BaReunionParticipantDto> {
    return this.http.post<BaReunionParticipantDto>(`${API_BASE_URL}/reunions-participants`, dto);
  }

  addAction(dto: BaReunionActionDto): Observable<BaReunionActionDto> {
    return this.http.post<BaReunionActionDto>(`${API_BASE_URL}/reunions-actions`, dto);
  }
}
