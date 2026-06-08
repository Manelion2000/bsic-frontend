import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { UsersService, BaUserDto, BaRoleDto, RoleAssignmentResult } from './users.service';
import { RolesService } from './roles.service';
import { NotificationService } from './notification.service';

export interface UserRoleState {
  userId: string;
  user: BaUserDto | null;
  availableRoles: BaRoleDto[];
  assignedRoles: BaRoleDto[];
  loading: boolean;
  error: string | null;
}

export interface RoleOperation {
  type: 'add' | 'remove' | 'bulk-add' | 'bulk-remove' | 'replace';
  roleId?: string;
  roleIds?: string[];
  timestamp: Date;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserRoleManagementService {
  private userRoleStates = new Map<string, BehaviorSubject<UserRoleState>>();
  private operationHistory = new Map<string, RoleOperation[]>();

  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private notificationService: NotificationService
  ) {}

  // Initialisation de l'état pour un utilisateur
  initializeUserRoleState(userId: string): Observable<UserRoleState> {
    if (!this.userRoleStates.has(userId)) {
      this.userRoleStates.set(userId, new BehaviorSubject<UserRoleState>({
        userId,
        user: null,
        availableRoles: [],
        assignedRoles: [],
        loading: true,
        error: null
      }));
    }

    return combineLatest([
      this.rolesService.getRoles(),
      this.usersService.getUserRoles(userId)
    ]).pipe(
      map(([availableRoles, assignedRoles]) => {
        const state = this.userRoleStates.get(userId)?.value;
        if (!state) throw new Error('État utilisateur non initialisé');

        // Filtrer les rôles disponibles (ceux qui ne sont pas déjà assignés)
        const availableFiltered = availableRoles.filter(role => 
          !assignedRoles.some(assigned => assigned.id === role.id)
        );

        return {
          ...state,
          availableRoles: availableFiltered,
          assignedRoles,
          loading: false,
          error: null
        };
      }),
      tap(updatedState => {
        this.userRoleStates.get(userId)?.next(updatedState);
      }),
      catchError(error => {
        const state = this.userRoleStates.get(userId)?.value;
        if (state) {
          this.userRoleStates.get(userId)?.next({
            ...state,
            loading: false,
            error: 'Erreur lors du chargement des rôles'
          });
        }
        this.notificationService.showError('Erreur de chargement', 'Impossible de charger les rôles utilisateur');
        return throwError(error);
      })
    );
  }

  // Observer l'état d'un utilisateur
  getUserRoleState(userId: string): Observable<UserRoleState> {
    if (!this.userRoleStates.has(userId)) {
      return this.initializeUserRoleState(userId);
    }
    return this.userRoleStates.get(userId)!.asObservable();
  }

  // Ajouter un rôle à un utilisateur avec validation professionnelle
  addRoleToUser(userId: string, roleId: string, userName?: string): Observable<RoleAssignmentResult> {
    const state = this.userRoleStates.get(userId)?.value;
    if (!state) {
      return this.initializeUserRoleState(userId).pipe(
        switchMap(() => this.addRoleToUser(userId, roleId, userName))
      );
    }

    // Validation locale
    if (state.assignedRoles.some(role => role.id === roleId)) {
      this.notificationService.showWarning('Rôle déjà assigné', 'Ce rôle est déjà assigné à cet utilisateur');
      return new Observable(observer => {
        observer.next({
          success: false,
          message: 'Le rôle est déjà assigné à cet utilisateur'
        });
        observer.complete();
      });
    }

    // Ajouter l'opération à l'historique
    this.addOperationToHistory(userId, {
      type: 'add',
      roleId,
      timestamp: new Date(),
      status: 'pending'
    });

    // Mettre à jour l'état localement (optimistic update)
    const roleToAdd = state.availableRoles.find(role => role.id === roleId);
    if (roleToAdd) {
      const updatedState = {
        ...state,
        assignedRoles: [...state.assignedRoles, roleToAdd],
        availableRoles: state.availableRoles.filter(role => role.id !== roleId)
      };
      this.userRoleStates.get(userId)?.next(updatedState);
    }

    return this.usersService.addRoleToUser(userId, roleId).pipe(
      tap(result => {
        if (result.success) {
          this.notificationService.showSuccess(
            'Rôle assigné', 
            `Le rôle ${roleToAdd?.libelle || roleId} a été assigné à ${userName || 'l\'utilisateur'} avec succès`
          );
          this.updateOperationStatus(userId, 'add', roleId, 'success', result.message);
        } else {
          // Rollback en cas d'erreur
          this.rollbackRoleAddition(userId, roleId);
          this.notificationService.showError('Échec d\'assignation', result.message);
          this.updateOperationStatus(userId, 'add', roleId, 'error', result.message);
        }
      }),
      catchError(error => {
        this.rollbackRoleAddition(userId, roleId);
        this.notificationService.showError('Erreur système', 'Une erreur technique est survenue lors de l\'assignation du rôle');
        this.updateOperationStatus(userId, 'add', roleId, 'error', error.message);
        return throwError(error);
      })
    );
  }

  // Supprimer un rôle d'un utilisateur
  removeRoleFromUser(userId: string, roleId: string, userName?: string): Observable<RoleAssignmentResult> {
    const state = this.userRoleStates.get(userId)?.value;
    if (!state) {
      return this.initializeUserRoleState(userId).pipe(
        switchMap(() => this.removeRoleFromUser(userId, roleId, userName))
      );
    }

    // Validation locale
    const roleToRemove = state.assignedRoles.find(role => role.id === roleId);
    if (!roleToRemove) {
      this.notificationService.showWarning('Rôle non assigné', 'Ce rôle n\'est pas actuellement assigné à cet utilisateur');
      return new Observable(observer => {
        observer.next({
          success: false,
          message: 'Le rôle n\'est pas assigné à cet utilisateur'
        });
        observer.complete();
      });
    }

    // Ajouter l'opération à l'historique
    this.addOperationToHistory(userId, {
      type: 'remove',
      roleId,
      timestamp: new Date(),
      status: 'pending'
    });

    // Optimistic update
    const updatedState = {
      ...state,
      assignedRoles: state.assignedRoles.filter(role => role.id !== roleId),
      availableRoles: [...state.availableRoles, roleToRemove]
    };
    this.userRoleStates.get(userId)?.next(updatedState);

    return this.usersService.removeRoleFromUser(userId, roleId).pipe(
      tap(result => {
        if (result.success) {
          this.notificationService.showSuccess(
            'Rôle supprimé', 
            `Le rôle ${roleToRemove.libelle || roleId} a été retiré de ${userName || 'l\'utilisateur'} avec succès`
          );
          this.updateOperationStatus(userId, 'remove', roleId, 'success', result.message);
        } else {
          // Rollback en cas d'erreur
          this.rollbackRoleRemoval(userId, roleId, roleToRemove);
          this.notificationService.showError('Échec de suppression', result.message);
          this.updateOperationStatus(userId, 'remove', roleId, 'error', result.message);
        }
      }),
      catchError(error => {
        this.rollbackRoleRemoval(userId, roleId, roleToRemove);
        this.notificationService.showError('Erreur système', 'Une erreur technique est survenue lors de la suppression du rôle');
        this.updateOperationStatus(userId, 'remove', roleId, 'error', error.message);
        return throwError(error);
      })
    );
  }

  // Assignation multiple de rôles
  assignMultipleRoles(userId: string, roleIds: string[], userName?: string): Observable<RoleAssignmentResult> {
    const state = this.userRoleStates.get(userId)?.value;
    if (!state) {
      return this.initializeUserRoleState(userId).pipe(
        switchMap(() => this.assignMultipleRoles(userId, roleIds, userName))
      );
    }

    // Validation
    const validRoleIds = roleIds.filter(roleId => 
      state.availableRoles.some(role => role.id === roleId)
    );

    if (validRoleIds.length === 0) {
      this.notificationService.showWarning('Aucun rôle valide', 'Aucun des rôles sélectionnés n\'est disponible pour l\'assignation');
      return new Observable(observer => {
        observer.next({
          success: false,
          message: 'Aucun rôle valide à assigner'
        });
        observer.complete();
      });
    }

    // Optimistic update
    const rolesToAdd = state.availableRoles.filter(role => validRoleIds.includes(role.id!));
    const updatedState = {
      ...state,
      assignedRoles: [...state.assignedRoles, ...rolesToAdd],
      availableRoles: state.availableRoles.filter(role => !validRoleIds.includes(role.id!))
    };
    this.userRoleStates.get(userId)?.next(updatedState);

    return this.usersService.assignMultipleRoles(userId, validRoleIds).pipe(
      tap(result => {
        if (result.success) {
          this.notificationService.showSuccess(
            'Rôles assignés', 
            `${validRoleIds.length} rôle(s) ont été assigné(s) à ${userName || 'l\'utilisateur'} avec succès`
          );
        } else {
          // Rollback complet
          this.initializeUserRoleState(userId);
          this.notificationService.showError('Échec d\'assignation multiple', result.message);
        }
      }),
      catchError(error => {
        this.initializeUserRoleState(userId);
        this.notificationService.showError('Erreur système', 'Une erreur technique est survenue lors de l\'assignation multiple des rôles');
        return throwError(error);
      })
    );
  }

  // Obtenir l'historique des opérations
  getOperationHistory(userId: string): RoleOperation[] {
    return this.operationHistory.get(userId) || [];
  }

  // Réinitialiser l'état d'un utilisateur
  resetUserRoleState(userId: string): void {
    this.userRoleStates.delete(userId);
    this.operationHistory.delete(userId);
  }

  // Méthodes privées
  private addOperationToHistory(userId: string, operation: RoleOperation): void {
    const history = this.operationHistory.get(userId) || [];
    history.push(operation);
    this.operationHistory.set(userId, history);
  }

  private updateOperationStatus(userId: string, type: string, roleId: string, status: 'success' | 'error', message?: string): void {
    const history = this.operationHistory.get(userId);
    if (history) {
      const operation = history.find(op => 
        op.type === type && op.roleId === roleId && op.status === 'pending'
      );
      if (operation) {
        operation.status = status;
        operation.message = message;
      }
    }
  }

  private rollbackRoleAddition(userId: string, roleId: string): void {
    const state = this.userRoleStates.get(userId)?.value;
    if (state) {
      const addedRole = state.assignedRoles.find(role => role.id === roleId);
      if (addedRole) {
        const updatedState = {
          ...state,
          assignedRoles: state.assignedRoles.filter(role => role.id !== roleId),
          availableRoles: [...state.availableRoles, addedRole]
        };
        this.userRoleStates.get(userId)?.next(updatedState);
      }
    }
  }

  private rollbackRoleRemoval(userId: string, roleId: string, roleToRemove: BaRoleDto): void {
    const state = this.userRoleStates.get(userId)?.value;
    if (state) {
      const updatedState = {
        ...state,
        assignedRoles: [...state.assignedRoles, roleToRemove],
        availableRoles: state.availableRoles.filter(role => role.id !== roleId)
      };
      this.userRoleStates.get(userId)?.next(updatedState);
    }
  }
}
