import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AnnuaireService, BaAgenceDto, BaDepartementDto, BaServiceDto } from '../../services/annuaire.service';
import { BaValidationDelegationDto, HabilitationsService } from '../../services/habilitations.service';
import { BaRoleDto, RolesService } from '../../services/roles.service';
import { BaUserDto, UsersService } from '../../services/users.service';
import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-validation-delegations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './validation-delegations.component.html',
  styleUrl: './validation-delegations.component.scss'
})
export class ValidationDelegationsComponent implements OnInit {
  delegations: BaValidationDelegationDto[] = [];
  users: BaUserDto[] = [];
  roles: BaRoleDto[] = [];
  departements: BaDepartementDto[] = [];
  services: BaServiceDto[] = [];
  agences: BaAgenceDto[] = [];
  form: BaValidationDelegationDto = this.emptyForm();
  message = '';
  submitted = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  showForm = false;

  readonly businessRoles = ['BA_DIRECTEUR', 'BA_DGA', 'BA_DG', 'BA_CHEF_SERVICE'];

  constructor(
    private habilitationsService: HabilitationsService,
    private usersService: UsersService,
    private rolesService: RolesService,
    private annuaireService: AnnuaireService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get roleOptions(): string[] {
    const codes = (this.roles || []).map((role) => role.code).filter((code): code is string => !!code);
    return Array.from(new Set([...this.businessRoles, ...codes])).sort();
  }

  get filteredDelegations(): BaValidationDelegationDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.delegations;
    return this.delegations.filter((item) =>
      [
        item.nomDelegue,
        item.nomDelegant,
        item.roleCode,
        item.nomDepartement,
        item.nomService,
        item.nomAgence,
        item.motif
      ].join(' ').toLowerCase().includes(term)
    );
  }

  get pagedDelegations(): BaValidationDelegationDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredDelegations.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDelegations.length / this.pageSize));
  }

  loadData(): void {
    forkJoin({
      delegations: this.habilitationsService.getValidationDelegations(),
      users: this.usersService.getUsers(),
      roles: this.rolesService.getRoles(),
      departements: this.annuaireService.getDepartements(),
      services: this.annuaireService.getServices(),
      agences: this.annuaireService.getAgences()
    }).subscribe({
      next: ({ delegations, users, roles, departements, services, agences }) => {
        this.delegations = delegations || [];
        this.users = users || [];
        this.roles = roles || [];
        this.departements = departements || [];
        this.services = services || [];
        this.agences = agences || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des delegations.'))
    });
  }

  openCreateForm(): void {
    this.form = this.emptyForm();
    this.submitted = false;
    this.showForm = true;
  }

  selectDelegation(delegation: BaValidationDelegationDto): void {
    this.form = { ...delegation };
    this.submitted = false;
    this.showForm = true;
  }

  closeFormModal(): void {
    this.form = this.emptyForm();
    this.submitted = false;
    this.showForm = false;
  }

  save(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    const payload = this.cleanPayload(this.form);
    const request = payload.id
      ? this.habilitationsService.updateValidationDelegation(payload.id, payload)
      : this.habilitationsService.createValidationDelegation(payload);
    request.subscribe({
      next: () => {
        this.message = payload.id ? 'Delegation mise a jour.' : 'Delegation creee.';
        this.closeFormModal();
        this.loadData();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de l’enregistrement.'))
    });
  }

  desactiver(delegation: BaValidationDelegationDto): void {
    if (!delegation.id) {
      this.message = 'Delegation sans identifiant.';
      return;
    }
    this.habilitationsService.deleteValidationDelegation(delegation.id).subscribe({
      next: () => {
        this.message = 'Delegation desactivee.';
        this.loadData();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la desactivation.'))
    });
  }

  prevPage(): void {
    this.pageIndex = Math.max(0, this.pageIndex - 1);
  }

  nextPage(): void {
    this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1);
  }

  userLabel(user: BaUserDto): string {
    const fullName = `${user.nom || ''} ${user.prenom || ''}`.trim();
    return fullName || user.username || user.email || user.id || '';
  }

  delegationScope(delegation: BaValidationDelegationDto): string {
    return delegation.nomDepartement || delegation.nomService || delegation.nomAgence || 'Perimetre utilisateur';
  }

  private cleanPayload(form: BaValidationDelegationDto): BaValidationDelegationDto {
    return {
      ...form,
      idDelegant: form.idDelegant || undefined,
      idDepartement: form.idDepartement || undefined,
      idService: form.idService || undefined,
      idAgence: form.idAgence || undefined,
      actif: form.actif !== false
    };
  }

  private emptyForm(): BaValidationDelegationDto {
    const today = new Date().toISOString().slice(0, 10);
    return {
      dateDebut: today,
      dateFin: today,
      actif: true,
      roleCode: 'BA_DIRECTEUR'
    };
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }
}
