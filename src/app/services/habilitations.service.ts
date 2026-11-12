import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface BaPlateformeDto {
  version?: number;
  id?: string;
  code?: string;
  nom?: string;
  description?: string;
  typePlateforme?: 'RESEAUX' | 'CORE_BANKING';
  idCircuit?: string;
  libelleCircuit?: string;
}

export interface BaEtapeDefinitionDto {
  id?: string;
  type?: 'DEPARTEMENT' | 'SERVICE';
  idDepartement?: string;
  nomDepartement?: string;
  idService?: string;
  nomService?: string;
  fonctionRequise?: string;
  roleCode?: string;
  libelle?: string;
}

export interface BaPlateformeRoleDto {
  id?: string;
  nom?: string;
  niveauAcces?: string;
  idPlateforme?: string;
  nomPlateforme?: string;
}

export interface BaFicheHabilitationDto {
  id?: string;
  idEmploye?: string;
  matriculeEmploye?: string;
  nomCompletEmploye?: string;
  idServiceEmploye?: string;
  nomServiceEmploye?: string;
  idDepartementEmploye?: string;
  nomDepartementEmploye?: string;
  idDirectionEmploye?: string;
  nomDirectionEmploye?: string;
  idAgenceEmploye?: string;
  nomAgenceEmploye?: string;
  idCircuit?: string;
  nomCircuit?: string;
  idPlateformeRole?: string;
  nomRole?: string;
  nomPlateforme?: string;
  idsPlateformes?: string[];
  nomsPlateformes?: string[];
  motif?: string;
  statutHabilitation?: 'EN_COURS' | 'VALIDEE' | 'REJETEE';
  priorite?: 'BASSE' | 'NORMALE' | 'HAUTE';
  createdDate?: string;
  justificatifId?: string;
  fonctionEmploye?: string;
  telephoneMobileEmploye?: string;
  etapes?: BaFicheHabilitationEtapeDto[];
}

export type HabilitationCompteStatut = 'A_CREER' | 'EN_COURS_CREATION' | 'CREE';

export interface BaHabilitationComptePlateformeDto {
  id?: string;
  idFiche?: string;
  idPlateforme?: string;
  nomPlateforme?: string;
  typePlateforme?: 'RESEAUX' | 'CORE_BANKING';
  idDemandeur?: string;
  matriculeDemandeur?: string;
  nomCompletDemandeur?: string;
  nomServiceDemandeur?: string;
  nomDepartementDemandeur?: string;
  statutCreation?: HabilitationCompteStatut;
  dateDebutCreation?: string;
  dateCreation?: string;
  idCreePar?: string;
  nomCompletCreePar?: string;
  commentaireCreation?: string;
  createdDate?: string;
}

export interface BaReinitialisationCompteEtapeDto {
  id?: string;
  idDemande?: string;
  nomEtape?: string;
  idValidateur?: string;
  nomCompletValidateur?: string;
  ordre?: number;
  statutValidation?: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  commentaire?: string;
  dateValidation?: string;
}

export interface BaReinitialisationCompteDto {
  id?: string;
  idDemandeur?: string;
  nomCompletDemandeur?: string;
  matriculeDemandeur?: string;
  idPlateforme?: string;
  nomPlateforme?: string;
  typePlateforme?: 'RESEAUX' | 'CORE_BANKING';
  idCircuit?: string;
  nomCircuit?: string;
  motif?: string;
  statutDemande?: 'EN_COURS' | 'VALIDEE' | 'REJETEE';
  dateValidation?: string;
  createdDate?: string;
  etapes?: BaReinitialisationCompteEtapeDto[];
  idTraitement?: string;
  statutTraitement?: 'A_TRAITER' | 'EN_COURS_TRAITEMENT' | 'TRAITEE';
  dateDebutTraitement?: string;
  dateTraitement?: string;
  nomCompletTraitePar?: string;
  commentaireTraitement?: string;
}

export interface BaStatItemDto {
  id?: string;
  libelle?: string;
  valeur?: number;
}

export interface BaPlateformeDashboardStatsDto {
  totalComptes: number;
  comptesACreer: number;
  comptesEnCoursCreation: number;
  comptesCrees: number;
  totalReinitialisations: number;
  reinitialisationsEnCours: number;
  reinitialisationsValidees: number;
  reinitialisationsRejetees: number;
  traitementsATraiter: number;
  traitementsEnCours: number;
  traitementsTraites: number;
  parTypePlateforme: BaStatItemDto[];
  parDepartement: BaStatItemDto[];
  topPlateformes: BaStatItemDto[];
  topCreateurs: BaStatItemDto[];
  topTraiteurs: BaStatItemDto[];
}

export interface BaPlateformeStatsFilter {
  idPlateforme?: string;
  typePlateforme?: 'RESEAUX' | 'CORE_BANKING';
  idDepartement?: string;
  idService?: string;
  idDemandeur?: string;
  idCreateurCompte?: string;
  idTraitePar?: string;
  statutCreation?: HabilitationCompteStatut;
  statutReinitialisation?: 'EN_COURS' | 'VALIDEE' | 'REJETEE';
  statutTraitement?: 'A_TRAITER' | 'EN_COURS_TRAITEMENT' | 'TRAITEE';
  dateDebut?: string;
  dateFin?: string;
}

export interface BaPlateformeUsageRowDto {
  idCompte?: string;
  idDemandeur?: string;
  nomDemandeur?: string;
  matriculeDemandeur?: string;
  idDepartement?: string;
  departement?: string;
  idService?: string;
  service?: string;
  idPlateforme?: string;
  plateforme?: string;
  typePlateforme?: 'RESEAUX' | 'CORE_BANKING';
  statutCreation?: HabilitationCompteStatut;
  dateDemandeCompte?: string;
  dateCreationCompte?: string;
  idCreePar?: string;
  creePar?: string;
  nombreReinitialisations?: number;
  derniereReinitialisation?: string;
  dernierStatutReinitialisation?: 'EN_COURS' | 'VALIDEE' | 'REJETEE';
  dernierStatutTraitement?: 'A_TRAITER' | 'EN_COURS_TRAITEMENT' | 'TRAITEE';
  idDernierTraitePar?: string;
  dernierTraitePar?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface BaReinitialisationCompteRequestDto {
  idPlateforme: string;
  motif: string;
}

interface PagedResponse<T> {
  content?: T[];
}

export interface BaFicheHabilitationEtapeDto {
  id?: string;
  idFiche?: string;
  idEtapeDefinition?: string;
  typeEtape?: 'DEPARTEMENT' | 'SERVICE';
  idDepartement?: string;
  nomDepartement?: string;
  idService?: string;
  nomService?: string;
  fonctionRequise?: string;
  idRole?: string;
  roleLibelle?: string;
  idValidateur?: string;
  nomCompletValidateur?: string;
  idDepartementValidateur?: string;
  nomDepartementValidateur?: string;
  ordre?: number;
  statutValidation?: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  commentaire?: string;
  dateValidation?: string;
}

interface BaRoleApiDto {
  id?: string;
  libelle?: string;
}

export interface CircuitEtapeRequestDto {
  departementId?: string | null;
  serviceId?: string | null;
  type?: 'DEPARTEMENT' | 'SERVICE';
  roleId?: string | null;
  ordre: number;
  obligatoire: boolean;
  actif: boolean;
  fonctionRequise?: string | null;
  delaiValidationJours?: number | null;
  conditions?: string | null;
}

export interface CircuitEtapeResponseDto {
  id?: string;
  type?: 'DEPARTEMENT' | 'SERVICE';
  ordre?: number;
  obligatoire?: boolean;
  actif?: boolean;
  departementId?: string;
  departementLibelle?: string;
  serviceId?: string;
  serviceLibelle?: string;
  roleId?: string | null;
  roleLibelle?: string | null;
  fonctionRequise?: string | null;
  delaiValidationJours?: number | null;
  conditions?: string | null;
}

export interface CircuitRequestDto {
  libelle: string;
  description?: string;
  actif?: boolean;
  statutCircuit?: 'ACTIF' | 'INACTIF' | 'EN_CONFIGURATION';
  etapes?: CircuitEtapeRequestDto[];
}

export interface CircuitResponseDto {
  id?: string;
  code?: string;
  libelle?: string;
  description?: string;
  actif?: boolean;
  statutCircuit?: 'ACTIF' | 'INACTIF' | 'EN_CONFIGURATION';
  etapes?: CircuitEtapeResponseDto[];
}

export interface BaValidationDelegationDto {
  id?: string;
  idDelegant?: string;
  nomDelegant?: string;
  idDelegue?: string;
  nomDelegue?: string;
  roleCode?: string;
  idDepartement?: string;
  nomDepartement?: string;
  idService?: string;
  nomService?: string;
  idAgence?: string;
  nomAgence?: string;
  dateDebut?: string;
  dateFin?: string;
  actif?: boolean;
  motif?: string;
}

export interface BaDgaPoleValidateurDto {
  id?: string;
  pole?: 'OPERATIONS' | 'DEVELOPPEMENT';
  idDga?: string;
  nomDga?: string;
  dateDebut?: string;
  dateFin?: string;
  actif?: boolean;
}

@Injectable({ providedIn: 'root' })
export class HabilitationsService {
  private baseUrl = `${API_BASE_URL}/habilitations`;

  constructor(private http: HttpClient) {}

  getPlateformes(): Observable<BaPlateformeDto[]> {
    return this.http.get<BaPlateformeDto[]>(`${this.baseUrl}/plateformes`);
  }

  createPlateforme(dto: BaPlateformeDto): Observable<BaPlateformeDto> {
    return this.http.post<BaPlateformeDto>(`${this.baseUrl}/plateformes`, dto);
  }

  updatePlateforme(id: string, dto: BaPlateformeDto): Observable<BaPlateformeDto> {
    return this.http.put<BaPlateformeDto>(`${this.baseUrl}/plateformes/${id}`, dto);
  }

  getCircuitsV2(): Observable<CircuitResponseDto[]> {
    return this.http.get<CircuitResponseDto[]>(`${API_BASE_URL}/circuits`);
  }

  getCircuitsActifsV2(): Observable<CircuitResponseDto[]> {
    return this.http.get<CircuitResponseDto[]>(`${API_BASE_URL}/circuits/actifs`);
  }

  createCircuitV2(dto: CircuitRequestDto): Observable<CircuitResponseDto> {
    return this.http.post<CircuitResponseDto>(`${API_BASE_URL}/circuits`, dto);
  }

  updateCircuitV2(id: string, dto: CircuitRequestDto): Observable<CircuitResponseDto> {
    return this.http.put<CircuitResponseDto>(`${API_BASE_URL}/circuits/${id}`, dto);
  }

  getCircuitByIdV2(id: string): Observable<CircuitResponseDto> {
    return this.http.get<CircuitResponseDto>(`${API_BASE_URL}/circuits/${id}`);
  }

  deleteCircuitV2(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/circuits/${id}`);
  }

  activerCircuitV2(id: string): Observable<CircuitResponseDto> {
    return this.http.post<CircuitResponseDto>(`${API_BASE_URL}/circuits/${id}/activer`, {});
  }

  desactiverCircuitV2(id: string): Observable<CircuitResponseDto> {
    return this.http.post<CircuitResponseDto>(`${API_BASE_URL}/circuits/${id}/desactiver`, {});
  }

  dupliquerCircuitV2(id: string, nouveauNom: string): Observable<CircuitResponseDto> {
    const params = new HttpParams().set('nouveauNom', nouveauNom);
    return this.http.post<CircuitResponseDto>(`${API_BASE_URL}/circuits/${id}/dupliquer`, {}, { params });
  }

  testerCircuitV2(id: string): Observable<boolean> {
    return this.http.post<boolean>(`${API_BASE_URL}/circuits/${id}/tester`, {});
  }

  getCircuitEtapesV2(circuitId: string): Observable<CircuitEtapeResponseDto[]> {
    return this.http.get<CircuitEtapeResponseDto[]>(`${API_BASE_URL}/circuits/${circuitId}/etapes`);
  }

  replaceCircuitEtapesV2(circuitId: string, etapes: CircuitEtapeRequestDto[]): Observable<CircuitEtapeResponseDto[]> {
    return this.http.put<CircuitEtapeResponseDto[]>(`${API_BASE_URL}/circuits/${circuitId}/etapes`, etapes);
  }

  addCircuitEtapeV2(circuitId: string, etape: CircuitEtapeRequestDto): Observable<CircuitEtapeResponseDto> {
    return this.http.post<CircuitEtapeResponseDto>(`${API_BASE_URL}/circuits/${circuitId}/etapes`, etape);
  }

  updateCircuitEtapeV2(circuitId: string, etapeId: string, etape: CircuitEtapeRequestDto): Observable<CircuitEtapeResponseDto> {
    return this.http.put<CircuitEtapeResponseDto>(`${API_BASE_URL}/circuits/${circuitId}/etapes/${etapeId}`, etape);
  }

  deleteCircuitEtapeV2(circuitId: string, etapeId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/circuits/${circuitId}/etapes/${etapeId}`);
  }

  getEtapes(type?: string, departementId?: string, serviceId?: string): Observable<BaEtapeDefinitionDto[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (departementId) params = params.set('departementId', departementId);
    if (serviceId) params = params.set('serviceId', serviceId);
    return this.http.get<BaEtapeDefinitionDto[]>(`${this.baseUrl}/etapes`, { params });
  }

  createEtape(dto: BaEtapeDefinitionDto): Observable<BaEtapeDefinitionDto> {
    return this.http.post<BaEtapeDefinitionDto>(`${this.baseUrl}/etapes`, dto);
  }

  updateEtape(id: string, dto: BaEtapeDefinitionDto): Observable<BaEtapeDefinitionDto> {
    return this.http.put<BaEtapeDefinitionDto>(`${this.baseUrl}/etapes/${id}`, dto);
  }

  getPlateformeRoles(_plateformeId: string): Observable<BaPlateformeRoleDto[]> {
    return this.http.get<BaRoleApiDto[]>(`${API_BASE_URL}/roles`).pipe(
      map((roles) =>
        (roles || []).map((role) => ({
          id: role.id,
          nom: role.libelle
        }))
      )
    );
  }

  createPlateformeRole(dto: BaPlateformeRoleDto): Observable<BaPlateformeRoleDto> {
    return this.http.post<BaRoleApiDto>(`${API_BASE_URL}/roles`, {
      id: dto.id,
      libelle: dto.nom
    }).pipe(map((created) => ({ id: created.id, nom: created.libelle })));
  }

  updatePlateformeRole(id: string, dto: BaPlateformeRoleDto): Observable<BaPlateformeRoleDto> {
    return this.http.put<BaRoleApiDto>(`${API_BASE_URL}/roles`, {
      id,
      libelle: dto.nom
    }).pipe(map((updated) => ({ id: updated.id, nom: updated.libelle })));
  }

  getFiches(): Observable<BaFicheHabilitationDto[]> {
    return this.http.get<BaFicheHabilitationDto[]>(`${this.baseUrl}/fiches`);
  }

  getMyFicheValidations(statut?: 'EN_COURS' | 'VALIDEE' | 'REJETEE', page = 0, size = 100): Observable<BaFicheHabilitationDto[]> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'createdDate,desc');
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http
      .get<PagedResponse<BaFicheHabilitationDto>>(`${this.baseUrl}/mes-validations`, { params })
      .pipe(map((res) => res?.content || []));
  }

  getFicheById(id: string): Observable<BaFicheHabilitationDto> {
    return this.http.get<BaFicheHabilitationDto>(`${this.baseUrl}/fiches/${id}`);
  }

  createFiche(dto: BaFicheHabilitationDto): Observable<BaFicheHabilitationDto> {
    return this.http.post<BaFicheHabilitationDto>(`${this.baseUrl}/fiches`, dto);
  }

  deleteFiche(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/fiches/${id}`);
  }

  initEtapesFromPlateforme(ficheId: string): Observable<BaFicheHabilitationEtapeDto[]> {
    return this.http.post<BaFicheHabilitationEtapeDto[]>(`${this.baseUrl}/fiches/${ficheId}/etapes-from-circuit`, {});
  }

  addEtape(dto: BaFicheHabilitationEtapeDto): Observable<BaFicheHabilitationEtapeDto> {
    return this.http.post<BaFicheHabilitationEtapeDto>(`${this.baseUrl}/fiches-etapes`, dto);
  }

  updateEtapeStatus(id: string, statut: string, commentaire?: string): Observable<BaFicheHabilitationEtapeDto> {
    let params = new HttpParams().set('statut', statut);
    if (commentaire) params = params.set('commentaire', commentaire);
    return this.http.put<BaFicheHabilitationEtapeDto>(`${this.baseUrl}/fiches-etapes/${id}/status`, null, { params });
  }

  getFichesEtapes(ficheId?: string): Observable<BaFicheHabilitationEtapeDto[]> {
    if (!ficheId) {
      return of([]);
    }
    return this.getFicheById(ficheId).pipe(map((fiche) => fiche.etapes || []));
  }

  updatePlateformeEtapesConfig(plateformeId: string, etapesConfig: { id: string; ordre: number }[]): Observable<void> {
    return this.resolveCircuitByPlateforme(plateformeId).pipe(
      switchMap((circuit) => {
        const payload: CircuitEtapeRequestDto[] = etapesConfig.map((item) => ({
          departementId: item.id,
          roleId: null,
          ordre: item.ordre,
          obligatoire: true,
          actif: true,
          type: 'DEPARTEMENT'
        }));
        return this.replaceCircuitEtapesV2(circuit.id!, payload);
      }),
      map(() => void 0)
    );
  }

  getEtapesByPlateforme(plateformeId: string): Observable<BaEtapeDefinitionDto[]> {
    return this.resolveCircuitByPlateforme(plateformeId).pipe(
      switchMap((circuit) => this.getCircuitEtapesV2(circuit.id!)),
      map((etapes) =>
        (etapes || []).map((etape, index) => ({
          id: etape.departementId,
          idDepartement: etape.departementId,
          nomDepartement: etape.departementLibelle,
          roleCode: etape.roleId || undefined,
          libelle: etape.departementLibelle || `Etape ${index + 1}`
        }))
      )
    );
  }

  createEtapesForFiche(ficheId: string, etapes: BaFicheHabilitationEtapeDto[]): Observable<BaFicheHabilitationEtapeDto[]> {
    if (!etapes.length) {
      return of([]);
    }
    const requests = etapes.map((etape) => this.addEtape({ ...etape, idFiche: ficheId }));
    return forkJoin(requests);
  }

  getWorkflowStatus(ficheId: string): Observable<{ progress: number; currentEtape: number; totalEtapes: number; statut: string }> {
    return this.getFicheById(ficheId).pipe(
      map((fiche) => {
        const etapes = fiche.etapes || [];
        const totalEtapes = etapes.length;
        const completed = etapes.filter((e) => e.statutValidation === 'VALIDE').length;
        const currentEtape = etapes.findIndex((e) => e.statutValidation === 'EN_ATTENTE') + 1;
        return {
          progress: totalEtapes ? (completed / totalEtapes) * 100 : 0,
          currentEtape: currentEtape > 0 ? currentEtape : totalEtapes,
          totalEtapes,
          statut: fiche.statutHabilitation || 'EN_COURS'
        };
      })
    );
  }

  getPlateformeEtapesConfig(plateformeId: string): Observable<BaEtapeDefinitionDto[]> {
    return this.getEtapesByPlateforme(plateformeId);
  }

  private resolveCircuitByPlateforme(plateformeId: string): Observable<CircuitResponseDto> {
    return forkJoin({
      circuits: this.getCircuitsV2(),
      plateformes: this.getPlateformes()
    }).pipe(
      map(({ circuits, plateformes }) => {
        const plateforme = (plateformes || []).find((p) => p.id === plateformeId);
        if (!plateforme?.idCircuit) {
          return undefined;
        }
        return (circuits || []).find((c) => c.id === plateforme.idCircuit);
      }),
      switchMap((circuit) => {
        if (circuit?.id) {
          return of(circuit);
        }
        const payload: CircuitRequestDto = {
          libelle: `Circuit ${plateformeId}`,
          description: 'Circuit cree automatiquement depuis le frontend',
          statutCircuit: 'EN_CONFIGURATION',
          actif: false
        };
        return this.createCircuitV2(payload);
      }),
      switchMap((circuit) => {
        if (circuit?.id) {
          return of(circuit);
        }
        return throwError(() => new Error('Impossible de resoudre le circuit de la plateforme.'));
      })
    );
  }

  getComptesPlateforme(statutCreation?: HabilitationCompteStatut): Observable<BaHabilitationComptePlateformeDto[]> {
    const params = statutCreation ? new HttpParams().set('statutCreation', statutCreation) : undefined;
    return this.http.get<BaHabilitationComptePlateformeDto[]>(`${API_BASE_URL}/habilitations/comptes-plateforme`, { params });
  }

  demarrerCreationComptePlateforme(id: string, commentaire?: string): Observable<BaHabilitationComptePlateformeDto> {
    const params = commentaire ? new HttpParams().set('commentaire', commentaire) : undefined;
    return this.http.put<BaHabilitationComptePlateformeDto>(`${API_BASE_URL}/habilitations/comptes-plateforme/${id}/demarrer`, null, { params });
  }

  marquerComptePlateformeCree(id: string, commentaire?: string): Observable<BaHabilitationComptePlateformeDto> {
    const params = commentaire ? new HttpParams().set('commentaire', commentaire) : undefined;
    return this.http.put<BaHabilitationComptePlateformeDto>(`${API_BASE_URL}/habilitations/comptes-plateforme/${id}/marquer-cree`, null, { params });
  }

  createReinitialisationCompte(dto: BaReinitialisationCompteRequestDto): Observable<BaReinitialisationCompteDto> {
    return this.http.post<BaReinitialisationCompteDto>(`${API_BASE_URL}/habilitations/reinitialisations-comptes`, dto);
  }

  getMesReinitialisationsCompte(): Observable<BaReinitialisationCompteDto[]> {
    return this.http.get<BaReinitialisationCompteDto[]>(`${API_BASE_URL}/habilitations/reinitialisations-comptes/mes-demandes`);
  }

  getReinitialisationsCompteAValider(): Observable<BaReinitialisationCompteDto[]> {
    return this.http.get<BaReinitialisationCompteDto[]>(`${API_BASE_URL}/habilitations/reinitialisations-comptes/a-valider`);
  }

  updateReinitialisationEtapeStatus(id: string, statut: 'VALIDE' | 'REJETE', commentaire?: string): Observable<BaReinitialisationCompteDto> {
    let params = new HttpParams().set('statut', statut);
    if (commentaire) params = params.set('commentaire', commentaire);
    return this.http.put<BaReinitialisationCompteDto>(`${API_BASE_URL}/habilitations/reinitialisations-comptes/etapes/${id}/status`, null, { params });
  }

  getReinitialisationsCompteATraiter(statutTraitement?: 'A_TRAITER' | 'EN_COURS_TRAITEMENT' | 'TRAITEE'): Observable<BaReinitialisationCompteDto[]> {
    const params = statutTraitement ? new HttpParams().set('statutTraitement', statutTraitement) : undefined;
    return this.http.get<BaReinitialisationCompteDto[]>(`${API_BASE_URL}/habilitations/reinitialisations-comptes/a-traiter`, { params });
  }

  demarrerTraitementReinitialisation(id: string, commentaire?: string): Observable<BaReinitialisationCompteDto> {
    const params = commentaire ? new HttpParams().set('commentaire', commentaire) : undefined;
    return this.http.put<BaReinitialisationCompteDto>(`${API_BASE_URL}/habilitations/reinitialisations-comptes/traitements/${id}/demarrer`, null, { params });
  }

  marquerReinitialisationTraitee(id: string, commentaire?: string): Observable<BaReinitialisationCompteDto> {
    const params = commentaire ? new HttpParams().set('commentaire', commentaire) : undefined;
    return this.http.put<BaReinitialisationCompteDto>(`${API_BASE_URL}/habilitations/reinitialisations-comptes/traitements/${id}/marquer-traitee`, null, { params });
  }

  getPlateformeDashboardStats(filter: BaPlateformeStatsFilter = {}): Observable<BaPlateformeDashboardStatsDto> {
    return this.http.get<BaPlateformeDashboardStatsDto>(`${API_BASE_URL}/habilitations/statistiques/tableau-bord`, {
      params: this.toStatsParams(filter)
    });
  }

  getSuiviPlateformes(filter: BaPlateformeStatsFilter = {}, page = 0, size = 20): Observable<PageResponse<BaPlateformeUsageRowDto>> {
    let params = this.toStatsParams(filter).set('page', page).set('size', size).set('sort', 'createdDate,desc');
    return this.http.get<PageResponse<BaPlateformeUsageRowDto>>(`${API_BASE_URL}/habilitations/suivi-plateformes`, { params });
  }

  getValidationDelegations(): Observable<BaValidationDelegationDto[]> {
    return this.http.get<BaValidationDelegationDto[]>(`${API_BASE_URL}/validation-delegations`);
  }

  createValidationDelegation(dto: BaValidationDelegationDto): Observable<BaValidationDelegationDto> {
    return this.http.post<BaValidationDelegationDto>(`${API_BASE_URL}/validation-delegations`, dto);
  }

  updateValidationDelegation(id: string, dto: BaValidationDelegationDto): Observable<BaValidationDelegationDto> {
    return this.http.put<BaValidationDelegationDto>(`${API_BASE_URL}/validation-delegations/${id}`, dto);
  }

  deleteValidationDelegation(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/validation-delegations/${id}`);
  }

  getDgaPoleValidateurs(): Observable<BaDgaPoleValidateurDto[]> {
    return this.http.get<BaDgaPoleValidateurDto[]>(`${API_BASE_URL}/dga-pole-validateurs`);
  }

  createDgaPoleValidateur(dto: BaDgaPoleValidateurDto): Observable<BaDgaPoleValidateurDto> {
    return this.http.post<BaDgaPoleValidateurDto>(`${API_BASE_URL}/dga-pole-validateurs`, dto);
  }

  updateDgaPoleValidateur(id: string, dto: BaDgaPoleValidateurDto): Observable<BaDgaPoleValidateurDto> {
    return this.http.put<BaDgaPoleValidateurDto>(`${API_BASE_URL}/dga-pole-validateurs/${id}`, dto);
  }

  deleteDgaPoleValidateur(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/dga-pole-validateurs/${id}`);
  }

  private toStatsParams(filter: BaPlateformeStatsFilter): HttpParams {
    let params = new HttpParams();
    Object.entries(filter || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }

}
