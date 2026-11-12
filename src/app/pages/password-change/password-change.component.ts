import { Component, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { extractErrorMessage } from '../../shared/error.utils';

@Component({selector:'app-password-change',standalone:true,imports:[CommonModule,FormsModule],
  template:`<section class="password-page"><article><span class="eyebrow">Sécurité de votre compte</span><h1>{{required?'Choisissez votre mot de passe personnel':'Changer mon mot de passe'}}</h1>
    <p>{{required?'Votre accès temporaire a été utilisé. Définissez votre mot de passe pour accéder à la banque.':'Les sessions ouvertes seront invalidées après le changement.'}}</p>
    <form #form="ngForm" (ngSubmit)="submit(form)"><fieldset [disabled]="busy">
      <label class="form-field" *ngIf="!required">Mot de passe actuel<input type="password" name="ancien" [(ngModel)]="old" required autocomplete="current-password" maxlength="72" /></label>
      <label class="form-field">Nouveau mot de passe<input type="password" name="nouveau" [(ngModel)]="password" required minlength="12" maxlength="72" autocomplete="new-password" /></label>
      <label class="form-field">Confirmer le nouveau mot de passe<input type="password" name="confirmer" [(ngModel)]="confirmation" required minlength="12" maxlength="72" autocomplete="new-password" /></label>
      <small>Au moins 12 caractères. Choisissez un mot de passe différent du code temporaire.</small>
      <p role="alert" class="error" *ngIf="error">{{error}}</p><button class="btn btn--primary" [disabled]="busy">{{busy?'Enregistrement…':'Enregistrer mon mot de passe'}}</button>
    </fieldset></form><button class="cancel" type="button" [disabled]="busy" (click)="logout()">Quitter et revenir à la connexion</button>
  </article></section>`,
  styles:[`.password-page{min-height:70vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:#f2f7f4}.password-page article{width:min(100%,500px);background:#fff;border:1px solid #d6e4da;border-radius:16px;padding:2rem;box-shadow:0 12px 40px #16362c12}.eyebrow{font-size:.74rem;color:#53816b;font-weight:700;text-transform:uppercase}h1{font-size:1.45rem;line-height:1.3;color:#234c3e;margin:.7rem 0}p,small{font-size:.84rem;color:#62796d;line-height:1.6}fieldset{border:0;padding:0;margin:1.2rem 0}.form-field{margin-bottom:1rem}.btn--primary{margin-top:1.2rem;width:100%}.error{background:#fff0eb;color:#983d29;padding:.8rem;border-radius:8px}.cancel{border:0;background:none;color:#638474;font-size:.8rem;cursor:pointer;padding:.7rem 0}`]
})
export class PasswordChangeComponent implements OnDestroy {
  private readonly destroyed$=new Subject<void>();
  ngOnDestroy(){this.destroyed$.next();this.destroyed$.complete();this.old='';this.password='';this.confirmation='';}
  old='';password='';confirmation='';error='';busy=false;required:boolean;
  constructor(private auth:AuthService,private router:Router){this.required=auth.requiresPasswordChange();}
  submit(form:NgForm){
    if(this.busy)return;if(form.invalid||this.password!==this.confirmation){form.control.markAllAsTouched();this.error='Vérifiez les champs et la confirmation du nouveau mot de passe.';return;}
    this.busy=true;this.error='';
    const source=this.required?this.auth.completeInitialPassword(this.password,this.confirmation):this.auth.changePassword(this.old,this.password,this.confirmation);
    source.pipe(takeUntil(this.destroyed$)).subscribe({next:()=>{this.password='';this.confirmation='';this.old='';this.busy=false;this.auth.clearToken();void this.router.navigate(['/login'],{queryParams:{passwordChanged:true}});},error:e=>{this.busy=false;if(this.required&&e.status===401){this.auth.clearToken();void this.router.navigate(['/login'],{queryParams:{temporaryExpired:true}});return;}this.error=extractErrorMessage(e,'Le changement a échoué.');}});
  }
  logout(){if(this.busy)return;this.auth.logout().pipe(takeUntil(this.destroyed$)).subscribe({next:()=>this.leave(),error:()=>this.leave()});}
  private leave(){this.old='';this.password='';this.confirmation='';this.auth.clearToken();void this.router.navigateByUrl('/login');}
}
