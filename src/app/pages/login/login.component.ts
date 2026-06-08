import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  form: BaLoginDto = { rememberMe: true };
  message = '';
  submitted = false;
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  submit(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner tous les champs.';
      return;
    }
    this.loading = true;
    this.message = '';
    this.authService.login(this.form).subscribe({
      next: (res) => {
        this.loading = false;
        this.authService.storeToken(res);
        this.message = res?.access_token || res?.token ? 'Connexion reussie.' : 'Connexion reussie (token manquant).';
        if (res?.access_token || res?.token) {
          this.router.navigate(['/users']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.message = extractErrorMessage(err, 'Erreur lors de la connexion.')
      }
    });
  }

  resetPassword(): void {
    this.submitted = true;
    if (!this.form.username) {
      this.message = 'Veuillez saisir votre email pour reinitialiser le mot de passe.';
      return;
    }
    this.loading = true;
    this.authService.requestResetPassword(this.form.username).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Demande de reinitialisation envoyee.';
      },
      error: (err) => {
        this.loading = false;
        this.message = extractErrorMessage(err, 'Erreur lors de la reinitialisation.')
      }
    });
  }
}



