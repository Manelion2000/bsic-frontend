import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_BASE_URL } from './api.config';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { RhCircuitDto } from './rh-demandes.service';
export interface Choice {
    id: string;
    nom: string;
}
export interface Step {
    libelle: string;
    selection: string;
    fonction: string | null;
    departementId: string | null;
    serviceId: string | null;
    agenceId: string | null;
    departementDemandeur: boolean;
    utilisateurs: string[];
    fonctionsDemandeur: string[];
    delaiJours: number | null;
}
export interface Definition {
    mode: 'LIBRE' | 'HIERARCHIQUE';
    politiqueRefus: string;
    dgObligatoire: boolean | null;
    etapes: Step[];
}
export interface Publication {
    id: string;
    numero: number;
    libelle: string;
    date: string;
    definition: Definition;
    version?: number;
    description?: string;
    supprimable?: boolean;
    blocageSuppression?: string | null;
}
export interface Model {
    id?: string;
    libelle: string;
    description: string;
    version?: number;
    definition: Definition;
    publications: Publication[];
    code?: string;
    supprimable?: boolean;
    blocageSuppression?: string | null;
    dejaPublie?: boolean;
}
export interface CircuitDeletionTarget {
    type: 'CIRCUIT' | 'PUBLICATION';
    id: string;
    version: number;
}
export interface CircuitDeletionResult {
    circuitsSupprimes: number;
    publicationsSupprimees: number;
}
export interface Field {
    cle: string;
    libelle: string;
    type: string;
    obligatoire: boolean;
    choix: string[];
}
export interface Procedure {
    id?: string;
    code: string;
    libelle: string;
    description: string;
    domaine: string;
    publicationId: string;
    actif: boolean;
    champs: Field[];
    version?: number;
    circuit?: string;
    numero?: number;
    route?: string;
}
export interface Dossier {
    id: string;
    version: number;
    titre: string;
    etat: string;
    demarcheId: string;
    demarche: string;
    demandeur: string;
    numero: number;
    createdDate: string;
    valeurs: Record<string, string>;
    champs: Field[];
    circuit?: RhCircuitDto;
    actions: string[];
    pieces: {
        id: string;
        nom: string;
        mime: string;
    }[];
}
export interface ProcessConfig {
    gerer: boolean;
    demander: boolean;
    valider: boolean;
    auditer: boolean;
    agentId: string;
    fonctions: string[];
    agents?: Choice[];
    departements?: Choice[];
    services?: Choice[];
    agences?: Choice[];
}
@Injectable({ providedIn: 'root' })
export class ProcessusService {
    private http = inject(HttpClient);
    private base = API_BASE_URL + '/processus';
    get<T>(path: string) { return this.http.get<T>(this.base + '/' + path); }
    post<T>(path: string, data: unknown, key?: string) { return this.http.post<T>(this.base + '/' + path, data, { headers: key ? new HttpHeaders({ 'Idempotency-Key': key }) : undefined }); }
    put<T>(path: string, data: unknown) { return this.http.put<T>(this.base + '/' + path, data); }
    delete<T>(path: string) { return this.http.delete<T>(this.base + '/' + path); }
    key(): string { return crypto.randomUUID(); }
    file(id: string) { return this.http.get(this.base + '/pieces/' + id, { responseType: 'blob' }); }
    document(id: string) { return this.http.get(this.base + '/dossiers/' + id + '/document', { responseType: 'blob' }); }
}
export const processusManagerGuard: CanActivateFn = () => { const router = inject(Router); return inject(ProcessusService).get<ProcessConfig>('configuration').pipe(map(c => c.gerer || router.createUrlTree(['/demarches'])), catchError(() => of(router.createUrlTree(['/login'])))); };
