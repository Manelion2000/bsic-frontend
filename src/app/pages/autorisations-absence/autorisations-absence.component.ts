import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {forkJoin} from 'rxjs';
import {BaAbsenceStatsDto, BaAutorisationAbsenceDto, RhCircuitDto, RhDemandesService} from '../../services/rh-demandes.service';
import {BaUserDto, UsersService} from '../../services/users.service';
import {RhCircuitComponent} from '../../shared/rh-circuit/rh-circuit.component';
import {isAdministrator} from '../../services/administrator.guard';
import {extractErrorMessage} from '../../shared/error.utils';

@Component({selector:'app-autorisations-absence', standalone:true, imports:[CommonModule, FormsModule, RhCircuitComponent], templateUrl:'./autorisations-absence.component.html', styleUrl:'./autorisations-absence.component.scss'})
export class AutorisationsAbsenceComponent implements OnInit {
  form = {motif:'', dateDebut:'', dateFin:''};
  mesDemandes: BaAutorisationAbsenceDto[] = [];
  aValider: BaAutorisationAbsenceDto[] = [];
  suivi: BaAutorisationAbsenceDto[] = [];
  stats?: BaAbsenceStatsDto;
  currentUser?: BaUserDto;
  circuit?: RhCircuitDto;
  circuitLoading=false; circuitError='';
  get peutConfigurerCircuit(){return isAdministrator(this.currentUser);}
  debutFiltre = ''; finFiltre = ''; message = ''; busy = false; reportingAllowed = false;

  constructor(private rh: RhDemandesService, private users: UsersService) {}
  document(d: BaAutorisationAbsenceDto) {
    if (!d.id || this.busy) return;
    this.busy=true;
    this.rh.documentAbsence(d.id).subscribe({next:b=>{const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download='autorisation-absence-'+d.id+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.busy=false;},error:()=>{this.busy=false;this.message='Téléchargement de l’acte impossible.';}});
  }

  ngOnInit() {
    this.users.getUserWithMoreInfo().subscribe(u => {
      this.currentUser = u;
      const roles = (u.roles || []).map((r: any) => r.code);
      this.reportingAllowed = roles.includes('BA_ADMIN') || roles.includes('RH_CONSULTATION_ABSENCES') || ['DIRECTEUR_GENERAL','DIRECTEUR_GENERAL_ADJOINT'].includes(String(u.fonction));
      if (this.reportingAllowed) this.loadReporting();
    });
    this.loadCircuit();
    this.reload();
  }

  loadCircuit(){
    if(this.circuitLoading || this.busy)return;
    this.circuitLoading=true;this.circuitError='';
    this.rh.getCircuitApplicable('ABSENCE').subscribe({next:c=>{this.circuit=c;this.circuitLoading=false;},error:e=>{this.circuit=undefined;this.circuitLoading=false;this.circuitError=extractErrorMessage(e,'Chargement du circuit impossible. Réessayez.');}});
  }

  get nombreJours() {
    if (!this.form.dateDebut || !this.form.dateFin) return 0;
    return Math.max(0, Math.round((new Date(this.form.dateFin).getTime() - new Date(this.form.dateDebut).getTime()) / 86400000) + 1);
  }

  reload() {
    forkJoin({mine:this.rh.getMesAbsences(), pending:this.rh.getAbsencesAValider()}).subscribe({
      next:r => {this.mesDemandes=r.mine; this.aValider=r.pending;}, error:() => this.message='Chargement impossible.'
    });
  }

  create() {
    if (this.busy || this.circuitLoading || !this.circuit || this.circuit.blocage) return;
    if (!this.form.motif.trim() || this.nombreJours < 1) {this.message='Renseignez une période et un motif valides.'; return;}
    this.busy=true;
    this.rh.createAbsence(this.form).subscribe({
      next:() => {this.form={motif:'',dateDebut:'',dateFin:''}; this.busy=false; this.message='Demande transmise.'; this.reload();},
      error:e => {this.busy=false; this.message=this.errorMessage(e,'Création impossible.');}
    });
  }

  valider(d: BaAutorisationAbsenceDto) {
    const c=prompt('Commentaire de validation (facultatif) :');
    if (c !== null) this.decide(d,true,c);
  }
  rejeter(d: BaAutorisationAbsenceDto) {const c=prompt('Motif du refus :'); if(c) this.decide(d,false,c);}
  annuler(d: BaAutorisationAbsenceDto) {
    if (!d.id || this.busy || !confirm('Annuler cette demande ?')) return;
    this.busy=true;
    this.rh.annulerAbsence(d.id).subscribe({next:() => {this.busy=false; this.reload();},error:e => {this.busy=false; this.message=this.errorMessage(e,'Annulation impossible.');}});
  }
  loadReporting() {
    forkJoin({rows:this.rh.getSuiviAbsences(this.debutFiltre,this.finFiltre), stats:this.rh.getStatsAbsences(this.debutFiltre,this.finFiltre)}).subscribe({
      next:r => {this.suivi=r.rows; this.stats=r.stats;}, error:() => this.message='Reporting réservé aux RH et DGA.'
    });
  }
  private decide(d: BaAutorisationAbsenceDto, approve: boolean, comment: string) {
    if (!d.id || !d.circuit?.peutDecider || this.busy) return;
    this.busy=true;
    const call=approve ? this.rh.validerAbsence(d.id,d.circuit.etapeCourante,comment) : this.rh.rejeterAbsence(d.id,d.circuit.etapeCourante,comment);
    call.subscribe({
      next:r => {
        this.busy=false;
        this.message=r.statutValidation==='VALIDEE' ? 'Absence approuvée définitivement.' : r.statutValidation==='REJETEE' ? 'Absence rejetée.' : approve ? 'Étape approuvée. La demande attend la validation suivante.' : 'Refus enregistré. Les autres validateurs peuvent encore statuer.';
        this.reload(); if(this.reportingAllowed) this.loadReporting();
      }, error:e => {this.busy=false; this.message=this.errorMessage(e,'Décision impossible.'); this.reload();}
    });
  }
  private errorMessage(e: any, fallback: string) {return e?.error?.message || e?.error?.detail || fallback;}
}
