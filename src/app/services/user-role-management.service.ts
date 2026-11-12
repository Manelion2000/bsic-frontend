import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, throwError, of } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { UsersService, BaUserDto, BaRoleDto, RoleAssignmentResult } from './users.service';
import { RolesService } from './roles.service';
import { NotificationService } from './notification.service';
import { extractErrorMessage } from '../shared/error.utils';

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

    const current = this.userRoleStates.get(userId)!;
    current.next({...current.value, loading: true, error: null});

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
            error: extractErrorMessage(error, 'Erreur lors du chargement des rôles')
          });
        }
        this.notificationService.showError('Erreur de chargement', extractErrorMessage(error, 'Impossible de charger les rôles utilisateur'));
        return throwError(() => error);
      })
    );
  }

  // Observer l'état d'un utilisateur
  getUserRoleState(userId: string): Observable<UserRoleState> {
    if (!this.userRoleStates.has(userId)) {
      this.userRoleStates.set(userId, new BehaviorSubject<UserRoleState>({userId, user: null, availableRoles: [], assignedRoles: [], loading: true, error: null}));
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

    if (state.loading) return of({success: false, message: 'Une opération sur les rôles est déjà en cours.'});

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

    // Afficher uniquement les droits confirmés par le serveur.
    const roleToAdd = state.availableRoles.find(role => role.id === roleId);
    this.userRoleStates.get(userId)?.next({...state, loading: true, error: null});

    return this.usersService.addRoleToUser(userId, roleId).pipe(
      tap(result => {
        if (result.success) {
          this.confirmRoles(userId, result.user);
          this.notificationService.showSuccess(
            'Rôle assigné', 
            `Le rôle ${roleToAdd?.libelle || roleId} a été assigné à ${userName || 'l\'utilisateur'} avec succès`
          );
          this.updateOperationStatus(userId, 'add', roleId, 'success', result.message);
        } else {
          this.failOperation(userId, result.message);
          this.notificationService.showError('Échec d\'assignation', result.message);
          this.updateOperationStatus(userId, 'add', roleId, 'error', result.message);
        }
      }),
      catchError(error => {
        const message = extractErrorMessage(error, 'Impossible d’assigner ce rôle.');
        this.failOperation(userId, message);
        this.notificationService.showError('Échec d’assignation', message);
        this.updateOperationStatus(userId, 'add', roleId, 'error', message);
        return throwError(() => error);
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

    if (state.loading) return of({success: false, message: 'Une opération sur les rôles est déjà en cours.'});

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

    this.userRoleStates.get(userId)?.next({...state, loading: true, error: null});

    return this.usersService.removeRoleFromUser(userId, roleId).pipe(
      tap(result => {
        if (result.success) {
          this.confirmRoles(userId, result.user);
          this.notificationService.showSuccess(
            'Rôle supprimé', 
            `Le rôle ${roleToRemove.libelle || roleId} a été retiré de ${userName || 'l\'utilisateur'} avec succès`
          );
          this.updateOperationStatus(userId, 'remove', roleId, 'success', result.message);
        } else {
          this.failOperation(userId, result.message);
          this.notificationService.showError('Échec de suppression', result.message);
          this.updateOperationStatus(userId, 'remove', roleId, 'error', result.message);
        }
      }),
      catchError(error => {
        const message = extractErrorMessage(error, 'Impossible de retirer ce rôle.');
        this.failOperation(userId, message);
        this.notificationService.showError('Échec du retrait', message);
        this.updateOperationStatus(userId, 'remove', roleId, 'error', message);
        return throwError(() => error);
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

    if (state.loading) return of({success: false, message: 'Une opération sur les rôles est déjà en cours.'});

    // Validation
    const validRoleIds = [...new Set(roleIds)].filter(roleId =>
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

    this.userRoleStates.get(userId)?.next({...state, loading: true, error: null});

    return this.usersService.assignMultipleRoles(userId, validRoleIds).pipe(
      // Certains ajouts peuvent réussir et d'autres être refusés : réconcilier le résultat.
      switchMap(result => this.initializeUserRoleState(userId).pipe(map(() => result))),
      tap(result => {
        if (result.success) {
          this.notificationService.showSuccess(
            'Rôles assignés', 
            `${validRoleIds.length} rôle(s) ont été assigné(s) à ${userName || 'l\'utilisateur'} avec succès`
          );
        } else {
          this.failOperation(userId, result.message);
          this.notificationService.showError('Échec d\'assignation multiple', result.message);
        }
      }),
      catchError(error => {
        const message = extractErrorMessage(error, 'Impossible de confirmer les rôles assignés.');
        this.failOperation(userId, message);
        this.notificationService.showError('Échec d’assignation multiple', message);
        return throwError(() => error);
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

  private confirmRoles(userId: string, user?: BaUserDto): void {
    const subject = this.userRoleStates.get(userId);
    if (!subject || !user) return;
    const state = subject.value;
    const assignedRoles = user.roles || [];
    const catalogue = [...state.availableRoles, ...state.assignedRoles];
    subject.next({...state, user, assignedRoles, availableRoles: catalogue.filter(role => !assignedRoles.some(assigned => assigned.id === role.id)), loading: false, error: null});
  }

  private failOperation(userId: string, error: string): void {
    const subject = this.userRoleStates.get(userId);
    if (subject) subject.next({...subject.value, loading: false, error});
  }
}
