import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { NgForm } from '@angular/forms';
import { PlateformesCatalogueComponent } from './plateformes-catalogue.component';
import { PlateformesService, PlateformeConfiguration, PlateformeDetail, PlateformePage } from '../../services/plateformes.service';

describe('Catalogue des plateformes',()=>{
  let api: jasmine.SpyObj<PlateformesService>;let router: jasmine.SpyObj<Router>;
  const config: PlateformeConfiguration = {consulter:true,gerer:true,habilitations:false,departements:[{id:'d',nom:'Informatique',actif:true}],responsables:[{id:'u',nom:'Référent',actif:true}],circuits:[]};
  const detail: PlateformeDetail = {id:'p',code:'PLT-CORE',nom:'Core Banking',description:'Gestion des comptes',typePlateforme:'CORE_BANKING',archivee:false,version:8,manuels:[],
    departement:config.departements[0],responsableTechnique:config.responsables[0],dependances:[{id:'network',nom:'Réseau',actif:true}],utiliseePar:[{id:'report',nom:'Reporting',actif:true}],
    fiche:{categorie:'APPLICATION',cycleVie:'EN_SERVICE',criticite:'CRITIQUE',hebergement:'INTERNE',fonctionnalites:'Opérations bancaires',rtoMinutes:60,
      environnements:[{type:'PRODUCTION',nom:'Production',url:'https://core.example.test',description:'Usage des agents'}],liens:[{titre:'Guide',url:'https://docs.example.test/core'}]}};
  const page: PlateformePage = {content:[{...detail,categorie:'APPLICATION',cycleVie:'EN_SERVICE',criticite:'CRITIQUE'}],totalElements:1,totalPages:1,number:0,size:20};
  beforeEach(async()=>{
    api = jasmine.createSpyObj('PlateformesService',['configuration','list','detail','save','history','archive','downloadManuel']);api.configuration.and.returnValue(of(config));api.list.and.returnValue(of(page));api.detail.and.returnValue(of(structuredClone(detail)));api.save.and.returnValue(of(structuredClone(detail)));api.history.and.returnValue(of([]));api.archive.and.returnValue(of({...detail,archivee:true,version:9}));api.downloadManuel.and.returnValue(of(new Blob(['PDF'],{type:'application/pdf'})));
    router = jasmine.createSpyObj('Router',['navigate']);router.navigate.and.returnValue(Promise.resolve(true));
    await TestBed.configureTestingModule({imports:[PlateformesCatalogueComponent],providers:[{provide:PlateformesService,useValue:api},{provide:Router,useValue:router},
      {provide:ActivatedRoute,useValue:{paramMap:new BehaviorSubject(convertToParamMap({}))}}]}).compileComponents();
  });
  function fixture(){const f = TestBed.createComponent(PlateformesCatalogueComponent);f.detectChanges();return f;}
  it('affiche les responsables et les filtres sans dépendre des habilitations',()=>{
    const f = fixture();expect(f.nativeElement.textContent).toContain('Core Banking');expect(f.nativeElement.textContent).toContain('Référent');expect(f.nativeElement.querySelector('.platform-card').tagName).toBe('BUTTON');
    f.componentInstance.filter.criticite = 'CRITIQUE';f.componentInstance.filter.archivees = true;f.componentInstance.reload(1);expect(api.list.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({criticite:'CRITIQUE',archivees:true,page:1}));
  });
  it('ouvre une fiche en lecture seule et permet de parcourir les dépendances',()=>{
    api.configuration.and.returnValue(of({...config,gerer:false}));const f = fixture();const c = f.componentInstance;c.open('p');f.detectChanges();
    expect(f.nativeElement.querySelector('dialog').open).toBeTrue();expect(f.nativeElement.querySelector('.dialog-footer').textContent).not.toContain('Modifier');c.setTab('architecture');f.detectChanges();
    expect(f.nativeElement.querySelector('.dependency-map').textContent).toContain('Réseau');(f.nativeElement.querySelector('.dependency-map button') as HTMLButtonElement).click();expect(router.navigate).toHaveBeenCalledWith(['/informatique/plateformes','network']);
    c.edit();expect(c.editing).toBeFalse();
  });
  it('édite une copie indépendante et abandonne les changements à l’annulation',()=>{
    const f = fixture();const c = f.componentInstance;c.open('p');c.edit();c.draft!.fiche.environnements[0].nom = 'Copie modifiée';c.draft!.dependanceIds = [];
    expect(c.detail!.fiche.environnements[0].nom).toBe('Production');expect(c.detail!.dependances.length).toBe(1);c.cancelEdit();expect(c.draft).toBeUndefined();expect(c.editing).toBeFalse();expect(api.save).not.toHaveBeenCalled();
  });
  it('préserve les modifications en cas de conflit et empêche le double enregistrement',()=>{
    const f = fixture();const c = f.componentInstance;c.open('p');c.edit();c.draft!.motif = 'Mise à jour';const pending = new Subject<PlateformeDetail>();api.save.and.returnValue(pending);
    const form = {invalid:false} as NgForm;c.save(form);c.save(form);expect(api.save).toHaveBeenCalledTimes(1);expect(api.save.calls.mostRecent().args[0].version).toBe(8);c.close();expect(c.dialog.nativeElement.open).toBeTrue();
    pending.error({status:409,error:{message:'La fiche a été modifiée. Rechargez-la.'}});expect(c.editing).toBeTrue();expect(c.draft!.motif).toBe('Mise à jour');expect(c.dialogError).toContain('Rechargez');
  });
  it('charge aussi les pages suivantes pour proposer toutes les dépendances',()=>{
    const f = fixture();const c = f.componentInstance;c.open('p');api.list.and.callFake(filter=>of({...page,size:100,totalElements:101,totalPages:2,number:filter.page,
      content:filter.page===0?page.content:[{...page.content[0],id:'last',nom:'Dernière plateforme'}]}));c.edit();
    expect(c.dependencies.map(p=>p.id)).toEqual(['last']);expect(api.list.calls.mostRecent().args[0].page).toBe(1);
  });
  it('ajoute environnements et documents avec des limites définies',async()=>{
    const f = fixture();const c = f.componentInstance;c.create();c.addEnvironment();c.addLink();f.detectChanges();await f.whenStable();
    expect(c.draft!.fiche.environnements.length).toBe(1);expect(c.draft!.fiche.liens.length).toBe(1);expect(c.draft!.fiche.criticite).toBe('A_QUALIFIER');
    for(let i=0;i<30;i++){c.addEnvironment();c.addLink();}expect(c.draft!.fiche.environnements.length).toBe(12);expect(c.draft!.fiche.liens.length).toBe(20);
  });
  it('conserve une fiche liée à un circuit lorsque les habilitations sont désactivées',async()=>{
    api.detail.and.returnValue(of({...detail,circuit:{id:'c',nom:'Circuit existant',actif:true}}));const f = fixture();const c = f.componentInstance;c.open('p');c.edit();f.detectChanges();
    await f.whenStable();expect(c.draft!.idCircuit).toBe('c');expect(f.nativeElement.querySelector('select[name="idCircuit"]').disabled).toBeTrue();expect(c.circuitOptions()[0].id).toBe('c');
  });
  it('exige un motif et conserve le blocage métier lors d’un archivage',()=>{
    const f = fixture();const c = f.componentInstance;c.open('p');c.archiveAction = true;c.changeArchive();expect(api.archive).not.toHaveBeenCalled();c.archiveMotif = 'Retrait du service';
    api.archive.and.returnValue(throwError(()=>({status:409,error:{message:'Une plateforme active dépend de cette plateforme.'}})));c.changeArchive();expect(api.archive).toHaveBeenCalledWith(jasmine.objectContaining({version:8}),'Retrait du service',false);expect(c.archiveAction).toBeTrue();expect(c.dialogError).toContain('dépend');
  });
  it('affiche l’auteur et la copie de la fiche dans l’historique',()=>{
    api.history.and.returnValue(of([{numero:8,date:'2026-10-11T10:00:00Z',auteur:'Référent',action:'MODIFICATION',motif:'Revue annuelle',snapshot:detail}]));const f = fixture();const c = f.componentInstance;c.open('p');c.setTab('historique');f.detectChanges();expect(f.nativeElement.querySelector('.revision').textContent).toContain('Revue annuelle');expect(f.nativeElement.querySelector('.revision').textContent).toContain('Opérations bancaires');
  });
  it('efface les fiches et ferme la fenêtre lors d’une révocation',()=>{
    const f = fixture();const c = f.componentInstance;c.open('p');api.configuration.and.returnValue(of({...config,consulter:false,gerer:false}));c.reload();expect(c.data).toBeUndefined();expect(c.detail).toBeUndefined();expect(c.dialog.nativeElement.open).toBeFalse();
  });
  it('annule une ancienne recherche pour ne pas remplacer les résultats récents',()=>{
    const f = fixture();const c = f.componentInstance;const old = new Subject<PlateformePage>();api.list.and.returnValue(old);c.reload();api.list.and.returnValue(of({...page,content:[]}));c.reload();old.next(page);expect(c.data!.content).toEqual([]);
  });
  it('ferme une fiche devenue inaccessible au lieu de laisser une fenêtre vide',()=>{
    const f = fixture();const c = f.componentInstance;c.open('p');api.detail.and.returnValue(throwError(()=>({status:404,error:{message:'Plateforme introuvable.'}})));c.open('deleted');
    expect(c.dialog.nativeElement.open).toBeFalse();expect(c.detail).toBeUndefined();expect(c.error).toContain('introuvable');expect(router.navigate).toHaveBeenCalledWith(['/informatique/plateformes']);
  });
  it('accepte le glisser-déposer mais abandonne la sélection sans téléverser à l’annulation',()=>{
    const f = fixture();const c = f.componentInstance;c.create();c.setTab('documents');f.detectChanges();const transfer = new DataTransfer();transfer.items.add(new File(['PDF'],'Guide agent.pdf',{type:'application/pdf'}));
    const drop = new DragEvent('drop',{dataTransfer:transfer,bubbles:true,cancelable:true});f.nativeElement.querySelector('.manual-dropzone').dispatchEvent(drop);f.detectChanges();
    expect(drop.defaultPrevented).toBeTrue();expect(c.pendingManuels[0].titre).toBe('Guide agent');expect(api.save).not.toHaveBeenCalled();c.cancelEdit();expect(c.pendingManuels.length).toBe(0);expect(api.save).not.toHaveBeenCalled();
  });
  it('refuse les formats et tailles invalides et ne duplique pas le fichier sélectionné',()=>{
    const f = fixture();const c = f.componentInstance;c.create();const file = new File(['PDF'],'guide.pdf');c.queueManuels([file,file,new File(['x'],'script.html'),new File([],'empty.pdf'),new File([new Uint8Array(10*1024*1024+1)],'large.pdf')]);
    expect(c.pendingManuels.length).toBe(1);expect(c.dialogError).toContain('10 Mo');expect(c.dialogError).toContain('script.html');
  });
  it('préserve les fichiers et retraits après un conflit puis les abandonne à l’annulation',()=>{
    const manual = {id:'old',titre:'Ancien guide',description:'',nomFichier:'old.pdf',contentType:'application/pdf',taille:10,sha256:'a',ajouteLe:'2026-10-11',auteur:'Référent'};
    api.detail.and.returnValue(of({...detail,manuels:[manual]}));const f = fixture();const c = f.componentInstance;c.open('p');c.edit();c.removeManuel('old');c.queueManuels([new File(['new'],'new.pdf')]);c.draft!.motif = 'Remplacement';
    api.save.and.returnValue(throwError(()=>({status:409,error:{message:'Version périmée.'}})));c.save({invalid:false} as NgForm);
    expect(api.save.calls.mostRecent().args[2]!.retraits).toEqual(['old']);expect(api.save.calls.mostRecent().args[2]!.ajouts[0].file.name).toBe('new.pdf');expect(c.pendingManuels.length).toBe(1);expect(c.visibleManuels.length).toBe(0);
    c.cancelEdit();expect(c.pendingManuels.length).toBe(0);expect(c.visibleManuels[0].id).toBe('old');
  });
  it('exige un titre avant d’envoyer un manuel',()=>{
    const f = fixture();const c = f.componentInstance;c.create();c.queueManuels([new File(['PDF'],'guide.pdf')]);c.pendingManuels[0].titre = ' ';c.save({invalid:false} as NgForm);expect(api.save).not.toHaveBeenCalled();expect(c.tab).toBe('documents');expect(c.dialogError).toContain('titre');
  });
  it('affiche les manuels en lecture seule et utilise le téléchargement authentifié',fakeAsync(()=>{
    const manual = {id:'manual',titre:'Guide agent',description:'',nomFichier:'guide.pdf',contentType:'application/pdf',taille:1024,sha256:'a',ajouteLe:'2026-10-11',auteur:'Référent'};
    api.configuration.and.returnValue(of({...config,gerer:false}));api.detail.and.returnValue(of({...detail,manuels:[manual]}));const f = fixture();const c = f.componentInstance;c.open('p');c.setTab('documents');f.detectChanges();
    expect(f.nativeElement.querySelector('.manual-file-input')).toBeNull();expect(f.nativeElement.querySelector('.manual-card').textContent).toContain('Guide agent');expect(f.nativeElement.querySelector('.manual-card').textContent).not.toContain('Retirer');
    spyOn(URL,'createObjectURL').and.returnValue('blob:manual');const revoke = spyOn(URL,'revokeObjectURL');const click = spyOn(HTMLAnchorElement.prototype,'click');c.downloadManuel(manual);expect(api.downloadManuel).toHaveBeenCalledOnceWith('p','manual');expect(click).toHaveBeenCalled();tick(1000);expect(revoke).toHaveBeenCalledWith('blob:manual');
  }));
  it('ferme les manuels et efface les fiches après révocation du droit de téléchargement',()=>{
    const f = fixture();const c = f.componentInstance;c.open('p');api.downloadManuel.and.returnValue(throwError(()=>({status:403})));c.downloadManuel({id:'manual',nomFichier:'guide.pdf'} as any);expect(c.dialog.nativeElement.open).toBeFalse();expect(c.data).toBeUndefined();expect(c.detail).toBeUndefined();
  });
});
