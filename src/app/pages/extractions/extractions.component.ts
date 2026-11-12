import { Component, ElementRef, ViewChild, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { ExtractionsService, ExtractionConfiguration, ExtractionDetail, ExtractionEcriture, ExtractionLigne, ExtractionPage, OracleDetail, OracleEcriture, OracleEssai, OracleLigne } from '../../services/extractions.service';
import { extractErrorMessage } from '../../shared/error.utils';

type Action='prendre'|'executer'|'archiver'|'restaurer'|'annuler'|'';
@Component({selector:'app-extractions',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./extractions.component.html',styleUrl:'./extractions.component.scss'})
export class ExtractionsComponent implements OnInit,OnDestroy {
  private api=inject(ExtractionsService);
  @ViewChild('detailDialog',{static:true}) dialog!:ElementRef<HTMLDialogElement>;
  config?:ExtractionConfiguration; tab:'demandes'|'bibliotheque'='demandes'; loading=false; opening=false; busy=false; error=''; dialogError=''; message='';
  requestPage?:ExtractionPage<ExtractionLigne>; queryPage?:ExtractionPage<OracleLigne>;
  search=''; state=''; departmentId=''; queryDepartmentId=''; drafts=false; archives=false;
  requestDetail?:ExtractionDetail; queryDetail?:OracleDetail; requestDraft?:ExtractionEcriture; queryDraft?:OracleEcriture;
  action:Action=''; motif=''; selectedQuery=''; choices:OracleLigne[]=[]; choicesLoading=false;
  essai={executeLe:'',environnement:'RECETTE',resultat:'SUCCES' as 'SUCCES'|'ECHEC',referenceVerification:'',lignes:null as number|null,commentaire:''};
  states=['NOUVELLE','EN_COURS','TERMINEE','ANNULEE']; types=['TEXTE','DATE','NOMBRE']; environments=['RECETTE','PRODUCTION','SECOURS','AUTRE'];
  private listSub?:Subscription; private detailSub?:Subscription; private choicesSub?:Subscription; private configSub?:Subscription;
  ngOnInit(){this.refresh();}
  ngOnDestroy(){this.configSub?.unsubscribe();this.listSub?.unsubscribe();this.detailSub?.unsubscribe();this.choicesSub?.unsubscribe();}
  refresh(){if(this.busy)return;this.close();this.requestPage=undefined;this.queryPage=undefined;this.config=undefined;this.configSub?.unsubscribe();this.loading=true;this.error='';this.configSub=this.api.configuration().subscribe({next:c=>{this.config=c;if(!c.demander&&!c.bibliotheque){this.loading=false;this.denied();return;}this.tab=c.bibliotheque?'bibliotheque':'demandes';this.reload();},error:e=>{this.loading=false;this.error=extractErrorMessage(e,'Accès indisponible.');if(e.status===401||e.status===403)this.denied();}});}
  switchTab(tab:'demandes'|'bibliotheque'){if(this.tab===tab)return;this.tab=tab;this.search='';this.error='';this.reload();}
  reload(page=0){if(!this.config)return;this.listSub?.unsubscribe();this.loading=true;this.error='';
    if(this.tab==='demandes')this.listSub=this.api.requests({recherche:this.search,etat:this.state,departementId:this.departmentId,page,size:20}).subscribe({next:p=>{this.requestPage=p;this.loading=false;},error:e=>this.listError(e)});
    else this.listSub=this.api.library({recherche:this.search,departementId:this.queryDepartmentId,brouillons:this.drafts,archivees:this.archives,page,size:20}).subscribe({next:p=>{this.queryPage=p;this.loading=false;},error:e=>this.listError(e)});
  }
  private listError(e:any){this.loading=false;this.error=extractErrorMessage(e,'Chargement impossible.');if(e.status===401||e.status===403)this.denied();}
  private denied(){this.config=undefined;this.requestPage=undefined;this.queryPage=undefined;this.busy=false;this.close();this.error='Votre compte ne dispose plus des droits de cet espace.';}
  get departments(){return [...new Map((this.config?.demandeurs||[]).map(d=>[d.departement.id,d.departement])).values()];}
  get draftRequester(){return this.config?.demandeurs.find(d=>d.id===this.requestDraft?.demandeurId);}
  get draftDepartmentRef(){return this.config?.gerer?this.draftRequester?.departement:this.config?.departement;}
  get draftDepartmentId(){return this.draftDepartmentRef?.id||'';}
  get draftDepartment(){return this.draftDepartmentRef?.nom||(this.config?.gerer?'Choisissez un demandeur':'Rattachement requis dans l’annuaire');}
  get requestServices(){return (this.config?.services||[]).filter(s=>s.departementId===this.draftDepartmentId);}
  get queryServices(){return (this.config?.services||[]).filter(s=>s.departementId===this.queryDraft?.departementId);}
  get requestServiceUnavailable(){return !!this.requestDraft?.serviceId&&!this.requestServices.some(s=>s.id===this.requestDraft?.serviceId);}
  get queryServiceUnavailable(){return !!this.queryDraft?.serviceId&&!this.queryServices.some(s=>s.id===this.queryDraft?.serviceId);}
  onRequesterChange(){if(!this.requestDraft)return;const service=this.config?.gerer?this.draftRequester?.service:this.config?.service;this.requestDraft.serviceId=this.requestServices.some(s=>s.id===service?.id)?service!.id:'';}
  onQueryDepartmentChange(){if(this.queryDraft)this.queryDraft.serviceId='';}
  newRequest(){if(!this.config?.demander||this.busy)return;this.reset();this.requestDraft={titre:'',objectif:'',dateDemande:this.localDate(),demandeurId:this.config.gerer&&!this.config.demandeurs.some(u=>u.id===this.config?.moi.id)?'':this.config.moi.id,serviceId:'',echeance:null,periodeDebut:null,periodeFin:null,criteres:''};this.onRequesterChange();this.show();}
  newQuery(){if(!this.config?.gerer||this.busy)return;this.reset();this.queryDraft={titre:'',motCle:'',objectif:'',dateValidation:this.localDate(),departementId:'',serviceId:'',schemaCible:'',sqlTexte:'',parametres:[],motif:''};this.show();}
  openRequest(id:string){this.openDetail(this.api.request(id),'demande');}
  openQuery(id:string){this.openDetail(this.api.query(id),'requete');}
  private openDetail(source:Observable<any>,kind:'demande'|'requete'){if(this.busy)return;this.reset();this.opening=true;this.detailSub=source.subscribe({next:d=>{this.opening=false;if(kind==='demande')this.requestDetail=d;else this.queryDetail=d;this.show();},error:e=>{this.opening=false;this.error=extractErrorMessage(e,'Fiche inaccessible.');if(e.status===401||e.status===403)this.denied();}});}
  editQuery(clone=false){if(this.busy||!this.config?.gerer||!this.queryDetail||this.queryDetail.fiche.archivee)return;const q=this.queryDetail;
    this.queryDraft={titre:q.fiche.titre,motCle:q.fiche.motCle||'',objectif:q.fiche.objectif,dateValidation:q.fiche.dateValidation||'',departementId:q.fiche.departementDemandeur?.id||'',serviceId:q.fiche.serviceDemandeur?.id||'',schemaCible:q.schemaCible||'',sqlTexte:q.sqlTexte,parametres:structuredClone(q.parametres),version:clone?undefined:q.fiche.version,motif:''};if(clone)this.queryDetail=undefined;this.action='';this.dialogError='';
  }
  cancelEdit(){if(this.busy)return;if(this.queryDetail){this.queryDraft=undefined;this.dialogError='';}else this.close();}
  save(form:NgForm){if(this.busy||(!this.requestDraft&&!this.queryDraft))return;if(form.invalid){form.control.markAllAsTouched();this.dialogError='Complétez les champs obligatoires et vérifiez les dates.';return;}
    if(this.requestServiceUnavailable||this.queryServiceUnavailable){this.dialogError='Choisissez un service disponible du département demandeur, ou laissez le service non précisé.';return;}
    if(this.requestDraft){const d=this.requestDraft;this.perform(this.api.create({...d,echeance:d.echeance||null,periodeDebut:d.periodeDebut||null,periodeFin:d.periodeFin||null}),'demande');}
    else if(this.queryDraft)this.perform(this.api.saveQuery(this.queryDraft,this.queryDetail?.fiche.id),'requete');
  }
  addParameter(){if(this.queryDraft&&this.queryDraft.parametres.length<30)this.queryDraft.parametres.push({nom:'',type:'TEXTE',description:''});}
  begin(action:Action){if(this.busy)return;this.action=action;this.motif='';this.dialogError='';this.selectedQuery='';
    const d=new Date();this.essai={executeLe:this.localDateTime(d),environnement:'RECETTE',resultat:'SUCCES',referenceVerification:'',lignes:null,commentaire:''};
    if(action==='prendre')this.loadChoices();
  }
  private loadChoices(){this.choicesSub?.unsubscribe();this.choices=[];this.choicesLoading=true;const load=(page:number)=>this.choicesSub=this.api.library({recherche:'',brouillons:false,archivees:false,page,size:100}).subscribe({next:p=>{this.choices.push(...p.content);if(page+1<p.totalPages)load(page+1);else this.choicesLoading=false;},error:e=>{this.choicesLoading=false;this.dialogError=extractErrorMessage(e,'Bibliothèque indisponible.');if(e.status===401||e.status===403)this.denied();}});load(0);}
  submitAction(form:NgForm){if(this.busy)return;if(form.invalid){form.control.markAllAsTouched();return;}const a=this.action;
    if(a==='prendre'&&this.requestDetail)this.perform(this.api.take(this.requestDetail,this.selectedQuery,this.motif),'demande');
    else if(a==='annuler'&&this.requestDetail)this.perform(this.api.cancel(this.requestDetail,this.motif),'demande');
    else if((a==='archiver'||a==='restaurer')&&this.queryDetail)this.perform(this.api.queryAction(this.queryDetail,a,this.motif),'requete');
    else if(a==='executer'){
      const time=new Date(this.essai.executeLe);if(Number.isNaN(time.getTime())){this.dialogError='Date d’exécution invalide.';return;}
      const input:OracleEssai={...this.essai,executeLe:time.toISOString(),lignes:this.essai.lignes??null,version:this.requestDetail?.fiche.version||0};
      if(this.requestDetail)this.perform(this.api.execute(this.requestDetail,input),'demande');
    }
  }
  private perform(source:Observable<any>,kind:'demande'|'requete'){this.busy=true;this.dialogError='';this.detailSub=source.subscribe({next:d=>{this.busy=false;this.action='';this.requestDraft=undefined;this.queryDraft=undefined;if(kind==='demande')this.requestDetail=d;else this.queryDetail=d;this.message='Enregistrement effectué.';this.reload();},error:e=>{this.busy=false;this.dialogError=extractErrorMessage(e,'Enregistrement impossible.');if(e.status===401||e.status===403)this.denied();}});}
  reloadDetail(){if(this.busy)return;if(this.queryDetail)this.openQuery(this.queryDetail.fiche.id);else if(this.requestDetail)this.openRequest(this.requestDetail.fiche.id);}
  async copySql(sql:string){try{await navigator.clipboard.writeText(sql);this.message='SQL copié.';}catch{this.dialogError='La copie automatique est indisponible. Sélectionnez le texte SQL pour le copier.';}}
  downloadSql(sql:string,title:string,edition:number){const fileName=title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^[.-]+|[.-]+$/g,'').slice(0,80)||'requete';const url=URL.createObjectURL(new Blob([sql],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${fileName}-edition-${edition}.sql`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  label(value:string){const labels:Record<string,string>={NOUVELLE:'Nouvelle',EN_COURS:'En cours',TERMINEE:'Terminée',ANNULEE:'Annulée',SUCCES:'Réussie',ECHEC:'Échec',PRISE_EN_CHARGE:'Prise en charge',EXECUTION_SUCCES:'Exécution réussie',EXECUTION_ECHEC:'Exécution en échec',CREATION:'Création',ANNULATION:'Annulation',RECETTE:'Recette',PRODUCTION:'Production',SECOURS:'Secours',AUTRE:'Autre'};return labels[value]||value;}
  close(){if(this.busy)return;this.dialog?.nativeElement.close();this.reset();}
  private reset(){this.detailSub?.unsubscribe();this.choicesSub?.unsubscribe();this.requestDetail=undefined;this.queryDetail=undefined;this.requestDraft=undefined;this.queryDraft=undefined;this.action='';this.dialogError='';this.opening=false;this.choicesLoading=false;this.choices=[];}
  private show(){this.dialog.nativeElement.showModal();}
  localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  private localDateTime(d:Date){return `${this.localDate(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;}
}
