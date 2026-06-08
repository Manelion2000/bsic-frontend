import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { UsersService, BaUserDto, BaRoleDto } from '../../services/users.service';
import { RolesService } from '../../services/roles.service';
import { ProfilsService, BaProfilDto } from '../../services/profils.service';
import { UserRoleManagementService, UserRoleState } from '../../services/user-role-management.service';
import { NotificationService } from '../../services/notification.service';
import { AnnuaireService, BaAgenceDto, BaDepartementDto, BaServiceDto } from '../../services/annuaire.service';
import { Subscription, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { extractErrorMessage } from '../../shared/error.utils';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, OnDestroy {
  users: BaUserDto[] = [];
  roles: BaRoleDto[] = [];
  profils: BaProfilDto[] = [];
  departements: BaDepartementDto[] = [];
  services: BaServiceDto[] = [];
  agences: BaAgenceDto[] = [];
  form: BaUserDto = {
    activated: true,
    locked: false,
    sexe: 'MASCULIN',
    roles: []
  };
  selectedId: string | null = null;
  message = '';
  loading = false;
  submitted = false;
  isSubmitting = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  showCreateForm = false;
  showUpdateSuccessPopup = false;
  updateSuccessMessage = '';

  // Gestion professionnelle des rôles
  selectedUserRoles$: Observable<BaRoleDto[]> | null = null;
  availableUserRoles$: Observable<BaRoleDto[]> | null = null;
  roleManagementLoading = false;
  private roleManagementSubscription: Subscription | null = null;

  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private profilsService: ProfilsService,
    private userRoleManagement: UserRoleManagementService,
    private notificationService: NotificationService,
    private annuaireService: AnnuaireService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.loading = false;
      return;
    }

    this.loadUsers();
    this.loadRefs();
  }

  ngOnDestroy(): void {
    this.roleManagementSubscription?.unsubscribe();
    // Nettoyer les états de gestion des rôles
    if (this.selectedId) {
      this.userRoleManagement.resetUserRoleState(this.selectedId);
    }
  }

  get filteredUsers(): BaUserDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.users;
    return this.users.filter((u) =>
      `${u.nom || ''} ${u.prenom || ''} ${u.email || ''} ${u.username || ''}`
        .toLowerCase()
        .includes(term)
    );
  }

  get pagedUsers(): BaUserDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  loadRefs(): void {
    this.rolesService.getRoles().subscribe({ next: (data) => (this.roles = data || []) });
    this.profilsService.getProfils().subscribe({ next: (data) => (this.profils = data || []) });
    this.annuaireService.getDepartements().subscribe({ next: (data) => (this.departements = data || []) });
    this.annuaireService.getServices().subscribe({ next: (data) => (this.services = data || []) });
    this.annuaireService.getAgences().subscribe({ next: (data) => (this.agences = data || []) });
  }

  loadUsers(): void {
    this.loading = true;
    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.users = data || [];
        this.loading = false;
        this.pageIndex = 0;
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.showError('Erreur de chargement', extractErrorMessage(err, 'Impossible de charger la liste des utilisateurs.'));
      }
    });
  }

  selectUser(user: BaUserDto): void {
    this.selectedId = user.id || null;
    this.form = { ...user, roles: user.roles || [] };
    this.showCreateForm = true;
    
    // Initialiser la gestion professionnelle des rôles
    if (user.id) {
      this.initializeRoleManagement(user.id);
    }
  }

  resetForm(): void {
    this.submitted = false;
    this.isSubmitting = false;
    this.selectedId = null;
    this.form = {
      activated: true,
      locked: false,
      sexe: 'MASCULIN',
      roles: []
    };
    this.showCreateForm = false;
    
    // Nettoyer la gestion des rôles
    this.roleManagementSubscription?.unsubscribe();
    this.selectedUserRoles$ = null;
    this.availableUserRoles$ = null;
  }

  // Initialisation de la gestion des rôles
  private initializeRoleManagement(userId: string): void {
    this.roleManagementLoading = true;
    this.roleManagementSubscription?.unsubscribe();
    
    this.roleManagementSubscription = this.userRoleManagement.getUserRoleState(userId).subscribe({
      next: (state) => {
        this.roleManagementLoading = state.loading;
        if (state.error) {
          this.notificationService.showError('Erreur de gestion des rôles', state.error);
        }
      },
      error: (err) => {
        this.roleManagementLoading = false;
        this.notificationService.showError('Erreur système', 'Erreur lors de la gestion des rôles utilisateur');
      }
    });

    // Initialiser l'état
    this.userRoleManagement.initializeUserRoleState(userId).subscribe({
      next: () => {
        // Récupérer les observables des rôles
        const roleState = this.userRoleManagement.getUserRoleState(userId);
        this.selectedUserRoles$ = roleState.pipe(map((state: UserRoleState) => state.assignedRoles));
        this.availableUserRoles$ = roleState.pipe(map((state: UserRoleState) => state.availableRoles));
        this.roleManagementLoading = false;
      },
      error: () => {
        this.roleManagementLoading = false;
      }
    });
  }

  // Gestion professionnelle des rôles
  addRoleToUser(role: BaRoleDto): void {
    if (!this.selectedId) {
      this.notificationService.showWarning('Sélection requise', 'Veuillez sélectionner un utilisateur avant d\'ajouter un rôle.');
      return;
    }

    const userName = this.form.nom && this.form.prenom ? `${this.form.prenom} ${this.form.nom}` : 'cet utilisateur';
    
    this.userRoleManagement.addRoleToUser(this.selectedId, role.id!, userName).subscribe({
      error: () => {
        // L'erreur est déjà gérée par le service
      }
    });
  }

  removeRoleFromUser(role: BaRoleDto): void {
    if (!this.selectedId) {
      this.notificationService.showWarning('Sélection requise', 'Veuillez sélectionner un utilisateur avant de supprimer un rôle.');
      return;
    }

    const userName = this.form.nom && this.form.prenom ? `${this.form.prenom} ${this.form.nom}` : 'cet utilisateur';
    
    this.userRoleManagement.removeRoleFromUser(this.selectedId, role.id!, userName).subscribe({
      error: () => {
        // L'erreur est déjà gérée par le service
      }
    });
  }

  // Assignation multiple de rôles
  assignMultipleRoles(roleIds: string[]): void {
    if (!this.selectedId) {
      this.notificationService.showWarning('Sélection requise', 'Veuillez sélectionner un utilisateur avant d\'assigner des rôles.');
      return;
    }

    const userName = this.form.nom && this.form.prenom ? `${this.form.prenom} ${this.form.nom}` : 'cet utilisateur';
    
    this.userRoleManagement.assignMultipleRoles(this.selectedId, roleIds, userName).subscribe({
      next: (result) => {
        if (result.success) {
          this.notificationService.showSuccess('Assignation réussie', `${roleIds.length} rôle(s) assigné(s) avec succès`);
        }
      },
      error: () => {
        // L'erreur est déjà gérée par le service
      }
    });
  }

  // Validation de l'assignation de rôle
  validateRoleAssignment(roleId: string): void {
    if (!this.selectedId) {
      this.notificationService.showWarning('Sélection requise', 'Veuillez sélectionner un utilisateur.');
      return;
    }

    this.usersService.validateRoleAssignment(this.selectedId, roleId).subscribe({
      next: (validation) => {
        if (validation.valid) {
          this.notificationService.showSuccess('Validation réussie', 'L\'assignation de ce rôle est valide');
        } else {
          this.notificationService.showWarning('Validation échouée', validation.reason || 'Cette assignation n\'est pas valide');
        }
      },
      error: () => {
        this.notificationService.showError('Erreur de validation', 'Impossible de valider cette assignation de rôle');
      }
    });
  }

  // Obtenir l'historique des opérations sur les rôles
  showRoleOperationHistory(): void {
    if (!this.selectedId) {
      this.notificationService.showWarning('Sélection requise', 'Veuillez sélectionner un utilisateur.');
      return;
    }

    const history = this.userRoleManagement.getOperationHistory(this.selectedId);
    if (history.length === 0) {
      this.notificationService.showInfo('Historique vide', 'Aucune opération sur les rôles n\'a été enregistrée pour cet utilisateur');
      return;
    }

    // Afficher un résumé des opérations récentes
    const recentOps = history.slice(-5).reverse();
    const summary = recentOps.map(op => 
      `${op.type} - ${op.status} - ${new Date(op.timestamp).toLocaleString()}`
    ).join('\n');

    this.notificationService.showInfo('Historique des opérations', `Dernières opérations:\n${summary}`);
  }

  // Méthodes existantes mises à jour avec notifications professionnelles
  createUser(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.notificationService.showWarning('Validation requise', 'Veuillez renseigner tous les champs obligatoires avant de continuer.');
      return;
    }
    if (!this.validateHierarchySelection()) {
      return;
    }
    const payload: BaUserDto = {
      ...this.form,
      username: this.form.email || this.form.emailPro
    };
    this.isSubmitting = true;
    this.usersService.createUser(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess('Utilisateur créé', `L'utilisateur ${this.form.prenom} ${this.form.nom} a été créé avec succès.`);
        this.resetForm();
        this.isSubmitting = false;
        this.loadUsers();
      },
      error: (err) => {
        this.notificationService.showError('Échec de création', extractErrorMessage(err, 'Une erreur est survenue lors de la création de l\'utilisateur.'));
        this.isSubmitting = false;
      }
    });
  }

  updateUser(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.notificationService.showWarning('Validation requise', 'Veuillez renseigner tous les champs obligatoires avant de continuer.');
      return;
    }
    if (!this.validateHierarchySelection()) {
      return;
    }
    const key = this.selectedId || this.form.id || this.form.username;
    if (!key) {
      this.notificationService.showWarning('Sélection requise', 'Veuillez sélectionner un utilisateur à modifier.');
      return;
    }
    const payload: BaUserDto = {
      ...this.form,
      username: this.form.email || this.form.emailPro
    };
    this.isSubmitting = true;
    this.usersService.updateUser(key, payload).subscribe({
      next: () => {
        this.notificationService.showSuccess('Utilisateur modifié', `Les informations de ${this.form.prenom} ${this.form.nom} ont été mises à jour avec succès.`);
        this.updateSuccessMessage = `Les informations de ${this.form.prenom} ${this.form.nom} ont été mises à jour avec succès.`;
        this.showUpdateSuccessPopup = true;
        this.resetForm();
        this.isSubmitting = false;
        this.loadUsers();
      },
      error: (err) => {
        this.notificationService.showError('Échec de mise à jour', extractErrorMessage(err, 'Une erreur est survenue lors de la mise à jour de l\'utilisateur.'));
        this.isSubmitting = false;
      }
    });
  }

  deleteUser(user?: BaUserDto): void {
    const key = user?.id || user?.username || this.selectedId || this.form.id || this.form.username;
    if (!key) {
      this.notificationService.showWarning('Sélection requise', 'Veuillez sélectionner un utilisateur à supprimer.');
      return;
    }
    const userName = user?.prenom && user?.nom ? `${user.prenom} ${user.nom}` : 'cet utilisateur';
    this.usersService.deleteUser(key).subscribe({
      next: () => {
        this.notificationService.showSuccess('Utilisateur supprimé', `${userName} a été supprimé définitivement du système.`);
        this.resetForm();
        this.loadUsers();
      },
      error: (err) => {
        this.notificationService.showError('Échec de suppression', extractErrorMessage(err, 'Une erreur est survenue lors de la suppression de l\'utilisateur.'));
      }
    });
  }

  activateUser(user: BaUserDto): void {
    if (!user.id) {
      this.notificationService.showError('Erreur système', 'Identifiant utilisateur manquant.');
      return;
    }
    const userName = user?.prenom && user?.nom ? `${user.prenom} ${user.nom}` : 'Cet utilisateur';
    this.usersService.activateUser(user.id).subscribe({
      next: () => {
        const action = user.locked ? 'activé' : 'désactivé';
        this.notificationService.showSuccess('Statut modifié', `${userName} a été ${action} avec succès.`);
        this.loadUsers();
      },
      error: (err) => {
        this.notificationService.showError('Échec de modification', extractErrorMessage(err, 'Une erreur est survenue lors de la modification du statut.'));
      }
    });
  }

  // Méthodes utilitaires pour la compatibilité
  toggleRole(role: BaRoleDto): void {
    const isAssigned = this.isRoleSelected(role);
    if (isAssigned) {
      this.removeRoleFromUser(role);
    } else {
      this.addRoleToUser(role);
    }
  }

  isRoleSelected(role: BaRoleDto): boolean {
    return !!this.form.roles?.some((r) => r.id === role.id);
  }

  prevPage(): void {
    this.pageIndex = Math.max(0, this.pageIndex - 1);
  }

  nextPage(): void {
    this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1);
  }

  startCreateUser(): void {
    this.resetForm();
    this.showCreateForm = true;
  }

  onFonctionChange(): void {
    const f = this.form.fonction;
    if (f === 'AGENT') {
      this.autoAssignHierarchyForAgent();
      return;
    }
    if (this.requiresServiceSelection) {
      this.form.idService = undefined;
    }
    this.form.idSuperieurSecondaire = undefined;
    if (f === 'DIRECTEUR_GENERAL') {
      this.form.idSuperieur = undefined;
    }
  }

  onDepartementChange(): void {
    this.form.idService = undefined;
    this.form.idSuperieur = undefined;
    this.form.idSuperieurSecondaire = undefined;
    const agenceIsValid = this.filteredAgences.some((a) => a.id === this.form.idAgence);
    if (!agenceIsValid) {
      this.form.idAgence = undefined;
    }
    this.autoAssignHierarchyForAgent();
  }

  onServiceChange(): void {
    this.form.idSuperieurSecondaire = undefined;
    this.autoAssignHierarchyForAgent();
  }

  get filteredAgences(): BaAgenceDto[] {
    if (!this.form.idDepartement) {
      return [];
    }
    return this.agences.filter((a) => a.idDepartement === this.form.idDepartement);
  }

  get filteredServices(): BaServiceDto[] {
    if (!this.form.idDepartement) {
      return [];
    }
    return this.services.filter((s) => s.idDepartement === this.form.idDepartement);
  }

  get requiresServiceSelection(): boolean {
    return this.form.fonction === 'AGENT' || this.form.fonction === 'CHEF_SERVICE';
  }

  get requiresAgenceSelection(): boolean {
    return false;
  }

  get availableChefsService(): BaUserDto[] {
    return this.users.filter((u) =>
      u.fonction === 'CHEF_SERVICE' &&
      u.id !== this.form.id &&
      (!this.form.idService || u.idService === this.form.idService)
    );
  }

  get availableDirecteurs(): BaUserDto[] {
    return this.users.filter((u) =>
      u.fonction === 'DIRECTEUR' &&
      u.id !== this.form.id &&
      (!this.form.idDepartement || u.idDepartement === this.form.idDepartement)
    );
  }

  get availableDG(): BaUserDto[] {
    return this.users.filter((u) => u.fonction === 'DIRECTEUR_GENERAL' && u.id !== this.form.id);
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

  private validateHierarchySelection(): boolean {
    const f = this.form.fonction;
    if (!f) {
      return true;
    }
    if (f === 'AGENT') {
      if (!this.form.idService) {
        this.notificationService.showWarning('Validation requise', 'Le service est obligatoire pour un AGENT.');
        return false;
      }
      this.autoAssignHierarchyForAgent();
      if (!this.form.idSuperieur || !this.form.idSuperieurSecondaire) {
        this.notificationService.showWarning('Hierarchie invalide', 'Aucun DIRECTEUR du departement ou CHEF_SERVICE du service n a ete trouve.');
        return false;
      }
      if (this.form.idSuperieur === this.form.idSuperieurSecondaire) {
        this.notificationService.showWarning('Hierarchie invalide', 'Les deux superieurs doivent etre differents.');
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
        this.notificationService.showWarning('Hierarchie invalide', 'Ce profil doit avoir un superieur direct.');
        return false;
      }
      this.form.idSuperieurSecondaire = undefined;
    }
    return true;
  }

  private autoAssignHierarchyForAgent(): void {
    if (this.form.fonction !== 'AGENT') {
      return;
    }
    const directeurDepartement = this.availableDirecteurs[0];
    const chefService = this.availableChefsService[0];
    this.form.idSuperieur = directeurDepartement?.id;
    this.form.idSuperieurSecondaire = chefService?.id;
  }

  get activeUsersCount(): number {
    return this.users.filter((u) => u.activated && !u.locked).length;
  }

  get lockedUsersCount(): number {
    return this.users.filter((u) => u.locked).length;
  }

  get inactiveUsersCount(): number {
    return this.users.filter((u) => !u.activated).length;
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }

  closeUpdateSuccessPopup(): void {
    this.showUpdateSuccessPopup = false;
    this.updateSuccessMessage = '';
  }
}
