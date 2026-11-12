import { ComponentFixture,TestBed,fakeAsync,tick } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { of,Subject,throwError } from 'rxjs';
import { ExtractionsComponent } from './extractions.component';
import { ExtractionsService,ExtractionConfiguration,ExtractionDetail,OracleDetail } from '../../services/extractions.service';

describe('ExtractionsComponent',()=>{
  let api:jasmine.SpyObj<ExtractionsService>;
  const config:ExtractionConfiguration={demander:true,bibliotheque:true,gerer:true,moi:{id:'it',nom:'Auteur IT'},departement:{id:'it-dep',nom:'Informatique'},service:{id:'it-service',nom:'Exploitation'},demandeurs:[{id:'agent',nom:'Agent',departement:{id:'dep',nom:'Finance'},service:{id:'s1',nom:'Comptabilité'}}],departements:[{id:'dep',nom:'Finance'},{id:'empty',nom:'Sans agents'}],services:[{id:'s1',nom:'Comptabilité',departementId:'dep'},{id:'s2',nom:'Trésorerie',departementId:'dep'},{id:'it-service',nom:'Exploitation',departementId:'it-dep'}]};
  const q:OracleDetail={fiche:{id:'q',titre:'Requête',objectif:'But',dateValidation:'2026-10-10',auteur:'IT',departementDemandeur:{id:'dep',nom:'Finance'},serviceDemandeur:{id:'s1',nom:'Comptabilité'},edition:2,verifiee:true,archivee:false,version:8},schemaCible:'REPORTING',sqlTexte:'SELECT :jour FROM dual',parametres:[{nom:'jour',type:'DATE',description:'Date du contrôle'}],revisions:[{id:'r',edition:2,date:'2026-10-11T00:00:00Z',auteur:'IT',motif:'Recette',contenu:{departementNom:'Finance historique',serviceNom:'Comptabilité historique'} as any}],executions:[]};
  const d:ExtractionDetail={fiche:{id:'d',reference:'EXT-ABC',titre:'Extraction',etat:'NOUVELLE',dateDemande:'2026-10-11',demandeur:{id:'agent',nom:'Agent'},departement:{id:'dep',nom:'Finance'},service:{id:'s1',nom:'Comptabilité'},auteur:'Auteur IT',version:3,creeLe:'2026-10-11T00:00:00Z'},objectif:'Besoin précis',criteres:'Période',executions:[],historique:[],peutTraiter:true,peutAnnuler:true};
  beforeEach(async()=>{api=jasmine.createSpyObj('ExtractionsService',['configuration','requests','library','request','query','saveQuery','create','queryAction','take','test','execute','cancel']);api.configuration.and.returnValue(of(structuredClone(config)));api.requests.and.returnValue(of({content:[structuredClone(d.fiche)],totalElements:1,totalPages:1,number:0,size:20}));api.library.and.returnValue(of({content:[structuredClone(q.fiche)],totalElements:1,totalPages:1,number:0,size:20}));api.request.and.returnValue(of(structuredClone(d)));api.query.and.returnValue(of(structuredClone(q)));api.saveQuery.and.returnValue(of(structuredClone(q)));api.create.and.returnValue(of(structuredClone(d)));api.take.and.returnValue(of(structuredClone(d)));api.execute.and.returnValue(of(structuredClone(d)));api.queryAction.and.returnValue(of(structuredClone(q)));api.test.and.returnValue(of(structuredClone(q)));api.cancel.and.returnValue(of(structuredClone(d)));await TestBed.configureTestingModule({imports:[ExtractionsComponent],providers:[{provide:ExtractionsService,useValue:api}]}).compileComponents();});
  function fixture(){const f=TestBed.createComponent(ExtractionsComponent);f.detectChanges();return f;}
  const form=()=>({invalid:false} as NgForm);
  it('recherche par mot clé avec les filtres courants et la pagination',fakeAsync(()=>{
    const f=fixture();tick();const c=f.componentInstance;const input=f.nativeElement.querySelector('[name="search"]');
    expect(input.placeholder).toContain('mot clé');input.value='Rapprochement';input.dispatchEvent(new Event('input'));tick();
    c.queryDepartmentId='dep';f.nativeElement.querySelector('form.filters').dispatchEvent(new Event('submit'));tick();
    expect(api.library).toHaveBeenCalledWith({recherche:'Rapprochement',departementId:'dep',brouillons:false,archivees:false,page:0,size:20});
    c.reload(1);expect(api.library).toHaveBeenCalledWith(jasmine.objectContaining({recherche:'Rapprochement',departementId:'dep',page:1}));
  }));
  it('saisit le mot clé et le transmet au service lors de l’enregistrement',fakeAsync(()=>{
    const f=fixture();const c=f.componentInstance;c.newQuery();f.detectChanges();tick();
    const keyword=f.nativeElement.querySelector('[name="queryKeyword"]');expect(keyword.maxLength).toBe(200);expect(keyword.required).toBeFalse();
    keyword.value='Rapprochement';keyword.dispatchEvent(new Event('input'));tick();
    c.queryDraft!.titre='Requête';c.queryDraft!.objectif='But';c.queryDraft!.departementId='dep';c.queryDraft!.sqlTexte='SELECT 1 FROM dual';c.save(form());
    expect(api.saveQuery).toHaveBeenCalledWith(jasmine.objectContaining({motCle:'Rapprochement'}),undefined);
  }));
  it('affiche le mot clé et le conserve pour une nouvelle édition ou une duplication',()=>{
    api.query.and.returnValue(of({...q,fiche:{...q.fiche,motCle:'Rapprochement'},revisions:[{...q.revisions[0],contenu:{...q.revisions[0].contenu,motCle:'Ancien mot clé'}}]}));
    api.library.and.returnValue(of({content:[{...q.fiche,motCle:'Rapprochement'}],totalElements:1,totalPages:1,number:0,size:20}));
    const f=fixture();const c=f.componentInstance;expect(f.nativeElement.querySelector('.query-card').textContent).toContain('Mot clé : Rapprochement');
    c.openQuery('q');f.detectChanges();expect(f.nativeElement.querySelector('dialog').textContent).toContain('Rapprochement');expect(f.nativeElement.querySelector('dialog').textContent).toContain('Ancien mot clé');
    c.editQuery();expect(c.queryDraft!.motCle).toBe('Rapprochement');c.cancelEdit();c.editQuery(true);expect(c.queryDraft!.motCle).toBe('Rapprochement');
    c.close();api.query.and.returnValue(of(structuredClone(q)));c.openQuery('q');c.editQuery();expect(c.queryDraft!.motCle).toBe('');
  });
  it('affiche le département réel du demandeur choisi et annule sans écriture',()=>{
    const f=fixture();const c=f.componentInstance;c.newRequest();expect(c.requestDraft!.demandeurId).toBe('');c.requestDraft!.demandeurId='agent';expect(c.draftDepartment).toBe('Finance');f.detectChanges();expect(f.nativeElement.textContent).toContain('Finance');c.close();expect(api.create).not.toHaveBeenCalled();expect(c.requestDraft).toBeUndefined();
  });
  it('limite un demandeur à ses demandes et masque la bibliothèque SQL',()=>{
    api.configuration.and.returnValue(of({...config,gerer:false,bibliotheque:false,demandeurs:[]}));const f=fixture();expect(f.nativeElement.textContent).toContain('Mes demandes');expect(f.nativeElement.querySelector('.space-tabs')?.textContent).not.toContain('Requêtes validées');expect(f.nativeElement.querySelector('[name="departmentId"]')).toBeNull();f.componentInstance.newQuery();expect(f.componentInstance.queryDraft).toBeUndefined();
  });
  it('ouvre directement la bibliothèque pour un lecteur sans permission de demander',()=>{
    api.configuration.and.returnValue(of({...config,demander:false,gerer:false,demandeurs:[]}));const f=fixture();expect(f.componentInstance.tab).toBe('bibliotheque');expect(api.requests).not.toHaveBeenCalled();expect(f.nativeElement.querySelector('[name="drafts"]')).toBeNull();expect(f.nativeElement.textContent).not.toContain('Enregistrer une requête');
  });
  it('préserve le SQL original et la saisie sur un conflit de nouvelle édition',()=>{
    const f=fixture();const c=f.componentInstance;c.openQuery('q');c.editQuery();c.queryDraft!.sqlTexte='SELECT 3 FROM dual';expect(c.queryDetail!.sqlTexte).toBe(q.sqlTexte);api.saveQuery.and.returnValue(throwError(()=>({status:409,error:{message:'La fiche a changé'}})));c.save(form());expect(c.queryDraft!.sqlTexte).toBe('SELECT 3 FROM dual');expect(c.queryDraft!.version).toBe(8);expect(c.busy).toBeFalse();c.cancelEdit();expect(c.queryDraft).toBeUndefined();expect(c.queryDetail!.sqlTexte).toBe(q.sqlTexte);
  });
  it('duplique une requête validée sans reprendre la version technique',()=>{
    const f=fixture();const c=f.componentInstance;c.openQuery('q');c.editQuery(true);expect(c.queryDraft!.version).toBeUndefined();expect(c.queryDraft!.dateValidation).toBe('2026-10-10');expect('code' in c.queryDraft!).toBeFalse();expect('plateformeId' in c.queryDraft!).toBeFalse();expect(c.queryDetail).toBeUndefined();expect(c.queryDraft!.parametres).toEqual(q.parametres);c.queryDraft!.parametres[0].description='Autre';expect(q.parametres[0].description).toBe('Date du contrôle');
  });
  it('charge uniquement les éditions vérifiées pour la prise en charge',()=>{
    const f=fixture();const c=f.componentInstance;c.openRequest('d');c.begin('prendre');expect(api.library).toHaveBeenCalledWith(jasmine.objectContaining({brouillons:false,archivees:false,size:100}));c.selectedQuery='q';c.motif='Traitement autorisé';c.submitAction(form());expect(api.take).toHaveBeenCalledWith(jasmine.objectContaining({fiche:jasmine.objectContaining({version:3})}),'q','Traitement autorisé');
  });
  it('empêche un double enregistrement et conserve la version des exécutions',()=>{
    const f=fixture();const c=f.componentInstance;c.openRequest('d');c.begin('executer');c.essai.executeLe='2026-10-11T00:00:00';c.essai.referenceVerification='TICKET';const wait=new Subject<ExtractionDetail>();api.execute.and.returnValue(wait);c.submitAction(form());c.submitAction(form());expect(api.execute).toHaveBeenCalledTimes(1);expect(api.execute.calls.mostRecent().args[1].version).toBe(3);expect(api.execute.calls.mostRecent().args[1].referenceVerification).toBe('TICKET');expect(c.busy).toBeTrue();wait.next({...d,fiche:{...d.fiche,etat:'TERMINEE',version:4}});expect(c.action).toBe('');expect(c.requestDetail!.fiche.etat).toBe('TERMINEE');
  });
  it('rend le SQL comme texte et utilise une édition figée pour le téléchargement',fakeAsync(()=>{
    const f=fixture();const c=f.componentInstance;api.query.and.returnValue(of({...q,sqlTexte:'SELECT \'<script>alert(1)</script>\' FROM dual'}));c.openQuery('q');f.detectChanges();expect(f.nativeElement.querySelector('pre').textContent).toContain('<script>');expect(f.nativeElement.querySelector('script')).toBeNull();const create=spyOn(URL,'createObjectURL').and.returnValue('blob:sql');const revoke=spyOn(URL,'revokeObjectURL');const click=spyOn(HTMLAnchorElement.prototype,'click');c.downloadSql('SELECT 1 FROM dual','EXT-TEST',1);expect(create).toHaveBeenCalled();expect(click).toHaveBeenCalled();tick(1000);expect(revoke).toHaveBeenCalledWith('blob:sql');
  }));
  it('efface les contenus et ferme la fiche lors d’un refus du serveur',()=>{
    const f=fixture();const c=f.componentInstance;c.openQuery('q');c.editQuery();api.saveQuery.and.returnValue(throwError(()=>({status:403})));c.save(form());expect(c.config).toBeUndefined();expect(c.queryPage).toBeUndefined();expect(c.requestPage).toBeUndefined();expect(c.queryDetail).toBeUndefined();expect(c.dialog.nativeElement.open).toBeFalse();
  });
  it('propose une saisie directe de requête validée avec cinq champs principaux et sans essai',fakeAsync(()=>{
    const f=fixture();const c=f.componentInstance;expect(c.tab).toBe('bibliotheque');c.newQuery();f.detectChanges();tick();f.detectChanges();
    expect(f.nativeElement.querySelector('[name="queryCode"]')).toBeNull();expect(f.nativeElement.querySelector('[name="queryPlatform"]')).toBeNull();expect(f.nativeElement.querySelector('[name="platformId"]')).toBeNull();
    const fields=f.nativeElement.querySelectorAll('.form-grid [required]');expect(fields.length).toBe(5);
    const info=f.nativeElement.querySelector('details');expect(info.open).toBeFalse();expect(f.nativeElement.querySelector('[name="queryReason"]').required).toBeFalse();
    const submit=f.nativeElement.querySelector('.dialog-actions .btn--primary');submit.click();tick();expect(api.saveQuery).not.toHaveBeenCalled();
    const set=(name:string,value:string)=>{const input=f.nativeElement.querySelector('[name="'+name+'"]');input.value=value;input.dispatchEvent(new Event('input'));input.dispatchEvent(new Event('change'));};
    set('queryTitle','Opérations par jour');set('queryGoal','Extraire les opérations pour le contrôle');set('queryValidationDate',c.localDate());set('queryDepartment','dep');set('sqlText','SELECT :jour FROM dual');f.detectChanges();tick();submit.click();tick();
    expect(api.saveQuery).toHaveBeenCalledTimes(1);expect(api.saveQuery.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({titre:'Opérations par jour',dateValidation:c.localDate(),departementId:'dep',sqlTexte:'SELECT :jour FROM dual',parametres:[],motif:''}));
    expect(api.test).not.toHaveBeenCalled();expect(api.queryAction).not.toHaveBeenCalled();
  }));
  it('ne propose pas de date inventée lors de la modification d’une ancienne requête',()=>{
    api.query.and.returnValue(of({...q,fiche:{...q.fiche,dateValidation:null}}));const f=fixture();const c=f.componentInstance;c.openQuery('q');c.editQuery();expect(c.queryDraft!.dateValidation).toBe('');
  });
  it('ne présente plus les actions d’essai ou de vérification dans le détail',()=>{
    const f=fixture();f.componentInstance.openQuery('q');f.detectChanges();const text=f.nativeElement.querySelector('dialog').textContent;expect(text).toContain('10/10/2026');expect(text).not.toContain('Déclarer un essai');expect(text).not.toContain('Vérifier pour réutilisation');expect(text).not.toContain('Code unique');expect(text).not.toContain('Plateforme source');
  });

  it('filtre les services par département et retire la sélection lors du changement',fakeAsync(()=>{
    const f=fixture();const c=f.componentInstance;c.newQuery();f.detectChanges();tick();
    const department=f.nativeElement.querySelector('[name="queryDepartment"]');department.value='dep';department.dispatchEvent(new Event('change'));f.detectChanges();tick();
    const service=f.nativeElement.querySelector('[name="queryService"]');expect([...service.options].map((o:any)=>o.value)).toEqual(['','s1','s2']);service.value='s2';service.dispatchEvent(new Event('change'));tick();expect(c.queryDraft!.serviceId).toBe('s2');
    department.value='empty';department.dispatchEvent(new Event('change'));f.detectChanges();tick();expect(c.queryDraft!.serviceId).toBe('');expect(c.queryServices).toEqual([]);expect(service.required).toBeFalse();expect(f.nativeElement.textContent).toContain('L’enregistrement sans service reste possible');
  }));

  it('propose le service du demandeur puis réinitialise le service quand il change',fakeAsync(()=>{
    const f=fixture();const c=f.componentInstance;c.newRequest();f.detectChanges();tick();expect(c.draftDepartmentId).toBe('');expect(f.nativeElement.querySelector('[name="requestService"]').disabled).toBeTrue();
    const requester=f.nativeElement.querySelector('[name="requester"]');requester.value='agent';requester.dispatchEvent(new Event('change'));f.detectChanges();tick();expect(c.requestDraft!.serviceId).toBe('s1');expect(c.requestServices.map(s=>s.id)).toEqual(['s1','s2']);
    c.requestDraft!.serviceId='s2';requester.value='';requester.dispatchEvent(new Event('change'));f.detectChanges();tick();expect(c.requestDraft!.serviceId).toBe('');expect(c.draftDepartmentId).toBe('');expect(c.draftDepartment).toBe('Choisissez un demandeur');
  }));

  it('préremplit le service de son propre compte et permet une demande pour tout le département',()=>{
    api.configuration.and.returnValue(of({...config,gerer:false,bibliotheque:false,demandeurs:[]}));const f=fixture();const c=f.componentInstance;c.newRequest();expect(c.requestDraft!.serviceId).toBe('it-service');expect(c.requestServices.map(s=>s.id)).toEqual(['it-service']);c.requestDraft!.serviceId='';c.save(form());expect(api.create).toHaveBeenCalledWith(jasmine.objectContaining({demandeurId:'it',serviceId:''}));
  });

  it('refuse un service hors département et préserve la saisie lors du refus du serveur',()=>{
    const f=fixture();const c=f.componentInstance;c.openQuery('q');c.editQuery();expect(c.queryDraft!.serviceId).toBe('s1');c.queryDraft!.serviceId='it-service';c.save(form());expect(api.saveQuery).not.toHaveBeenCalled();expect(c.dialogError).toContain('département demandeur');
    c.queryDraft!.serviceId='s2';api.saveQuery.and.returnValue(throwError(()=>({status:400,error:{message:'Service désactivé depuis l’ouverture'}})));c.save(form());expect(c.queryDraft!.serviceId).toBe('s2');expect(c.queryDraft!.sqlTexte).toBe(q.sqlTexte);expect(c.dialogError).toContain('Service désactivé');
  });

  it('affiche les noms historiques et laisse le service des anciennes fiches inconnu',()=>{
    const f=fixture();const c=f.componentInstance;c.openQuery('q');f.detectChanges();expect(f.nativeElement.querySelector('dialog').textContent).toContain('Comptabilité historique');expect(f.nativeElement.querySelector('.query-card').textContent).toContain('Comptabilité');
    api.query.and.returnValue(of({...q,fiche:{...q.fiche,serviceDemandeur:null}}));c.openQuery('q');f.detectChanges();expect(f.nativeElement.querySelector('dialog').textContent).toContain('Service demandeur');expect(f.nativeElement.querySelector('dialog').textContent).toContain('Non renseigné');c.editQuery(true);expect(c.queryDraft!.serviceId).toBe('');
    api.query.and.returnValue(of({...q,fiche:{...q.fiche,serviceDemandeur:{id:'retired',nom:'Ancien service'}}}));c.close();c.openQuery('q');c.editQuery();f.detectChanges();expect(c.queryServiceUnavailable).toBeTrue();c.save(form());expect(api.saveQuery).not.toHaveBeenCalled();
  });

});
