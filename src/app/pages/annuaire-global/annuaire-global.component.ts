import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, forkJoin } from 'rxjs';
import { AnnuaireService, BaAgenceDto, BaAnnuaireAgentDto, BaAnnuaireDepartementDto, BaDepartementDto, BaServiceDto } from '../../services/annuaire.service';
import { UsersService } from '../../services/users.service';
import { isAdministrator } from '../../services/administrator.guard';
import { DirectoryNavComponent } from '../../shared/directory-nav.component';
import { directoryMatches, directoryFunction, directoryInitials, directoryEmail, directoryTelephone } from '../../shared/directory.utils';
import { extractErrorMessage } from '../../shared/error.utils';

interface DirectoryContact extends BaAnnuaireAgentDto { departementId?: string; departementNom: string; key: number; }

@Component({selector:'app-annuaire-global', standalone:true, imports:[CommonModule,FormsModule,RouterLink,DirectoryNavComponent],
  templateUrl:'./annuaire-global.component.html',styleUrl:'./annuaire-global.component.scss'})
export class AnnuaireGlobalComponent implements OnInit, OnDestroy {
  @ViewChild('contactDialog',{static:true}) dialog!: ElementRef<HTMLDialogElement>;
  annuaire: BaAnnuaireDepartementDto[] = [];
  departements: BaDepartementDto[] = []; services: BaServiceDto[] = []; agences: BaAgenceDto[] = [];
  filters={departementId:'',serviceId:'',agenceId:''}; searchTerm=''; functionFilter='';
  view:'cards'|'list'='cards'; sort:'name'|'department'='name'; pageIndex=0; pageSize=12;
  message=''; refsError=''; feedback=''; loading=false; refsLoading=false; isPublicView=false; hasSearched=false; canManage=false;
  selected?: DirectoryContact;
  functionLabel=directoryFunction; initials=directoryInitials; emailLink=directoryEmail; phoneLink=directoryTelephone;
  private subscriptions=new Subscription(); private listSub?:Subscription; private searches=new Subject<void>();

  constructor(private api:AnnuaireService, private router:Router, private route:ActivatedRoute, private users:UsersService) {}
  ngOnInit(){
    this.isPublicView=this.router.url.split('?')[0]==='/'||this.router.url.startsWith('/annuaire-public');
    this.subscriptions.add(this.searches.pipe(debounceTime(250)).subscribe(()=>{if(this.isPublicView&&!this.hasSearched&&!this.loading&&this.hasActiveCriteria)this.load();}));
    if(!this.isPublicView)this.subscriptions.add(this.users.getUserWithMoreInfo().subscribe({next:u=>this.canManage=isAdministrator(u),error:()=>this.canManage=false}));
    this.loadRefs();
    this.subscriptions.add(this.route.queryParamMap.subscribe(params=>{
      this.filters={departementId:params.get('departementId')||'',serviceId:params.get('serviceId')||'',agenceId:params.get('agenceId')||''};
      if(!this.isPublicView||this.hasActiveCriteria)this.load();
    }));
  }
  ngOnDestroy(){this.subscriptions.unsubscribe();this.listSub?.unsubscribe();}
  loadRefs(){
    this.refsLoading=true;this.refsError='';
    this.subscriptions.add(forkJoin({
      departments:this.isPublicView?this.api.getPublicDepartements():this.api.getDepartements(),
      services:this.isPublicView?this.api.getPublicServices():this.api.getServices(),
      branches:this.isPublicView?this.api.getPublicAgences():this.api.getAgences()
    }).subscribe({next:refs=>{
      const order=(a:{nom?:string},b:{nom?:string})=>(a.nom||'').localeCompare(b.nom||'','fr');
      this.departements=(refs.departments||[]).sort(order);this.services=(refs.services||[]).sort(order);this.agences=(refs.branches||[]).sort(order);this.refsLoading=false;
    },error:e=>{this.refsLoading=false;this.refsError=extractErrorMessage(e,'Les filtres sont indisponibles. Réessayez.');}}));
  }
  get filteredServices(){return this.services.filter(s=>!this.filters.departementId||s.idDepartement===this.filters.departementId);}
  get filteredAgences(){return this.agences.filter(a=>!this.filters.departementId||a.idDepartement===this.filters.departementId);}
  get hasActiveCriteria(){return !!(this.searchTerm.trim()||this.filters.departementId||this.filters.serviceId||this.filters.agenceId||this.functionFilter);}
  get contacts():DirectoryContact[]{
    let key=0;return this.annuaire.flatMap(d=>(d.agents||[]).map(a=>({...a,departementId:d.id,departementNom:d.nom||'Département non renseigné',key:key++})));
  }
  get functions(){return [...new Set(this.contacts.map(a=>a.fonction).filter((f):f is string=>!!f))].sort((a,b)=>this.functionLabel(a).localeCompare(this.functionLabel(b),'fr'));}
  get matchingContacts(){
    if(this.isPublicView&&!this.hasSearched)return [];
    return this.contacts.filter(a=>(!this.functionFilter||a.fonction===this.functionFilter)&&directoryMatches([
      a.nom,a.prenom,a.fonction,this.functionLabel(a.fonction),a.emailPro,a.email,a.numeroPoste,a.telephone,
      ...(!this.isPublicView?[a.telephoneSecondaire]:[]),a.nomService,a.nomAgence,a.departementNom
    ],this.searchTerm)).sort((a,b)=>{
      if(this.sort==='department'){const diff=a.departementNom.localeCompare(b.departementNom,'fr');if(diff)return diff;}
      return [a.nom,a.prenom].join(' ').localeCompare([b.nom,b.prenom].join(' '),'fr');
    });
  }
  get pagedContacts(){return this.matchingContacts.slice(this.pageIndex*this.pageSize,(this.pageIndex+1)*this.pageSize);}
  get totalPages(){return Math.max(1,Math.ceil(this.matchingContacts.length/this.pageSize));}
  get departmentCount(){return new Set(this.matchingContacts.map(a=>a.departementId||a.departementNom)).size;}
  get serviceCount(){return new Set(this.matchingContacts.map(a=>a.idService).filter(Boolean)).size;}
  fullName(a:BaAnnuaireAgentDto){return [a.prenom,a.nom].filter(Boolean).join(' ')||'Contact sans nom';}
  trackContact(_:number,a:DirectoryContact){return a.key;}
  onSearchChange(){this.pageIndex=0;this.message='';if(this.isPublicView&&!this.hasActiveCriteria){this.clearPublicResults();return;}if(this.isPublicView&&!this.hasSearched)this.searches.next();}
  onDepartmentChange(){
    if(!this.filteredServices.some(s=>s.id===this.filters.serviceId))this.filters.serviceId='';
    if(!this.filteredAgences.some(a=>a.id===this.filters.agenceId))this.filters.agenceId='';
    this.onCriteriaChange();
  }
  onCriteriaChange(){this.pageIndex=0;this.closeContact();this.load();}
  load(){
    this.listSub?.unsubscribe();this.pageIndex=0;this.message='';this.closeContact();
    if(this.isPublicView&&!this.hasActiveCriteria){this.clearPublicResults();return;}
    this.loading=true;this.annuaire=[];
    const source=this.isPublicView?this.api.getPublicAnnuaire(this.filters.departementId||undefined,this.filters.serviceId||undefined,this.filters.agenceId||undefined):this.api.getAnnuaire(this.filters.departementId||undefined,this.filters.serviceId||undefined,this.filters.agenceId||undefined);
    this.listSub=source.subscribe({next:data=>{
      this.loading=false;
      if(this.isPublicView&&!this.hasActiveCriteria){this.clearPublicResults();return;}
      this.annuaire=data||[];this.hasSearched=true;
      if(this.functionFilter&&!this.functions.includes(this.functionFilter))this.functionFilter='';
    },error:e=>{this.loading=false;this.hasSearched=false;this.message=extractErrorMessage(e,'Impossible de charger les contacts. Réessayez.');}});
  }
  reset(){this.filters={departementId:'',serviceId:'',agenceId:''};this.searchTerm='';this.functionFilter='';this.pageIndex=0;this.load();}
  private clearPublicResults(){this.listSub?.unsubscribe();this.loading=false;this.hasSearched=false;this.annuaire=[];this.closeContact();}
  openContact(a:DirectoryContact){this.selected=a;this.feedback='';this.dialog.nativeElement.showModal();}
  closeContact(){this.dialog?.nativeElement.close();this.selected=undefined;this.feedback='';}
  async copyContact(){if(!this.selected)return;const a=this.selected;try{await navigator.clipboard.writeText([
    this.fullName(a),this.functionLabel(a.fonction),a.departementNom,a.nomService,a.nomAgence,a.emailPro||a.email,a.telephone,a.numeroPoste,
    ...(!this.isPublicView?[a.telephoneSecondaire]:[])
  ].filter(Boolean).join('\n'));this.feedback='Coordonnées copiées.';}catch{this.feedback='La copie est indisponible. Vous pouvez sélectionner les coordonnées ci-dessous.';}}
}
