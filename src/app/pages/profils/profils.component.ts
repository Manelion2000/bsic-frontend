import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ProfilsService, BaProfilDto } from '../../services/profils.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-profils',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profils.component.html',
  styleUrl: './profils.component.scss'
})
export class ProfilsComponent implements OnInit {
  profils: BaProfilDto[] = [];
  form: BaProfilDto = {};
  message = '';
  submitted = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  showForm = false;

  constructor(private profilsService: ProfilsService) {}

  ngOnInit(): void {
    this.loadProfils();
  }

  get filteredProfils(): BaProfilDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.profils;
    return this.profils.filter((p) => `${p.libelle || ''} ${p.description || ''}`.toLowerCase().includes(term));
  }

  get pagedProfils(): BaProfilDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredProfils.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProfils.length / this.pageSize));
  }

  loadProfils(): void {
    this.profilsService.getProfils().subscribe({
      next: (data) => {
        this.profils = data || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des profils.'))
    });
  }

  selectProfil(profil: BaProfilDto): void {
    this.form = { ...profil, roles: profil.roles || [] };
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

  createProfil(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    this.profilsService.createProfil(this.form).subscribe({
      next: () => {
        this.message = 'Profil cree.';
        this.resetForm();
        this.loadProfils();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la creation.'))
    });
  }

  updateProfil(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    if (!this.form.id) {
      this.message = 'Selectionner un profil a modifier.';
      return;
    }
    this.profilsService.updateProfil(this.form).subscribe({
      next: () => {
        this.message = 'Profil mis a jour.';
        this.resetForm();
        this.loadProfils();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la mise a jour.'))
    });
  }

  deleteProfil(profil: BaProfilDto): void {
    if (!profil.id) {
      this.message = 'Profil sans identifiant.';
      return;
    }
    this.profilsService.deleteProfil(profil.id).subscribe({
      next: () => {
        this.message = 'Profil supprime.';
        this.loadProfils();
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



