import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AnnuaireGlobalComponent } from './annuaire-global.component';
import { AnnuaireService, BaAnnuaireDepartementDto } from '../../services/annuaire.service';
import { UsersService } from '../../services/users.service';

describe('AnnuaireGlobalComponent',()=>{
  let api:jasmine.SpyObj<AnnuaireService>;let users:jasmine.SpyObj<UsersService>;let params:BehaviorSubject<any>;
  const data:BaAnnuaireDepartementDto[]=[{id:'it',nom:'Département informatique',agents:[{prenom:'Émile',nom:'Bakouan',fonction:'CHEF_SERVICE',email:'emile@bsic.bf',telephone:'+226 70 00 11 22',numeroPoste:'123',idService:'s1',nomService:'Support',idAgence:'a1',nomAgence:'Siège'},{prenom:'Aya',nom:'Zongo',fonction:'AGENT',idService:'s1',nomService:'Support'}]},{id:'finance',nom:'Finance',agents:[{prenom:'Aminata',nom:'Diallo',fonction:'DIRECTEUR',telephone:'25000000',idService:'s2',nomService:'Contrôle'}]}];
  beforeEach(async()=>{
    params=new BehaviorSubject(convertToParamMap({}));api=jasmine.createSpyObj('AnnuaireService',['getDepartements','getServices','getAgences','getAnnuaire','getPublicDepartements','getPublicServices','getPublicAgences','getPublicAnnuaire']);users=jasmine.createSpyObj('UsersService',['getUserWithMoreInfo']);users.getUserWithMoreInfo.and.returnValue(of({roles:[{code:'BA_ADMIN'}]}));
    for(const method of ['getDepartements','getPublicDepartements'] as const)api[method].and.returnValue(of([{id:'it',nom:'Informatique'},{id:'finance',nom:'Finance'}]));
    for(const method of ['getServices','getPublicServices'] as const)api[method].and.returnValue(of([{id:'s1',nom:'Support',idDepartement:'it'},{id:'s2',nom:'Contrôle',idDepartement:'finance'}]));
    for(const method of ['getAgences','getPublicAgences'] as const)api[method].and.returnValue(of([{id:'a1',nom:'Siège',idDepartement:'it'},{id:'a2',nom:'Centre',idDepartement:'finance'}]));
    api.getAnnuaire.and.returnValue(of(structuredClone(data)));api.getPublicAnnuaire.and.returnValue(of(structuredClone(data)));
    await TestBed.configureTestingModule({imports:[AnnuaireGlobalComponent],providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{queryParamMap:params}},{provide:AnnuaireService,useValue:api},{provide:UsersService,useValue:users}]}).compileComponents();
  });
  function fixture(publicView=false){spyOnProperty(TestBed.inject(Router),'url','get').and.returnValue(publicView?'/':'/annuaire/annuaire');const f=TestBed.createComponent(AnnuaireGlobalComponent);f.detectChanges();return f;}
  it('recherche plusieurs mots sans accents et retrouve un téléphone sans espaces',()=>{
    const f=fixture();const c=f.componentInstance;c.searchTerm='bakouan emile';c.onSearchChange();expect(c.matchingContacts.length).toBe(1);expect(c.matchingContacts[0].prenom).toBe('Émile');
    c.searchTerm='70001122';expect(c.matchingContacts.length).toBe(1);c.searchTerm='chef support';expect(c.matchingContacts.length).toBe(1);expect(api.getAnnuaire).toHaveBeenCalledTimes(1);f.destroy();
  });
  it('présente les cartes puis une liste avec les coordonnées et une fiche native',()=>{
    const f=fixture();const c=f.componentInstance;expect(f.nativeElement.querySelectorAll('.contact-card').length).toBe(3);c.view='list';f.detectChanges();expect(f.nativeElement.querySelector('table')).not.toBeNull();c.openContact(c.matchingContacts.find(a=>a.nom==='Bakouan')!);f.detectChanges();expect(c.dialog.nativeElement.open).toBeTrue();expect(c.dialog.nativeElement.textContent).toContain('+226 70 00 11 22');expect(c.dialog.nativeElement.querySelector('a[href="mailto:emile@bsic.bf"]')).not.toBeNull();c.closeContact();expect(c.dialog.nativeElement.open).toBeFalse();f.destroy();
  });
  it('ne charge pas les contacts publics avant une recherche et regroupe la frappe',fakeAsync(()=>{
    const f=fixture(true);const c=f.componentInstance;expect(api.getPublicAnnuaire).not.toHaveBeenCalled();expect(api.getAnnuaire).not.toHaveBeenCalled();expect(users.getUserWithMoreInfo).not.toHaveBeenCalled();
    c.searchTerm='em';c.onSearchChange();tick(100);c.searchTerm='emile';c.onSearchChange();tick(249);expect(api.getPublicAnnuaire).not.toHaveBeenCalled();tick(1);expect(api.getPublicAnnuaire).toHaveBeenCalledTimes(1);expect(c.matchingContacts.length).toBe(1);c.reset();expect(c.annuaire.length).toBe(0);expect(c.hasSearched).toBeFalse();tick(300);expect(api.getPublicAnnuaire).toHaveBeenCalledTimes(1);f.destroy();
  }));
  it('ignore une réponse devenue obsolète après un changement de filtre',()=>{
    const pending=new Subject<BaAnnuaireDepartementDto[]>();api.getAnnuaire.and.returnValue(pending);const f=fixture();const c=f.componentInstance;api.getAnnuaire.and.returnValue(of([data[1]]));c.filters.departementId='finance';c.onDepartmentChange();pending.next([data[0]]);expect(c.annuaire[0].id).toBe('finance');expect(c.loading).toBeFalse();f.destroy();
  });
  it('efface les services et agences incompatibles lors du changement de département',()=>{
    const f=fixture();const c=f.componentInstance;c.filters={departementId:'finance',serviceId:'s1',agenceId:'a1'};c.onDepartmentChange();expect(c.filters.serviceId).toBe('');expect(c.filters.agenceId).toBe('');expect(c.filteredServices.map(s=>s.id)).toEqual(['s2']);expect(c.filteredAgences.map(a=>a.id)).toEqual(['a2']);expect(api.getAnnuaire).toHaveBeenCalledWith('finance',undefined,undefined);f.destroy();
  });
  it('ouvre le périmètre demandé depuis un écran de référence',()=>{
    params.next(convertToParamMap({serviceId:'s1'}));const f=fixture();expect(api.getAnnuaire).toHaveBeenCalledWith(undefined,'s1',undefined);expect(f.componentInstance.filters.serviceId).toBe('s1');f.destroy();
  });
  it('réinitialise la pagination après recherche et filtre les fonctions',()=>{
    const f=fixture();const c=f.componentInstance;c.pageSize=1;c.pageIndex=2;expect(c.totalPages).toBe(3);c.searchTerm='bakouan';c.onSearchChange();expect(c.pageIndex).toBe(0);expect(c.pagedContacts.length).toBe(1);c.searchTerm='';c.functionFilter='DIRECTEUR';expect(c.matchingContacts.map(a=>a.nom)).toEqual(['Diallo']);f.destroy();
  });
  it('efface les données et propose de réessayer sur une erreur de chargement',()=>{
    const f=fixture();api.getAnnuaire.and.returnValue(throwError(()=>({status:403})));const c=f.componentInstance;c.openContact(c.matchingContacts[0]);c.load();f.detectChanges();expect(c.annuaire.length).toBe(0);expect(c.selected).toBeUndefined();expect(c.dialog.nativeElement.open).toBeFalse();expect(c.message).not.toBe('');expect(f.nativeElement.querySelector('[role="alert"]')).not.toBeNull();f.destroy();
  });
  it('masque et exclut de la copie le téléphone secondaire sur la vue publique',async()=>{
    const f=fixture(true);const c=f.componentInstance;c.searchTerm='emile';c.load();c.openContact({...c.matchingContacts[0],telephoneSecondaire:'private-mobile'});f.detectChanges();expect(c.dialog.nativeElement.textContent).not.toContain('private-mobile');const copy=spyOn(navigator.clipboard,'writeText').and.resolveTo();await c.copyContact();expect(copy.calls.mostRecent().args[0]).not.toContain('private-mobile');f.destroy();
  });
});
