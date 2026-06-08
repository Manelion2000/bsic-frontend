import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AnnuaireService, BaAgenceDto, BaDepartementDto } from '../../services/annuaire.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-annuaire-agences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annuaire-agences.component.html',
  styleUrl: './annuaire-agences.component.scss'
})
export class AnnuaireAgencesComponent implements OnInit {
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
    this.load();
    this.annuaireService.getDepartements().subscribe({ next: (d) => (this.departements = d || []) });
  }

  get filteredAgences(): BaAgenceDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.agences;
    return this.agences.filter((a) => `${a.code || ''} ${a.nom || ''} ${a.adresse || ''} ${a.telephone || ''} ${a.telephone1 || ''} ${a.nomDepartement || ''}`.toLowerCase().includes(term));
  }

  get pagedAgences(): BaAgenceDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredAgences.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAgences.length / this.pageSize));
  }

  load(): void {
    this.annuaireService.getAgences().subscribe({
      next: (data) => {
        this.agences = data || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des agences.'))
    });
  }

  selectAgence(ag: BaAgenceDto): void {
    this.form = { ...ag };
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
      ? this.annuaireService.updateAgence(this.form.id, this.form)
      : this.annuaireService.createAgence(this.form);
    action$.subscribe({
      next: () => {
        this.message = this.form.id ? 'Agence mise a jour.' : 'Agence creee.';
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



