import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface PlateformeReference { id: string; nom: string; actif: boolean; }
export interface PlateformeConfiguration { consulter: boolean; gerer: boolean; habilitations: boolean; departements: PlateformeReference[]; responsables: PlateformeReference[]; circuits: PlateformeReference[]; }
export interface PlateformeEnvironnement { type: string; nom: string; url: string; description: string; }
export interface PlateformeLien { titre: string; url: string; }
export interface PlateformeManuel {id: string; titre: string; description: string; nomFichier: string; contentType: string; taille: number; sha256: string; ajouteLe: string; auteur: string;}
export interface ManuelSelection {file: File; titre: string; description: string;}
export interface ModificationsManuels {ajouts: ManuelSelection[]; retraits: string[];}
export interface PlateformeFiche {
  [key: string]: unknown;
  categorie: string; cycleVie: string; criticite: string; hebergement: string;
  environnements: PlateformeEnvironnement[]; liens: PlateformeLien[];
}
export interface PlateformeLigne {
  id: string; code: string; nom: string; description: string; typePlateforme: 'RESEAUX' | 'CORE_BANKING';
  categorie: string; cycleVie: string; criticite: string; departement?: PlateformeReference; responsableTechnique?: PlateformeReference;
  archivee: boolean; version: number; dateProchaineRevue?: string; dateFinSupport?: string; modifieLe?: string;
}
export interface PlateformeDetail extends Omit<PlateformeLigne, 'categorie' | 'cycleVie' | 'criticite' | 'dateProchaineRevue' | 'dateFinSupport'> {
  fiche: PlateformeFiche; responsableMetier?: PlateformeReference; circuit?: PlateformeReference;
  dependances: PlateformeReference[]; utiliseePar: PlateformeReference[];
  manuels: PlateformeManuel[];
}
export interface PlateformeEcriture {
  code: string; nom: string; description: string; typePlateforme: 'RESEAUX' | 'CORE_BANKING'; idCircuit: string;
  departementId: string; responsableMetierId: string; responsableTechniqueId: string;
  fiche: PlateformeFiche; dependanceIds: string[]; version?: number; motif: string;
}
export interface PlateformePage {content: PlateformeLigne[]; totalElements: number; totalPages: number; number: number; size: number;}
export interface PlateformeRevision {numero: number; date: string; auteur: string; action: string; motif: string; snapshot: PlateformeDetail;}
export interface PlateformeFiltre {recherche: string; categorie: string; cycleVie: string; criticite: string; departementId: string; archivees: boolean; page: number; size: number;}

@Injectable({providedIn: 'root'})
export class PlateformesService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/plateformes`;
  configuration() {return this.http.get<PlateformeConfiguration>(`${this.base}/configuration`);}
  list(filter: PlateformeFiltre) {
    let params = new HttpParams();Object.entries(filter).forEach(([key,value]) => {if(value !== '') params = params.set(key,String(value));});
    return this.http.get<PlateformePage>(this.base,{params});
  }
  detail(id: string) {return this.http.get<PlateformeDetail>(`${this.base}/${encodeURIComponent(id)}`);}
  history(id: string,page = 0) {return this.http.get<PlateformeRevision[]>(`${this.base}/${encodeURIComponent(id)}/historique`,{params:{page}});}
  save(input: PlateformeEcriture,id?: string,manuels?: ModificationsManuels) {
    let body: PlateformeEcriture | FormData = input;
    if(manuels && (manuels.ajouts.length || manuels.retraits.length)) {
      body = new FormData();body.append('fiche',new Blob([JSON.stringify(input)],{type:'application/json'}));
      body.append('manuels',new Blob([JSON.stringify({ajouts:manuels.ajouts.map(m=>({titre:m.titre.trim(),description:m.description.trim()})),retraits:manuels.retraits})],{type:'application/json'}));
      manuels.ajouts.forEach(m=>body instanceof FormData && body.append('fichiers',m.file,m.file.name));
    }
    return id ? this.http.put<PlateformeDetail>(`${this.base}/${encodeURIComponent(id)}`,body) : this.http.post<PlateformeDetail>(this.base,body);
  }
  downloadManuel(plateformeId: string,manuelId: string) {return this.http.get(`${this.base}/${encodeURIComponent(plateformeId)}/manuels/${encodeURIComponent(manuelId)}`,{responseType:'blob'});}
  archive(detail: PlateformeDetail,motif: string,restore = false) {
    return this.http.post<PlateformeDetail>(`${this.base}/${encodeURIComponent(detail.id)}/${restore?'restaurer':'archiver'}`,{version:detail.version,motif});
  }
}
export const plateformesGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(PlateformesService).configuration().pipe(map(c => c.consulter || router.createUrlTree(['/annuaire/annuaire'])),
    catchError(e => of(router.createUrlTree([e.status === 401 ? '/login' : '/annuaire/annuaire']))));
};
