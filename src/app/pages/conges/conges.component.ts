import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {forkJoin, Subject, takeUntil} from 'rxjs';
import {CongesService, CongeConfiguration, LeaveInput, Leave, Balance, Simulation, Unavailability, Handover} from '../../services/conges.service';
import {RhCircuitComponent} from '../../shared/rh-circuit/rh-circuit.component';
import {extractErrorMessage} from '../../shared/error.utils';

@Component({selector: 'app-conges', standalone: true, imports: [CommonModule, FormsModule, RouterLink, RhCircuitComponent], templateUrl: './conges.component.html', styleUrl: './conges.component.scss'})
export class CongesComponent implements OnInit, OnDestroy {
  config?: CongeConfiguration; balances: Balance[] = []; mine: Leave[] = []; pending: Leave[] = []; administrative: Leave[] = []; planning: Unavailability[] = []; handovers: Handover[] = [];
  notifications: {id: string; demandeId: string; evenement: string; lueLe?: string}[] = [];
  selected?: Leave; simulation?: Simulation; editor = false; form: LeaveInput = this.empty(); tab = 'agent'; busy = false; loading = false; error = ''; message = '';
  reason = ''; returnDate = ''; returnPortion = ''; returnTime = ''; derogation = false; handover: Handover = {tachesEtEcheances: ''};
  filter = {debut: `${new Date().getFullYear()}-01-01`, fin: `${new Date().getFullYear()}-12-31`}; report: any;
  structure={type:'',id:''};
  readonly portions = [{id:'JOURNEE', nom:'Journée entière'},{id:'MATIN',nom:'Matin'},{id:'APRES_MIDI',nom:'Après-midi'}];
  private destroyed = new Subject<void>(); private createKey = '';
  constructor(public api: CongesService) {}
  ngOnInit() {this.loading = true; this.api.configuration().pipe(takeUntil(this.destroyed)).subscribe({next:c => {this.config = c; this.reload();}, error:e => this.fail(e)});}
  ngOnDestroy() {this.destroyed.next(); this.destroyed.complete();}
  has(p: string) {return this.config?.permissions.includes(`CONGES_${p}`) === true;}
  get isRh() {return ['POLITIQUES','DROITS','AUDITER','ANNULER'].some(p => this.has(p));}
  get hourly() {return this.config?.politiques.find(p => p.typeCode === this.form.typeCode)?.regles['unite'] === 'HEURE';}
  get types() {return this.config?.politiques.filter((p,i,all) => p.etat === 'ACTIVE' && all.findIndex(q => q.typeCode === p.typeCode && q.etat === 'ACTIVE') === i) || [];}
  get structures(){return this.structure.type==='departementId'?this.config?.departements||[]:this.structure.type==='serviceId'?this.config?.services||[]:this.structure.type==='agenceId'?this.config?.agences||[]:[];}
  get displayedPlanning(){return this.planning.filter(p=>!this.structure.type||!this.structure.id||(p as any)[this.structure.type]===this.structure.id);}
  reload() {
    this.loading = true;
    forkJoin({balances: this.api.get<Balance[]>('mes-soldes'), mine:this.api.get<Leave[]>('mes-demandes'), handovers:this.api.get<Handover[]>('mes-passations'), notifications:this.api.get<typeof this.notifications>('notifications')}).pipe(takeUntil(this.destroyed)).subscribe({next:d => {this.balances=d.balances;this.mine=d.mine;this.handovers=d.handovers;this.notifications=d.notifications;this.loading=false;}, error:e => this.fail(e)});
    if(this.has('VALIDER'))this.api.get<Leave[]>('a-valider').pipe(takeUntil(this.destroyed)).subscribe({next:d => this.pending=d,error:e=>this.fail(e)});
    if(['DROITS','AUDITER','ANNULER'].some(p=>this.has(p)))this.api.get<Leave[]>('administratif').pipe(takeUntil(this.destroyed)).subscribe({next:d=>this.administrative=d,error:e=>this.fail(e)});
  }
  start(d?: Leave, revision = false) {this.selected = d; this.editor=true;this.simulation=undefined;this.createKey=this.api.key();this.form=d ? {typeCode:d.typeCode,debut:d.debut,fin:d.fin,portionDebut:d.portionDebut,portionFin:d.portionFin,motif:d.motif,heureDebut:d.heureDebut,heureFin:d.heureFin,...(revision?{remplaceDemandeId:d.id}:{remplaceDemandeId:d.remplaceDemandeId,idBrouillon:d.id})} : this.empty();}
  clearSimulation() {this.simulation=undefined;}
  simulate() {if(this.busy)return;this.busy=true;this.error='';this.api.post<Simulation>('simulation',this.payload()).pipe(takeUntil(this.destroyed)).subscribe({next:s=>{this.simulation=s;this.busy=false;},error:e=>this.fail(e)});}
  draft() {
    if(this.busy||!this.simulation)return;this.busy=true;this.error='';
    const existing=this.form.idBrouillon ? this.selected : undefined;
    const request=existing ? this.api.put<Leave>(`demandes/${existing.id}`,{demande:this.payload(),operation:this.api.operation(existing)}) : this.api.post<Leave>('demandes',this.payload(),this.createKey);
    request.pipe(takeUntil(this.destroyed)).subscribe({next:d=>{this.selected=d;this.editor=false;this.busy=false;this.message='Brouillon enregistré. Ajoutez la passation et les pièces requises, puis soumettez.';this.reload();},error:e=>this.fail(e)});
  }
  select(d: Leave) {this.editor=false;this.simulation=undefined;this.reason='';this.derogation=false;this.returnDate=d.repriseDemandee||'';this.returnPortion=d.portionRepriseDemandee||'';this.returnTime=d.heureRepriseDemandee||'';this.api.get<Leave>(`demandes/${d.id}`).pipe(takeUntil(this.destroyed)).subscribe({next:v=>{this.selected=v;this.handover=v.passation?{...v.passation}:{tachesEtEcheances:''};},error:e=>this.fail(e)});}
  action(d: Leave, action: string) {
    if(this.busy)return;
    if(['REJETER','ANNULER','CONFIRMER_RETOUR','REFUSER_RETOUR','CONFIRMER_REPRISE'].includes(action)&&!this.reason.trim()){this.error='Une justification est obligatoire.';return;}
    if(action.includes('RETOUR')&&action!=='REFUSER_RETOUR'&&(!this.returnDate||!this.returnPortion)){this.error='Renseignez la date et la portion de reprise.';return;}
    this.busy=true;this.error='';const path=action.toLowerCase().replaceAll('_','-');
    this.api.post<Leave>(`demandes/${d.id}/${path}`,this.api.operation(d,{justification:this.reason,dateReprise:this.returnDate||null,portionReprise:this.returnPortion||null,heureReprise:this.returnTime||null,derogationCouverture:this.derogation})).pipe(takeUntil(this.destroyed)).subscribe({next:v=>{this.selected=v;this.busy=false;this.message='Opération enregistrée.';this.reload();},error:e=>{this.fail(e);this.api.get<Leave>(`demandes/${d.id}`).pipe(takeUntil(this.destroyed)).subscribe({next:v=>this.selected=v,error:()=>{}});}});
  }
  saveHandover() {if(!this.selected||this.busy)return;this.busy=true;this.api.put<Handover>(`demandes/${this.selected.id}/passation`,{...this.handover,remplacantId:this.handover.remplacantId||null}).pipe(takeUntil(this.destroyed)).subscribe({next:h=>{this.busy=false;this.handover=h;this.select(this.selected!);this.message='Passation enregistrée. Aucun accès applicatif n’est transféré.';},error:e=>this.fail(e)});}
  accept(h: Handover) {if(this.busy||!h.demandeId)return;this.busy=true;this.api.post(`demandes/${h.demandeId}/passation/accepter`,{}).pipe(takeUntil(this.destroyed)).subscribe({next:()=>{this.busy=false;this.reload();},error:e=>this.fail(e)});}
  upload(event: Event) {const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file||!this.selected||this.busy)return;this.busy=true;const body=new FormData();body.append('file',file);this.api.post(`demandes/${this.selected.id}/pieces`,body).pipe(takeUntil(this.destroyed)).subscribe({next:()=>{this.busy=false;input.value='';this.select(this.selected!);},error:e=>this.fail(e)});}
  removePiece(id: string) {this.api.remove(`pieces/${id}`).pipe(takeUntil(this.destroyed)).subscribe({next:()=>this.select(this.selected!),error:e=>this.fail(e)});}
  download(path: string,name: string) {this.api.download(path).pipe(takeUntil(this.destroyed)).subscribe({next:b=>this.api.saveFile(b,name),error:e=>this.fail(e)});}
  loadPlanning() {this.tab='planning';const query=`debut=${this.filter.debut}&fin=${this.filter.fin}`;this.api.get<Unavailability[]>(`planning?${query}`).pipe(takeUntil(this.destroyed)).subscribe({next:d=>this.planning=d,error:e=>this.fail(e)});if(this.has('PLANNING')||this.has('DROITS')||this.has('AUDITER'))this.api.get(`synthese?${query}`).pipe(takeUntil(this.destroyed)).subscribe({next:d=>this.report=d,error:e=>this.fail(e)});}
  wish() {this.api.post('souhaits',this.filter).pipe(takeUntil(this.destroyed)).subscribe({next:()=>{this.message='Souhait enregistré sans réservation ni débit.';this.loadPlanning();},error:e=>this.fail(e)});}
  removeWish(id: string) {this.api.remove(`souhaits/${id}`).pipe(takeUntil(this.destroyed)).subscribe({next:()=>this.loadPlanning(),error:e=>this.fail(e)});}
  openNotification(n: typeof this.notifications[number]) {this.api.post(`notifications/${n.id}/lire`,{}).pipe(takeUntil(this.destroyed)).subscribe({next:()=>{this.api.get<Leave>(`demandes/${n.demandeId}`).pipe(takeUntil(this.destroyed)).subscribe({next:d=>this.select(d),error:e=>this.fail(e)});this.reload();},error:e=>this.fail(e)});}
  private payload(): LeaveInput {return {...this.form,heureDebut:this.hourly?this.form.heureDebut:undefined,heureFin:this.hourly?this.form.heureFin:undefined};}
  private empty(): LeaveInput {return {typeCode:'',debut:'',fin:'',portionDebut:'',portionFin:''};}
  private fail(e: unknown) {this.error=extractErrorMessage(e,'Opération impossible.');this.busy=false;this.loading=false;}
}
