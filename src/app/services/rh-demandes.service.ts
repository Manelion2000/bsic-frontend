import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface BaStatItemDto {
  id?: string;
  libelle?: string;
  valeur?: number;
}

export interface BaAutorisationSortieRequestDto {
  motif: string;
  dateSortie: string;
  typeStructure: 'DIRECTION' | 'SERVICE' | 'AGENCE';
  idDirection?: string;
  idService?: string;
  idAgence?: string;
}
export interface BaAutorisationAbsenceRequestDto { motif: string; dateDebut: string; dateFin: string; }
export interface RhCircuitDto {
  publicationId?: string;
  fonctionDemandeur?: string; dgObligatoire: boolean; etapeCourante: number; statut?: string;
  blocage?: string; etapeBloquee?: string; peutDecider: boolean;
  etapes: {type:string;libelle:string;statut:string;validateurs:{id:string;nom:string}[];idSignataire?:string;nomSignataire?:string;dateDecision?:string;commentaire?:string}[];
  historique: {etape:number;type:string;decision:string;idSignataire:string;nomSignataire:string;date:string;commentaire?:string}[];
}
export interface BaAutorisationAbsenceDto { circuit?: RhCircuitDto; id?: string; motif?: string; dateDebut?: string; dateFin?: string; nombreJours?: number; statutValidation?: 'EN_ATTENTE'|'VALIDEE'|'REJETEE'|'ANNULEE'; commentaireValidation?: string; dateValidation?: string; idDemandeur?: string; nomCompletDemandeur?: string; matriculeDemandeur?: string; departement?: string; service?: string; idValidateur?: string; nomCompletValidateur?: string; }
export interface BaAbsenceStatsDto { totalDemandes: number; totalJours: number; enAttente: number; validees: number; rejetees: number; parMois: {periode:string;demandes:number;jours:number}[]; parAnnee: {periode:string;demandes:number;jours:number}[]; }
export type AbsenceStatut = 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE' | 'ANNULEE';
export interface RhDashboardFilter { idDepartement?: string; idService?: string; statut?: string; recherche?: string; }
export interface RhDashboardStructure { id: string; nom: string; idDepartement?: string; }
export interface RhAbsenceRegistre {
  id: string; idDemandeur: string; nomCompletDemandeur: string; matriculeDemandeur?: string;
  idDepartement: string; departement: string; idService?: string; service: string;
  dateDebut: string; dateFin: string; nombreJours: number; joursPeriode: number;
  statutValidation: AbsenceStatut; motif: string; validateur?: string; commentaireValidation?: string;
}
export interface RhAgentBilan {
  id: string; nom: string; matricule?: string; departement: string; service: string;
  demandes: number; validees: number; enAttente: number; jours: number;
}
export interface BaRhDashboardDto {
  nomUtilisateur: string; debut: string; fin: string;
  sortiesTotal: number; sortiesEnAttente: number; sortiesValidees: number;
  absencesTotal: number; absencesEnAttente: number; absencesValidees: number;
  absencesRejetees: number; absencesAnnulees: number;
  joursAbsenceValides: number; joursAbsenceEnAttente: number; agentsConcernes: number;
  absentsAujourdHui: number; absencesAVenir: number; tauxValidation: number;
  tendances: {periode: string; sorties: number; absences: number; joursAbsence: number}[];
  parDepartement: {id: string; departement: string; sorties: number; absences: number; joursAbsence: number}[];
  parAgent: RhAgentBilan[]; registre: RhAbsenceRegistre[];
  departements: RhDashboardStructure[]; services: RhDashboardStructure[];
}

export interface BaAutorisationSortieDto {
  circuit?: RhCircuitDto;
  id?: string;
  motif?: string;
  dateSortie?: string;
  statutValidation?: 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';
  commentaireValidation?: string;
  dateValidation?: string;
  idDemandeur?: string;
  nomCompletDemandeur?: string;
  idValidateur?: string;
  nomCompletValidateur?: string;
  typeStructure?: 'DIRECTION' | 'SERVICE' | 'AGENCE';
  idDirection?: string;
  nomDirection?: string;
  idService?: string;
  nomService?: string;
  idAgence?: string;
  nomAgence?: string;
}

export interface BaRepriseServiceRequestDto {
  motifAbsence: string;
  dateDebutConge: string;
  dateFinConge: string;
  dateReprise: string;
}

export interface BaRepriseServiceDto {
  id?: string;
  motifAbsence?: string;
  dateDebutConge?: string;
  dateFinConge?: string;
  dateReprise?: string;
  statutValidation?: 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';
  commentaireValidation?: string;
  dateValidation?: string;
  createdDate?: string;
  idDemandeur?: string;
  matriculeDemandeur?: string;
  nomCompletDemandeur?: string;
  nomServiceDemandeur?: string;
  nomDepartementDemandeur?: string;
  idSignataire?: string;
  nomCompletSignataire?: string;
  nomDepartementSignataire?: string;
  fonctionSignataire?: string;
}

export interface BaRhDemandesFilter {
  idDemandeur?: string;
  idDepartement?: string;
  idService?: string;
  idValidateur?: string;
  statutValidation?: 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';
  typeStructure?: 'DIRECTION' | 'SERVICE' | 'AGENCE';
  dateDebut?: string;
  dateFin?: string;
}

export interface BaRhDemandesStatsDto {
  total: number;
  enAttente: number;
  validees: number;
  rejetees: number;
  parDepartement: BaStatItemDto[];
  parService: BaStatItemDto[];
  parDemandeur: BaStatItemDto[];
  parValidateur: BaStatItemDto[];
  parMois: BaStatItemDto[];
  parTypeStructure: BaStatItemDto[];
}

export interface BaAutorisationSortieSuiviDto extends BaAutorisationSortieDto {
  createdDate?: string;
  nomDemandeur?: string;
  matriculeDemandeur?: string;
  idDepartement?: string;
  departement?: string;
  service?: string;
  structure?: string;
  validateur?: string;
}

export interface BaRepriseServiceSuiviDto extends BaRepriseServiceDto {
  nombreJoursAbsence?: number;
  nomDemandeur?: string;
  idDepartement?: string;
  departement?: string;
  idService?: string;
  service?: string;
  signataire?: string;
}

@Injectable({ providedIn: 'root' })
export class RhDemandesService {
  documentAbsence(id: string) { return this.http.get(`${API_BASE_URL}/reporting/autorisations-absence/${id}`, {responseType: 'blob'}); }
  constructor(private readonly http: HttpClient) {}
  getCircuitApplicable(demarche: 'SORTIE' | 'ABSENCE' = 'SORTIE') { return this.http.get<RhCircuitDto>(`${API_BASE_URL}/rh/circuit`, {params:{demarche}}); }

  createAbsence(dto: BaAutorisationAbsenceRequestDto) { return this.http.post<BaAutorisationAbsenceDto>(`${API_BASE_URL}/autorisations-absence`, dto); }
  getMesAbsences() { return this.http.get<BaAutorisationAbsenceDto[]>(`${API_BASE_URL}/autorisations-absence/mes-demandes`); }
  getAbsencesAValider() { return this.http.get<BaAutorisationAbsenceDto[]>(`${API_BASE_URL}/autorisations-absence/a-valider`); }
  getSuiviAbsences(debut?: string, fin?: string) { let params=new HttpParams(); if(debut)params=params.set('debut',debut);if(fin)params=params.set('fin',fin);return this.http.get<BaAutorisationAbsenceDto[]>(`${API_BASE_URL}/autorisations-absence/suivi`,{params}); }
  getStatsAbsences(debut?: string, fin?: string) { let params=new HttpParams();if(debut)params=params.set('debut',debut);if(fin)params=params.set('fin',fin);return this.http.get<BaAbsenceStatsDto>(`${API_BASE_URL}/autorisations-absence/statistiques`,{params}); }
  validerAbsence(id:string,etape:number,commentaire?:string) { let params=new HttpParams().set('etape',etape);if(commentaire)params=params.set('commentaire',commentaire);return this.http.put<BaAutorisationAbsenceDto>(`${API_BASE_URL}/autorisations-absence/${id}/valider`,null,{params}); }
  rejeterAbsence(id:string,etape:number,commentaire:string) { return this.http.put<BaAutorisationAbsenceDto>(`${API_BASE_URL}/autorisations-absence/${id}/rejeter`,null,{params:new HttpParams().set('etape',etape).set('commentaire',commentaire)}); }
  annulerAbsence(id:string) { return this.http.put<BaAutorisationAbsenceDto>(`${API_BASE_URL}/autorisations-absence/${id}/annuler`,null); }
  getRhDashboard(debut?: string, fin?: string, filter: RhDashboardFilter = {}): Observable<BaRhDashboardDto> {
    return this.http.get<BaRhDashboardDto>(`${API_BASE_URL}/rh-dashboard`, {params: this.dashboardParams(debut, fin, filter)});
  }
  exportRhDashboard(type: 'TOUT' | 'SORTIES' | 'ABSENCES' | 'AGENTS', debut?: string, fin?: string, filter: RhDashboardFilter = {}): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/rh-dashboard/export`, {
      params: this.dashboardParams(debut, fin, filter).set('type', type), responseType: 'blob'
    });
  }
  private dashboardParams(debut?: string, fin?: string, filter: RhDashboardFilter = {}): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries({debut, fin, ...filter})) {
      if (value) params = params.set(key, value);
    }
    return params;
  }

  createAutorisationSortie(dto: BaAutorisationSortieRequestDto): Observable<BaAutorisationSortieDto> {
    return this.http.post<BaAutorisationSortieDto>(`${API_BASE_URL}/autorisation-sorties`, dto);
  }

  getMesDemandesAutorisationSortie(): Observable<BaAutorisationSortieDto[]> {
    return this.http.get<BaAutorisationSortieDto[]>(`${API_BASE_URL}/autorisation-sorties/mes-demandes`);
  }

  getDemandesAutorisationSortieAValider(): Observable<BaAutorisationSortieDto[]> {
    return this.http.get<BaAutorisationSortieDto[]>(`${API_BASE_URL}/autorisation-sorties/a-valider`);
  }

  validerAutorisationSortie(id: string, etape: number, commentaire?: string): Observable<BaAutorisationSortieDto> {
    let params = new HttpParams().set('etape', etape);
    if (commentaire) params = params.set('commentaire', commentaire);
    return this.http.put<BaAutorisationSortieDto>(`${API_BASE_URL}/autorisation-sorties/${id}/valider`, null, { params });
  }

  rejeterAutorisationSortie(id: string, etape: number, commentaire: string): Observable<BaAutorisationSortieDto> {
    const params = new HttpParams().set('etape', etape).set('commentaire', commentaire);
    return this.http.put<BaAutorisationSortieDto>(`${API_BASE_URL}/autorisation-sorties/${id}/rejeter`, null, { params });
  }

  downloadAutorisationSortiePdf(id: string): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/reporting/autorisation-sorties/${id}`, { responseType: 'blob' });
  }

  createRepriseService(dto: BaRepriseServiceRequestDto): Observable<BaRepriseServiceDto> {
    return this.http.post<BaRepriseServiceDto>(`${API_BASE_URL}/reprises-service`, dto);
  }

  getMesReprisesService(): Observable<BaRepriseServiceDto[]> {
    return this.http.get<BaRepriseServiceDto[]>(`${API_BASE_URL}/reprises-service/mes-demandes`);
  }

  getReprisesServiceAValider(): Observable<BaRepriseServiceDto[]> {
    return this.http.get<BaRepriseServiceDto[]>(`${API_BASE_URL}/reprises-service/a-valider`);
  }

  getRepriseService(id: string): Observable<BaRepriseServiceDto> {
    return this.http.get<BaRepriseServiceDto>(`${API_BASE_URL}/reprises-service/${id}`);
  }

  validerRepriseService(id: string, commentaire?: string): Observable<BaRepriseServiceDto> {
    const params = commentaire ? new HttpParams().set('commentaire', commentaire) : undefined;
    return this.http.put<BaRepriseServiceDto>(`${API_BASE_URL}/reprises-service/${id}/valider`, null, { params });
  }

  rejeterRepriseService(id: string, commentaire: string): Observable<BaRepriseServiceDto> {
    const params = new HttpParams().set('commentaire', commentaire);
    return this.http.put<BaRepriseServiceDto>(`${API_BASE_URL}/reprises-service/${id}/rejeter`, null, { params });
  }

  downloadAttestationRepriseService(id: string): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/reporting/reprises-service/${id}/attestation`, { responseType: 'blob' });
  }

  getStatistiquesAutorisations(filter: BaRhDemandesFilter = {}): Observable<BaRhDemandesStatsDto> {
    return this.http.get<BaRhDemandesStatsDto>(`${API_BASE_URL}/autorisation-sorties/statistiques`, { params: this.toParams(filter) });
  }

  getSuiviAutorisations(filter: BaRhDemandesFilter = {}, page = 0, size = 20): Observable<PageResponse<BaAutorisationSortieSuiviDto>> {
    return this.http.get<PageResponse<BaAutorisationSortieSuiviDto>>(`${API_BASE_URL}/autorisation-sorties/suivi`, {
      params: this.toParams(filter).set('page', page).set('size', size).set('sort', 'createdDate,desc')
    });
  }

  getStatistiquesReprises(filter: BaRhDemandesFilter = {}): Observable<BaRhDemandesStatsDto> {
    return this.http.get<BaRhDemandesStatsDto>(`${API_BASE_URL}/reprises-service/statistiques`, { params: this.toParams(filter) });
  }

  getSuiviReprises(filter: BaRhDemandesFilter = {}, page = 0, size = 20): Observable<PageResponse<BaRepriseServiceSuiviDto>> {
    return this.http.get<PageResponse<BaRepriseServiceSuiviDto>>(`${API_BASE_URL}/reprises-service/suivi`, {
      params: this.toParams(filter).set('page', page).set('size', size).set('sort', 'createdDate,desc')
    });
  }

  private toParams(filter: BaRhDemandesFilter): HttpParams {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
