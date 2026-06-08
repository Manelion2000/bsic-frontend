import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AnnuaireService, BaDepartementDto } from '../../services/annuaire.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-annuaire-departements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annuaire-departements.component.html',
  styleUrl: './annuaire-departements.component.scss'
})
export class AnnuaireDepartementsComponent implements OnInit {
  departements: BaDepartementDto[] = [];
  form: BaDepartementDto = {};
  message = '';
  submitted = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  showForm = false;

  constructor(private annuaireService: AnnuaireService) {}

  ngOnInit(): void {
    this.load();
  }

  get filteredDepartements(): BaDepartementDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.departements;
    return this.departements.filter((d) => `${d.code || ''} ${d.nom || ''}`.toLowerCase().includes(term));
  }

  get pagedDepartements(): BaDepartementDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredDepartements.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDepartements.length / this.pageSize));
  }

  load(): void {
    this.annuaireService.getDepartements().subscribe({
      next: (data) => {
        this.departements = data || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des departements.'))
    });
  }

  selectDepartement(dep: BaDepartementDto): void {
    this.form = { ...dep };
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
      ? this.annuaireService.updateDepartement(this.form.id, this.form)
      : this.annuaireService.createDepartement(this.form);
    action$.subscribe({
      next: () => {
        this.message = this.form.id ? 'Departement mis a jour.' : 'Departement cree.';
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



