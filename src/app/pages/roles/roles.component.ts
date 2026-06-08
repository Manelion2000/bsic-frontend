import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RolesService, BaRoleDto } from '../../services/roles.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss'
})
export class RolesComponent implements OnInit {
  roles: BaRoleDto[] = [];
  form: BaRoleDto = {};
  message = '';
  submitted = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  showForm = false;

  constructor(private rolesService: RolesService) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  get filteredRoles(): BaRoleDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.roles;
    return this.roles.filter((r) => `${r.libelle || ''} ${r.code || ''}`.toLowerCase().includes(term));
  }

  get pagedRoles(): BaRoleDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredRoles.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRoles.length / this.pageSize));
  }

  loadRoles(): void {
    this.rolesService.getRoles().subscribe({
      next: (data) => {
        this.roles = data || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des roles.'))
    });
  }

  selectRole(role: BaRoleDto): void {
    this.form = { ...role };
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

  createRole(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    this.rolesService.createRole(this.form).subscribe({
      next: () => {
        this.message = 'Role cree.';
        this.resetForm();
        this.loadRoles();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la creation du role.'))
    });
  }

  updateRole(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    if (!this.form.id) {
      this.message = 'Selectionner un role a modifier.';
      return;
    }
    this.rolesService.updateRole(this.form).subscribe({
      next: () => {
        this.message = 'Role mis a jour.';
        this.resetForm();
        this.loadRoles();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la mise a jour.'))
    });
  }

  deleteRole(role: BaRoleDto): void {
    if (!role.id) {
      this.message = 'Role sans identifiant.';
      return;
    }
    this.rolesService.deleteRole(role.id).subscribe({
      next: () => {
        this.message = 'Role supprime.';
        this.loadRoles();
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



