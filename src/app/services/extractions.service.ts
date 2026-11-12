import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface ExtractionReference {id: string; nom: string;}
export interface ExtractionServiceReference extends ExtractionReference {departementId: string;}
export interface ExtractionConfiguration {demander: boolean; bibliotheque: boolean; gerer: boolean; moi: ExtractionReference; departement?: ExtractionReference|null; service?: ExtractionReference|null; demandeurs: (ExtractionReference & {departement: ExtractionReference; service?: ExtractionReference|null})[]; departements: ExtractionReference[]; services?: ExtractionServiceReference[];}
export interface OracleParametre {nom: string; type: 'TEXTE'|'DATE'|'NOMBRE'; description: string;}
export interface OracleEcriture {titre: string; motCle?: string; objectif: string; dateValidation: string; departementId: string; departementNom?: string; serviceId?: string|null; serviceNom?: string|null; schemaCible: string; sqlTexte: string; parametres: OracleParametre[]; version?: number; motif: string;}
export interface OracleLigne {id: string; titre: string; motCle?: string; objectif: string; dateValidation?: string|null; auteur?: string|null; departementDemandeur?: ExtractionReference|null; serviceDemandeur?: ExtractionReference|null; edition: number; verifiee: boolean; archivee: boolean; version: number; modifieLe?: string;}
export interface OracleRevision {id: string; edition: number; date: string; auteur: string; motif: string; contenu: OracleEcriture;}
export interface OracleExecution {id: string; edition: number; executeLe: string; enregistreLe: string; auteur: string; environnement: string; resultat: 'SUCCES'|'ECHEC'; referenceVerification: string; lignes?: number; commentaire: string; demandeReference?: string;}
export interface OracleDetail {fiche: OracleLigne; schemaCible: string; sqlTexte: string; parametres: OracleParametre[]; revisions: OracleRevision[]; executions: OracleExecution[];}
export interface ExtractionEcriture {titre: string; objectif: string; dateDemande: string; demandeurId: string; serviceId?: string|null; echeance: string|null; periodeDebut: string|null; periodeFin: string|null; criteres: string;}
export interface ExtractionLigne {id: string; reference: string; titre: string; etat: 'NOUVELLE'|'EN_COURS'|'TERMINEE'|'ANNULEE'; dateDemande: string; echeance?: string; demandeur: ExtractionReference; departement: ExtractionReference; service?: ExtractionReference|null; auteur: string; chargeDe?: ExtractionReference; requeteTitre?: string; edition?: number; version: number; creeLe: string;}
export interface ExtractionDetail {fiche: ExtractionLigne; objectif: string; periodeDebut?: string; periodeFin?: string; criteres: string; requete?: OracleRevision; executions: OracleExecution[]; historique: {date: string; auteur: string; action: string; motif: string}[]; peutTraiter: boolean; peutAnnuler: boolean;}
export interface ExtractionPage<T> {content: T[]; totalElements: number; totalPages: number; number: number; size: number;}
export interface OracleEssai {version: number; executeLe: string; environnement: string; resultat: 'SUCCES'|'ECHEC'; referenceVerification: string; lignes: number|null; commentaire: string;}

@Injectable({providedIn:'root'})
export class ExtractionsService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/extractions`;
  configuration(){return this.http.get<ExtractionConfiguration>(`${this.base}/configuration`);}
  library(filters: Record<string,string|boolean|number>){return this.http.get<ExtractionPage<OracleLigne>>(`${this.base}/requetes`,{params:this.params(filters)});}
  requests(filters: Record<string,string|boolean|number>){return this.http.get<ExtractionPage<ExtractionLigne>>(`${this.base}/demandes`,{params:this.params(filters)});}
  query(id: string){return this.http.get<OracleDetail>(`${this.base}/requetes/${encodeURIComponent(id)}`);}
  request(id: string){return this.http.get<ExtractionDetail>(`${this.base}/demandes/${encodeURIComponent(id)}`);}
  saveQuery(data: OracleEcriture,id?: string){return id?this.http.put<OracleDetail>(`${this.base}/requetes/${encodeURIComponent(id)}`,data):this.http.post<OracleDetail>(`${this.base}/requetes`,data);}
  create(data: ExtractionEcriture){return this.http.post<ExtractionDetail>(`${this.base}/demandes`,data);}
  queryAction(d: OracleDetail,action: 'verifier'|'archiver'|'restaurer',motif: string){return this.http.post<OracleDetail>(`${this.base}/requetes/${encodeURIComponent(d.fiche.id)}/${action}`,{version:d.fiche.version,motif});}
  test(d: OracleDetail,input: OracleEssai){return this.http.post<OracleDetail>(`${this.base}/requetes/${encodeURIComponent(d.fiche.id)}/essais`,input);}
  take(d: ExtractionDetail,requeteId: string,motif: string){return this.http.post<ExtractionDetail>(`${this.base}/demandes/${encodeURIComponent(d.fiche.id)}/prendre`,{version:d.fiche.version,requeteId,motif});}
  execute(d: ExtractionDetail,input: OracleEssai){return this.http.post<ExtractionDetail>(`${this.base}/demandes/${encodeURIComponent(d.fiche.id)}/executions`,input);}
  cancel(d: ExtractionDetail,motif: string){return this.http.post<ExtractionDetail>(`${this.base}/demandes/${encodeURIComponent(d.fiche.id)}/annuler`,{version:d.fiche.version,motif});}
  private params(filters: Record<string,string|boolean|number>){let params=new HttpParams();Object.entries(filters).forEach(([key,value])=>{if(value!=='')params=params.set(key,String(value));});return params;}
}
export const extractionsGuard: CanActivateFn=()=>{
  const router=inject(Router);
  return inject(ExtractionsService).configuration().pipe(map(c=>c.demander||c.bibliotheque||router.createUrlTree(['/annuaire/annuaire'])),catchError(e=>of(router.createUrlTree([e.status===401?'/login':'/annuaire/annuaire']))));
};
