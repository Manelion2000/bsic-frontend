import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of, Subject} from 'rxjs';
import {CongesRhComponent} from './conges-rh.component';
import {CongesService} from '../../services/conges.service';

describe('Configuration RH explicite',()=>{
  let api:jasmine.SpyObj<CongesService>;
  beforeEach(async()=>{api=jasmine.createSpyObj('CongesService',['configuration','get','post','key']);api.configuration.and.returnValue(of({permissions:['CONGES_POLITIQUES','CONGES_DROITS'],agentId:'rh',fonction:'AGENT',blocage:'',politiques:[]}));api.get.and.returnValue(of([]));api.key.and.returnValue('unique');api.post.and.returnValue(new Subject());await TestBed.configureTestingModule({imports:[CongesRhComponent],providers:[provideRouter([]),{provide:CongesService,useValue:api}]}).compileComponents();});
  function fixture(){const f=TestBed.createComponent(CongesRhComponent);f.detectChanges();return f;}
  it('prédéfinît seulement le DG facultatif confirmé, sans inventer de droits ou calendrier',()=>{const f=fixture();const c=f.componentInstance;c.open('politiques');expect(c.rules).toEqual({dgObligatoire:false});c.open('calendriers');expect(c.week.length).toBe(7);expect(c.week.every(w=>w.worked===null&&w.plages.length===0)).toBeTrue();c.save();expect(api.post).not.toHaveBeenCalled();expect(c.error).toContain('explicitement');});
  it('requiert la confirmation et la justification avant d’activer une politique',()=>{const f=fixture();const c=f.componentInstance;c.confirm('politiques/p/confirmer','Politique');c.commitConfirmation();expect(api.post).not.toHaveBeenCalled();c.confirmed=true;c.confirmationReason='Décision RH';c.commitConfirmation();c.commitConfirmation();expect(api.post).toHaveBeenCalledTimes(1);expect(api.post).toHaveBeenCalledWith('politiques/p/confirmer',{confirme:true,justification:'Décision RH'});});
  it('n’importe que le contenu de la simulation affichée et confirmée',()=>{const f=fixture();const c=f.componentInstance;c.reviewedImport={arrete:'2026-10-08',source:'RH',lignes:[]};c.importPreview={empreinte:'hash',simulation:{valide:true}};c.confirmed=true;c.confirmationReason='Rapprochement effectué';c.importation.source='Autre source modifiée';c.commitImport();expect(api.post.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({importation:c.reviewedImport,empreinteSimulation:'hash'}));});
  it('n’active aucune règle de couverture à l’ouverture du formulaire',()=>{const f=fixture();f.componentInstance.open('couverture');expect(f.componentInstance.coverageRules).toEqual({});expect(f.componentInstance.groups).toEqual([]);});
});
