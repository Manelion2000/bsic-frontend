import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { ProcessusService, ProcessConfig, Model, Step, Procedure, Dossier, Publication, Field, CircuitDeletionTarget, CircuitDeletionResult } from '../../services/processus.service';
import { RhCircuitComponent } from '../../shared/rh-circuit/rh-circuit.component';
import { CircuitWorkflowComponent } from '../../shared/circuit-workflow/circuit-workflow.component';
import { RhCircuitDto } from '../../services/rh-demandes.service';
import { extractErrorMessage } from '../../shared/error.utils';
interface CircuitDeletionRow extends CircuitDeletionTarget {
    modelId: string;
    label: string;
    detail: string;
    enabled: boolean;
    blockage?: string | null;
}
@Component({ selector: 'app-processus', standalone: true, imports: [CommonModule, FormsModule, RouterLink, RhCircuitComponent, CircuitWorkflowComponent], templateUrl: './processus.component.html', styleUrl: './processus.component.scss' })
export class ProcessusComponent implements OnInit {
    downloadActe(d: Dossier) {
        this.api.document(d.id).subscribe({next:b=>{const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download='acte-'+d.id+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},error:()=>{this.error='Téléchargement de l’acte impossible.';}});
    }
    api = inject(ProcessusService);
    route = inject(ActivatedRoute);
    config?: ProcessConfig;
    models: Model[] = [];
    procedures: Procedure[] = [];
    rows: Dossier[] = [];
    view = 'catalogue';
    search = '';
    state = '';
    busy = false;
    loading = false;
    error = '';
    success = '';
    model?: Model;
    procedure?: Procedure;
    selected?: Dossier;
    request?: {
        id?: string;
        version?: number;
        demarcheId: string;
        titre: string;
        valeurs: Record<string, string>;
        champs: Field[];
    };
    comment = '';
    publicationReason = '';
    persistedModel = '';
    simulation: any;
    simulationAgent = '';
    dragIndex: number | null = null;
    fieldDrag: number | null = null;
    announcement = '';
    creationKey = '';
    @ViewChild('deletionDialog') deletionDialog?: ElementRef<HTMLDialogElement>;
    deletionMode: 'CIRCUIT' | 'PUBLICATION' = 'CIRCUIT';
    deletionSearch = '';
    deletionModelId?: string;
    deletionSelection = new Map<string, CircuitDeletionTarget>();
    deletionConfirm = false;
    deletionError = '';
    @ViewChild(CircuitWorkflowComponent) visualWorkflow?: CircuitWorkflowComponent;
    workflowError = '';
    openWorkflow(model = this.model) {
        if (!this.config?.gerer || this.busy || this.loading || !model) return;
        this.workflowError = '';
        const current = this.model?.id === model.id && this.signature(model) === this.persistedModel;
        this.visualWorkflow?.openModel(model, false, current ? this.simulation?.circuit : undefined, current ? this.simulationAgent : '');
    }
    openPublishedWorkflow(model: Model, publication: Publication) {
        if (!this.config?.gerer || this.busy || publication.definition.mode !== 'LIBRE') return;
        this.workflowError = '';
        this.visualWorkflow?.openModel({...model, libelle: `${publication.libelle} · version ${publication.numero}`,
            description: publication.description || '', definition: publication.definition}, true);
    }
    openDossierWorkflow(dossier: Dossier) {
        if (this.busy || !dossier.circuit) return;
        this.workflowError = ''; this.visualWorkflow?.openCircuit(dossier.titre, dossier.circuit);
    }
    saveWorkflow(model: Model) {
        if (!this.config?.gerer || this.busy || model.definition.mode !== 'LIBRE') return;
        const input = {libelle: model.libelle, description: model.description, definition: model.definition, version: model.version};
        this.busy = true; this.workflowError = '';
        (model.id ? this.api.put<Model>('modeles/' + model.id, input) : this.api.post<Model>('modeles', input)).subscribe({
            next: saved => {
                this.busy = false;
                if (this.model && this.model.id === model.id) { this.model = saved; this.persistedModel = this.signature(saved); this.simulation = undefined; }
                this.visualWorkflow?.saved(saved); this.load(); this.success = 'Brouillon du workflow enregistré. Les versions publiées sont conservées.';
            },
            error: e => {
                this.busy = false;
                this.workflowError = extractErrorMessage(e, 'Impossible d’enregistrer le circuit.');
                if (e.status === 409) this.workflowError += ' Fermez la fenêtre et actualisez le circuit avant de reprendre vos modifications.';
            }
        });
    }
    simulateWorkflow(input: {id: string; agentId: string}) {
        if (!this.config?.gerer || this.busy) return;
        if (this.model?.id === input.id && this.signature(this.model) !== this.persistedModel) {
            this.workflowError = 'Enregistrez les modifications du studio avant d’afficher le parcours RH.'; return;
        }
        this.busy = true; this.workflowError = '';
        this.api.get<{circuit?: RhCircuitDto; blocage?: string}>('modeles/' + input.id + '/simulation?agentId=' + encodeURIComponent(input.agentId)).subscribe({
            next: result => { this.busy = false; this.visualWorkflow?.showSimulation(result.circuit, result.blocage); },
            error: e => { this.busy = false; this.visualWorkflow?.showSimulation(); this.workflowError = extractErrorMessage(e, 'Impossible d’afficher le circuit RH.'); }
        });
    }
    ngOnInit() { this.loading = true; this.api.get<ProcessConfig>('configuration').subscribe({ next: c => { this.config = c; this.view = this.route.snapshot.data['studio'] ? 'modeles' : 'catalogue'; this.load(); }, error: e => this.fail(e) }); }
    load() { this.error = ''; this.loading = true; const requests: Record<string, Observable<unknown>> = { procedures: this.api.get<Procedure[]>('demarches') }; if (this.config?.gerer)
        requests['models'] = this.api.get<Model[]>('modeles'); if (['mes', 'a-traiter', 'audit'].includes(this.view))
        requests['rows'] = this.api.get<Dossier[]>('dossiers?vue=' + this.view); forkJoin(requests).subscribe({ next: r => { this.procedures = r['procedures'] as Procedure[]; this.models = (r['models'] as Model[]) || []; this.rows = (r['rows'] as Dossier[]) || []; this.loading = false; }, error: e => this.fail(e) }); }
    tab(v: string) { if (this.busy)
        return; this.view = v; this.model = undefined; this.procedure = undefined; this.request = undefined; this.selected = undefined; this.search = ''; this.state = ''; this.load(); }
    get filteredProcedures() { const q = this.search.trim().toLocaleLowerCase(); return this.procedures.filter(p => (!this.state || String(p.actif) === this.state) && (p.libelle + ' ' + p.code + ' ' + p.description).toLocaleLowerCase().includes(q)); }
    get filteredModels() { const q = this.search.trim().toLocaleLowerCase(); return this.models.filter(p => (p.libelle + ' ' + p.description).toLocaleLowerCase().includes(q)); }
    get filteredRows() { const q = this.search.trim().toLocaleLowerCase(); return this.rows.filter(p => (!this.state || p.etat === this.state) && (p.titre + ' ' + p.demarche + ' ' + p.demandeur).toLocaleLowerCase().includes(q)); }
    get publications() { return this.models.flatMap(m => m.publications); }
    get alreadyPublished() { return !!this.model?.dejaPublie && this.signature(this.model) === this.persistedModel; }
    get allDeletionRows() {
        const models = this.models.filter(m => !this.deletionModelId || m.id === this.deletionModelId);
        return models.flatMap<CircuitDeletionRow>(m => this.deletionMode === 'CIRCUIT' ? [{
            type: 'CIRCUIT' as const, id: m.id!, version: m.version!, modelId: m.id!,
            label: m.libelle, detail: `${m.publications.length} version(s) publiée(s) · ${m.code || ''}`,
            enabled: m.supprimable === true, blockage: m.blocageSuppression
        }] : m.publications.map(p => ({
            type: 'PUBLICATION' as const, id: p.id, version: p.version!, modelId: m.id!,
            label: `${m.libelle} — version ${p.numero}`, detail: p.date,
            enabled: p.supprimable === true, blockage: p.blocageSuppression
        })));
    }
    get deletionRows() {
        const q = this.deletionSearch.trim().toLocaleLowerCase();
        return this.allDeletionRows.filter(row => `${row.label} ${row.detail}`.toLocaleLowerCase().includes(q));
    }
    get selectedDeletionRows() {
        return this.allDeletionRows.filter(row => this.deletionSelection.has(row.id));
    }
    trackDeletionRow(_index: number, row: CircuitDeletionRow) { return `${row.type}:${row.id}`; }
    openDeletion(mode: 'CIRCUIT' | 'PUBLICATION' = 'CIRCUIT', modelId?: string) {
        if (!this.config?.gerer || this.busy || this.loading) return;
        this.deletionMode = mode; this.deletionModelId = modelId; this.deletionSearch = '';
        this.deletionSelection.clear(); this.deletionConfirm = false; this.deletionError = '';
        this.deletionDialog?.nativeElement.showModal();
        this.load();
    }
    closeDeletion(event?: Event) {
        if (this.busy) { event?.preventDefault(); return; }
        this.deletionDialog?.nativeElement.close();
        this.deletionSelection.clear(); this.deletionConfirm = false;
    }
    changeDeletionMode(mode: 'CIRCUIT' | 'PUBLICATION') {
        if (this.busy) return;
        this.deletionMode = mode; this.deletionModelId = undefined;
        this.deletionSelection.clear(); this.deletionConfirm = false; this.deletionError = '';
    }
    toggleDeletion(row: CircuitDeletionTarget & {enabled: boolean}, checked: boolean) {
        if (!row.enabled || this.busy || this.loading) return;
        if (checked && this.deletionSelection.size >= 100) { this.deletionError = 'Sélectionnez au plus 100 éléments à la fois.'; return; }
        if (checked) this.deletionSelection.set(row.id, {type: row.type, id: row.id, version: row.version});
        else this.deletionSelection.delete(row.id);
        this.deletionConfirm = false; this.deletionError = '';
    }
    reviewDeletion() {
        if (this.busy || this.loading || !this.deletionSelection.size) return;
        this.deletionConfirm = true;
    }
    deleteCircuits() {
        if (!this.config?.gerer || this.busy || this.loading || !this.deletionConfirm || !this.deletionSelection.size) return;
        const cibles = [...this.deletionSelection.values()];
        const affectedModelIds = this.selectedDeletionRows.map(row => row.modelId);
        this.busy = true; this.deletionError = ''; this.error = '';
        this.api.post<CircuitDeletionResult>('modeles/suppression', {cibles}).subscribe({
            next: result => {
                this.busy = false;
                if (this.model?.id && affectedModelIds.includes(this.model.id)) { this.model = undefined; this.simulation = undefined; }
                this.closeDeletion(); this.load();
                this.success = `${result.circuitsSupprimes} circuit(s) et ${result.publicationsSupprimees} version(s) supprimé(s).`;
            },
            error: e => {
                this.fail(e); this.deletionError = this.error;
                this.deletionConfirm = false; this.deletionSelection.clear();
                // Relire les affectations et versions après un refus ou une modification concurrente.
                this.load();
            }
        });
    }
    editModel(m?: Model) { this.model = m ? structuredClone(m) : { libelle: '', description: '', definition: { mode: 'LIBRE', politiqueRefus: '', dgObligatoire: null, etapes: [] }, publications: [] }; this.persistedModel = m ? this.signature(this.model!) : ''; this.procedure = undefined; this.simulation = undefined; this.publicationReason = ''; this.success = ''; }
    clone(m: Model) { this.editModel(m); this.model!.id = undefined; this.model!.version = undefined; this.model!.libelle = m.libelle + ' — copie'; this.model!.publications = []; }
    changeMode() { if (!this.model)
        return; this.model.definition.etapes = []; this.model.definition.dgObligatoire = this.model.definition.mode==='HIERARCHIQUE' ? false : null; this.simulation = undefined; }
    addStep() { this.model?.definition.etapes.push({ libelle: '', selection: 'FONCTION', fonction: null, departementId: null, serviceId: null, agenceId: null, departementDemandeur: false, utilisateurs: [], fonctionsDemandeur: [], delaiJours: null }); }
    move(index: number, delta: number) { const list = this.model?.definition.etapes; if (!list || this.busy)
        return; const target = index + delta; if (target < 0 || target >= list.length)
        return; const [item] = list.splice(index, 1); list.splice(target, 0, item); this.simulation = undefined; this.announcement = 'étape déplacée en position ' + (target + 1); }
    drag(event: DragEvent, index: number) { if (this.busy)
        return; this.dragIndex = index; event.dataTransfer?.setData('text/plain', String(index)); if (event.dataTransfer)
        event.dataTransfer.effectAllowed = 'move'; }
    drop(event: DragEvent, target: number) { event.preventDefault(); if (this.dragIndex !== null)
        this.move(this.dragIndex, target - this.dragIndex); this.dragIndex = null; }
    removeStep(index: number) { this.model?.definition.etapes.splice(index, 1); this.simulation = undefined; }
    toggle(step: Step, key: 'utilisateurs' | 'fonctionsDemandeur', id: string, checked: boolean) { step[key] = checked ? [...new Set([...step[key], id])] : step[key].filter(x => x !== id); }
    saveModel() { if (!this.model || this.busy)
        return; if (!this.model.libelle.trim() || !this.model.definition.politiqueRefus) {
        this.error = 'Le nom et le traitement du refus sont obligatoires.';
        return;
    } const input = { ...this.model, definition: { ...this.model.definition, dgObligatoire: this.model.definition.mode === 'LIBRE' ? null : this.model.definition.dgObligatoire } }; this.perform(this.model.id ? this.api.put<Model>('modeles/' + this.model.id, input) : this.api.post<Model>('modeles', input), m => { this.model = m; this.persistedModel = this.signature(m); this.simulation = undefined; this.load(); }, 'Brouillon du circuit enregistré.'); }
    publish() { if (!this.model?.id || this.busy)
        return; if (this.signature(this.model) !== this.persistedModel) {
        this.error = 'Enregistrez vos modifications avant de publier.';
        return;
    } if (!this.publicationReason.trim()) {
        this.error = 'Justifiez la publication après vérification du circuit.';
        return;
    } if (this.alreadyPublished) { this.error = 'Ce contenu est déjà publié. Modifiez le brouillon avant une nouvelle publication.'; return; }
    this.perform(this.api.post<Model>('modeles/' + this.model.id + '/publier', { version: this.model.version, justification: this.publicationReason }), m => { this.model = m; this.persistedModel = this.signature(m); this.publicationReason = ''; this.load(); }, 'Version publiée. Affectez-la à une démarche.'); }
    simulate() { if (!this.model?.id || !this.simulationAgent || this.busy)
        return; if (this.signature(this.model) !== this.persistedModel) {
        this.error = 'Enregistrez vos modifications avant de simuler.';
        return;
    } this.perform(this.api.get('modeles/' + this.model.id + '/simulation?agentId=' + encodeURIComponent(this.simulationAgent)), r => this.simulation = r, 'Simulation du brouillon enregistré effectuée.'); }
    editProcedure(p?: Procedure) { this.procedure = p ? structuredClone(p) : { code: '', libelle: '', description: '', domaine: 'GENERIQUE', publicationId: '', actif: false, champs: [] }; this.model = undefined; this.success = ''; }
    domainChange() { if (this.procedure && this.procedure.domaine !== 'GENERIQUE') {
        this.procedure.code = this.procedure.domaine;
        this.procedure.champs = [];
    } }
    allowedPublications() { return this.publications.filter(p => this.procedure?.domaine === 'GENERIQUE' || p.definition.mode === 'HIERARCHIQUE'); }
    addField() { this.procedure?.champs.push({ cle: '', libelle: '', type: 'TEXTE', obligatoire: false, choix: [] }); }
    choices(f: Field, value: string) { f.choix = value.split('\n').map(x => x.trim()).filter(Boolean); }
    moveField(index: number, target: number) { const list = this.procedure?.champs; if (!list || target < 0 || target >= list.length || this.busy)
        return; const [item] = list.splice(index, 1); list.splice(target, 0, item); this.announcement = 'Champ déplacé en position ' + (target + 1); }
    dropField(event: DragEvent, target: number) { event.preventDefault(); if (this.fieldDrag !== null)
        this.moveField(this.fieldDrag, target); this.fieldDrag = null; }
    saveProcedure() { if (!this.procedure || this.busy)
        return; this.perform(this.procedure.id ? this.api.put<Procedure>('demarches/' + this.procedure.id, this.procedure) : this.api.post<Procedure>('demarches', this.procedure), p => { this.procedure = p; this.load(); }, 'Affectation enregistrée. Les dossiers existants conservent leur version.'); }
    newRequest(p: Procedure) {
        this.creationKey = this.api.key(); this.request = { demarcheId: p.id!, titre: '', valeurs: {}, champs: structuredClone(p.champs) }; this.selected = undefined; this.error = ''; this.success = ''; }
    editRequest(d: Dossier) { this.request = { id: d.id, version: d.version, demarcheId: d.demarcheId, titre: d.titre, valeurs: { ...d.valeurs }, champs: d.champs }; this.selected = undefined; }
    saveRequest() { if (!this.request || this.busy)
        return; const { champs, ...input } = this.request; this.perform(this.request.id ? this.api.put<Dossier>('dossiers/' + this.request.id, input) : this.api.post<Dossier>('dossiers', input, this.creationKey || (this.creationKey=this.api.key())), d => { this.request = undefined; this.selected = d; this.load(); }, 'Brouillon enregistré. Vérifiez le dossier avant soumission.'); }
    detail(d: Dossier) { if (this.busy)
        return; this.perform(this.api.get<Dossier>('dossiers/' + d.id), r => { this.selected = r; this.request = undefined; this.comment = ''; }, ''); }
    action(d: Dossier, action: string) { if (this.busy)
        return; if (action === 'REJETER' && !this.comment.trim()) {
        this.error = 'Le motif du refus est obligatoire.';
        return;
    } this.perform(this.api.post<Dossier>('dossiers/' + d.id + '/' + action.toLowerCase(), { version: d.version, cle: this.api.key(), etape: d.circuit?.etapeCourante, commentaire: this.comment }), r => { this.selected = r; this.comment = ''; this.load(); }, 'Action enregistrée.'); }

    upload(event: Event) {
        const input=event.target as HTMLInputElement;
        const file=input.files?.[0];
        if(file)this.uploadFile(file);
        input.value='';
    }
    dropFile(event: DragEvent) {
        event.preventDefault();
        if(event.dataTransfer?.files.length!==1){this.error='Déposez un seul document à la fois.';return;}
        this.uploadFile(event.dataTransfer.files[0]);
    }
    uploadFile(file:File) {
        if(!this.selected || this.busy || !this.selected.actions.includes('PIECE'))return;
        if(file.size===0 || file.size>5*1024*1024){this.error='Le document doit peser au plus 5 Mo.';return;}
        const form=new FormData();form.append('fichier',file);
        this.perform(this.api.post<Dossier>('dossiers/'+this.selected.id+'/pieces?version='+this.selected.version,form),d=>this.selected=d,'Pièce ajoutée.');
    }
    removePiece(id: string) { if (!this.selected || this.busy)
        return; this.perform(this.api.delete<Dossier>('dossiers/' + this.selected.id + '/pieces/' + id + '?version=' + this.selected.version), r => this.selected = r, 'Pièce retirée du brouillon.'); }
    download(id: string, name: string) { this.perform(this.api.file(id), blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }, ''); }
    perform<T>(request: Observable<T>, done: (r: T) => void, message: string) { if (this.busy)
        return; this.busy = true; this.error = ''; request.subscribe({ next: r => { this.busy = false; done(r); this.success = message; }, error: e => { this.fail(e); if (e.status === 409 && this.selected)
            this.api.get<Dossier>('dossiers/' + this.selected.id).subscribe({ next: d => this.selected = d, error: () => { } }); } }); }
    signature(m: Model) { return JSON.stringify({ libelle: m.libelle, description: m.description, definition: m.definition }); }
    fail(e: any) { this.busy = false; this.loading = false; this.error = e?.error?.message || e?.error?.detail || 'L’opération a échoué. Réessayez ou contactez votre administrateur.'; }
}
