import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import {CongesComponent} from './conges.component';
import {CongesService, Leave} from '../../services/conges.service';

describe('Congés : actions serveur et simulation',()=>{
  let api:jasmine.SpyObj<CongesService>;
  const draft={id:'leave',version:4,revision:1,agentId:'agent',agent:'Agent',typeCode:'ANNUEL',libelle:'Annuel',etat:'BROUILLON',situation:'A_VENIR',debut:'2026-12-01',fin:'2026-12-02',portionDebut:'JOURNEE',portionFin:'JOURNEE',droits:[],pieces:[],historique:[],actions:['SOUMETTRE','MODIFIER']} as Leave;
  beforeEach(async()=>{
    api=jasmine.createSpyObj('CongesService',['configuration','get','post','put','remove','download','operation','key','saveFile']);
    api.configuration.and.returnValue(of({permissions:['CONGES_DEMANDER'],agentId:'agent',fonction:'AGENT',blocage:'',politiques:[{id:'p',typeCode:'ANNUEL',libelle:'Annuel',etat:'ACTIVE',version:1,categorie:'CONGE_ANNUEL',debutEffet:'2026-01-01',sourceRh:'Décision RH',regles:{unite:'JOUR'}}]}));api.get.and.returnValue(of([]));api.key.and.returnValue('unique');api.operation.and.callFake((d,extra)=>({version:d.version,cle:'unique',etape:d.circuit?.etapeCourante,...extra}));api.post.and.returnValue(new Subject());
    await TestBed.configureTestingModule({imports:[CongesComponent],providers:[provideRouter([]),{provide:CongesService,useValue:api}]}).compileComponents();
  });
  function fixture(){const f=TestBed.createComponent(CongesComponent);f.detectChanges();return f;}
  it('ne présente pas une étape inapplicable comme approuvée et respecte les actions serveur',()=>{const f=fixture();f.componentInstance.selected=draft;f.detectChanges();expect(f.nativeElement.textContent).toContain('SOUMETTRE');expect(f.nativeElement.textContent).not.toContain('APPROUVER');expect(f.nativeElement.querySelector('app-rh-circuit')).toBeNull();});
  it('interdit un enregistrement avant la simulation et bloque le double clic',()=>{const f=fixture();const c=f.componentInstance;c.start();c.draft();expect(api.post).not.toHaveBeenCalled();c.simulation={blocages:[],alertes:[],droits:[],disponibleAvant:'20',disponibleApres:'18',calcul:{quantite:'2',unite:'JOUR',jours:[]},circuit:{etapes:[],historique:[],dgObligatoire:true,etapeCourante:0,peutDecider:false}};c.draft();c.draft();expect(api.post).toHaveBeenCalledTimes(1);expect(api.post.calls.mostRecent().args[2]).toBe('unique');});
  it('envoie la version et l’étape actives puis actualise après conflit',()=>{const f=fixture();const c=f.componentInstance;c.selected={...draft,etat:'EN_ATTENTE',circuit:{etapeCourante:2,etapes:[],historique:[],dgObligatoire:true,peutDecider:true}};api.post.and.returnValue(throwError(()=>({error:{message:'Version modifiée'}})));api.get.and.returnValue(of(c.selected));c.action(c.selected,'APPROUVER');expect(api.post.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({version:4}));expect(c.error).toContain('Version modifiée');expect(c.busy).toBeFalse();});
  it('garde une modification comme nouvelle révision liée au congé approuvé',()=>{const f=fixture();f.componentInstance.start({...draft,etat:'APPROUVEE'},true);expect(f.componentInstance.form.remplaceDemandeId).toBe('leave');expect(f.componentInstance.form.idBrouillon).toBeUndefined();});
  it('exige une justification de rejet sans appel réseau',()=>{const f=fixture();f.componentInstance.action(draft,'REJETER');expect(api.post).not.toHaveBeenCalled();expect(f.componentInstance.error).toContain('justification');});
});
