import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ErrorService } from './services/error.service';
import { NotificationComponent } from './components/notification/notification.component';
import { AuthService } from './services/auth.service';
import { HabilitationsService } from './services/habilitations.service';
import { BaUserDto, UsersService } from './services/users.service';
import { FeatureService } from './services/feature.service';
import { RhDemandesService } from './services/rh-demandes.service';
import { isAdministrator } from './services/administrator.guard';
import { canAccessRhReporting } from './services/rh-reporting.guard';
import { SuiviDemandesService } from './services/suivi-demandes.service';
import { PlateformesService } from './services/plateformes.service';
import { ExtractionsService } from './services/extractions.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'bsic-frontend';
  menuOpen = false;
  isLoginPage = false;
  isPublicPage = false;
  pendingFichesCount = 0;
  pendingAutorisationsCount = 0;
  pendingReprisesCount = 0;
  pendingAbsencesCount = 0;
  pendingComptesCount = 0;
  currentUser?: BaUserDto;
  suiviDemandesEnabled = false;
  plateformesEnabled = false;
  extractionsEnabled = false;
  private extractionsService = inject(ExtractionsService);
  private plateformesService = inject(PlateformesService);
  private suiviDemandesService = inject(SuiviDemandesService);
  private errorService = inject(ErrorService);
  private authService = inject(AuthService);
  private habilitationsService = inject(HabilitationsService);
  private rhDemandesService = inject(RhDemandesService);
  private usersService = inject(UsersService);
  private featureService = inject(FeatureService);
  errorMessage$ = this.errorService.message$;

  constructor(private router: Router) {
    this.featureService.load().subscribe();
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((event) => {
      this.menuOpen = false;
      this.isLoginPage = event.urlAfterRedirects.startsWith('/login') || event.urlAfterRedirects.startsWith('/changer-mot-de-passe');
      this.isPublicPage = event.urlAfterRedirects === '/' || event.urlAfterRedirects.startsWith('/annuaire-public');
      if (this.isLoginPage && !this.authService.isAuthenticated()) {
        this.currentUser = undefined;
        this.suiviDemandesEnabled = false;
        this.plateformesEnabled = false;
        this.extractionsEnabled = false;
        this.pendingFichesCount = 0;
        this.pendingAutorisationsCount = 0;
        this.pendingReprisesCount = 0;
        this.pendingAbsencesCount = 0;
        this.pendingComptesCount = 0;
      }
      if (!this.isLoginPage && !this.isPublicPage) {
        this.loadCurrentUser();
        this.refreshPendingCounts();
      }
    });
  }

  get habilitationsEnabled(): boolean {
    return this.featureService.isEnabled('habilitations');
  }

  get processusConfigurationEnabled(): boolean { return this.administrationEnabled || !!this.currentUser?.roles?.some(r => r.code === 'PROCESSUS_CONFIGURER'); }
  get administrationEnabled(): boolean { return isAdministrator(this.currentUser); }
  get rhReportingEnabled(): boolean { return canAccessRhReporting(this.currentUser); }

  get currentUserFullName(): string {
    if (!this.currentUser) {
      return 'Utilisateur';
    }
    const fullName = [this.currentUser.prenom, this.currentUser.nom]
      .filter(Boolean)
      .join(' ')
      .trim();
    return fullName || this.currentUser.username || 'Utilisateur';
  }

  get currentUserInitials(): string {
    const source = this.currentUserFullName;
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.substring(0, 2).toUpperCase();
  }

  clearError(): void {
    this.errorService.clear();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.finalizeLogout(),
      error: () => this.finalizeLogout()
    });
  }

  private finalizeLogout(): void {
    this.authService.clearToken();
    this.errorService.clear();
    this.pendingFichesCount = 0;
    this.pendingAutorisationsCount = 0;
    this.pendingReprisesCount = 0;
    this.pendingAbsencesCount = 0;
    this.pendingComptesCount = 0;
    this.currentUser = undefined;
    this.suiviDemandesEnabled = false;
    this.plateformesEnabled = false;
    this.extractionsEnabled = false;
    this.router.navigateByUrl('/login');
  }

  private loadCurrentUser(): void {
    if (this.currentUser || !this.authService.getToken()) {
      return;
    }

    this.usersService.getUserWithMoreInfo().subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: () => {
        this.currentUser = undefined;
      }
    });
  }

  private refreshPendingCounts(): void {
    if (!this.authService.getToken()) {
      this.pendingFichesCount = 0;
      this.pendingAutorisationsCount = 0;
      this.pendingReprisesCount = 0;
      this.pendingAbsencesCount = 0;
      this.pendingComptesCount = 0;
      this.suiviDemandesEnabled = false;
      this.plateformesEnabled = false;
      this.extractionsEnabled = false;
      return;
    }

    this.suiviDemandesService.configuration().subscribe({
      next: config => this.suiviDemandesEnabled = config.autorise,
      error: () => this.suiviDemandesEnabled = false
    });
    this.plateformesService.configuration().subscribe({
      next: config => this.plateformesEnabled = config.consulter,
      error: () => this.plateformesEnabled = false
    });
    this.extractionsService.configuration().subscribe({
      next: config => this.extractionsEnabled = config.demander || config.bibliotheque,
      error: () => this.extractionsEnabled = false
    });

    if (this.habilitationsEnabled) {
      this.habilitationsService.getMyFicheValidations().subscribe({
        next: (fiches) => {
          this.pendingFichesCount = (fiches || []).length;
        },
        error: () => {
          this.pendingFichesCount = 0;
        }
      });

      this.habilitationsService.getComptesPlateforme().subscribe({
        next: (comptes) => {
          this.pendingComptesCount = (comptes || []).filter((c) => c.statutCreation !== 'CREE').length;
        },
        error: () => {
          this.pendingComptesCount = 0;
        }
      });
    } else {
      this.pendingFichesCount = 0;
      this.pendingComptesCount = 0;
    }

    this.rhDemandesService.getDemandesAutorisationSortieAValider().subscribe({
      next: (demandes) => {
        this.pendingAutorisationsCount = (demandes || []).filter((d) => d.statutValidation === 'EN_ATTENTE').length;
      },
      error: () => {
        this.pendingAutorisationsCount = 0;
      }
    });

    this.rhDemandesService.getReprisesServiceAValider().subscribe({
      next: (demandes) => {
        this.pendingReprisesCount = (demandes || []).filter((d) => d.statutValidation === 'EN_ATTENTE').length;
      },
      error: () => {
        this.pendingReprisesCount = 0;
      }
    });

    this.rhDemandesService.getAbsencesAValider().subscribe({
      next: demandes => this.pendingAbsencesCount = (demandes || []).length,
      error: () => this.pendingAbsencesCount = 0
    });

  }
}
