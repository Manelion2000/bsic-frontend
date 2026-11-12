import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemporaryCredential } from '../services/users.service';

@Component({selector:'app-temporary-password',standalone:true,imports:[CommonModule],
  template:`<dialog #dialog class="credential-dialog" aria-labelledby="credential-title" (cancel)="$event.preventDefault();close()">
    <header><div><span>Remise d’accès sans e-mail</span><h2 id="credential-title">Mot de passe temporaire</h2></div><button type="button" aria-label="Fermer" (click)="close()">×</button></header>
    <section *ngIf="credential as c"><p>Remettez ces informations directement à la personne dont l’identité a été vérifiée.</p>
      <dl><dt>Identifiant</dt><dd>{{c.username}}</dd><dt>Code valable jusqu’au</dt><dd>{{c.expiresAt | date:'dd/MM/yyyy HH:mm'}}</dd></dl>
      <label class="secret-field">Mot de passe à usage unique<input [type]="revealed?'text':'password'" [value]="c.temporaryPassword" readonly autocomplete="off" spellcheck="false" /></label>
      <div class="credential-actions"><button class="btn btn--light" type="button" (click)="revealed=!revealed">{{revealed?'Masquer':'Afficher'}}</button><button class="btn btn--outline" type="button" (click)="copy()">Copier les identifiants</button></div>
      <p class="notice">Le code sera consommé à la première connexion. L’utilisateur devra choisir un mot de passe personnel avant d’ouvrir les modules. Cette fenêtre ne permet pas de retrouver le code après fermeture.</p>
      <p role="status" *ngIf="message">{{message}}</p>
    </section><footer><button class="btn btn--primary" type="button" (click)="close()">J’ai terminé la remise</button></footer>
  </dialog>`,
  styles:[`.credential-dialog{width:min(560px,calc(100vw - 2rem));max-height:calc(100dvh - 2rem);padding:0;border:1px solid #cde0d5;border-radius:16px;color:#27483d;box-shadow:0 24px 80px #17372a40}.credential-dialog::backdrop{background:#183a3566;backdrop-filter:blur(3px)}header{display:flex;align-items:start;justify-content:space-between;background:#f0f7f3;padding:1.2rem;border-bottom:1px solid #d9e7de}header span{font-size:.75rem;color:#5a796c}header h2{font-size:1.2rem;margin:.4rem 0}header>button{background:none;border:0;font-size:1.6rem;color:#667f73;cursor:pointer}section{padding:1.2rem;font-size:.86rem;line-height:1.6}dl{display:grid;gap:.3rem}dt{color:#668071;font-size:.77rem}dd{margin:0 0 .7rem;overflow-wrap:anywhere;font-weight:600}.secret-field{display:grid;gap:.5rem;font-size:.82rem;font-weight:600}.secret-field input{font-family:Consolas,monospace;font-size:1.05rem;width:100%;padding:.85rem;border:1px solid #cadfd1;border-radius:8px;background:#f7faf8}.credential-actions{display:flex;gap:.6rem;margin-top:.7rem;flex-wrap:wrap}.notice{background:#edf5f0;border-radius:8px;padding:.85rem;font-size:.8rem;margin-top:1rem}footer{display:flex;justify-content:flex-end;padding:1rem 1.2rem;border-top:1px solid #dce8e0}`]
})
export class TemporaryPasswordComponent implements OnChanges,OnDestroy {
  @Input() credential?:TemporaryCredential;
  @Output() closed=new EventEmitter<void>();
  @ViewChild('dialog',{static:true}) dialog!:ElementRef<HTMLDialogElement>;
  revealed=false;message='';private destroyed=false;
  ngOnChanges(){this.revealed=false;this.message='';if(this.credential)queueMicrotask(()=>{if(!this.destroyed&&this.credential&&!this.dialog.nativeElement.open)this.dialog.nativeElement.showModal();});else this.dialog?.nativeElement.close();}
  ngOnDestroy(){this.destroyed=true;this.credential=undefined;}
  close(){this.revealed=false;this.message='';this.credential=undefined;this.dialog.nativeElement.close();this.closed.emit();}
  async copy(){if(!this.credential)return;try{await navigator.clipboard.writeText('Identifiant : '+this.credential.username+'\nMot de passe temporaire : '+this.credential.temporaryPassword);this.message='Identifiants copiés. Remettez-les par un canal privé autorisé.';}catch{this.revealed=true;this.message='La copie est indisponible. Sélectionnez les identifiants affichés.';}}
}
