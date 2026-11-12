import { TemporaryPasswordComponent } from '../../shared/temporary-password.component';
import { TemporaryCredential } from '../../services/users.service';
import { DirectoryNavComponent } from '../../shared/directory-nav.component';
import { directoryMatches, directoryFunction, directoryInitials } from '../../shared/directory.utils';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AnnuaireService, BaUserDto, BaServiceDto, BaDepartementDto, BaAgenceDto } from '../../services/annuaire.service';
import { UsersService } from '../../services/users.service';

import { extractErrorMessage } from '../../shared/error.utils';
import { agentHierarchyCandidates, fillAgentHierarchy } from '../../shared/agent-hierarchy.utils';

@Component({
  selector: 'app-annuaire-employes',
  standalone: true,
  imports: [CommonModule, FormsModule, DirectoryNavComponent, TemporaryPasswordComponent],
  templateUrl: './annuaire-employes.component.html',
  styleUrl: './annuaire-employes.component.scss'
})
export class AnnuaireEmployesComponent implements OnInit {
  @ViewChild('editDialog',{static:true}) dialog!:ElementRef<HTMLDialogElement>;
  @ViewChild('deleteDialog',{static:true}) deleteDialog!:ElementRef<HTMLDialogElement>;
  pendingDelete?:BaUserDto;
  credential?:TemporaryCredential;
  loading=false;departmentFilter='';functionFilter='';functionLabel=directoryFunction;initials=directoryInitials;
  functions=['AGENT','CHEF_SERVICE','DIRECTEUR','DIRECTEUR_GENERAL_ADJOINT','DIRECTEUR_GENERAL'];
  employes: BaUserDto[] = [];
  allUsers: BaUserDto[] = [];
  services: BaServiceDto[] = [];
  departements: BaDepartementDto[] = [];
  agences: BaAgenceDto[] = [];
  searchQuery = '';
  form: BaUserDto = { sexe: 'MASCULIN' };
  message = '';
  messageType: 'success' | 'error' = 'success';
  isSaving = false;
  isUpdating = false;
  deletingId?: string;
  submitted = false;
  showForm = false;
  pageSize = 8;
  pageIndex = 0;

  constructor(
    private annuaireService: AnnuaireService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadRefs();
  }

  get pagedEmployes(): BaUserDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredEmployes.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEmployes.length / this.pageSize));
  }

  get filteredServices(): BaServiceDto[] {
    if (!this.form.idDepartement) {
      return [];
    }
    return this.services.filter((s) => s.idDepartement === this.form.idDepartement);
  }

  get filteredAgences(): BaAgenceDto[] {
    if (!this.form.idDepartement) {
      return [];
    }
    return this.agences.filter((a) => a.idDepartement === this.form.idDepartement);
  }

  get filteredEmployes():BaUserDto[]{return this.allUsers.filter(u=>(!this.departmentFilter||u.idDepartement===this.departmentFilter)&&(!this.functionFilter||u.fonction===this.functionFilter)&&directoryMatches([u.nom,u.prenom,u.emailPro,u.email,u.matricule,u.nomDepartement,u.nomService,u.nomAgence,u.telephone,u.telephoneFixe,this.functionLabel(u.fonction)],this.searchQuery)).sort((a,b)=>[a.nom,a.prenom].join(' ').localeCompare([b.nom,b.prenom].join(' '),'fr'));}
  load(): void {if(this.loading)return;this.loading=true;this.usersService.getUsers().subscribe({next:data=>{this.allUsers=data||[];this.employes=this.allUsers;this.pageIndex=0;this.loading=false;if(this.showForm)this.fillHierarchy();},error:err=>{this.loading=false;this.setFeedback(this.extractError(err,'Impossible de charger les collaborateurs.'),'error');}});}

  loadRefs(): void {
    this.annuaireService.getServices().subscribe({ next: (s) => {this.services = s || [];if(this.showForm)this.fillHierarchy();} });
    this.annuaireService.getDepartements().subscribe({ next: (d) => (this.departements = d || []) });
    this.annuaireService.getAgences().subscribe({ next: (a) => (this.agences = a || []) });
  }

  selectEmploye(emp: BaUserDto): void {
    if(this.isSaving||this.isUpdating||this.deletingId)return;
    this.form = { ...emp };
    this.fillHierarchy();
    this.showForm = true;this.submitted=false;this.message='';this.dialog.nativeElement.showModal();
  }

  resetForm(): void {
    if(this.isSaving||this.isUpdating)return;this.dialog?.nativeElement.close();
    this.submitted = false;
    this.form = { sexe: 'MASCULIN' };
    this.showForm = false;
  }

  startCreate(): void {
    if(this.isSaving||this.isUpdating)return;
    this.submitted = false;
    this.form = { sexe: 'MASCULIN' };
    this.showForm = true;this.submitted=false;this.message='';this.dialog.nativeElement.showModal();
  }

  onDepartementChange(): void {
    if (!this.form.idDepartement) {
      this.form.idService = undefined;
      this.form.idAgence = undefined;
      this.fillHierarchy();
      return;
    }
    const serviceIsValid = this.filteredServices.some((s) => s.id === this.form.idService);
    if (!serviceIsValid) {
      this.form.idService = undefined;
    }
    const agenceIsValid = this.filteredAgences.some((a) => a.id === this.form.idAgence);
    if (!agenceIsValid) {
      this.form.idAgence = undefined;
    }
    this.fillHierarchy();
  }

  onFonctionChange(): void {
    const f = this.form.fonction;
    this.form.idSuperieur = undefined;
    this.form.nomCompletSuperieur = undefined;
    this.form.nomCompletSuperieurSecondaire = undefined;
    if (f === 'AGENT') {this.fillHierarchy();return;}
    if (!this.requiresServiceSelection) {
      this.form.idService = undefined;
    }
    this.form.idSuperieurSecondaire = undefined;
    if (f === 'DIRECTEUR_GENERAL') {
      this.form.idSuperieur = undefined;
    }
  }

  onServiceChange(): void {this.fillHierarchy();}
  fillHierarchy(): void {fillAgentHierarchy(this.form, this.allUsers, this.services);}
  get agentHierarchy(){return agentHierarchyCandidates(this.form, this.allUsers, this.services);}

  get availableChefsService(): BaUserDto[] {
    return this.agentHierarchy.chiefs;
  }

  get availableDirecteurs(): BaUserDto[] {
    return this.agentHierarchy.directors;
  }

  get availableDG(): BaUserDto[] {
    return this.allUsers.filter((u) => u.fonction === 'DIRECTEUR_GENERAL' && u.id !== this.form.id);
  }

  get availableDirectSuperiors(): BaUserDto[] {
    switch (this.form.fonction) {
      case 'AGENT':
        return this.availableChefsService;
      case 'CHEF_SERVICE':
        return this.availableDirecteurs;
      case 'DIRECTEUR':
      case 'DIRECTEUR_GENERAL_ADJOINT':
        return this.availableDG;
      default:
        return [];
    }
  }

  get requiresSecondarySuperior(): boolean {
    return this.form.fonction === 'AGENT';
  }

  get requiresServiceSelection(): boolean {
    return this.form.fonction === 'AGENT' || this.form.fonction === 'CHEF_SERVICE';
  }

  get requiresAgenceSelection(): boolean {
    return false;
  }

  create(formRef: NgForm): void {
    if(this.isSaving||this.isUpdating||this.form.id)return;
    this.submitted = true;
    if (formRef.invalid) {
      formRef.control.markAllAsTouched();
      this.setFeedback('Veuillez renseigner les champs obligatoires.', 'error');
      return;
    }
    if (!this.validateHierarchySelection()) {
      return;
    }
    this.isSaving = true;
    const payload: any = {
      ...this.form,
      username: this.form.email || this.form.emailPro,
      email: this.form.email || this.form.emailPro,
      activated: this.form.activated ?? true,
      locked: this.form.locked ?? false
    };
    this.usersService.createUser(payload).subscribe({
      next: (created) => {
        this.setFeedback('Utilisateur cree avec succes.', 'success');
        this.isSaving = false;
        this.resetForm();
        this.credential=created?.initialCredential;
        this.load();
      },
      error: (err) => {
        this.setFeedback(this.extractError(err, 'Erreur lors de la creation.'), 'error');
        this.isSaving = false;
      }
    });
  }

  update(formRef: NgForm): void {
    if(this.isSaving||this.isUpdating)return;
    this.submitted = true;
    if (formRef.invalid) {
      formRef.control.markAllAsTouched();
      this.setFeedback('Veuillez renseigner les champs obligatoires.', 'error');
      return;
    }
    if (!this.validateHierarchySelection()) {
      return;
    }
    if (!this.form.id) {
      this.setFeedback('Selectionner un employe a modifier.', 'error');
      return;
    }
    this.isUpdating = true;
    this.usersService.updateUser(this.form.id, this.form as any).subscribe({
      next: () => {
        this.setFeedback('Utilisateur mis a jour avec succes.', 'success');
        this.isUpdating = false;
        this.resetForm();
        this.load();
      },
      error: (err) => {
        this.setFeedback(this.extractError(err, 'Erreur lors de la mise a jour.'), 'error');
        this.isUpdating = false;
      }
    });
  }

  requestDelete(emp:BaUserDto){if(this.deletingId||this.isSaving||this.isUpdating)return;this.pendingDelete=emp;this.message='';this.deleteDialog.nativeElement.showModal();}
  cancelDelete(){if(this.deletingId)return;this.pendingDelete=undefined;this.deleteDialog.nativeElement.close();}
  delete(emp: BaUserDto): void {
    if(this.deletingId||this.isSaving||this.isUpdating)return;
    if (!emp.id) {
      this.setFeedback('Employe sans identifiant.', 'error');
      return;
    }
    this.deletingId = emp.id;
    this.usersService.deleteUser(emp.id).subscribe({
      next: () => {
        this.setFeedback('Utilisateur supprime avec succes.', 'success');
        this.deletingId = undefined;
        this.cancelDelete();
        this.load();
      },
      error: (err) => {
        this.setFeedback(this.extractError(err, 'Erreur lors de la suppression.'), 'error');
        this.deletingId = undefined;
      }
    });
  }

  prevPage(): void {
    this.pageIndex = Math.max(0, this.pageIndex - 1);
  }

  nextPage(): void {
    this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1);
  }

  private validateHierarchySelection(): boolean {
    if(this.form.fonction==='AGENT' && (!this.form.idDepartement||!this.form.idService)){this.setFeedback('Choisissez un département et un service pour cet agent.','error');return false;}
    if(this.form.idSuperieur && this.form.idSuperieur===this.form.idSuperieurSecondaire){this.setFeedback('Les deux responsables doivent être différents.','error');return false;}
    if(this.form.id && (this.form.idSuperieur===this.form.id||this.form.idSuperieurSecondaire===this.form.id)){this.setFeedback('Un collaborateur ne peut pas être son propre responsable.','error');return false;}
    if(!this.requiresServiceSelection)this.form.idService=undefined;
    if(!this.requiresSecondarySuperior)this.form.idSuperieurSecondaire=undefined;
    if(this.form.fonction==='DIRECTEUR_GENERAL')this.form.idSuperieur=undefined;
    return true;
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }

  private setFeedback(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      if (this.message === message) {
        this.message = '';
      }
    }, 4000);
  }

}
