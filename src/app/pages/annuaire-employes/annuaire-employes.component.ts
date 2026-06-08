import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AnnuaireService, BaUserDto, BaServiceDto, BaDepartementDto, BaAgenceDto } from '../../services/annuaire.service';
import { UsersService } from '../../services/users.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-annuaire-employes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annuaire-employes.component.html',
  styleUrl: './annuaire-employes.component.scss'
})
export class AnnuaireEmployesComponent implements OnInit {
  employes: BaUserDto[] = [];
  allUsers: BaUserDto[] = [];
  services: BaServiceDto[] = [];
  departements: BaDepartementDto[] = [];
  agences: BaAgenceDto[] = [];
  searchQuery = '';
  form: BaUserDto = { sexe: 'MASCULIN' };
  message = '';
  messageType: 'success' | 'error' = 'success';
  isSaving = false;
  isUpdating = false;
  deletingId?: string;
  submitted = false;
  showForm = false;
  pageSize = 8;
  pageIndex = 0;

  constructor(
    private annuaireService: AnnuaireService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadRefs();
  }

  get pagedEmployes(): BaUserDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.employes.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.employes.length / this.pageSize));
  }

  get filteredServices(): BaServiceDto[] {
    if (!this.form.idDepartement) {
      return [];
    }
    return this.services.filter((s) => s.idDepartement === this.form.idDepartement);
  }

  get filteredAgences(): BaAgenceDto[] {
    if (!this.form.idDepartement) {
      return [];
    }
    return this.agences.filter((a) => a.idDepartement === this.form.idDepartement);
  }

  load(): void {
    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.allUsers = data || [];
        const query = (this.searchQuery || '').trim().toLowerCase();
        this.employes = (data || []).filter((u) => {
          if (!query) return true;
          const full = `${u.nom || ''} ${u.prenom || ''} ${u.email || ''} ${u.matricule || ''}`.toLowerCase();
          return full.includes(query);
        });
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des employes.'))
    });
  }

  loadRefs(): void {
    this.annuaireService.getServices().subscribe({ next: (s) => (this.services = s || []) });
    this.annuaireService.getDepartements().subscribe({ next: (d) => (this.departements = d || []) });
    this.annuaireService.getAgences().subscribe({ next: (a) => (this.agences = a || []) });
  }

  selectEmploye(emp: BaUserDto): void {
    this.form = { ...emp };
    this.showForm = true;
  }

  resetForm(): void {
    this.submitted = false;
    this.form = { sexe: 'MASCULIN' };
    this.showForm = false;
  }

  startCreate(): void {
    this.submitted = false;
    this.form = { sexe: 'MASCULIN' };
    this.showForm = true;
  }

  onDepartementChange(): void {
    if (!this.form.idDepartement) {
      this.form.idService = undefined;
      this.form.idAgence = undefined;
      return;
    }
    const serviceIsValid = this.filteredServices.some((s) => s.id === this.form.idService);
    if (!serviceIsValid) {
      this.form.idService = undefined;
    }
    const agenceIsValid = this.filteredAgences.some((a) => a.id === this.form.idAgence);
    if (!agenceIsValid) {
      this.form.idAgence = undefined;
    }
  }

  onFonctionChange(): void {
    const f = this.form.fonction;
    if (f === 'AGENT') {
      this.autoAssignHierarchyForAgent();
      return;
    }
    if (!this.requiresServiceSelection) {
      this.form.idService = undefined;
    }
    this.form.idSuperieurSecondaire = undefined;
    if (f === 'DIRECTEUR_GENERAL') {
      this.form.idSuperieur = undefined;
    }
  }

  get availableChefsService(): BaUserDto[] {
    return this.allUsers.filter((u) =>
      u.fonction === 'CHEF_SERVICE' &&
      u.id !== this.form.id &&
      (!this.form.idService || u.idService === this.form.idService)
    );
  }

  get availableDirecteurs(): BaUserDto[] {
    return this.allUsers.filter((u) =>
      u.fonction === 'DIRECTEUR' &&
      u.id !== this.form.id &&
      (!this.form.idDepartement || u.idDepartement === this.form.idDepartement)
    );
  }

  get availableDG(): BaUserDto[] {
    return this.allUsers.filter((u) => u.fonction === 'DIRECTEUR_GENERAL' && u.id !== this.form.id);
  }

  get availableDirectSuperiors(): BaUserDto[] {
    switch (this.form.fonction) {
      case 'AGENT':
        return this.availableDirecteurs;
      case 'CHEF_SERVICE':
        return this.availableDirecteurs;
      case 'DIRECTEUR':
      case 'DIRECTEUR_GENERAL_ADJOINT':
        return this.availableDG;
      default:
        return [];
    }
  }

  get requiresSecondarySuperior(): boolean {
    return this.form.fonction === 'AGENT';
  }

  get requiresServiceSelection(): boolean {
    return this.form.fonction === 'AGENT' || this.form.fonction === 'CHEF_SERVICE';
  }

  get requiresAgenceSelection(): boolean {
    return false;
  }

  create(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.setFeedback('Veuillez renseigner les champs obligatoires.', 'error');
      return;
    }
    if (!this.validateHierarchySelection()) {
      return;
    }
    this.isSaving = true;
    const payload: any = {
      ...this.form,
      username: this.form.email || this.form.emailPro,
      email: this.form.email || this.form.emailPro,
      activated: this.form.activated ?? true,
      locked: this.form.locked ?? false
    };
    this.usersService.createUser(payload).subscribe({
      next: () => {
        this.setFeedback('Utilisateur cree avec succes.', 'success');
        this.resetForm();
        this.isSaving = false;
        this.load();
      },
      error: (err) => {
        this.setFeedback(this.extractError(err, 'Erreur lors de la creation.'), 'error');
        this.isSaving = false;
      }
    });
  }

  update(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.setFeedback('Veuillez renseigner les champs obligatoires.', 'error');
      return;
    }
    if (!this.validateHierarchySelection()) {
      return;
    }
    if (!this.form.id) {
      this.setFeedback('Selectionner un employe a modifier.', 'error');
      return;
    }
    this.isUpdating = true;
    this.usersService.updateUser(this.form.id, this.form as any).subscribe({
      next: () => {
        this.setFeedback('Utilisateur mis a jour avec succes.', 'success');
        this.resetForm();
        this.isUpdating = false;
        this.load();
      },
      error: (err) => {
        this.setFeedback(this.extractError(err, 'Erreur lors de la mise a jour.'), 'error');
        this.isUpdating = false;
      }
    });
  }

  delete(emp: BaUserDto): void {
    if (!emp.id) {
      this.setFeedback('Employe sans identifiant.', 'error');
      return;
    }
    this.deletingId = emp.id;
    this.usersService.deleteUser(emp.id).subscribe({
      next: () => {
        this.setFeedback('Utilisateur supprime avec succes.', 'success');
        this.deletingId = undefined;
        this.load();
      },
      error: (err) => {
        this.setFeedback(this.extractError(err, 'Erreur lors de la suppression.'), 'error');
        this.deletingId = undefined;
      }
    });
  }

  prevPage(): void {
    this.pageIndex = Math.max(0, this.pageIndex - 1);
  }

  nextPage(): void {
    this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1);
  }

  private validateHierarchySelection(): boolean {
    const f = this.form.fonction;
    if (!f) {
      return true;
    }
    if (f === 'AGENT') {
      if (!this.form.idService) {
        this.setFeedback('Le service est obligatoire pour un AGENT.', 'error');
        return false;
      }
      this.autoAssignHierarchyForAgent();
      if (!this.form.idSuperieur || !this.form.idSuperieurSecondaire) {
        this.setFeedback('Aucun DIRECTEUR du departement ou CHEF_SERVICE du service n a ete trouve.', 'error');
        return false;
      }
      if (this.form.idSuperieur === this.form.idSuperieurSecondaire) {
        this.setFeedback('Les deux superieurs doivent etre differents.', 'error');
        return false;
      }
    } else if (f === 'DIRECTEUR_GENERAL') {
      this.form.idService = undefined;
      this.form.idSuperieur = undefined;
      this.form.idSuperieurSecondaire = undefined;
    } else {
      if (!this.requiresServiceSelection) {
        this.form.idService = undefined;
      }
      if (!this.form.idSuperieur) {
        this.setFeedback('Ce profil doit avoir un superieur direct.', 'error');
        return false;
      }
      this.form.idSuperieurSecondaire = undefined;
    }
    return true;
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }

  private setFeedback(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      if (this.message === message) {
        this.message = '';
      }
    }, 4000);
  }

  private autoAssignHierarchyForAgent(): void {
    if (this.form.fonction !== 'AGENT') {
      return;
    }
    this.form.idSuperieur = this.availableDirecteurs[0]?.id;
    this.form.idSuperieurSecondaire = this.availableChefsService[0]?.id;
  }
}
