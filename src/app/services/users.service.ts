import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface BaRoleDto {
  id?: string;
  libelle?: string;
  code?: string;
}

export interface BaUserDto {
  id?: string;
  username?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  locked?: boolean;
  activated?: boolean;
  telephone?: string;
  idProfil?: string;
  libelleProfil?: string;
  roles?: BaRoleDto[];
  matricule?: string;
  fonction?: string;
  emailPro?: string;
  telephoneFixe?: string;
  telephoneMobile?: string;
  idService?: string;
  nomService?: string;
  idDepartement?: string;
  codeDepartement?: string;
  nomDepartement?: string;
  idAgence?: string;
  nomAgence?: string;
  idSuperieur?: string;
  nomCompletSuperieur?: string;
  idSuperieurSecondaire?: string;
  nomCompletSuperieurSecondaire?: string;
  lastConnexionDate?: string;
  sexe?: 'MASCULIN' | 'FEMININ';
  indicatifPays?: string;
}

export interface RoleAssignmentResult {
  success: boolean;
  message: string;
  user?: BaUserDto;
  affectedRoles?: BaRoleDto[];
}

export interface UserRoleOperation {
  userId: string;
  roleId: string;
  operation: 'assign' | 'remove';
  timestamp: Date;
  performedBy?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private baseUrl = `${API_BASE_URL}/users`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<BaUserDto[]> {
    return this.http.get<BaUserDto[]>(this.baseUrl);
  }

  createUser(user: BaUserDto): Observable<void> {
    return this.http.post<void>(this.baseUrl, user);
  }

  updateUser(code: string, user: BaUserDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${code}`, user);
  }

  deleteUser(code: string): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${code}`, { responseType: 'text' });
  }

  getUserWithMoreInfo(): Observable<BaUserDto> {
    return this.http.get<BaUserDto>(`${this.baseUrl}/details`);
  }

  activateUser(id: string): Observable<string> {
    return this.http.get(`${this.baseUrl}/${id}/activate`, { responseType: 'text' });
  }

  addRoleToUser(userId: string, roleId: string): Observable<RoleAssignmentResult> {
    return this.http.post<BaUserDto>(`${this.baseUrl}/${userId}/roles/${roleId}`, {}).pipe(
      map((user) => ({ success: true, message: 'Role ajoute avec succes.', user })),
      catchError((error) => {
        const result: RoleAssignmentResult = {
          success: false,
          message: `Erreur lors de l'ajout du role a l'utilisateur: ${error.message || 'Erreur serveur'}`
        };
        return throwError(() => result);
      })
    );
  }

  removeRoleFromUser(userId: string, roleId: string): Observable<RoleAssignmentResult> {
    return this.http.delete<BaUserDto>(`${this.baseUrl}/${userId}/roles/${roleId}`).pipe(
      map((user) => ({ success: true, message: 'Role supprime avec succes.', user })),
      catchError((error) => {
        const result: RoleAssignmentResult = {
          success: false,
          message: `Erreur lors de la suppression du role: ${error.message || 'Erreur serveur'}`
        };
        return throwError(() => result);
      })
    );
  }

  getUserRoles(userId: string): Observable<BaRoleDto[]> {
    return this.http.get<BaRoleDto[]>(`${this.baseUrl}/${userId}/roles`).pipe(
      catchError(() =>
        this.getUsers().pipe(
          map((users) => users.find((u) => u.id === userId)?.username),
          switchMap((username) => {
            if (!username) {
              return throwError(() => new Error('Impossible de recuperer les roles de l\'utilisateur'));
            }
            return this.http.get<BaRoleDto[]>(`${this.baseUrl}/${username}/roles`);
          }),
          catchError(() => throwError(() => new Error('Impossible de recuperer les roles de l\'utilisateur')))
        )
      )
    );
  }

  assignMultipleRoles(userId: string, roleIds: string[]): Observable<RoleAssignmentResult> {
    if (!roleIds.length) {
      return of({ success: false, message: 'Aucun role fourni pour l\'assignation.' });
    }

    return forkJoin(roleIds.map((roleId) => this.addRoleToUser(userId, roleId))).pipe(
      map(() => ({ success: true, message: `${roleIds.length} role(s) assigne(s) avec succes.` })),
      catchError((error) => {
        const result: RoleAssignmentResult = {
          success: false,
          message: `Erreur lors de l'assignation multiple des roles: ${error.message || 'Erreur serveur'}`
        };
        return throwError(() => result);
      })
    );
  }

  removeAllRoles(userId: string): Observable<RoleAssignmentResult> {
    return this.getUserRoles(userId).pipe(
      switchMap((roles) => {
        const roleIds = roles.map((role) => role.id).filter((id): id is string => !!id);
        if (!roleIds.length) {
          return of({ success: true, message: 'Aucun role a supprimer.' });
        }
        return forkJoin(roleIds.map((roleId) => this.removeRoleFromUser(userId, roleId))).pipe(
          map(() => ({ success: true, message: 'Tous les roles ont ete supprimes.' }))
        );
      }),
      catchError((error) => {
        const result: RoleAssignmentResult = {
          success: false,
          message: `Erreur lors de la suppression de tous les roles: ${error.message || 'Erreur serveur'}`
        };
        return throwError(() => result);
      })
    );
  }

  updateAllUserRoles(userId: string, newRoles: BaRoleDto[]): Observable<RoleAssignmentResult> {
    return this.removeAllRoles(userId).pipe(
      switchMap((result) => {
        if (!result.success) {
          return of(result);
        }
        const roleIds = newRoles.map((role) => role.id).filter((id): id is string => !!id);
        return this.assignMultipleRoles(userId, roleIds);
      })
    );
  }

  validateRoleAssignment(userId: string, roleId: string): Observable<{ valid: boolean; reason?: string }> {
    return this.getUserRoles(userId).pipe(
      map((roles) => {
        const alreadyAssigned = roles.some((role) => role.id === roleId);
        return alreadyAssigned
          ? { valid: false, reason: 'Ce role est deja assigne a l\'utilisateur.' }
          : { valid: true };
      }),
      catchError(() => throwError(() => new Error('Erreur lors de la validation de l\'assignation de role')))
    );
  }

  getRoleAssignmentHistory(_userId: string): Observable<UserRoleOperation[]> {
    return of([]);
  }
}
