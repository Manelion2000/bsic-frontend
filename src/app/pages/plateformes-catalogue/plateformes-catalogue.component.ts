import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, switchMap } from 'rxjs';
import { PlateformesService, PlateformeConfiguration, PlateformeDetail, PlateformeEcriture, PlateformeFiltre, PlateformeManuel, ManuelSelection, PlateformePage, PlateformeReference, PlateformeRevision } from '../../services/plateformes.service';
import { extractErrorMessage } from '../../shared/error.utils';

type Tab = 'general' | 'responsables' | 'exploitation' | 'architecture' | 'documents' | 'historique';
interface Field {key: string; label: string; type?: 'date' | 'number' | 'textarea'; max?: number; hint?: string;}
@Component({selector:'app-plateformes-catalogue',standalone:true,imports:[CommonModule,FormsModule],
  templateUrl:'./plateformes-catalogue.component.html',styleUrl:'./plateformes-catalogue.component.scss'})
export class PlateformesCatalogueComponent implements OnInit, OnDestroy {
  private api = inject(PlateformesService);private router = inject(Router);private route = inject(ActivatedRoute);
  @ViewChild('ficheDialog',{static:true}) dialog!: ElementRef<HTMLDialogElement>;
  config?: PlateformeConfiguration;data?: PlateformePage;detail?: PlateformeDetail;draft?: PlateformeEcriture;
  dependencies: PlateformeReference[] = [];history: PlateformeRevision[] = [];historyPage = 0;historyLoading = false;
  pendingManuels: ManuelSelection[] = [];manuelsRetires: string[] = [];draggingManuels = false;downloadingManuel = '';
  private downloadSub?: Subscription;
  filter: PlateformeFiltre = {recherche:'',categorie:'',cycleVie:'',criticite:'',departementId:'',archivees:false,page:0,size:20};
  loading = false;opening = false;saving = false;editing = false;tab: Tab = 'general';error = '';dialogError = '';message = '';
  archiveAction = false;archiveMotif = '';private loadSub?: Subscription;private detailSub?: Subscription;private historySub?: Subscription;private routeSub?: Subscription;private dependencySub?: Subscription;
  readonly tabs: {id: Tab;label: string}[] = [{id:'general',label:'Vue générale'},{id:'responsables',label:'Responsabilités'},
    {id:'exploitation',label:'Exploitation'},{id:'architecture',label:'Architecture'},{id:'documents',label:'Documentation'},{id:'historique',label:'Historique'}];
  readonly categories = ['APPLICATION','INFRASTRUCTURE','SECURITE','COLLABORATION','DONNEES','AUTRE'];
  readonly cycles = ['A_QUALIFIER','EN_PROJET','EN_SERVICE','EN_FIN_DE_VIE','RETIREE'];
  readonly criticites = ['A_QUALIFIER','FAIBLE','MODEREE','ELEVEE','CRITIQUE'];
  readonly hebergements = ['A_QUALIFIER','INTERNE','CLOUD_PRIVE','CLOUD_PUBLIC','SAAS','HYBRIDE'];
  readonly environnements = ['PRODUCTION','PREPRODUCTION','RECETTE','DEVELOPPEMENT','SECOURS'];
  readonly generalFields: Field[] = [{key:'fonctionnalites',label:'Fonctionnalités principales',type:'textarea',max:5000},
    {key:'population',label:'Utilisateurs et activités concernés',type:'textarea',max:2000}];
  readonly exploitationFields: Field[] = [{key:'editeur',label:'Éditeur / fournisseur',max:200},{key:'versionLogicielle',label:'Version du logiciel',max:100},
    {key:'technologies',label:'Technologies et composants',type:'textarea',max:2000},{key:'contactSupport',label:'Contact et canal de support',max:500},
    {key:'exploitation',label:'Exploitation et maintenance',type:'textarea',max:5000,hint:'Horaires, supervision, tâches récurrentes et procédure d’escalade.'},
    {key:'sauvegarde',label:'Sauvegarde et restauration',type:'textarea',max:3000},{key:'continuite',label:'Continuité et reprise',type:'textarea',max:3000},
    {key:'rtoMinutes',label:'Délai cible de reprise (RTO), en minutes',type:'number'},{key:'rpoMinutes',label:'Perte de données cible (RPO), en minutes',type:'number'},
    {key:'dateMiseService',label:'Date de mise en service',type:'date'},{key:'dateFinSupport',label:'Fin de support',type:'date'},
    {key:'dateProchaineRevue',label:'Prochaine revue de la fiche',type:'date'}];
  private readonly labels: Record<string,string> = {A_QUALIFIER:'À qualifier',EN_PROJET:'En projet',EN_SERVICE:'En service',EN_FIN_DE_VIE:'En fin de vie',RETIREE:'Retirée',
    APPLICATION:'Application',INFRASTRUCTURE:'Infrastructure',SECURITE:'Sécurité',COLLABORATION:'Collaboration',DONNEES:'Données',AUTRE:'Autre',FAIBLE:'Faible',MODEREE:'Modérée',ELEVEE:'Élevée',CRITIQUE:'Critique',
    INTERNE:'Interne',CLOUD_PRIVE:'Cloud privé',CLOUD_PUBLIC:'Cloud public',SAAS:'SaaS',HYBRIDE:'Hybride',PRODUCTION:'Production',PREPRODUCTION:'Préproduction',RECETTE:'Recette',DEVELOPPEMENT:'Développement',SECOURS:'Secours',
    CREATION:'Création',MODIFICATION:'Modification',ARCHIVAGE:'Archivage',RESTAURATION:'Restauration',REPRISE:'Reprise de la fiche existante'};
  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe(params => {const id = params.get('id');if(id)this.open(id);else this.close(false);});
    this.reload();
  }
  ngOnDestroy(){[this.loadSub,this.detailSub,this.historySub,this.routeSub,this.dependencySub,this.downloadSub].forEach(s=>s?.unsubscribe());this.dialog.nativeElement.close();}
  label(value?: string){return value?this.labels[value]||value:'Non renseigné';}
  text(value: unknown){return value === undefined || value === null || value === '' ? 'Non renseigné' : String(value);}
  overdue(value?: string){const now = new Date();const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;return !!value && value < today;}
  reload(page = 0) {
    this.loadSub?.unsubscribe();this.loading = true;this.error = '';this.data = undefined;this.filter.page = page;
    this.loadSub = this.api.configuration().pipe(switchMap(config => {
      this.config = config;if(!config.consulter)throw {error:{message:'Votre permission de consultation a été retirée.'},status:403};
      return this.api.list({...this.filter,recherche:this.filter.recherche.trim()});
    })).subscribe({next:page=>{this.data = page;this.loading = false;},error:e=>{this.loading = false;this.error = extractErrorMessage(e,'Le catalogue est indisponible.');if(e.status===401||e.status===403)this.close();}});
  }
  navigate(id: string){if(this.saving||this.editing)return;this.router.navigate(['/informatique/plateformes',id]);}
  open(id: string) {
    this.resetManuels();
    this.detailSub?.unsubscribe();this.opening = true;this.detail = undefined;this.draft = undefined;this.editing = false;this.tab = 'general';this.dialogError = '';this.archiveAction = false;
    this.historySub?.unsubscribe();this.history = [];this.historyPage = 0;this.historyLoading = false;
    this.detailSub = forkJoin({config:this.api.configuration(),detail:this.api.detail(id)}).subscribe({next:({config,detail})=>{
      this.config = config;this.detail = detail;this.opening = false;if(!this.dialog.nativeElement.open)this.dialog.nativeElement.showModal();
    },error:e=>{this.opening = false;this.error = extractErrorMessage(e,'La plateforme est inaccessible.');if(e.status===401||e.status===403)this.data = undefined;this.close();}});
  }
  create() {
    if(!this.config?.gerer)return;this.detail = undefined;this.editing = true;this.tab = 'general';this.dialogError = '';this.archiveAction = false;
    this.resetManuels();
    this.draft = {code:'',nom:'',description:'',typePlateforme:'RESEAUX',idCircuit:'',departementId:'',responsableMetierId:'',responsableTechniqueId:'',
      fiche:{categorie:'APPLICATION',cycleVie:'A_QUALIFIER',criticite:'A_QUALIFIER',hebergement:'A_QUALIFIER',environnements:[],liens:[]},dependanceIds:[],motif:''};
    this.loadDependencies();if(!this.dialog.nativeElement.open)this.dialog.nativeElement.showModal();
  }
  edit() {
    if(!this.config?.gerer||!this.detail||this.detail.archivee)return;const d = this.detail;
    this.resetManuels();
    this.draft = {code:d.code,nom:d.nom,description:d.description,typePlateforme:d.typePlateforme||'RESEAUX',idCircuit:d.circuit?.id||'',
      departementId:d.departement?.id||'',responsableMetierId:d.responsableMetier?.id||'',responsableTechniqueId:d.responsableTechnique?.id||'',
      fiche:structuredClone(d.fiche),dependanceIds:d.dependances.map(x=>x.id),version:d.version,motif:''};
    this.editing = true;this.tab = 'general';this.dialogError = '';this.loadDependencies();
  }
  private loadDependencies() {
    this.dependencySub?.unsubscribe();this.dependencies = [];
    // Charge toutes les pages : la sélection ne doit pas se limiter aux 20 premières plateformes.
    const rows: PlateformeReference[] = [];
    const load = (page: number) => this.dependencySub = this.api.list({recherche:'',categorie:'',cycleVie:'',criticite:'',departementId:'',archivees:false,page,size:100}).subscribe({
      next:data=>{rows.push(...data.content.filter(p=>p.id!==this.detail?.id).map(p=>({id:p.id,nom:`${p.code} — ${p.nom}`,actif:true})));
        if(page+1<data.totalPages)load(page+1);else this.dependencies = rows;},error:e=>this.dialogError = extractErrorMessage(e,'Impossible de charger les dépendances.')});
    load(0);
  }
  save(form: NgForm) {
    if(this.saving||!this.draft||!this.config?.gerer)return;
    if(this.pendingManuels.some(m=>!m.titre.trim())){this.tab = 'documents';this.dialogError = 'Donnez un titre à chaque manuel sélectionné.';return;}
    if(form.invalid){form.control.markAllAsTouched();this.dialogError = 'Complétez le code, le nom et le motif, puis vérifiez les autres rubriques.';return;}
    this.saving = true;this.dialogError = '';
    this.detailSub = this.api.save(this.draft,this.detail?.id,{ajouts:this.pendingManuels,retraits:this.manuelsRetires}).subscribe({next:d=>{this.saving = false;this.editing = false;this.draft = undefined;this.detail = d;this.resetManuels();
      this.message = 'Fiche enregistrée.';this.history = [];this.reload();this.router.navigate(['/informatique/plateformes',d.id]);},error:e=>{
      this.saving = false;this.dialogError = extractErrorMessage(e,'Impossible d’enregistrer la fiche.');if(e.status===401||e.status===403){this.config = undefined;this.data = undefined;this.close();}}});
  }
  cancelEdit(){if(this.saving)return;this.resetManuels();if(!this.detail)this.close();else{this.editing = false;this.draft = undefined;this.dialogError = '';}}
  close(navigate = true){if(this.saving)return;this.resetManuels();this.dialog.nativeElement.close();this.detailSub?.unsubscribe();this.historySub?.unsubscribe();this.dependencySub?.unsubscribe();this.detail = undefined;this.draft = undefined;this.editing = false;this.opening = false;this.archiveAction = false;if(navigate)this.router.navigate(['/informatique/plateformes']);}
  setTab(tab: Tab){this.tab = tab;if(tab==='historique'&&this.detail&&!this.history.length)this.loadHistory();}
  loadHistory(page = 0){if(!this.detail||this.historyLoading)return;this.historyLoading = true;this.historySub = this.api.history(this.detail.id,page).subscribe({
    next:r=>{this.history = r;this.historyPage = page;this.historyLoading = false;},error:e=>{this.historyLoading = false;this.dialogError = extractErrorMessage(e,'Historique indisponible.');}});}
  changeArchive(){if(!this.detail||this.saving||!this.config?.gerer||!this.archiveMotif.trim())return;this.saving = true;this.dialogError = '';
    this.detailSub = this.api.archive(this.detail,this.archiveMotif,this.detail.archivee).subscribe({next:d=>{this.detail = d;this.saving = false;this.archiveAction = false;this.archiveMotif = '';this.history = [];this.filter.archivees = d.archivee;this.reload();},
      error:e=>{this.saving = false;this.dialogError = extractErrorMessage(e,'Cette opération est bloquée.');if(e.status===401||e.status===403){this.config = undefined;this.data = undefined;this.close();}}});}
  toggleDependency(id: string,checked: boolean){if(!this.draft)return;this.draft.dependanceIds = checked ? [...new Set([...this.draft.dependanceIds,id])] : this.draft.dependanceIds.filter(x=>x!==id);}
  addEnvironment(){if(this.draft&&this.draft.fiche.environnements.length<12)this.draft.fiche.environnements.push({type:'PRODUCTION',nom:'',url:'',description:''});}
  addLink(){if(this.draft&&this.draft.fiche.liens.length<20)this.draft.fiche.liens.push({titre:'',url:''});}
  get visibleManuels(){return (this.detail?.manuels||[]).filter(m=>!this.manuelsRetires.includes(m.id));}
  fileSize(bytes: number){return bytes>=1024*1024 ? `${(bytes/(1024*1024)).toLocaleString('fr-FR',{maximumFractionDigits:1})} Mo` : `${Math.max(1,Math.ceil(bytes/1024))} Ko`;}
  selectManuels(event: Event){const input = event.target as HTMLInputElement;this.queueManuels(Array.from(input.files||[]));input.value = '';}
  dragManuels(event: DragEvent){event.preventDefault();if(this.editing&&!this.saving)this.draggingManuels = true;}
  dropManuels(event: DragEvent){event.preventDefault();this.draggingManuels = false;this.queueManuels(Array.from(event.dataTransfer?.files||[]));}
  queueManuels(files: File[]) {
    if(!this.editing||this.saving||!this.config?.gerer)return;const errors: string[] = [];this.dialogError = '';
    for(const file of files) {
      if(!/\.(pdf|docx)$/i.test(file.name)||!file.size||file.size>10*1024*1024){errors.push(`${file.name} : choisissez un PDF ou DOCX de 10 Mo maximum.`);continue;}
      if(this.pendingManuels.some(m=>m.file.name===file.name&&m.file.size===file.size&&m.file.lastModified===file.lastModified))continue;
      if(this.visibleManuels.length+this.pendingManuels.length>=20){errors.push('20 manuels maximum par plateforme.');break;}
      if(this.pendingManuels.reduce((total,m)=>total+m.file.size,0)+file.size>20*1024*1024){errors.push('La sélection ne doit pas dépasser 20 Mo par enregistrement.');continue;}
      this.pendingManuels.push({file,titre:file.name.replace(/\.(pdf|docx)$/i,'').slice(0,150),description:''});
    }
    this.dialogError = errors.join(' ');
  }
  removeManuel(id: string){if(this.editing&&!this.saving)this.manuelsRetires = [...new Set([...this.manuelsRetires,id])];}
  undoRemoveManuels(){if(!this.saving)this.manuelsRetires = [];}
  downloadManuel(manual: PlateformeManuel) {
    if(!this.detail||this.downloadingManuel)return;this.downloadingManuel = manual.id;this.dialogError = '';
    this.downloadSub = this.api.downloadManuel(this.detail.id,manual.id).subscribe({next:blob=>{
      const url = URL.createObjectURL(blob);const link = document.createElement('a');link.href = url;link.download = manual.nomFichier;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.downloadingManuel = '';
    },error:e=>{this.downloadingManuel = '';this.dialogError = extractErrorMessage(e,'Téléchargement du manuel impossible.');if(e.status===401||e.status===403){this.config = undefined;this.data = undefined;this.close();}}});
  }
  private resetManuels(){this.pendingManuels = [];this.manuelsRetires = [];this.draggingManuels = false;this.downloadSub?.unsubscribe();this.downloadingManuel = '';}
  ownerOptions(current?: PlateformeReference){return current&&!this.config?.responsables.some(r=>r.id===current.id)?[current,...(this.config?.responsables||[])]:this.config?.responsables||[];}
  departmentOptions(){const current = this.detail?.departement;return current&&!this.config?.departements.some(r=>r.id===current.id)?[current,...(this.config?.departements||[])]:this.config?.departements||[];}
  circuitOptions(){const current = this.detail?.circuit;return current&&!this.config?.circuits.some(r=>r.id===current.id)?[current,...(this.config?.circuits||[])]:this.config?.circuits||[];}
  fieldValue(field: Field){const value = this.detail?.fiche[field.key];return field.type==='date'&&value?new Date(String(value)+'T12:00:00').toLocaleDateString('fr-FR'):this.text(value);}
}
