import { RouterLink } from '@angular/router';
import { DirectoryNavComponent } from '../../shared/directory-nav.component';
import { directoryMatches } from '../../shared/directory.utils';
import {UsersService} from '../../services/users.service';
import {isAdministrator} from '../../services/administrator.guard';
import { inject, Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AnnuaireService, BaAgenceDto, BaDepartementDto } from '../../services/annuaire.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-annuaire-agences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DirectoryNavComponent],
  templateUrl: './annuaire-agences.component.html',
  styleUrl: './annuaire-agences.component.scss'
})
export class AnnuaireAgencesComponent implements OnInit {
  @ViewChild('editDialog',{static:true}) dialog!:ElementRef<HTMLDialogElement>;
  canManage = false; loading=false; isSaving=false; messageType:'success'|'error'='success';
  private sessionUsers = inject(UsersService);
  agences: BaAgenceDto[] = [];
  departements: BaDepartementDto[] = [];
  form: BaAgenceDto = {};
  message = '';
  submitted = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  showForm = false;

  constructor(private annuaireService: AnnuaireService) {}

  ngOnInit(): void {
    this.sessionUsers.getUserWithMoreInfo().subscribe({next:user=>this.canManage=isAdministrator(user),error:()=>this.canManage=false});
    this.load();
    this.annuaireService.getDepartements().subscribe({ next: (d) => (this.departements = d || []) });
  }

  get filteredAgences(): BaAgenceDto[] {
    return this.agences.filter(s=>directoryMatches([s.code,s.nom,s.adresse,s.telephone,s.telephone1,s.nomDepartement],this.searchTerm));
  }

  get pagedAgences(): BaAgenceDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredAgences.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAgences.length / this.pageSize));
  }

  load(): void {
    if(this.loading)return;this.loading=true;
    this.annuaireService.getAgences().subscribe({
      next: (data) => {
        this.agences = (data || []).sort((a,b)=>(a.nom||'').localeCompare(b.nom||'','fr'));this.loading=false;
        this.pageIndex = 0;
      },
      error: (err) => {this.loading=false;this.isSaving=false;this.messageType='error';this.message=this.extractError(err,'Erreur lors du chargement des agences.');}
    });
  }

  selectAgence(ag: BaAgenceDto): void {
    if(!this.canManage || this.isSaving)return;
    this.form = { ...ag };
    this.showForm = true;this.message='';this.submitted=false;this.dialog.nativeElement.showModal();
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
    this.isSaving=true;
    const action$ = this.form.id
      ? this.annuaireService.updateAgence(this.form.id, this.form)
      : this.annuaireService.createAgence(this.form);
    action$.subscribe({
      next: () => {
        this.isSaving=false;this.messageType='success';
        this.message = this.form.id ? 'Agence mise a jour.' : 'Agence creee.';
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
}



