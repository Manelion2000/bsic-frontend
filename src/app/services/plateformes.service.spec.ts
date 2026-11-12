import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { PlateformesService, plateformesGuard } from './plateformes.service';

describe('API du catalogue informatique',()=>{
  let http: HttpTestingController;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});http = TestBed.inject(HttpTestingController);});
  afterEach(()=>http.verify());
  it('transmet les filtres et conserve la recherche littérale',()=>{
    TestBed.inject(PlateformesService).list({recherche:'Nom + exemple',categorie:'',cycleVie:'EN_SERVICE',criticite:'CRITIQUE',departementId:'d',archivees:true,page:2,size:20}).subscribe();
    const r = http.expectOne(r=>r.url==='/api/plateformes');expect(r.request.params.get('categorie')).toBeNull();expect(r.request.params.get('archivees')).toBe('true');expect(r.request.params.get('recherche')).toBe('Nom + exemple');r.flush({content:[]});
  });
  it('envoie la version actuelle pour les mises à jour et les archivages',()=>{
    const api = TestBed.inject(PlateformesService);api.save({version:7,motif:'Correction'} as any,'id/a').subscribe();
    const edit = http.expectOne('/api/plateformes/id%2Fa');expect(edit.request.method).toBe('PUT');expect(edit.request.body.version).toBe(7);edit.flush({});
    api.archive({id:'id/a',version:8} as any,'Reprise',true).subscribe();const r = http.expectOne('/api/plateformes/id%2Fa/restaurer');expect(r.request.body).toEqual({version:8,motif:'Reprise'});r.flush({});
  });
  function guard(){let value: any;(TestBed.runInInjectionContext(()=>plateformesGuard({} as ActivatedRouteSnapshot,{} as RouterStateSnapshot)) as Observable<any>).subscribe(v=>value=v);return ()=>value;}
  it('autorise l’entrée seulement lorsque le serveur autorise la consultation',()=>{
    const allowed = guard();http.expectOne('/api/plateformes/configuration').flush({consulter:true});expect(allowed()).toBeTrue();
    const denied = guard();http.expectOne('/api/plateformes/configuration').flush({consulter:false});expect(TestBed.inject(Router).serializeUrl(denied())).toBe('/annuaire/annuaire');
  });
  it('renvoie vers la connexion quand la session expire',()=>{
    const expired = guard();http.expectOne('/api/plateformes/configuration').flush({}, {status:401,statusText:'Unauthorized'});expect(TestBed.inject(Router).serializeUrl(expired())).toBe('/login');
  });
  it('enregistre fiche, métadonnées et fichiers dans une seule requête multipart',async()=>{
    const file = new File(['%PDF-1.7\n%%EOF'],'guide.pdf',{type:'application/pdf'});
    TestBed.inject(PlateformesService).save({code:'P',version:8} as any,'p',{ajouts:[{file,titre:' Guide utilisateur ',description:' Français '}],retraits:['old']}).subscribe();
    const r = http.expectOne('/api/plateformes/p');expect(r.request.method).toBe('PUT');expect(r.request.headers.has('Content-Type')).toBeFalse();
    const data = r.request.body as FormData;expect(data.getAll('fichiers').length).toBe(1);expect((data.get('fichiers') as File).name).toBe('guide.pdf');
    const metadata = JSON.parse(await (data.get('manuels') as Blob).text());expect(metadata).toEqual({ajouts:[{titre:'Guide utilisateur',description:'Français'}],retraits:['old']});
    expect(JSON.parse(await (data.get('fiche') as Blob).text()).version).toBe(8);r.flush({});
  });
  it('permet un retrait sans ajouter de fichier et conserve le JSON pour une édition ordinaire',()=>{
    const api = TestBed.inject(PlateformesService);api.save({version:8} as any,'p',{ajouts:[],retraits:['old']}).subscribe();let r = http.expectOne('/api/plateformes/p');expect(r.request.body instanceof FormData).toBeTrue();expect(r.request.body.getAll('fichiers').length).toBe(0);r.flush({});
    api.save({version:9} as any,'p',{ajouts:[],retraits:[]}).subscribe();r = http.expectOne('/api/plateformes/p');expect(r.request.body).toEqual({version:9});r.flush({});
  });
  it('télécharge le manuel par l’API protégée en encodant les identifiants',()=>{
    TestBed.inject(PlateformesService).downloadManuel('p/a','m+b').subscribe();const r = http.expectOne('/api/plateformes/p%2Fa/manuels/m%2Bb');expect(r.request.responseType).toBe('blob');r.flush(new Blob(['pdf'],{type:'application/pdf'}));
  });
});
