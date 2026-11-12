import { RouterLink } from '@angular/router';
import { DirectoryNavComponent } from '../../shared/directory-nav.component';
import { directoryMatches } from '../../shared/directory.utils';
import {UsersService} from '../../services/users.service';
import {isAdministrator} from '../../services/administrator.guard';
import { inject, Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AnnuaireService, BaServiceDto, BaDepartementDto } from '../../services/annuaire.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-annuaire-services',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DirectoryNavComponent],
  templateUrl: './annuaire-services.component.html',
  styleUrl: './annuaire-services.component.scss'
})
export class AnnuaireServicesComponent implements OnInit {
  @ViewChild('editDialog',{static:true}) dialog!:ElementRef<HTMLDialogElement>;
  canManage = false; loading=false; isSaving=false; messageType:'success'|'error'='success';
  private sessionUsers = inject(UsersService);
  services: BaServiceDto[] = [];
  departements: BaDepartementDto[] = [];
  form: BaServiceDto = {};
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
    this.loadDepartements();
  }

  get filteredServices(): BaServiceDto[] {
    return this.services.filter(s=>directoryMatches([s.code,s.nom,s.nomDepartement],this.searchTerm));
  }

  get pagedServices(): BaServiceDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredServices.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredServices.length / this.pageSize));
  }

  load(): void {
    if(this.loading)return;this.loading=true;
    this.annuaireService.getServices().subscribe({
      next: (data) => {
        this.services = (data || []).sort((a,b)=>(a.nom||'').localeCompare(b.nom||'','fr'));this.loading=false;
        this.pageIndex = 0;
      },
      error: (err) => {this.loading=false;this.isSaving=false;this.messageType='error';this.message=this.extractError(err,'Erreur lors du chargement des services.');}
    });
  }

  loadDepartements(): void {
    this.annuaireService.getDepartements().subscribe({
      next: (data) => (this.departements = data || []),
      error: () => {}
    });
  }

  selectService(srv: BaServiceDto): void {
    if(!this.canManage || this.isSaving)return;
    this.form = { ...srv };
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
      ? this.annuaireService.updateService(this.form.id, this.form)
      : this.annuaireService.createService(this.form);
    action$.subscribe({
      next: () => {
        this.isSaving=false;this.messageType='success';
        this.message = this.form.id ? 'Service mis a jour.' : 'Service cree.';
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



