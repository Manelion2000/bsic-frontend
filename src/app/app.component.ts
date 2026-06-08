import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ErrorService } from './services/error.service';
import { NotificationComponent } from './components/notification/notification.component';
import { AuthService } from './services/auth.service';
import { HabilitationsService } from './services/habilitations.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'bsic-frontend';
  isLoginPage = false;
  pendingFichesCount = 0;
  pendingAutorisationsCount = 0;
  pendingReprisesCount = 0;
  pendingComptesCount = 0;
  private errorService = inject(ErrorService);
  private authService = inject(AuthService);
  private habilitationsService = inject(HabilitationsService);
  errorMessage$ = this.errorService.message$;

  constructor(private router: Router) {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((event) => {
      this.isLoginPage = event.urlAfterRedirects.startsWith('/login');
      if (!this.isLoginPage) {
        this.refreshPendingCounts();
      }
    });
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
    this.pendingComptesCount = 0;
    this.router.navigateByUrl('/login');
  }

  private refreshPendingCounts(): void {
    if (!this.authService.getToken()) {
      this.pendingFichesCount = 0;
      this.pendingAutorisationsCount = 0;
      this.pendingReprisesCount = 0;
      this.pendingComptesCount = 0;
      return;
    }

    this.habilitationsService.getMyFicheValidations().subscribe({
      next: (fiches) => {
        this.pendingFichesCount = (fiches || []).length;
      },
      error: () => {
        this.pendingFichesCount = 0;
      }
    });

    this.habilitationsService.getDemandesAutorisationSortieAValider().subscribe({
      next: (demandes) => {
        this.pendingAutorisationsCount = (demandes || []).filter((d) => d.statutValidation === 'EN_ATTENTE').length;
      },
      error: () => {
        this.pendingAutorisationsCount = 0;
      }
    });

    this.habilitationsService.getReprisesServiceAValider().subscribe({
      next: (demandes) => {
        this.pendingReprisesCount = (demandes || []).filter((d) => d.statutValidation === 'EN_ATTENTE').length;
      },
      error: () => {
        this.pendingReprisesCount = 0;
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
  }
}
