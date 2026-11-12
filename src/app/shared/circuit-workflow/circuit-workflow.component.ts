import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Choice, Model, ProcessConfig, Step } from '../../services/processus.service';
import { RhCircuitDto } from '../../services/rh-demandes.service';

type CircuitStep = RhCircuitDto['etapes'][number];
interface WorkflowNode {
  key: string;
  label: string;
  subtitle: string;
  state: string;
  step?: Step;
  snapshot?: CircuitStep;
}

@Component({
  selector: 'app-circuit-workflow', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './circuit-workflow.component.html', styleUrl: './circuit-workflow.component.scss'
})
export class CircuitWorkflowComponent {
  @Input() config?: ProcessConfig;
  @Input() busy = false;
  @Input() error = '';
  @Output() saveRequested = new EventEmitter<Model>();
  @Output() simulateRequested = new EventEmitter<{id: string; agentId: string}>();
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;
  working?: Model;
  circuit?: RhCircuitDto;
  title = '';
  readOnly = false;
  preview = false;
  agentId = '';
  selectedKey?: string;
  dragIndex: number | null = null;
  dropIndex: number | null = null;
  announcement = '';
  notice = '';
  localError = '';
  private baseline = '';
  private keys = new WeakMap<Step, string>();
  private nextKey = 0;
  private pointer?: {id: number; index: number; x: number; y: number; moved: boolean};

  openModel(model: Model, readOnly = false, circuit?: RhCircuitDto, agentId = '') {
    this.reset();
    this.working = structuredClone(model); this.title = model.libelle || 'Nouveau circuit';
    this.readOnly = readOnly; this.circuit = circuit ? structuredClone(circuit) : undefined;
    this.preview = true; this.agentId = agentId; this.baseline = this.signature(this.working);
    this.localError = circuit?.blocage || '';
    this.dialog?.nativeElement.showModal();
  }
  openCircuit(title: string, circuit: RhCircuitDto) {
    this.reset(); this.working = undefined; this.title = title;
    this.circuit = structuredClone(circuit); this.readOnly = true; this.preview = false;
    this.localError = circuit.blocage || '';
    this.dialog?.nativeElement.showModal();
  }
  close(event?: Event) {
    if (this.busy) { event?.preventDefault(); return; }
    this.dialog?.nativeElement.close(); this.reset();
  }
  private reset() {
    this.selectedKey = undefined; this.dragIndex = null; this.dropIndex = null;
    this.pointer = undefined; this.announcement = ''; this.notice = ''; this.localError = '';
  }
  get editable() { return !this.readOnly && !!this.config?.gerer && this.working?.definition.mode === 'LIBRE'; }
  get dirty() { return !!this.working && this.signature(this.working) !== this.baseline; }
  get hierarchical() { return this.working?.definition.mode === 'HIERARCHIQUE'; }
  get nodes(): WorkflowNode[] {
    if (this.circuit && (!this.working || this.hierarchical)) return this.circuit.etapes.map((step, index) => ({
      key: `snapshot-${index}`, label: step.libelle, subtitle: `${step.validateurs?.length || 0} titulaire(s)`,
      state: this.state(step, index), snapshot: step
    }));
    if (!this.working || this.hierarchical) return [];
    return this.working.definition.etapes.map(step => ({
      key: this.key(step), label: step.libelle || 'Étape à configurer',
      subtitle: step.selection === 'FONCTION' ? this.functionName(step.fonction) : `${step.utilisateurs?.length || 0} titulaire(s)`,
      state: 'PREVUE', step
    }));
  }
  get selectedNode() { return this.nodes.find(node => node.key === this.selectedKey); }
  get selectedIndex() { return this.nodes.findIndex(node => node.key === this.selectedKey); }
  get selectedHistory() { return this.preview ? [] : (this.circuit?.historique || []).filter(d => d.etape === this.selectedIndex); }
  trackNode(_index: number, node: WorkflowNode) { return node.key; }
  select(node: WorkflowNode) { this.selectedKey = node.key; }
  private key(step: Step) {
    if (!this.keys.has(step)) this.keys.set(step, `step-${++this.nextKey}`);
    return this.keys.get(step)!;
  }
  move(from: number, to: number) {
    const steps = this.working?.definition.etapes;
    if (!this.editable || this.busy || !steps || from < 0 || to < 0 || from >= steps.length || to >= steps.length || from === to) return;
    const [step] = steps.splice(from, 1); steps.splice(to, 0, step);
    this.announcement = `${step.libelle || 'Étape'} déplacée en position ${to + 1} sur ${steps.length}.`;
    this.notice = ''; this.localError = '';
  }
  startDrag(event: DragEvent, index: number) {
    if (!this.editable || this.busy) { event.preventDefault(); return; }
    this.dragIndex = index;
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  dragOver(event: DragEvent, index: number) {
    if (this.dragIndex === null || !this.editable || this.busy) return;
    event.preventDefault(); this.dropIndex = index;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }
  drop(event: DragEvent, index: number) {
    event.preventDefault(); if (this.dragIndex !== null) this.move(this.dragIndex, index);
    this.endDrag();
  }
  endDrag() { this.dragIndex = null; this.dropIndex = null; }
  pointerStart(event: PointerEvent, index: number) {
    if (!this.editable || this.busy || event.pointerType === 'mouse') return;
    event.preventDefault();
    this.pointer = {id: event.pointerId, index, x: event.clientX, y: event.clientY, moved: false};
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }
  pointerMove(event: PointerEvent) {
    if (!this.pointer || this.pointer.id !== event.pointerId || this.busy) return;
    if (Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) < 8 && !this.pointer.moved) return;
    this.pointer.moved = true; this.dragIndex = this.pointer.index;
    const hit = this.dialog?.nativeElement.ownerDocument.elementFromPoint(event.clientX, event.clientY);
    const target = hit?.closest<HTMLElement>('[data-workflow-index]');
    this.dropIndex = target && this.dialog?.nativeElement.contains(target) ? Number(target.dataset['workflowIndex']) : null;
  }
  pointerEnd(event: PointerEvent) {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    if (this.pointer.moved && this.dropIndex !== null) this.move(this.pointer.index, this.dropIndex);
    this.pointer = undefined; this.endDrag();
  }
  pointerCancel() { this.pointer = undefined; this.endDrag(); }
  addStep() {
    if (!this.editable || this.busy || this.nodes.length >= 30) return;
    const step: Step = {libelle: '', selection: 'FONCTION', fonction: null, departementId: null,
      serviceId: null, agenceId: null, departementDemandeur: false, utilisateurs: [], fonctionsDemandeur: [], delaiJours: null};
    this.working!.definition.etapes.push(step); this.selectedKey = this.key(step); this.notice = '';
  }
  toggle(step: Step, field: 'utilisateurs' | 'fonctionsDemandeur', value: string, checked: boolean) {
    if (!this.editable || this.busy) return;
    step[field] = checked ? [...new Set([...step[field], value])] : step[field].filter(item => item !== value);
  }
  save() {
    if (!this.editable || this.busy || !this.working || !this.dirty) return;
    if (!this.working.libelle.trim() || !this.working.definition.politiqueRefus) {
      this.localError = 'Renseignez le nom du circuit et le traitement du refus dans le studio.'; return;
    }
    this.localError = ''; this.saveRequested.emit(structuredClone(this.working));
  }
  saved(model: Model) {
    const selected = this.selectedIndex;
    this.working = structuredClone(model); this.title = model.libelle;
    this.baseline = this.signature(this.working); this.notice = 'Brouillon enregistré.'; this.localError = '';
    this.selectedKey = this.nodes[selected]?.key;
  }
  changeAgent() { this.circuit = undefined; this.selectedKey = undefined; this.localError = ''; }
  simulate() {
    if (this.busy || !this.hierarchical || this.readOnly || !this.working?.id || !this.agentId) return;
    this.localError = ''; this.simulateRequested.emit({id: this.working.id, agentId: this.agentId});
  }
  showSimulation(circuit?: RhCircuitDto, blockage?: string) {
    this.circuit = circuit ? structuredClone(circuit) : undefined;
    this.selectedKey = undefined; this.localError = blockage || circuit?.blocage || '';
  }
  functionName(code: string | null) {
    const names: Record<string, string> = {AGENT: 'Agent', CHEF_SERVICE: 'Chef de service', DIRECTEUR: 'Directeur',
      DIRECTEUR_GENERAL_ADJOINT: 'DGA', DIRECTEUR_GENERAL: 'DG'};
    return code ? names[code] || code : 'Fonction à choisir';
  }
  name(choices: Choice[] | undefined, id: string | null) { return choices?.find(choice => choice.id === id)?.nom || id || 'Tous'; }
  private signature(model: Model) { return JSON.stringify({libelle: model.libelle, description: model.description, definition: model.definition}); }
  private state(step: CircuitStep, index: number) {
    if (this.preview) return 'PREVUE';
    if (step.statut === 'VALIDEE' || step.statut === 'REJETEE') return step.statut;
    return this.circuit?.statut === 'EN_ATTENTE' && index === this.circuit.etapeCourante ? 'COURANTE' : 'EN_ATTENTE';
  }
  stateName(state: string) { return ({PREVUE: 'Prévue', VALIDEE: 'Approuvée', REJETEE: 'Refusée', COURANTE: 'À valider', EN_ATTENTE: 'En attente', ANNULEE: 'Annulée', RETIREE: 'Retirée'} as Record<string, string>)[state] || state; }
}
