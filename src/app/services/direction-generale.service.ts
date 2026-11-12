import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {API_BASE_URL} from './api.config';
import {BaUserDto} from './users.service';
import {BaDgaPoleValidateurDto} from './habilitations.service';

export type DirectionKind = 'dg' | 'dga';
export interface DirectionGeneraleRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  sexe: 'MASCULIN' | 'FEMININ';
  matricule?: string;
  pole?: 'OPERATIONS' | 'DEVELOPPEMENT';
  dateDebut?: string;
  dateFin?: string;
}

@Injectable({providedIn: 'root'})
export class DirectionGeneraleService {
  private readonly baseUrl = `${API_BASE_URL}/direction-generale`;
  constructor(private http: HttpClient) {}
  getUsers(kind: DirectionKind): Observable<BaUserDto[]> { return this.http.get<BaUserDto[]>(`${this.baseUrl}/${kind}`); }
  create(kind: DirectionKind, request: DirectionGeneraleRequest): Observable<BaUserDto> {
    return this.http.post<BaUserDto>(`${this.baseUrl}/${kind}`, request);
  }
  getAssignments(): Observable<BaDgaPoleValidateurDto[]> {
    return this.http.get<BaDgaPoleValidateurDto[]>(`${this.baseUrl}/affectations-dga`);
  }
  saveAssignment(request: BaDgaPoleValidateurDto): Observable<BaDgaPoleValidateurDto> {
    return request.id
      ? this.http.put<BaDgaPoleValidateurDto>(`${this.baseUrl}/affectations-dga/${request.id}`, request)
      : this.http.post<BaDgaPoleValidateurDto>(`${this.baseUrl}/affectations-dga`, request);
  }
  deactivateAssignment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/affectations-dga/${id}`);
  }
}
