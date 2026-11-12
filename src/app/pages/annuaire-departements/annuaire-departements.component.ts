import { RouterLink } from '@angular/router';
import { DirectoryNavComponent } from '../../shared/directory-nav.component';
import { directoryMatches } from '../../shared/directory.utils';
import {isAdministrator} from '../../services/administrator.guard';
import { inject, Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AnnuaireService, BaDepartementDto } from '../../services/annuaire.service';
import { UsersService, BaUserDto } from '../../services/users.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-annuaire-departements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DirectoryNavComponent],
  templateUrl: './annuaire-departements.component.html',
  styleUrl: './annuaire-departements.component.scss'
})
export class AnnuaireDepartementsComponent implements OnInit {
  @ViewChild('editDialog',{static:true}) dialog!:ElementRef<HTMLDialogElement>;
  canManage = false; loading=false; isSaving=false; messageType:'success'|'error'='success';
  private sessionUsers = inject(UsersService);
  departements: BaDepartementDto[] = [];
  dgaValidateurs: BaUserDto[] = [];
  form: BaDepartementDto = {};
  dgaPoles: Array<{ value: NonNullable<BaDepartementDto['dgaPole']>; label: string }> = [
    { value: 'OPERATIONS', label: 'Opérations' },
    { value: 'DEVELOPPEMENT', label: 'Développement' }
  ];
  message = '';
  submitted = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  showForm = false;

  constructor(
    private annuaireService: AnnuaireService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.sessionUsers.getUserWithMoreInfo().subscribe({next:user=>{this.canManage=isAdministrator(user);if(this.canManage)this.loadDgaValidateurs();},error:()=>this.canManage=false});
    this.load();

  }

  get filteredDepartements(): BaDepartementDto[] {
    return this.departements.filter(d=>directoryMatches([d.code,d.nom,this.dgaPoleLabel(d.dgaPole),d.nomParentDepartement,d.nomDgaValidateur,d.nomDgaEffectif],this.searchTerm));
  }

  get pagedDepartements(): BaDepartementDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredDepartements.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDepartements.length / this.pageSize));
  }

  load(): void {
    if(this.loading)return;this.loading=true;
    this.annuaireService.getDepartements().subscribe({
      next: (data) => {
        this.departements = (data || []).sort((a,b)=>(a.nom||'').localeCompare(b.nom||'','fr'));this.loading=false;
        this.pageIndex = 0;
      },
      error: (err) => {this.loading=false;this.isSaving=false;this.messageType='error';this.message=this.extractError(err,'Erreur lors du chargement des departements.');}
    });
  }

  selectDepartement(dep: BaDepartementDto): void {
    if(!this.canManage || this.isSaving)return;
    this.form = { ...dep };
    this.showForm = true;this.message='';this.submitted=false;this.dialog.nativeElement.showModal();
  }

  get parentDepartementOptions(): BaDepartementDto[] {
    return this.departements.filter((dep) => dep.id && dep.id !== this.form.id);
  }

  loadDgaValidateurs(): void {
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.dgaValidateurs = (users || [])
          .filter((user) =>
            user.fonction === 'DIRECTEUR_GENERAL_ADJOINT' &&
            user.activated === true &&
            user.locked !== true
          )
          .sort((a, b) => this.userDisplayName(a).localeCompare(this.userDisplayName(b)));
      },
      error: () => (this.dgaValidateurs = [])
    });
  }

  resetForm(): void {
    if(this.isSaving)return;this.dialog?.nativeElement.close();
    this.submitted = false;
    this.form = {};
    this.showForm = false;
  }

  openCreateForm(): void {
    if(!this.canManage || this.isSaving)return;
    this.form = {};
    this.submitted = false;
    this.showForm = true;this.message='';this.submitted=false;this.dialog.nativeElement.showModal();
  }

  closeFormModal(): void {
    this.resetForm();
  }

  create(formRef: NgForm): void {
    if(!this.canManage || this.isSaving)return;
    this.submitted = true;
    if (formRef.invalid) {
      formRef.control.markAllAsTouched();this.messageType='error';
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    const payload: BaDepartementDto = {
      ...this.form,
      dgaPole: this.form.dgaPole || undefined,
      idParentDepartement: this.form.idParentDepartement || undefined,
      idDgaValidateur: this.form.idDgaValidateur || undefined
    };
    this.isSaving=true;
    const action$ = this.form.id
      ? this.annuaireService.updateDepartement(this.form.id, payload)
      : this.annuaireService.createDepartement(payload);
    action$.subscribe({
      next: () => {
        this.isSaving=false;this.messageType='success';
        this.message = this.form.id ? 'Departement mis a jour.' : 'Departement cree.';
        this.resetForm();
        this.load();
      },
      error: (err) => {this.loading=false;this.isSaving=false;this.messageType='error';this.message=this.extractError(err,'Erreur lors de la creation.');}
    });
  }

  prevPage(): void {
    this.pageIndex = Math.max(0, this.pageIndex - 1);
  }

  nextPage(): void {
    this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1);
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }

  userDisplayName(user: BaUserDto): string {
    const fullName = `${user.nom || ''} ${user.prenom || ''}`.trim();
    return fullName || user.email || user.username || '-';
  }

  dgaPoleLabel(pole?: BaDepartementDto['dgaPole']): string {
    return this.dgaPoles.find((item) => item.value === pole)?.label || '-';
  }

  dgaReferentLabel(dep: BaDepartementDto): string {
    if (dep.nomDgaEffectif) {
      return dep.nomDgaEffectif;
    }
    if (dep.nomDgaValidateur) {
      return dep.nomDgaValidateur;
    }
    return '-';
  }
}



