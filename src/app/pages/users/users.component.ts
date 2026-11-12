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
import { ElementRef, ViewChild } from '@angular/core';
import { TemporaryCredential } from '../../services/users.service';
import { TemporaryPasswordComponent } from '../../shared/temporary-password.component';
import { agentHierarchyCandidates, fillAgentHierarchy } from '../../shared/agent-hierarchy.utils';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, TemporaryPasswordComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, OnDestroy {
  @ViewChild('resetAccessDialog',{static:true}) resetAccessDialog!:ElementRef<HTMLDialogElement>;
  credential?:TemporaryCredential;resetReason='';resetError='';resetting=false;resetTarget?:BaUserDto;
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
  pageSize = 15;
  pageIndex = 0;
  statusView: 'ACTIVE' | 'INACTIVE' = 'ACTIVE';
  showCreateForm = false;
  showUpdateSuccessPopup = false;
  updateSuccessMessage = '';
  currentUser: BaUserDto | null = null;

  // Gestion professionnelle des rôles
  selectedUserRoles$: Observable<BaRoleDto[]> | null = null;
  availableUserRoles$: Observable<BaRoleDto[]> | null = null;
  roleManagementLoading = false;
  roleManagementError: string | null = null;
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
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.credential=undefined;
    this.roleManagementSubscription?.unsubscribe();
    // Nettoyer les états de gestion des rôles
    if (this.selectedId) {
      this.userRoleManagement.resetUserRoleState(this.selectedId);
    }
  }

  get filteredUsers(): BaUserDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    const usersByStatus = this.statusView === 'ACTIVE' ? this.activeUsers : this.inactiveUsers;
    if (!term) return usersByStatus;
    return usersByStatus.filter((u) =>
      `${u.nom || ''} ${u.prenom || ''} ${u.email || ''} ${u.username || ''} ${u.matricule || ''} ${u.nomService || ''} ${u.nomDepartement || ''}`
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

  get activeUsers(): BaUserDto[] {
    return this.users.filter((u) => this.isActiveUser(u));
  }

  get inactiveUsers(): BaUserDto[] {
    return this.users.filter((u) => !this.isActiveUser(u));
  }

  get currentViewTitle(): string {
    return this.statusView === 'ACTIVE' ? 'Utilisateurs actifs' : 'Utilisateurs inactifs et verrouilles';
  }

  get currentViewSubtitle(): string {
    return this.statusView === 'ACTIVE'
      ? 'Comptes autorises a acceder a la plateforme'
      : 'Comptes suspendus, verrouilles ou non actives';
  }

  getRoleSummary(user: BaUserDto): string {
    const roles = user.roles || [];
    if (!roles.length) {
      return 'Aucun role';
    }
    return roles.map((role) => role.libelle || role.code).filter(Boolean).join(', ');
  }

  getRoleCount(user: BaUserDto): number {
    return user.roles?.length || 0;
  }

  setStatusView(view: 'ACTIVE' | 'INACTIVE'): void {
    this.statusView = view;
    this.pageIndex = 0;
  }

  loadRefs(): void {
    this.rolesService.getRoles().subscribe({ next: (data) => (this.roles = data || []) });
    this.profilsService.getProfils().subscribe({ next: (data) => (this.profils = data || []) });
    this.annuaireService.getDepartements().subscribe({ next: (data) => (this.departements = data || []) });
    this.annuaireService.getServices().subscribe({ next: (data) => {this.services = data || [];if(this.showCreateForm)this.fillHierarchy();} });
    this.annuaireService.getAgences().subscribe({ next: (data) => (this.agences = data || []) });
  }

  loadUsers(): void {
    this.loading = true;
    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.users = data || [];
        this.loading = false;
        this.pageIndex = 0;
        if(this.showCreateForm)this.fillHierarchy();
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.showError('Erreur de chargement', extractErrorMessage(err, 'Impossible de charger la liste des utilisateurs.'));
      }
    });
  }

  loadCurrentUser(): void {
    this.usersService.getUserWithMoreInfo().subscribe({
      next: (user) => this.currentUser = user,
      error: () => this.currentUser = null
    });
  }

  selectUser(user: BaUserDto): void {
    if (!this.canManageUser(user)) {
      this.notificationService.showWarning('Acces limite', 'Vous ne pouvez pas gerer cet utilisateur.');
      return;
    }
    this.selectedId = user.id || null;
    this.form = { ...user, roles: user.roles || [] };
    this.fillHierarchy();
    this.showCreateForm = true;
    
    // Initialiser la gestion professionnelle des rôles
    if (user.id) {
      this.initializeRoleManagement(user.id);
    }
  }

  resetForm(): void {
    if(this.resetting)return;
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
    this.roleManagementLoading = false;
    this.roleManagementError = null;
  }

  // Initialisation de la gestion des rôles
  private initializeRoleManagement(userId: string): void {
    this.roleManagementLoading = true;
    this.roleManagementSubscription?.unsubscribe();
    
    const roleState = this.userRoleManagement.getUserRoleState(userId);
    this.selectedUserRoles$ = roleState.pipe(map((state: UserRoleState) => state.assignedRoles));
    this.availableUserRoles$ = roleState.pipe(map((state: UserRoleState) => state.availableRoles));
    this.roleManagementSubscription = roleState.subscribe(state => {
      if (this.selectedId !== state.userId) return;
      this.roleManagementLoading = state.loading;
      this.roleManagementError = state.error;
      if (!state.loading && !state.error) {
        // Conserver la saisie et envoyer les rôles confirmés lors de la sauvegarde.
        this.form.roles = [...state.assignedRoles];
        this.users = this.users.map(user => user.id === userId ? {...user, roles: [...state.assignedRoles]} : user);
        if (this.currentUser?.id === userId) this.currentUser = {...this.currentUser, roles: [...state.assignedRoles]};
      }
    });
    this.userRoleManagement.initializeUserRoleState(userId).subscribe({error: () => {}});
  }

  // Gestion professionnelle des rôles
  addRoleToUser(role: BaRoleDto): void {
    if (!this.isCurrentUserAdmin || this.roleManagementLoading || this.isSubmitting || !role.id) return;
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
    if (!this.isCurrentUserAdmin || this.roleManagementLoading || this.isSubmitting || !role.id) return;
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
    if (!this.isCurrentUserAdmin || this.roleManagementLoading || this.isSubmitting) return;
    if (!this.selectedId) {
      this.notificationService.showWarning('Sélection requise', 'Veuillez sélectionner un utilisateur avant d\'assigner des rôles.');
      return;
    }

    const userName = this.form.nom && this.form.prenom ? `${this.form.prenom} ${this.form.nom}` : 'cet utilisateur';
    
    this.userRoleManagement.assignMultipleRoles(this.selectedId, roleIds, userName).subscribe({
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
    if(this.isSubmitting)return;
    if (!this.canManageUsers) {
      this.notificationService.showError('Acces refuse', 'Action reservee aux administrateurs et aux chefs de service.');
      return;
    }
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
      next: (created) => {
        this.notificationService.showSuccess('Utilisateur créé', `L'utilisateur ${this.form.prenom} ${this.form.nom} a été créé avec succès.`);
        this.resetForm();
        this.credential=created?.initialCredential;
        this.isSubmitting = false;
        this.loadUsers();
      },
      error: (err) => {
        this.notificationService.showError('Échec de création', extractErrorMessage(err, 'Une erreur est survenue lors de la création de l\'utilisateur.'));
        this.isSubmitting = false;
      }
    });
  }

  get canInitializeAccess():boolean {return this.currentUser?.canResetUserAccess ?? this.isCurrentUserAdmin;}
  canResetUser(user:BaUserDto):boolean {return this.canInitializeAccess&&!!user.id&&user.id!==this.currentUser?.id&&user.activated===true&&user.locked!==true;}
  get canResetSelectedUser():boolean {return this.canResetUser({...this.form,id:this.selectedId || undefined});}
  beginResetAccess(user?:BaUserDto){
    const target=user || {...this.form,id:this.selectedId || undefined};
    if(!this.canResetUser(target)||this.resetting||this.isSubmitting)return;
    this.resetTarget={...target};this.resetReason='';this.resetError='';this.resetAccessDialog.nativeElement.showModal();
  }
  closeResetAccess(){if(this.resetting)return;this.resetAccessDialog.nativeElement.close();this.resetTarget=undefined;this.resetError='';}
  resetAccess(){
    if(this.resetting||!this.resetTarget||!this.canInitializeAccess)return;
    if(!this.resetReason.trim()){this.resetError='Précisez le motif de la réinitialisation.';return;}
    this.resetting=true;this.resetError='';
    this.usersService.resetAccess(this.resetTarget,this.resetReason.trim()).subscribe({next:credential=>{
      this.resetting=false;if(this.selectedId===this.resetTarget?.id){this.form.version=credential.userVersion;this.form.passwordChangeRequired=true;}
      this.closeResetAccess();this.credential=credential;this.loadUsers();
    },error:e=>{this.resetting=false;this.resetError=extractErrorMessage(e,'Réinitialisation impossible.');}});
  }

  updateUser(formRef: NgForm): void {
    if (this.isSubmitting || this.roleManagementLoading) return;
    if (!this.canManageUser(this.form)) {
      this.notificationService.showError('Acces refuse', 'Vous ne pouvez pas modifier cet utilisateur.');
      return;
    }
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

  toggleUserActivation(user: BaUserDto): void {
    if (!user.id) {
      this.notificationService.showError('Erreur système', 'Identifiant utilisateur manquant.');
      return;
    }
    if (!this.canManageUser(user)) {
      this.notificationService.showError('Acces refuse', 'Vous ne pouvez pas modifier le statut de cet utilisateur.');
      return;
    }
    if (this.currentUser?.id === user.id && user.activated && !user.locked) {
      this.notificationService.showWarning('Action interdite', 'Vous ne pouvez pas desactiver votre propre compte.');
      return;
    }
    const userName = user?.prenom && user?.nom ? `${user.prenom} ${user.nom}` : 'Cet utilisateur';
    const action$ = user.activated && !user.locked
      ? this.usersService.desactiverUser(user.id)
      : this.usersService.activerUser(user.id);
    action$.subscribe({
      next: () => {
        const action = user.activated && !user.locked ? 'desactive' : 'active';
        this.notificationService.showSuccess('Statut modifié', `${userName} a été ${action} avec succès.`);
        this.loadUsers();
      },
      error: (err) => {
        this.notificationService.showError('Échec de modification', extractErrorMessage(err, 'Une erreur est survenue lors de la modification du statut.'));
      }
    });
  }
  activateUser(user: BaUserDto): void {
    this.toggleUserActivation(user);
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
    if (!this.canManageUsers) {
      this.notificationService.showError('Acces refuse', 'Action reservee aux administrateurs et aux chefs de service.');
      return;
    }
    this.resetForm();
    this.showCreateForm = true;
  }

  onFonctionChange(): void {
    const f = this.form.fonction;
    if (!this.requiresServiceSelection) {
      this.form.idService = undefined;
    }
    this.form.idSuperieur = undefined;
    this.form.idSuperieurSecondaire = undefined;
    this.form.nomCompletSuperieur = undefined;
    this.form.nomCompletSuperieurSecondaire = undefined;
    if (f === 'DIRECTEUR_GENERAL') {
      this.form.idDepartement = undefined;
      this.form.idAgence = undefined;
    }
    this.fillHierarchy();
  }

  onDepartementChange(): void {
    this.form.idService = undefined;
    this.form.idSuperieur = undefined;
    this.form.idSuperieurSecondaire = undefined;
    const agenceIsValid = this.filteredAgences.some((a) => a.id === this.form.idAgence);
    if (!agenceIsValid) {
      this.form.idAgence = undefined;
    }
    this.fillHierarchy();
  }

  onServiceChange(): void {
    this.fillHierarchy();
  }

  fillHierarchy(): void {fillAgentHierarchy(this.form, this.users, this.services);}
  get agentHierarchy(){return agentHierarchyCandidates(this.form, this.users, this.services);}

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
    return this.agentHierarchy.chiefs;
  }

  get availableDirecteurs(): BaUserDto[] {
    return this.agentHierarchy.directors;
  }

  get availableDG(): BaUserDto[] {
    return this.users.filter((u) => u.fonction === 'DIRECTEUR_GENERAL' && u.id !== this.form.id);
  }

  get availableDirectSuperiors(): BaUserDto[] {
    switch (this.form.fonction) {
      case 'AGENT':
        return this.availableChefsService;
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

  get requiresDepartmentSelection(): boolean {
    return this.form.fonction !== 'DIRECTEUR_GENERAL' && this.form.fonction !== 'DIRECTEUR_GENERAL_ADJOINT';
  }

  private validateHierarchySelection(): boolean {
    const f = this.form.fonction;
    if (!f) {
      return true;
    }
    if (f === 'AGENT') {
      if (!this.form.idDepartement) {
        this.notificationService.showWarning('Validation requise', 'Le département est obligatoire pour un agent.');
        return false;
      }
      if (!this.form.idService) {
        this.notificationService.showWarning('Validation requise', 'Le service est obligatoire pour un AGENT.');
        return false;
      }
      if (!this.filteredServices.some(s => s.id === this.form.idService)) {
        this.notificationService.showWarning('Affectation invalide', 'Le service doit appartenir au département sélectionné.');
        return false;
      }
      if (this.form.idSuperieur && this.form.idSuperieur === this.form.idSuperieurSecondaire) {
        this.notificationService.showWarning('Hierarchie invalide', 'Les deux superieurs doivent etre differents.');
        return false;
      }
    } else if (f === 'DIRECTEUR_GENERAL') {
      this.form.idService = undefined;
      this.form.idDepartement = undefined;
      this.form.idAgence = undefined;
      this.form.idSuperieur = undefined;
      this.form.idSuperieurSecondaire = undefined;
    } else {
      if (!this.requiresServiceSelection) {
        this.form.idService = undefined;
      }
      this.form.idSuperieurSecondaire = undefined;
    }
    return true;
  }

  get activeUsersCount(): number {
    return this.activeUsers.length;
  }

  get lockedUsersCount(): number {
    return this.users.filter((u) => u.locked).length;
  }

  get inactiveUsersCount(): number {
    return this.inactiveUsers.length;
  }

  isActiveUser(user: BaUserDto): boolean {
    return !!user.activated && !user.locked;
  }

  get canManageUsers(): boolean {
    return this.isCurrentUserAdmin || this.currentUser?.fonction === 'CHEF_SERVICE';
  }

  get isCurrentUserAdmin(): boolean {
    return !!this.currentUser?.roles?.some((role) => {
      const code = (role.code || '').toUpperCase();
      const libelle = (role.libelle || '').toUpperCase();
      return code === 'BA_ADMIN';
    });
  }

  canManageUser(user?: BaUserDto | null): boolean {
    if (!this.canManageUsers || !user) {
      return false;
    }
    if (this.isCurrentUserAdmin) {
      return true;
    }
    return this.currentUser?.fonction === 'CHEF_SERVICE'
      && user.fonction === 'AGENT'
      && !!this.currentUser.idService
      && this.currentUser.idService === user.idService;
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }

  closeUpdateSuccessPopup(): void {
    this.showUpdateSuccessPopup = false;
    this.updateSuccessMessage = '';
  }
}
