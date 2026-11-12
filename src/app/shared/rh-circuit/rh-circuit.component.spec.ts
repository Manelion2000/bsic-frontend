import {provideRouter} from '@angular/router';
import {TestBed} from '@angular/core/testing';
import {RhCircuitComponent} from './rh-circuit.component';
import {RhCircuitDto} from '../../services/rh-demandes.service';

describe('Circuit RH affiché', () => {
  function circuit(types: string[]): RhCircuitDto {
    return {fonctionDemandeur:'CHEF_SERVICE', dgObligatoire:types.includes('DG'), etapeCourante:0, statut:'EN_ATTENTE', peutDecider:true,
      etapes:types.map(type=>({type,libelle:type,statut:'EN_ATTENTE',validateurs:[]})),historique:[]};
  }

  it('guide un administrateur vers le DG dans un autre onglet et permet de recontrôler',async()=>{
    await TestBed.configureTestingModule({imports:[RhCircuitComponent],providers:[provideRouter([])]}).compileComponents();const f=TestBed.createComponent(RhCircuitComponent),c=f.componentInstance;
    c.circuit={...circuit(['CHEF_SERVICE','DIRECTEUR','DGA','DG']),blocage:'DG absent',etapeBloquee:'DG'};c.apercu=true;c.peutConfigurer=true;c.actualisationDisponible=true;f.detectChanges();
    const link=f.nativeElement.querySelector('a');expect(link.getAttribute('href')).toBe('/administration/dg');expect(link.target).toBe('_blank');expect(f.nativeElement.textContent).toContain('À configurer');expect(f.nativeElement.textContent).not.toContain('Approuvée');
    const refresh=spyOn(c.actualiser,'emit');f.nativeElement.querySelector('button').click();expect(refresh).toHaveBeenCalledTimes(1);c.chargement=true;f.detectChanges();f.nativeElement.querySelector('button').click();expect(refresh).toHaveBeenCalledTimes(1);
    c.peutConfigurer=false;f.detectChanges();expect(f.nativeElement.querySelector('a')).toBeNull();expect(f.nativeElement.textContent).toContain('votre administrateur');
  });
  it('annonce la finalisation par un DGA quand le DG est facultatif, sans l’appliquer aux circuits libres',async()=>{
    await TestBed.configureTestingModule({imports:[RhCircuitComponent],providers:[provideRouter([])]}).compileComponents();const f=TestBed.createComponent(RhCircuitComponent);f.componentInstance.apercu=true;f.componentInstance.circuit=circuit(['CHEF_SERVICE','DIRECTEUR','DGA']);f.detectChanges();
    expect(f.nativeElement.textContent).toContain('DG facultatif');expect(f.nativeElement.textContent).toContain('validation finale par un DGA');expect(f.nativeElement.querySelectorAll('li').length).toBe(3);
    f.componentInstance.circuit=circuit(['LIBRE']);f.detectChanges();expect(f.nativeElement.textContent).not.toContain('validation finale par un DGA');
  });
  it('omet les étapes non applicables sans les annoncer approuvées', async () => {
    await TestBed.configureTestingModule({imports:[RhCircuitComponent],providers:[provideRouter([])]}).compileComponents();
    const fixture=TestBed.createComponent(RhCircuitComponent);
    fixture.componentInstance.circuit=circuit(['DIRECTEUR','DGA','DG']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('CHEF_SERVICE');
    expect(fixture.nativeElement.textContent).not.toContain('Approuvée');
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.current').textContent).toContain('DIRECTEUR');
  });

  it('affiche uniquement l’autre DGA puis le DG pour une demande DGA', async () => {
    await TestBed.configureTestingModule({imports:[RhCircuitComponent],providers:[provideRouter([])]}).compileComponents();
    const fixture=TestBed.createComponent(RhCircuitComponent);
    fixture.componentInstance.circuit=circuit(['AUTRE_DGA','DG']); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('AUTRE_DGA');
    expect(fixture.nativeElement.textContent).not.toContain('DIRECTEUR');
  });

  it('montre le signataire effectif et un blocage sans ajouter d’approbation', async () => {
    await TestBed.configureTestingModule({imports:[RhCircuitComponent],providers:[provideRouter([])]}).compileComponents();
    const fixture=TestBed.createComponent(RhCircuitComponent);
    const c=circuit(['CHEF_SERVICE','DIRECTEUR','DGA']);
    c.etapes[0].statut='VALIDEE';c.etapes[0].nomSignataire='Chef du service 2';c.etapeCourante=1;
    c.blocage='Validateur indisponible';fixture.componentInstance.circuit=c;fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.approved').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Chef du service 2');
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('indisponible');
  });
});
