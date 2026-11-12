import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {CanActivateFn, Router} from '@angular/router';
import {catchError, map, of} from 'rxjs';
import {API_BASE_URL} from './api.config';
import {RhCircuitDto} from './rh-demandes.service';

export interface Reference {id: string; nom: string;}
export interface CongeConfiguration {permissions: string[]; agentId: string; fonction: string; blocage: string; administrateurTechnique?:boolean; politiques: Policy[]; agents?: Reference[]; departements?: Reference[]; services?: Reference[]; agences?: Reference[];}
export interface Policy {id: string; typeCode: string; libelle: string; categorie: string; version: number; etat: string; debutEffet: string; finEffet?: string; sourceRh: string; regles: Record<string, any>;}
export interface Calendar {id: string; nom: string; debutEffet: string; finEffet?: string; sourceRh: string; confirme: boolean; regles: {fuseau: string; semaine: any[]; exceptions: any[]};}
export interface Balance {droitId: string; agentId: string; agent: string; typeCode: string; libelle: string; unite: string; origineDebut: string; origineFin: string; expiration?: string; acquis: string; reserves: string; debites: string; disponible: string; projetes: string; approuvesAVenir: string; pris: string; echusNonConfirmes: string; plafondAnticipation: string; cloturee: boolean;}
export interface Calculation {quantite: string; unite: string; jours: {date: string; quantite: string; exclusion?: string}[];}
export interface Simulation {calcul: Calculation; droits: {droitId: string; jour: string; quantite: string; origine: string; expiration?: string}[]; disponibleAvant: string; disponibleApres: string; circuit: RhCircuitDto; blocages: string[]; alertes: {date: string; message: string; bloquante: boolean}[];}
export interface LeaveInput {typeCode: string; debut: string; fin: string; portionDebut: string; portionFin: string; heureDebut?: string; heureFin?: string; motif?: string; remplaceDemandeId?: string; idBrouillon?: string;}
export interface Handover {id?: string; demandeId?: string; demandeur?:string; debut?:string; fin?:string; remplacantId?: string; remplacant?: string; tachesEtEcheances: string; contactsUtiles?: string; priseEnChargeLe?: string;}
export interface Leave extends LeaveInput {id: string; version: number; revision: number; agentId: string; agent: string; libelle: string; etat: string; situation: string; calcul?: Calculation; droits: Simulation['droits']; circuit?: RhCircuitDto; actions: string[]; pieces: {id: string; nomFichier: string}[]; passation?: Handover; historique: {date: string; action: string; auteurId: string; motif?: string}[]; repriseDemandee?: string; portionRepriseDemandee?: string; heureRepriseDemandee?: string; retourStatut?: string;}
export interface Unavailability {id: string; agentId: string; agent: string; departementId?: string; serviceId?: string; agenceId?: string; categorie: string; etat: string; debut: string; fin: string; souhait: boolean;}

@Injectable({providedIn: 'root'})
export class CongesService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/conges`;
  get<T>(path: string) {return this.http.get<T>(`${this.base}/${path}`);}
  post<T>(path: string, body: unknown, key?: string) {return this.http.post<T>(`${this.base}/${path}`, body, {headers: key ? {'Idempotency-Key': key} : {}});}
  put<T>(path: string, body: unknown) {return this.http.put<T>(`${this.base}/${path}`, body);}
  remove(path: string) {return this.http.delete<void>(`${this.base}/${path}`);}
  download(path: string) {return this.http.get(`${this.base}/${path}`, {responseType: 'blob'});}
  configuration() {return this.get<CongeConfiguration>('configuration');}
  key():string {return crypto.randomUUID();}
  operation(d: Leave, extra: Record<string, unknown> = {}) {return {version: d.version, cle: this.key(), etape: d.circuit?.etapeCourante, ...extra};}
  saveFile(blob: Blob, name: string) {const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);}
}
export const congesRhGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(CongesService).configuration().pipe(map(c => c.permissions.some(p => ['CONGES_POLITIQUES','CONGES_DROITS','CONGES_AUDITER','CONGES_ANNULER'].includes(p)) || router.createUrlTree(['/conges'])), catchError(() => of(router.createUrlTree(['/conges']))));
};
