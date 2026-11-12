import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ProcessusComponent } from './processus.component';
import { ProcessusService, Model, Dossier } from '../../services/processus.service';
describe('Circuits autonomes et démarches', () => {
    let api: jasmine.SpyObj<ProcessusService>;
    const template: Model = { id: 'm', version: 3, libelle: 'Courrier', description: 'Test', publications: [], definition: { mode: 'LIBRE', politiqueRefus: 'DEFINITIF', dgObligatoire: null, etapes: [{ libelle: 'Chef', selection: 'UTILISATEURS', fonction: null, departementId: null, serviceId: null, agenceId: null, departementDemandeur: false, utilisateurs: ['chief'], fonctionsDemandeur: [], delaiJours: null }, { libelle: 'Directeur', selection: 'UTILISATEURS', fonction: null, departementId: null, serviceId: null, agenceId: null, departementDemandeur: false, utilisateurs: ['director'], fonctionsDemandeur: [], delaiJours: null }] } };
    const dossier = { id: 'd', version: 4, titre: 'Dossier', etat: 'EN_ATTENTE', demarcheId: 'p', demarche: 'Courrier', demandeur: 'Agent', numero: 1, createdDate: '2026-10-08', valeurs: {}, champs: [], actions: ['APPROUVER', 'REJETER'], pieces: [], circuit: { etapeCourante: 1, etapes: [], historique: [], dgObligatoire: false, peutDecider: true } } as Dossier;
    beforeEach(async () => { api = jasmine.createSpyObj('ProcessusService', ['get', 'post', 'put', 'delete', 'key', 'file']); api.get.and.callFake((path: string) => of<any>(path === 'configuration' ? { gerer: true, demander: true, valider: true, auditer: false, agentId: 'agent', fonctions: ['AGENT'], agents: [] } : [])); api.post.and.returnValue(new Subject()); api.put.and.returnValue(new Subject()); api.key.and.returnValue('unique'); await TestBed.configureTestingModule({ imports: [ProcessusComponent], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } }, { provide: ProcessusService, useValue: api }] }).compileComponents(); });
    function fixture() { const f = TestBed.createComponent(ProcessusComponent); f.detectChanges(); return f; }
    it('réordonne par glisser-déposer et conserve les titulaires associés', () => { const c = fixture().componentInstance; c.editModel(template); c.dragIndex = 0; c.drop({ preventDefault: () => { } } as DragEvent, 1); expect(c.model!.definition.etapes.map(s => s.libelle)).toEqual(['Directeur', 'Chef']); expect(c.model!.definition.etapes[1].utilisateurs).toEqual(['chief']); expect(c.announcement).toContain('2'); });
    it('fournit un déplacement au clavier et empêche les déplacements hors limites', () => { const f = fixture(); const c = f.componentInstance; c.editModel(template); c.move(0, -1); expect(c.model!.definition.etapes[0].libelle).toBe('Chef'); c.move(1, -1); f.detectChanges(); expect(c.model!.definition.etapes[0].libelle).toBe('Directeur'); expect(f.nativeElement.querySelector('[aria-label="Monter l’étape"]')).toBeTruthy(); });
    it('refuse de publier ou simuler des modifications non enregistrées', () => { const c = fixture().componentInstance; c.editModel(template); c.model!.libelle = 'Autre'; c.publicationReason = 'Contrôle'; c.publish(); expect(api.post).not.toHaveBeenCalled(); expect(c.error).toContain('Enregistrez'); c.simulationAgent = 'agent'; const before = api.get.calls.count(); c.simulate(); expect(api.get.calls.count()).toBe(before); });
    it('transmet l’agent encodé au point de simulation du circuit enregistré', () => {
        const c = fixture().componentInstance;
        c.editModel(template);
        c.simulationAgent = 'agent+1';
        c.simulate();
        expect(api.get).toHaveBeenCalledWith('modeles/m/simulation?agentId=agent%2B1');
    });
    it('affiche les titulaires à configurer même si la simulation signale une permission manquante', () => {
        const f = fixture();
        const c = f.componentInstance;
        c.editModel(template);
        c.simulationAgent = 'agent';
        api.get.and.returnValue(of({blocage: 'Permission PROCESSUS_VALIDER manquante', circuit: {
            dgObligatoire: false, etapeCourante: 0, peutDecider: false, historique: [],
            etapes: [{type: 'LIBRE', libelle: 'Chef', statut: 'EN_ATTENTE', validateurs: [{id: 'chief', nom: 'Chef Exemple'}]}]
        }}));
        c.simulate();
        f.detectChanges();
        expect(f.nativeElement.textContent).toContain('Permission PROCESSUS_VALIDER manquante');
        expect(f.nativeElement.textContent).toContain('Chef Exemple');
    });
    it('publie la version enregistrée avec justification et bloque le double clic', () => { const c = fixture().componentInstance; c.editModel(template); c.publicationReason = 'Contrôle'; c.publish(); c.publish(); expect(api.post).toHaveBeenCalledTimes(1); expect(api.post).toHaveBeenCalledWith('modeles/m/publier', { version: 3, justification: 'Contrôle' }); });
    it('désactive le DG par défaut dans le mode RH sans inventer le traitement du refus', () => { const c = fixture().componentInstance; c.editModel(); expect(c.model!.definition.politiqueRefus).toBe(''); c.model!.definition.mode = 'HIERARCHIQUE'; c.changeMode(); expect(c.model!.definition.dgObligatoire).toBeFalse(); expect(c.model!.definition.etapes).toEqual([]); });
    it('ne montre aucune action de signature absente de la réponse serveur', () => { const f = fixture(); f.componentInstance.selected = { ...dossier, actions: [] }; f.detectChanges(); expect(f.nativeElement.textContent).not.toContain('Approuver'); expect(f.nativeElement.textContent).not.toContain('Refuser'); });
    it('exige un motif de refus sans appel réseau', () => { const c = fixture().componentInstance; c.action(dossier, 'REJETER'); expect(api.post).not.toHaveBeenCalled(); expect(c.error).toContain('motif'); });
    it('transmet la version et l’étape puis relit après un conflit', () => { const c = fixture().componentInstance; c.selected = dossier; api.post.and.returnValue(throwError(() => ({ status: 409, error: { message: 'Version modifiée' } }))); api.get.and.returnValue(of(dossier)); c.action(dossier, 'APPROUVER'); expect(api.post.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ version: 4, etape: 1, cle: 'unique' })); expect(api.get).toHaveBeenCalledWith('dossiers/d'); expect(c.error).toContain('Version'); });
    it('duplique le brouillon sans recopier les publications', () => { const c = fixture().componentInstance; c.clone({ ...template, publications: [{ id: 'v', numero: 1, libelle: 'Test', date: '2026-10-08', definition: template.definition }] }); expect(c.model!.id).toBeUndefined(); expect(c.model!.publications).toEqual([]); c.model!.definition.etapes[0].libelle = 'Autre'; expect(template.definition.etapes[0].libelle).toBe('Chef'); });

    it('contrôle le dépôt et transmet la version du dossier avec la pièce',()=>{
        const c=fixture().componentInstance;c.selected={...dossier,etat:'BROUILLON',actions:['PIECE']};
        c.uploadFile(new File([new Uint8Array(5*1024*1024+1)],'trop-grand.pdf',{type:'application/pdf'}));expect(api.post).not.toHaveBeenCalled();
        c.uploadFile(new File(['%PDF-1.4'],'document.pdf',{type:'application/pdf'}));expect(api.post.calls.mostRecent().args[0]).toBe('dossiers/d/pieces?version=4');expect(api.post.calls.mostRecent().args[1] instanceof FormData).toBeTrue();
    });
    it('filtre le catalogue sans élargir le périmètre obtenu du serveur', () => { const c = fixture().componentInstance; c.procedures = [{ code: 'COURRIER', libelle: 'Courrier interne', description: '', domaine: 'GENERIQUE', publicationId: 'v', actif: true, champs: [] }]; c.search = 'courrier'; expect(c.filteredProcedures.length).toBe(1); c.search = 'inconnu'; expect(c.filteredProcedures).toEqual([]); });

    describe('Workflow visuel intégré', () => {
        it('enregistre le nouvel ordre du brouillon avec sa version et les titulaires sans publier', () => {
            const f = fixture();const c = f.componentInstance;c.editModel(template);c.openWorkflow();f.detectChanges();
            const workflow = c.visualWorkflow!;workflow.move(0,1);const pending = new Subject<Model>();api.put.and.returnValue(pending);
            workflow.save();workflow.save();
            expect(api.put).toHaveBeenCalledTimes(1);expect(api.post).not.toHaveBeenCalled();
            const input = api.put.calls.mostRecent().args[1] as any;
            expect(api.put.calls.mostRecent().args[0]).toBe('modeles/m');expect(input.version).toBe(3);
            expect(input.definition.etapes.map((s: any) => s.libelle)).toEqual(['Directeur','Chef']);
            expect(input.definition.etapes[1].utilisateurs).toEqual(['chief']);expect(c.model!.definition.etapes[0].libelle).toBe('Chef');
            pending.next({...template, version: 4, definition: input.definition});pending.complete();f.detectChanges();
            expect(c.model!.version).toBe(4);expect(workflow.dirty).toBeFalse();expect(c.model!.definition.etapes[0].libelle).toBe('Directeur');workflow.close();
        });
        it('préserve la saisie et le modèle initial après un conflit de sauvegarde', () => {
            const f = fixture();const c = f.componentInstance;c.editModel(template);c.openWorkflow();f.detectChanges();
            c.visualWorkflow!.move(0,1);api.put.and.returnValue(throwError(() => ({status: 409,error: {message: 'La version a changé.'}})));
            c.visualWorkflow!.save();f.detectChanges();
            expect(c.busy).toBeFalse();expect(c.visualWorkflow!.dirty).toBeTrue();expect(c.model!.definition.etapes[0].libelle).toBe('Chef');
            expect(f.nativeElement.querySelector('.workflow-dialog .error').textContent).toContain('La version a changé');
            c.visualWorkflow!.close();expect(api.post).not.toHaveBeenCalled();
        });
        it('consulte les versions publiées et le circuit d’un dossier sans ouvrir la modification', () => {
            const f = fixture();const c = f.componentInstance;
            c.openPublishedWorkflow(template,{id:'v', numero:1,libelle:'Courrier',date:'2026-10-11',definition:template.definition});f.detectChanges();
            expect(c.visualWorkflow!.readOnly).toBeTrue();c.visualWorkflow!.move(0,1);c.visualWorkflow!.save();
            expect(api.put).not.toHaveBeenCalled();c.visualWorkflow!.close();
            const actual = {...dossier, circuit: {...dossier.circuit!, etapes: [{type:'DIRECTEUR',libelle:'Direction',statut:'EN_ATTENTE',validateurs:[{id:'director',nom:'Directeur Exemple'}]}]}};
            c.openDossierWorkflow(actual);f.detectChanges();expect(c.visualWorkflow!.nodes.map(n=>n.label)).toEqual(['Direction']);
            expect(c.visualWorkflow!.readOnly).toBeTrue();c.visualWorkflow!.close();
        });
        it('affiche le circuit RH renvoyé par le serveur et refuse la simulation des réglages non enregistrés', () => {
            const f = fixture();const c = f.componentInstance;
            const hierarchy: Model = {...template, definition: {mode:'HIERARCHIQUE',politiqueRefus:'DEFINITIF',dgObligatoire:false,etapes:[]}};
            c.editModel(hierarchy);c.openWorkflow();f.detectChanges();
            api.get.and.returnValue(of({circuit:{dgObligatoire:false,etapeCourante:0,etapes:[{type:'DGA',libelle:'Un DGA',statut:'EN_ATTENTE',validateurs:[{id:'ops',nom:'DGA Opérations'}]}],historique:[],peutDecider:false}}));
            c.simulateWorkflow({id:'m',agentId:'agent+1'});f.detectChanges();
            expect(api.get).toHaveBeenCalledWith('modeles/m/simulation?agentId=agent%2B1');expect(c.visualWorkflow!.nodes.map(n=>n.label)).toEqual(['Un DGA']);
            c.model!.definition.dgObligatoire=true;const count=api.get.calls.count();c.simulateWorkflow({id:'m',agentId:'agent'});
            expect(api.get.calls.count()).toBe(count);expect(c.workflowError).toContain('Enregistrez');c.visualWorkflow!.close();
        });
    });

    describe('Fenêtre de suppression', () => {
        const free: Model = {...template, id: 'free', libelle: 'Circuit inutile', supprimable: true};
        const used: Model = {...template, supprimable: false, blocageSuppression: 'Version 1 : affectée à Courrier.', publications: [
            {id: 'v2', version: 0, numero: 2, libelle: 'Courrier', date: '2026-10-10', definition: template.definition, supprimable: true},
            {id: 'v1', version: 0, numero: 1, libelle: 'Courrier', date: '2026-10-09', definition: template.definition, supprimable: false, blocageSuppression: 'Affectée à Courrier. Réaffectez cette démarche.'}
        ]};
        function deletionFixture(models = [free, used]) {
            const f = fixture();
            f.componentInstance.view = 'modeles';
            api.get.and.callFake((path: string) => of<any>(path === 'modeles' ? structuredClone(models) : []));
            f.componentInstance.models = structuredClone(models);
            f.detectChanges();
            return f;
        }
        function click(f: ReturnType<typeof fixture>, text: string) {
            const button = [...f.nativeElement.querySelectorAll('.deletion-dialog button')] as HTMLButtonElement[];
            button.find(b => b.textContent?.trim() === text)!.click();
            f.detectChanges();
        }
        it('ouvre une fenêtre accessible, explique les blocages et permet d’annuler sans suppression', () => {
            const f = deletionFixture();
            const open = [...f.nativeElement.querySelectorAll('button')].find((b: any) => b.textContent.trim() === 'Supprimer des circuits') as HTMLButtonElement;
            open.click(); f.detectChanges();
            const dialog = f.nativeElement.querySelector('.deletion-dialog') as HTMLDialogElement;
            expect(dialog.open).toBeTrue();expect(dialog.getAttribute('aria-labelledby')).toBe('deletion-title');
            const choices = dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
            expect(choices[0].disabled).toBeFalse();expect(choices[1].disabled).toBeTrue();
            expect(dialog.textContent).toContain('affectée à Courrier');
            choices[0].click(); f.detectChanges();expect(f.componentInstance.deletionSelection.size).toBe(1);
            click(f, 'Annuler');expect(dialog.open).toBeFalse();expect(api.post).not.toHaveBeenCalled();
        });
        it('supprime uniquement la version choisie après confirmation et bloque un double clic', () => {
            const f = deletionFixture();const c = f.componentInstance;
            c.openDeletion('PUBLICATION', 'm');f.detectChanges();
            const dialog = f.nativeElement.querySelector('.deletion-dialog') as HTMLDialogElement;
            dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();f.detectChanges();
            click(f, 'Continuer');expect(c.deletionConfirm).toBeTrue();expect(api.post).not.toHaveBeenCalled();
            expect(dialog.querySelector('.deletion-summary')!.textContent).toContain('version 2');
            expect(dialog.querySelector('.deletion-summary')!.textContent).not.toContain('version 1');
            const pending = new Subject<any>();api.post.and.returnValue(pending);
            click(f, 'Confirmer la suppression');c.deleteCircuits();
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('modeles/suppression', {cibles: [{type: 'PUBLICATION', id: 'v2', version: 0}]});
            expect(c.busy).toBeTrue();
            const cancel = new Event('cancel', {cancelable: true});dialog.dispatchEvent(cancel);
            expect(cancel.defaultPrevented).toBeTrue();expect(dialog.open).toBeTrue();
            api.get.and.callFake((path: string) => of<any>(path === 'modeles' ? [{...used, publications: [used.publications[1]]}] : []));
            pending.next({circuitsSupprimes: 0, publicationsSupprimees: 1});pending.complete();f.detectChanges();
            expect(dialog.open).toBeFalse();expect(c.models[0].publications.map(p => p.id)).toEqual(['v1']);
            expect(c.success).toContain('1 version');
        });
        it('conserve la sélection dans la confirmation lorsque la recherche change', () => {
            const f = deletionFixture();const c = f.componentInstance;c.openDeletion();f.detectChanges();
            c.toggleDeletion(c.deletionRows[0], true);c.deletionSearch = 'autre';c.reviewDeletion();f.detectChanges();
            expect(c.deletionRows.length).toBe(0);expect(c.selectedDeletionRows.map(r => r.label)).toEqual(['Circuit inutile']);
            c.closeDeletion();
        });
        it('limite le lot à 100 éléments tout en permettant de décocher une sélection', () => {
            const models = Array.from({length: 101}, (_, index) => ({...free, id: `circuit-${index}`, libelle: `Circuit ${index}`}));
            const f = deletionFixture(models);const c = f.componentInstance;c.openDeletion();
            c.deletionRows.slice(0,100).forEach(row => c.toggleDeletion(row,true));f.detectChanges();
            const choices = f.nativeElement.querySelectorAll('.deletion-dialog input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            expect(choices[0].disabled).toBeFalse();expect(choices[100].disabled).toBeTrue();
            choices[0].click();f.detectChanges();expect(c.deletionSelection.size).toBe(99);expect(choices[100].disabled).toBeFalse();c.closeDeletion();
        });
        it('garde la fenêtre ouverte et relit les blocages après un refus de l’API', () => {
            const f = deletionFixture();const c = f.componentInstance;c.openDeletion();
            c.toggleDeletion(c.deletionRows[0], true);c.reviewDeletion();
            api.post.and.returnValue(throwError(() => ({status: 409, error: {message: 'Circuit désormais affecté à une démarche.'}})));
            api.get.and.callFake((path: string) => of<any>(path === 'modeles' ? [{...free, supprimable: false, blocageSuppression: 'Circuit désormais affecté à une démarche.'}] : []));
            c.deleteCircuits();f.detectChanges();
            expect(f.nativeElement.querySelector('.deletion-dialog').open).toBeTrue();expect(c.busy).toBeFalse();
            expect(c.deletionSelection.size).toBe(0);expect(c.deletionConfirm).toBeFalse();
            expect(f.nativeElement.querySelector('.deletion-dialog').textContent).toContain('Circuit désormais affecté');
            expect(f.nativeElement.querySelector('.deletion-dialog input[type="checkbox"]').disabled).toBeTrue();c.closeDeletion();
        });
        it('réserve la suppression aux configurateurs et ne supprime rien sans confirmation', () => {
            const f = deletionFixture();const c = f.componentInstance;
            c.openDeletion();c.toggleDeletion(c.deletionRows[0], true);c.deleteCircuits();
            expect(api.post).not.toHaveBeenCalled();c.closeDeletion();
            c.config!.gerer = false;f.detectChanges();c.openDeletion();c.deleteCircuits();
            expect(f.nativeElement.querySelector('.page-header__actions .btn--danger')).toBeNull();
            expect(f.nativeElement.querySelector('.deletion-dialog').open).toBeFalse();expect(api.post).not.toHaveBeenCalled();
        });
        it('désactive une nouvelle publication lorsque le serveur indique un contenu déjà publié', () => {
            const f = deletionFixture();const c = f.componentInstance;c.editModel({...used, dejaPublie: true});c.publicationReason = 'Erreur';
            f.detectChanges();c.publish();expect(api.post).not.toHaveBeenCalled();expect(c.error).toContain('déjà publié');
            const publish = [...f.nativeElement.querySelectorAll('button')].find((b: any) => b.textContent.trim() === 'Publier') as HTMLButtonElement;
            expect(publish.disabled).toBeTrue();c.model!.libelle = 'Circuit modifié';expect(c.alreadyPublished).toBeFalse();
        });
    });
});
