import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {Subject, takeUntil} from 'rxjs';
import {Balance, Calendar, CongesService, CongeConfiguration, Policy, Reference} from '../../services/conges.service';
import {extractErrorMessage} from '../../shared/error.utils';

export interface Field {key:string; label:string; type?:string; choices?:{id:any;nom:string}[]; optional?:boolean;}
const choices=(pairs:string[])=>pairs.map(v=>({id:v.split('|')[0],nom:v.split('|')[1]||v}));
const yesNo=[{id:true,nom:'Oui'},{id:false,nom:'Non'}];
const decimal=(key:string,label:string,optional=false):Field=>({key,label,optional,type:'decimal'});
const toggle=(key:string,label:string):Field=>({key,label,choices:yesNo});
const select=(key:string,label:string,pairs:string[],optional=false):Field=>({key,label,choices:choices(pairs),optional});
export const policyFields:Field[]=[
  select('unite','Unité de décompte',['JOUR|Jours','DEMI_JOUR|Demi-journées','HEURE|Heures']),select('attribution','Mode d’attribution',['DOTATION|Dotation','ACQUISITION|Acquisition à terme échu']),decimal('dotation','Volume de dotation',true),decimal('acquisitionParEcheance','Acquisition par échéance',true),select('frequence','Fréquence d’acquisition',['MENSUELLE|Mensuelle','TRIMESTRIELLE|Trimestrielle','ANNUELLE|Annuelle'],true),
  select('prorata','Proratisation de la période',['AUCUN|Aucune','JOURS_CALENDAIRES|Ratio de jours calendaires','JOURS_TRAVAILLES|Ratio de dates travaillées']),select('arrondi','Arrondi au pas de décompte',['UP|Supérieur','DOWN|Inférieur','HALF_UP|Au plus proche (demi supérieur)','HALF_EVEN|Au plus proche (demi pair)','UNNECESSARY|Aucun arrondi toléré']),decimal('pasDecompte','Pas de décompte'),select('priorite','Priorité de consommation',['EXPIRATION_PUIS_ORIGINE|Droits expirant le plus tôt, puis origine','ORIGINE_PUIS_EXPIRATION|Origine la plus ancienne, puis expiration']),
  select('expirationReservation','Droits réservés arrivant à expiration',['PROTEGER_JUSQUA_DECISION|Protéger jusqu’à la décision','BLOQUER_ET_SIGNALER|Bloquer le débit et signaler aux RH']),decimal('plafondAccumulation','Plafond d’accumulation',true),toggle('reportAutorise','Report autorisé'),decimal('plafondReport','Plafond de report',true),{key:'expirationReportJours',label:'Durée de validité du report (jours calendaires)',type:'number',optional:true},toggle('anticipationAutorisee','Prise anticipée autorisée'),decimal('plafondAnticipation','Plafond de prise anticipée par période',true),{key:'preavisJours',label:'Préavis (jours calendaires)',type:'number'},decimal('dureeMin','Durée minimale'),decimal('dureeMax','Durée maximale'),toggle('justificatifRequis','Justificatif requis'),toggle('demiJourneesAutorisees','Fractions matin / après-midi autorisées'),
  toggle('circuitAbsencesConfirme','Confirmer le circuit des absences pour les congés'),toggle('dgObligatoire','Ajouter la validation finale du DG (facultative, Non par défaut)'),select('politiqueRefus','Refus dans un groupe de validateurs',['DEFINITIF|Rejet définitif au premier refus','AUTRES_VALIDATEURS|Un autre validateur peut encore décider']),toggle('modeleReservationDebitConfirme','Confirmer : réservation à la soumission, débit final, libération au rejet/retrait'),toggle('rhGestionAdministrativeConfirmee','Confirmer : les RH contrôlent les droits et reprises sans signature obligatoire'),toggle('delegationsAutorisees','Délégations de chef/directeur autorisées'),select('annulation','Annulation RH autorisée',['INTERDITE|Interdite','RH_AVANT_DEBUT|Avant le début','RH_PARTIE_NON_PRISE|Avant le début et partie non prise via retour contrôlé']),toggle('modificationAvantDebutAutorisee','Modification / prolongation avant le départ'),toggle('retourAnticipeAutorise','Retour anticipé contrôlé autorisé'),toggle('confirmationRepriseRequise','Confirmation RH de reprise requise'),toggle('remplacementRequis','Remplaçant et prise en charge requis'),toggle('passationRequise','Fiche de passation requise'),toggle('chevauchementBloquant','Chevauchement d’indisponibilités bloquant')
];

@Component({selector:'app-conges-rh',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./conges-rh.component.html',styleUrl:'../conges/conges.component.scss'})
export class CongesRhComponent implements OnInit,OnDestroy {
  config?:CongeConfiguration; policies:Policy[]=[]; calendars:Calendar[]=[]; assignments:any[]=[]; balances:Balance[]=[]; coverage:any[]=[]; anomalies:any[]=[]; movements:any[]=[];
  busy=false;error='';message='';tab='politiques'; mode=''; confirmation?:{path:string;label:string};confirmed=false;confirmationReason='';delegations:any[]=[];
  form:Record<string,any>={}; rules:Record<string,any>={}; fields:Field[]=[]; readonly policyFields=policyFields;
  week:any[]=[];exceptions:any[]=[]; calendarZone='';coverageRules:any={};groups:any[]=[];functionRules:any[]=[];incompatibilities:any[]=[];
  importation:any={arrete:'',source:'',lignes:[]};importPreview:any;reviewedImport:any;
  readonly dayNames=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  readonly dayCodes=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
  readonly functions=choices(['AGENT|Agent','CHEF_SERVICE|Chef de service','DIRECTEUR|Directeur','DIRECTEUR_GENERAL_ADJOINT|DGA','DIRECTEUR_GENERAL|DG']);
  readonly portions=choices(['MATIN|Matin','APRES_MIDI|Après-midi']); readonly yesNo=yesNo;
  private destroyed=new Subject<void>();
  constructor(public api:CongesService){}
  ngOnInit(){this.api.configuration().pipe(takeUntil(this.destroyed)).subscribe({next:c=>{this.config=c;this.tab=this.has('POLITIQUES')?'politiques':'droits';this.load();},error:e=>this.fail(e)});}
  ngOnDestroy(){this.destroyed.next();this.destroyed.complete();}
  has(p:string){return this.config?.permissions.includes(`CONGES_${p}`)===true;}
  get refs():Reference[]{const scope=this.coverageRules.perimetre;return scope==='DEPARTEMENT'?this.config?.departements||[]:scope==='SERVICE'?this.config?.services||[]:this.config?.agences||[];}
  get canManageRights(){return this.has('DROITS');}
  load(){
    if(this.config?.administrateurTechnique)this.api.get<any[]>('delegations').pipe(takeUntil(this.destroyed)).subscribe({next:d=>this.delegations=d,error:e=>this.fail(e)});
    if(this.has('POLITIQUES'))for(const [path,key] of [['politiques','policies'],['calendriers','calendars'],['couverture','coverage']] as const)this.api.get<any[]>(path).pipe(takeUntil(this.destroyed)).subscribe({next:d=>this[key]=d,error:e=>this.fail(e)});
    if(this.has('DROITS')){this.api.get<any[]>('affectations').pipe(takeUntil(this.destroyed)).subscribe({next:d=>this.assignments=d,error:e=>this.fail(e)});this.api.get<Balance[]>('soldes').pipe(takeUntil(this.destroyed)).subscribe({next:d=>this.balances=d,error:e=>this.fail(e)});}
    if(this.has('DROITS')||this.has('AUDITER'))this.api.get<any[]>('anomalies').pipe(takeUntil(this.destroyed)).subscribe({next:d=>this.anomalies=d,error:e=>this.fail(e)});
    // Les gestionnaires de droits choisissent parmi les versions confirmees, sans permission de les modifier.
    if(this.has('DROITS')&&!this.has('POLITIQUES'))this.api.get<any>('referentiels-droits').pipe(takeUntil(this.destroyed)).subscribe({next:d=>{this.policies=d.politiques;this.calendars=d.calendriers;},error:e=>this.fail(e)});
  }
  open(mode:string){
    this.mode=mode;this.error='';this.form={};this.rules={};this.fields=[];
    const text=(key:string,label:string,optional=false):Field=>({key,label,optional});const date=(key:string,label:string,optional=false):Field=>({key,label,type:'date',optional});
    const refs=(key:string,label:string,values:any[]):Field=>({key,label,choices:values.map(v=>({id:v.id,nom:v.nom||v.agent||v.libelle||v.typeCode}))});
    if(mode==='politiques'){this.rules={dgObligatoire:false};this.fields=[text('typeCode','Code du type'),text('libelle','Libellé'),select('categorie','Catégorie',['CONGE_ANNUEL|Congé annuel','AUTRE_CONGE|Autre congé']),date('debutEffet','Début d’effet'),date('finEffet','Fin d’effet',true),text('sourceRh','Référence du document RH validé')];}
    if(mode==='calendriers'){this.fields=[text('nom','Nom de la version de calendrier'),date('debutEffet','Début d’effet'),date('finEffet','Fin d’effet',true),text('sourceRh','Source RH du calendrier')];this.week=this.dayCodes.map(jour=>({jour,worked:null,plages:[]}));this.exceptions=[];this.calendarZone='';}
    if(mode==='affectations')this.fields=[refs('agentId','Agent',this.config?.agents||[]),refs('politiqueId','Politique active',this.policies.filter(p=>p.etat==='ACTIVE')),refs('calendrierId','Calendrier confirmé',this.calendars.filter(c=>c.confirme)),date('debut','Début d’affectation'),date('fin','Fin d’affectation',true),date('dateEntree','Date d’entrée (requise pour proratisation)',true),date('dateSortie','Date de sortie',true),text('justification','Justification RH')];
    if(mode==='periodes')this.fields=[refs('affectationId','Agent / politique',this.assignments.map(a=>({...a,nom:`${a.agent} · ${a.typeCode} · ${a.debut}`}))),date('debut','Début de la période de référence'),date('fin','Fin de la période de référence'),date('expiration','Expiration des droits',true),text('source','Source RH'),text('justification','Justification')];
    if(mode==='ajustements')this.fields=[refs('droitId','Compteur',this.balances.map(b=>({...b,id:b.droitId,nom:`${b.agent} · ${b.typeCode} · ${b.origineDebut}`}))),decimal('quantite','Quantité signée (+ crédit, − correction)'),text('source','Source RH'),text('justification','Justification')];
    if(mode==='reports'){const lots=this.balances.map(b=>({...b,id:b.droitId,nom:`${b.agent} · ${b.typeCode} · ${b.origineDebut}`}));this.fields=[refs('sourceDroitId','Période source',lots),refs('cibleDroitId','Période cible',lots),text('justification','Justification')];}
    if(mode==='delegations')this.fields=[refs('idDelegant','Titulaire de la fonction',this.config?.agents||[]),refs('idDelegue','Délégué',this.config?.agents||[]),select('roleCode','Fonction déléguée',['BA_CHEF_SERVICE|Chef de service','BA_DIRECTEUR|Directeur']),refs('idDepartement','Département (facultatif)',this.config?.departements||[]),date('dateDebut','Début'),date('dateFin','Fin'),text('motif','Justification')];
    if(mode==='couverture'){this.fields=[text('nom','Nom de la règle'),date('debut','Début d’effet'),date('fin','Fin d’effet',true),text('sourceRh','Source RH')];this.coverageRules={};this.groups=[];this.functionRules=[];this.incompatibilities=[];}
    this.form['cle']=this.api.key();
  }
  addRange(row:any){row.plages.push({portion:null,debut:'',fin:'',poidsJour:''});}
  workChanged(row:any){if(row.worked===false)row.plages=[];}
  addException(){this.exceptions.push({date:'',libelle:'',worked:null,plages:[]});}
  save(){
    if(this.busy)return;let payload:any=this.clean(this.form);let path=this.mode;
    if(path==='politiques')payload.regles=this.clean(this.rules);
    if(path==='calendriers'){if(this.week.some(w=>w.worked===null)||this.exceptions.some(e=>e.worked===null)){this.error='Choisissez explicitement les jours travaillés et non travaillés.';return;}if([...this.week,...this.exceptions].some(w=>w.worked&& !w.plages.length)){this.error='Chaque journée travaillée doit avoir des plages horaires.';return;}payload.regles={fuseau:this.calendarZone,semaine:this.week.map(w=>({jour:w.jour,plages:w.plages})),exceptions:this.exceptions.map(e=>({date:e.date,libelle:e.libelle,plages:e.plages}))};}
    if(path==='couverture')payload.regles={...this.clean(this.coverageRules),minimumParFonction:Object.fromEntries(this.functionRules.map(r=>[r.fonction,r.minimum])),groupes:this.groups,incompatibilites:this.incompatibilities.map(g=>g.agents)};
    if(['periodes','ajustements','reports'].includes(path))path=`droits/${path}`;
    this.busy=true;this.api.post(path,this.clean(payload)).pipe(takeUntil(this.destroyed)).subscribe({next:()=>{this.busy=false;this.mode='';this.message='Enregistré. Une politique, un calendrier ou une règle reste inactif tant que sa confirmation RH n’a pas été donnée.';this.load();},error:e=>this.fail(e)});
  }
  confirm(path:string,label:string){this.confirmation={path,label};this.confirmed=false;this.confirmationReason='';}
  commitConfirmation(){if(this.busy||!this.confirmation||!this.confirmed||!this.confirmationReason.trim())return;this.busy=true;this.api.post(this.confirmation.path,{confirme:true,justification:this.confirmationReason}).pipe(takeUntil(this.destroyed)).subscribe({next:()=>{this.confirmation=undefined;this.busy=false;this.message='Confirmation enregistrée.';this.load();},error:e=>this.fail(e)});}
  due(){if(this.busy)return;this.busy=true;this.api.post('droits/traiter-echeances',{}).pipe(takeUntil(this.destroyed)).subscribe({next:()=>{this.busy=false;this.message='Échéances et expirations traitées sans doublon.';this.load();},error:e=>this.fail(e)});}
  history(id:string){this.api.get<any[]>(`droits/${id}/mouvements`).pipe(takeUntil(this.destroyed)).subscribe({next:m=>this.movements=m,error:e=>this.fail(e)});}
  revoke(id:string){this.api.remove(`delegations/${id}`).pipe(takeUntil(this.destroyed)).subscribe({next:()=>{this.message='Délégation révoquée. Les demandes conservent leur historique.';this.load();},error:e=>this.fail(e)});}
  addImportLine(){this.importation.lignes.push({cle:this.api.key(),affectationId:'',origineDebut:'',origineFin:'',expiration:null,solde:'',justification:''});this.importPreview=undefined;}
  simulateImport(){if(this.busy)return;this.busy=true;this.reviewedImport=this.clean(this.importation);this.api.post<any>('reprise/simuler',this.reviewedImport).pipe(takeUntil(this.destroyed)).subscribe({next:r=>{this.importPreview=r;this.busy=false;this.confirmed=false;this.confirmationReason='';},error:e=>this.fail(e)});}
  commitImport(){if(this.busy||!this.importPreview?.simulation.valide||!this.confirmed||!this.confirmationReason.trim())return;this.busy=true;this.api.post('reprise/confirmer',{importation:this.reviewedImport,empreinteSimulation:this.importPreview.empreinte,confirmation:{confirme:true,justification:this.confirmationReason}}).pipe(takeUntil(this.destroyed)).subscribe({next:()=>{this.busy=false;this.importPreview=undefined;this.importation={arrete:'',source:'',lignes:[]};this.message='Soldes repris avec provenance et audit. Aucun crédit d’acquisition supplémentaire n’est ajouté à cette reprise.';this.load();},error:e=>this.fail(e)});}
  private clean(value:any):any{if(Array.isArray(value))return value.map(v=>this.clean(v));if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,this.clean(v)]));if(typeof value==='string'&&/^[+-]?\d+(?:[.,]\d{1,4})?$/.test(value.trim()))return value.trim().replace(',','.');return value===''?null:value;}
  private fail(e:unknown){this.busy=false;this.error=extractErrorMessage(e,'Opération RH impossible.');}
}
