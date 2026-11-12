import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ExtractionsService,extractionsGuard } from './extractions.service';
import { firstValueFrom,Observable } from 'rxjs';

describe('ExtractionsService',()=>{
  let api:ExtractionsService;let http:HttpTestingController;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});api=TestBed.inject(ExtractionsService);http=TestBed.inject(HttpTestingController);});
  afterEach(()=>http.verify());
  it('conserve les filtres et encode les identifiants',()=>{
    api.library({recherche:'opérations %',brouillons:false,archivees:false,page:2,size:20}).subscribe();const r=http.expectOne(r=>r.url==='/api/extractions/requetes');expect(r.request.params.get('recherche')).toBe('opérations %');expect(r.request.params.get('brouillons')).toBe('false');expect(r.request.params.has('plateformeId')).toBeFalse();r.flush({});
    api.query('q/a+b').subscribe();http.expectOne('/api/extractions/requetes/q%2Fa%2Bb').flush({});
  });
  it('transmet la version pour la prise en charge et le résultat',()=>{
    const d:any={fiche:{id:'d',version:7}};api.take(d,'q','Traitement').subscribe();const take=http.expectOne('/api/extractions/demandes/d/prendre');expect(take.request.body).toEqual({version:7,requeteId:'q',motif:'Traitement'});take.flush({});
    const input:any={version:7,resultat:'SUCCES',executeLe:'2026-10-11T12:00:00Z'};api.execute(d,input).subscribe();const execute=http.expectOne('/api/extractions/demandes/d/executions');expect(execute.request.method).toBe('POST');expect(execute.request.body).toEqual(input);execute.flush({});
  });
  it('redirige une route privée selon les capacités réellement retournées par le serveur',async()=>{
    const allowed=firstValueFrom(TestBed.runInInjectionContext(()=>extractionsGuard({} as any,{} as any)) as Observable<any>);http.expectOne('/api/extractions/configuration').flush({demander:false,bibliotheque:true});expect(await allowed).toBeTrue();
    const denied=firstValueFrom(TestBed.runInInjectionContext(()=>extractionsGuard({} as any,{} as any)) as Observable<any>);http.expectOne('/api/extractions/configuration').flush({demander:false,bibliotheque:false});expect((await denied).toString()).toContain('/annuaire/annuaire');
  });
  it('enregistre une requête validée sans code unique ni plateforme',()=>{
    const data={titre:'Requête',motCle:'Rapprochement',objectif:'Contrôle',dateValidation:'2026-10-10',departementId:'dep',serviceId:'service',schemaCible:'',sqlTexte:'SELECT 1 FROM dual',parametres:[],motif:''};api.saveQuery(data).subscribe();
    const r=http.expectOne('/api/extractions/requetes');expect(r.request.method).toBe('POST');expect(r.request.body).toEqual(data);expect(r.request.body.code).toBeUndefined();expect(r.request.body.plateformeId).toBeUndefined();r.flush({});
  });

  it('transmet le service sélectionné pour la demande d’extraction',()=>{
    const data={titre:'Extraction',objectif:'Contrôle',dateDemande:'2026-10-10',demandeurId:'agent',serviceId:'service',echeance:null,periodeDebut:null,periodeFin:null,criteres:''};api.create(data).subscribe();const r=http.expectOne('/api/extractions/demandes');expect(r.request.method).toBe('POST');expect(r.request.body).toEqual(data);r.flush({});
  });

});
