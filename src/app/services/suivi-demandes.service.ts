import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { RhCircuitDto } from './rh-demandes.service';

export interface SuiviConfiguration {
  autorise: boolean; perimetre?: 'GLOBAL' | 'DEPARTEMENT'; blocage?: string;
  departement?: {id: string; nom: string}; departements: {id: string; nom: string}[]; modules: string[];
}
export interface SuiviDemande {
  module: string; id: string; agent: string; departementId?: string; departement: string; service: string;
  etat: string; soumiseLe?: string; debut?: string; fin?: string;
  etapeActive?: string; etapesValidees: number; etapesTotal: number;
}
export interface SuiviPage { content: SuiviDemande[]; totalElements: number; totalPages: number; number: number; size: number; }
export interface SuiviDetail { demande: SuiviDemande; circuit: RhCircuitDto; }
export interface SuiviFilter { module: string; etat: string; recherche: string; departementId: string; page: number; size: number; }

@Injectable({providedIn: 'root'})
export class SuiviDemandesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/suivi-demandes`;
  configuration() { return this.http.get<SuiviConfiguration>(`${this.base}/configuration`); }
  list(filter: SuiviFilter) {
    const params = new HttpParams({fromObject: {...filter}});
    return this.http.get<SuiviPage>(this.base, {params});
  }
  detail(row: SuiviDemande) { return this.http.get<SuiviDetail>(`${this.base}/${encodeURIComponent(row.module)}/${encodeURIComponent(row.id)}`); }
}
export const suiviDemandesGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(SuiviDemandesService).configuration().pipe(
    map(config => config.autorise || router.createUrlTree(['/demarches'])),
    catchError(error => of(router.createUrlTree([error.status === 401 ? '/login' : '/demarches'])))
  );
};
