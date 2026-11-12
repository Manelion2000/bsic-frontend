import {Type} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of,Subject,throwError} from 'rxjs';
import {AutorisationsAbsenceComponent} from '../../pages/autorisations-absence/autorisations-absence.component';
import {AutorisationSortiesComponent} from '../../pages/autorisation-sorties/autorisation-sorties.component';
import {RhDemandesService,RhCircuitDto} from '../../services/rh-demandes.service';
import {UsersService} from '../../services/users.service';
import {AnnuaireService} from '../../services/annuaire.service';

const blocked:RhCircuitDto={fonctionDemandeur:'AGENT',dgObligatoire:true,etapeCourante:0,statut:'EN_ATTENTE',peutDecider:false,blocage:'Aucun DG disponible',etapeBloquee:'DG',etapes:['CHEF_SERVICE','DIRECTEUR','DGA','DG'].map(type=>({type,libelle:type,statut:'EN_ATTENTE',validateurs:[]})),historique:[]};
const available:RhCircuitDto={...blocked,blocage:undefined,etapeBloquee:undefined};
for(const page of [{type:AutorisationsAbsenceComponent as Type<any>,code:'ABSENCE',creation:'createAbsence',action:'create'}, {type:AutorisationSortiesComponent as Type<any>,code:'SORTIE',creation:'createAutorisationSortie',action:'createDemande'}]){
 describe('Actualisation du circuit '+page.code,()=>{
  let rh:any;
  beforeEach(async()=>{
    rh=jasmine.createSpyObj('RhDemandesService',['getCircuitApplicable','getMesAbsences','getAbsencesAValider','getMesDemandesAutorisationSortie','getDemandesAutorisationSortieAValider','createAbsence','createAutorisationSortie']);
    rh.getCircuitApplicable.and.returnValue(of(blocked));
    for(const method of ['getMesAbsences','getAbsencesAValider','getMesDemandesAutorisationSortie','getDemandesAutorisationSortieAValider'])rh[method].and.returnValue(of([]));
    rh[page.creation].and.returnValue(new Subject());
    await TestBed.configureTestingModule({imports:[page.type],providers:[provideRouter([]),{provide:RhDemandesService,useValue:rh},{provide:UsersService,useValue:{getUserWithMoreInfo:()=>of({id:'agent',nom:'Agent',fonction:'AGENT',idDepartement:'dept',roles:[]})}},{provide:AnnuaireService,useValue:{getDepartements:()=>of([{id:'dept',nom:'Département'}]),getServices:()=>of([]),getAgences:()=>of([])}}]}).compileComponents();
  });
  function fixture(){const f=TestBed.createComponent(page.type);f.detectChanges();Object.assign(f.componentInstance.form,{motif:'Demande saisie à conserver',dateDebut:'2026-10-15',dateFin:'2026-10-16',dateSortie:'2026-10-15',typeStructure:'DIRECTION',idDirection:'dept'});f.detectChanges();return f;}
  it('bloque le bouton et la soumission tant que le DG manque',()=>{
    const f=fixture(),c=f.componentInstance;expect(f.nativeElement.querySelector('button.btn--primary').disabled).toBeTrue();
    expect(f.nativeElement.textContent).toContain('Accord du DG obligatoire');expect(f.nativeElement.textContent).toContain('DG');
    c[page.action]();expect(rh[page.creation]).not.toHaveBeenCalled();expect(c.form.motif).toContain('conserver');
  });
  it('réactualise une fois, garde la saisie et permet la soumission après configuration du DG',()=>{
    const f=fixture(),c=f.componentInstance,input={...c.form},response=new Subject<RhCircuitDto>();rh.getCircuitApplicable.calls.reset();rh.getCircuitApplicable.and.returnValue(response);
    const refresh=Array.from(f.nativeElement.querySelectorAll('button')).find((b:any)=>b.textContent.includes('Actualiser le circuit')) as HTMLButtonElement;refresh.click();f.detectChanges();
    c.loadCircuit();expect(rh.getCircuitApplicable).toHaveBeenCalledOnceWith(page.code);expect(f.nativeElement.querySelector('button.btn--primary').disabled).toBeTrue();expect(c.form).toEqual(input);
    response.next(available);f.detectChanges();expect(f.nativeElement.querySelector('button.btn--primary').disabled).toBeFalse();expect(c.form).toEqual(input);
    f.nativeElement.querySelector('button.btn--primary').click();expect(rh[page.creation]).toHaveBeenCalledOnceWith(input);
  });
  it('reste bloqué sur une panne et propose un nouvel essai sans perdre la saisie',()=>{
    const f=fixture(),c=f.componentInstance,input={...c.form};rh.getCircuitApplicable.and.returnValue(throwError(()=>({error:{message:'Serveur indisponible'}})));c.loadCircuit();f.detectChanges();
    expect(c.circuit).toBeUndefined();expect(f.nativeElement.textContent).toContain('Serveur indisponible');expect(f.nativeElement.querySelector('button.btn--primary').disabled).toBeTrue();
    rh.getCircuitApplicable.and.returnValue(of(available));const retry=Array.from(f.nativeElement.querySelectorAll('button')).find((b:any)=>b.textContent.includes('Réessayer le chargement')) as HTMLButtonElement;retry.click();f.detectChanges();
    expect(c.circuitError).toBe('');expect(c.form).toEqual(input);expect(f.nativeElement.querySelector('button.btn--primary').disabled).toBeFalse();
  });
 });
}
