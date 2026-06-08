import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ParamService, BaProductDto, BaCategorieDto } from '../../services/param.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produits.component.html',
  styleUrl: './produits.component.scss'
})
export class ProduitsComponent implements OnInit {
  produits: BaProductDto[] = [];
  categories: BaCategorieDto[] = [];
  form: BaProductDto = {};
  message = '';
  submitted = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  showForm = false;

  constructor(private paramService: ParamService) {}

  ngOnInit(): void {
    this.load();
    this.loadCategories();
  }

  get filteredProduits(): BaProductDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.produits;
    return this.produits.filter((p) => `${p.name || ''} ${p.nomCategorie || ''}`.toLowerCase().includes(term));
  }

  get pagedProduits(): BaProductDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredProduits.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProduits.length / this.pageSize));
  }

  load(): void {
    this.paramService.getProducts().subscribe({
      next: (data) => {
        this.produits = data || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des produits.'))
    });
  }

  loadCategories(): void {
    this.paramService.getCategories().subscribe({
      next: (data) => (this.categories = data || []),
      error: () => {}
    });
  }

  selectProduct(prod: BaProductDto): void {
    this.form = { ...prod };
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
    this.paramService.createProduct(this.form).subscribe({
      next: () => {
        this.message = 'Produit cree.';
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
      this.message = 'Selectionner un produit a modifier.';
      return;
    }
    this.paramService.updateProduct(this.form.id, this.form).subscribe({
      next: () => {
        this.message = 'Produit mis a jour.';
        this.resetForm();
        this.load();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la mise a jour.'))
    });
  }

  delete(prod: BaProductDto): void {
    if (!prod.id) {
      this.message = 'Produit sans identifiant.';
      return;
    }
    this.paramService.deleteProduct(prod.id).subscribe({
      next: () => {
        this.message = 'Produit supprime.';
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



