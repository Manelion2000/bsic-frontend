import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, BaLoginDto } from '../../services/auth.service';
import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form: BaLoginDto = { rememberMe: false };
  message = '';
  submitted = false;
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if(route.snapshot.queryParamMap.get('passwordChanged')==='true')this.message='Votre mot de passe est enregistré. Connectez-vous avec votre mot de passe personnel.';
    else if(route.snapshot.queryParamMap.get('temporaryExpired')==='true')this.message='Votre accès temporaire a expiré ou a été remplacé. Demandez un nouveau code à votre administrateur.';
  }

  submit(formRef: NgForm): void {
    if (this.loading) {
      return;
    }
    this.submitted = true;
    if (formRef.invalid || !this.form.username?.trim() || !this.form.password) {
      this.message = 'Veuillez renseigner tous les champs.';
      return;
    }
    this.loading = true;
    this.message = '';
    this.authService.login(this.form).subscribe({
      next: (res) => {
        this.loading = false;
        if (!this.authService.storeToken(res, Boolean(this.form.rememberMe))) {
          this.message = 'Le serveur n\'a pas retourne de session valide. Veuillez reessayer.';
          return;
        }
        this.form.password = '';
        if(this.authService.requiresPasswordChange()){void this.router.navigateByUrl('/changer-mot-de-passe');return;}
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
          && !returnUrl.startsWith('/\\') && !returnUrl.startsWith('/login') ? returnUrl : '/users';
        void this.router.navigateByUrl(destination);
      },
      error: (err) => {
        this.loading = false;
        this.message = extractErrorMessage(err, 'Erreur lors de la connexion.');
      }
    });
  }

  resetPassword(): void {
    if(this.loading)return;
    this.message='Contactez votre administrateur pour recevoir un accès temporaire. Aucun e-mail n’est envoyé.';
  }
}
