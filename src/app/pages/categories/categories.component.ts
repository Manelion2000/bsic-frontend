import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ParamService, BaCategorieDto } from '../../services/param.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  categories: BaCategorieDto[] = [];
  form: BaCategorieDto = {};
  message = '';
  submitted = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  showForm = false;

  constructor(private paramService: ParamService) {}

  ngOnInit(): void {
    this.load();
  }

  get filteredCategories(): BaCategorieDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.categories;
    return this.categories.filter((c) => `${c.code || ''} ${c.nom || ''}`.toLowerCase().includes(term));
  }

  get pagedCategories(): BaCategorieDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredCategories.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCategories.length / this.pageSize));
  }

  load(): void {
    this.paramService.getCategories().subscribe({
      next: (data) => {
        this.categories = data || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des categories.'))
    });
  }

  selectCategory(cat: BaCategorieDto): void {
    this.form = { ...cat };
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
    this.paramService.createCategorie(this.form).subscribe({
      next: () => {
        this.message = 'Categorie creee.';
        this.resetForm();
        this.load();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la creation.'))
    });
  }

  update(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    if (!this.form.id) {
      this.message = 'Selectionner une categorie a modifier.';
      return;
    }
    this.paramService.updateCategorie(this.form.id, this.form).subscribe({
      next: () => {
        this.message = 'Categorie mise a jour.';
        this.resetForm();
        this.load();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la mise a jour.'))
    });
  }

  delete(cat: BaCategorieDto): void {
    if (!cat.id) {
      this.message = 'Categorie sans identifiant.';
      return;
    }
    this.paramService.deleteCategorie(cat.id).subscribe({
      next: () => {
        this.message = 'Categorie supprimee.';
        this.load();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la suppression.'))
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



