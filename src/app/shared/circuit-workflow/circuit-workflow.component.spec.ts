import { TestBed } from '@angular/core/testing';
import { CircuitWorkflowComponent } from './circuit-workflow.component';
import { Model, ProcessConfig } from '../../services/processus.service';
import { RhCircuitDto } from '../../services/rh-demandes.service';

describe('Fenêtre du workflow visuel', () => {
  const config: ProcessConfig = {gerer: true, demander: true, valider: true, auditer: false, agentId: 'agent',
    fonctions: ['CHEF_SERVICE', 'DIRECTEUR'], agents: [{id: 'chief', nom: 'Chef Exemple'}, {id: 'director', nom: 'Directeur Exemple'}],
    departements: [{id: 'department', nom: 'Département'}], services: [], agences: []};
  const model: Model = {id: 'model', version: 7, libelle: 'Courrier interne', description: 'Recette', publications: [],
    definition: {mode: 'LIBRE', politiqueRefus: 'DEFINITIF', dgObligatoire: null, etapes: [
      {libelle: 'Chef', selection: 'UTILISATEURS', fonction: null, departementId: 'department', serviceId: null,
        agenceId: null, departementDemandeur: false, utilisateurs: ['chief'], fonctionsDemandeur: [], delaiJours: 2},
      {libelle: 'Direction', selection: 'FONCTION', fonction: 'DIRECTEUR', departementId: null, serviceId: null,
        agenceId: null, departementDemandeur: true, utilisateurs: [], fonctionsDemandeur: ['AGENT'], delaiJours: null}
    ]}};
  const circuit: RhCircuitDto = {dgObligatoire: false, etapeCourante: 1, statut: 'EN_ATTENTE', peutDecider: false,
    historique: [], etapes: [
      {type: 'CHEF_SERVICE', libelle: 'Chef', statut: 'VALIDEE', validateurs: [{id: 'chief', nom: 'Chef Exemple'}], nomSignataire: 'Chef Exemple', dateDecision: '2026-10-11T10:00:00Z'},
      {type: 'DIRECTEUR', libelle: 'Direction', statut: 'EN_ATTENTE', validateurs: [{id: 'director', nom: 'Directeur Exemple'}]}
    ]};
  beforeEach(async () => { await TestBed.configureTestingModule({imports: [CircuitWorkflowComponent]}).compileComponents(); });
  function open(readOnly = false) {
    const f = TestBed.createComponent(CircuitWorkflowComponent);f.componentInstance.config = config;f.detectChanges();
    f.componentInstance.openModel(model, readOnly);f.detectChanges();return f;
  }
  afterEach(() => TestBed.resetTestingModule());

  it('affiche les blocs reliés et révèle les détails seulement au clic', () => {
    const f = open();const dialog = f.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBeTrue();expect(dialog.getAttribute('aria-labelledby')).toBe('workflow-title');
    expect(dialog.querySelectorAll('.workflow-node').length).toBe(2);expect(dialog.querySelector('.workflow-details')).toBeNull();
    expect(dialog.textContent).not.toContain('Chef Exemple');
    (dialog.querySelector('.node-open') as HTMLButtonElement).click();f.detectChanges();
    expect(dialog.querySelector('.workflow-details')!.textContent).toContain('Chef Exemple');
    expect(f.componentInstance.selectedNode!.step!.delaiJours).toBe(2);f.componentInstance.close();
  });
  it('réordonne par les événements de glisser-déposer sans perdre les titulaires ni la sélection', () => {
    const f = open();const c = f.componentInstance;const grip = f.nativeElement.querySelector('.node-grip') as HTMLElement;
    const node = f.nativeElement.querySelector('.node-open') as HTMLButtonElement;node.click();node.focus();f.detectChanges();
    const selected = c.selectedKey;const transfer = new DataTransfer();
    grip.dispatchEvent(new DragEvent('dragstart', {bubbles: true, cancelable: true, dataTransfer: transfer}));
    const target = f.nativeElement.querySelectorAll('.workflow-node')[1] as HTMLElement;
    target.dispatchEvent(new DragEvent('dragover', {bubbles: true, cancelable: true, dataTransfer: transfer}));
    expect(c.dropIndex).toBe(1);
    target.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: transfer}));f.detectChanges();
    expect(c.working!.definition.etapes.map(s => s.libelle)).toEqual(['Direction', 'Chef']);
    expect(c.working!.definition.etapes[1].utilisateurs).toEqual(['chief']);expect(c.working!.definition.etapes[1].departementId).toBe('department');
    expect(c.selectedKey).toBe(selected);expect(c.selectedIndex).toBe(1);expect(document.activeElement).toBe(node);
    expect(c.announcement).toContain('position 2');expect(model.definition.etapes[0].libelle).toBe('Chef');c.close();
  });
  it('permet le déplacement tactile et annule un geste interrompu', () => {
    const f = open();const c = f.componentInstance;const grip = f.nativeElement.querySelector('.node-grip') as HTMLElement;
    spyOn(grip, 'setPointerCapture');
    const target = f.nativeElement.querySelectorAll('.workflow-node')[1] as HTMLElement;
    spyOn(document, 'elementFromPoint').and.returnValue(target);
    grip.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 7, clientX: 10, clientY: 10}));
    grip.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, pointerType: 'touch', pointerId: 7, clientX: 10, clientY: 90}));
    expect(c.dropIndex).toBe(1);
    grip.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, pointerType: 'touch', pointerId: 7}));
    expect(c.working!.definition.etapes.map(s => s.libelle)).toEqual(['Direction', 'Chef']);
    c.pointerCancel();expect(c.dragIndex).toBeNull();expect(c.dropIndex).toBeNull();c.close();
  });
  it('propose un déplacement au clavier et ignore un dépôt provenant de l’extérieur', () => {
    const f = open();const c = f.componentInstance;
    const down = f.nativeElement.querySelector('[aria-label="Descendre Chef"]') as HTMLButtonElement;
    down.click();f.detectChanges();expect(c.working!.definition.etapes[1].libelle).toBe('Chef');
    c.move(1, 2);c.drop(new DragEvent('drop'), 0);expect(c.working!.definition.etapes[1].libelle).toBe('Chef');c.close();
  });
  it('conserve la version attendue à la sauvegarde et laisse Annuler sans effet sur le modèle', () => {
    const f = open();const c = f.componentInstance;const save = jasmine.createSpy('save');c.saveRequested.subscribe(save);
    c.move(0, 1);c.save();expect(save).toHaveBeenCalledTimes(1);
    expect(save.calls.mostRecent().args[0].version).toBe(7);expect(save.calls.mostRecent().args[0].definition.etapes[1].utilisateurs).toEqual(['chief']);
    c.close();expect(model.definition.etapes[0].libelle).toBe('Chef');
  });
  it('ajoute et configure une étape dans le panneau sans modifier une publication', async () => {
    const f = open();const c = f.componentInstance;c.addStep();f.detectChanges();
    const input = f.nativeElement.querySelector('.workflow-details input:not([type="checkbox"])') as HTMLInputElement;
    input.value = 'Contrôle';input.dispatchEvent(new Event('input'));await f.whenStable();f.detectChanges();
    expect(c.nodes[2].label).toBe('Contrôle');expect(model.definition.etapes.length).toBe(2);expect(c.dirty).toBeTrue();c.close();
  });
  it('bloque l’édition d’une publication et d’un circuit de demande même par appel direct aux méthodes', () => {
    const f = open(true);const c = f.componentInstance;const save = jasmine.createSpy('save');c.saveRequested.subscribe(save);
    c.move(0, 1);c.addStep();c.save();expect(c.working!.definition.etapes.length).toBe(2);expect(c.working!.definition.etapes[0].libelle).toBe('Chef');
    expect(f.nativeElement.querySelector('.node-grip')).toBeNull();expect(save).not.toHaveBeenCalled();c.close();
    c.openCircuit('Dossier', {...circuit,historique:[{etape:0,type:'CHEF_SERVICE',decision:'REJETEE',idSignataire:'other',nomSignataire:'Autre chef',date:'2026-10-11T09:00:00Z'}]});f.detectChanges();c.move(0, 1);c.save();
    expect(f.nativeElement.querySelectorAll('.workflow-node.approved').length).toBe(1);expect(f.nativeElement.querySelectorAll('.workflow-node.current').length).toBe(1);
    (f.nativeElement.querySelector('.node-open') as HTMLButtonElement).click();f.detectChanges();
    expect(f.nativeElement.querySelector('.workflow-details').textContent).toContain('Signataire effectif');expect(save).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('.decision-history').textContent).toContain('Autre chef');expect(c.selectedHistory[0].decision).toBe('REJETEE');c.close();
  });
  it('affiche uniquement le circuit RH calculé pour l’agent et conserve son ordre obligatoire', () => {
    const f = open();const c = f.componentInstance;c.close();
    c.openModel({...model, definition: {mode: 'HIERARCHIQUE', politiqueRefus: 'DEFINITIF', dgObligatoire: false, etapes: []}});f.detectChanges();
    expect(c.nodes).toEqual([]);expect(f.nativeElement.textContent).toContain('Choisissez un agent');
    const request = jasmine.createSpy('simulate');c.simulateRequested.subscribe(request);c.agentId = 'agent';c.simulate();
    expect(request).toHaveBeenCalledWith({id: 'model', agentId: 'agent'});
    c.showSimulation(circuit);f.detectChanges();c.move(0,1);expect(c.nodes.map(n => n.label)).toEqual(['Chef', 'Direction']);
    expect(f.nativeElement.querySelector('.node-grip')).toBeNull();expect(f.nativeElement.querySelector('.workflow-node.approved')).toBeNull();
    c.changeAgent();expect(c.nodes).toEqual([]);c.showSimulation(undefined, 'Autre DGA indisponible.');f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Autre DGA indisponible');c.close();
  });
  it('bloque les modifications et la fermeture pendant l’enregistrement', () => {
    const f = open();const c = f.componentInstance;c.move(0, 1);c.busy = true;f.detectChanges();
    const cancel = new Event('cancel', {cancelable: true});c.close(cancel);c.move(1, 0);
    expect(cancel.defaultPrevented).toBeTrue();expect(c.working!.definition.etapes[0].libelle).toBe('Direction');
    expect(f.nativeElement.querySelector('dialog').open).toBeTrue();
    c.busy = false;c.saved({...c.working!, version: 8});expect(c.dirty).toBeFalse();c.close();
  });
});
