import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AnnuaireService, BaServiceDto, BaDepartementDto } from '../../services/annuaire.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-annuaire-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annuaire-services.component.html',
  styleUrl: './annuaire-services.component.scss'
})
export class AnnuaireServicesComponent implements OnInit {
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
    this.load();
    this.loadDepartements();
  }

  get filteredServices(): BaServiceDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.services;
    return this.services.filter((s) => `${s.code || ''} ${s.nom || ''} ${s.nomDepartement || ''}`.toLowerCase().includes(term));
  }

  get pagedServices(): BaServiceDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredServices.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredServices.length / this.pageSize));
  }

  load(): void {
    this.annuaireService.getServices().subscribe({
      next: (data) => {
        this.services = data || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des services.'))
    });
  }

  loadDepartements(): void {
    this.annuaireService.getDepartements().subscribe({
      next: (data) => (this.departements = data || []),
      error: () => {}
    });
  }

  selectService(srv: BaServiceDto): void {
    this.form = { ...srv };
    this.showForm = true;
  }

  resetForm(): void {
    this.submitted = false;
    this.form = {};
    this.showForm = false;
  }

  openCreateForm(): void {
    this.form = {};
    this.submitted = false;
    this.showForm = true;
  }

  closeFormModal(): void {
    this.resetForm();
  }

  create(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    const action$ = this.form.id
      ? this.annuaireService.updateService(this.form.id, this.form)
      : this.annuaireService.createService(this.form);
    action$.subscribe({
      next: () => {
        this.message = this.form.id ? 'Service mis a jour.' : 'Service cree.';
        this.resetForm();
        this.load();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la creation.'))
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



