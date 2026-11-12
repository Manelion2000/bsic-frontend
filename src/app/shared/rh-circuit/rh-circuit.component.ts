import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {RhCircuitDto} from '../../services/rh-demandes.service';

@Component({
  selector: 'app-rh-circuit', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <div class="circuit" *ngIf="circuit">
      <div *ngIf="apercu" class="preview-heading"><div><p><strong>Circuit applicable</strong> · {{circuit.dgObligatoire ? 'Accord du DG obligatoire' : validationFinaleParDga ? 'DG facultatif · validation finale par un DGA' : 'Étape DG non activée'}}</p><small *ngIf="actualisationDisponible">{{circuit.publicationId ? 'Circuit publié affecté à cette démarche' : 'Circuit RH par défaut'}}</small></div><button *ngIf="actualisationDisponible" type="button" class="btn btn--small btn--light" [disabled]="chargement" (click)="actualiser.emit()">{{chargement ? 'Vérification…' : 'Actualiser le circuit'}}</button></div>
      <ol aria-label="Circuit de validation">
        <li *ngFor="let e of circuit.etapes; let i = index" [class.approved]="!apercu && e.statut === 'VALIDEE'" [class.current]="!apercu && circuit.statut === 'EN_ATTENTE' && i === circuit.etapeCourante">
          <strong>{{e.libelle}}</strong>
          <small class="blockage" *ngIf="apercu && e.type===circuit.etapeBloquee">À configurer</small>
          <small *ngIf="afficherValidateurs && e.validateurs?.length">Validateurs : <ng-container *ngFor="let v of e.validateurs; let last = last">{{v.nom}}<ng-container *ngIf="!last">, </ng-container></ng-container></small>
          <span *ngIf="!apercu">{{e.statut === 'VALIDEE' ? 'Approuvée' : e.statut === 'REJETEE' ? 'Refusée' : circuit.statut === 'EN_ATTENTE' && i === circuit.etapeCourante ? 'À valider' : 'En attente'}}</span>
          <small *ngIf="e.nomSignataire">{{e.nomSignataire}} · {{e.dateDecision | date:'dd/MM/yyyy HH:mm'}}</small>
        </li>
      </ol>
      <p class="blockage" role="alert" *ngIf="circuit.blocage">{{circuit.blocage}}</p>
      <p *ngIf="!apercu && circuit.peutDecider">Votre signature enregistrée sera apposée lors de l'approbation. <a routerLink="/mon-compte/signature">Gérer ma signature</a></p>
      <div class="configuration-help" *ngIf="apercu && circuit.blocage && actualisationDisponible">
        <ng-container *ngIf="circuit.etapeBloquee==='DG'; else genericHelp"><p>Le titulaire doit avoir la fonction « Directeur général » et un compte actif et déverrouillé. Le rôle ADMIN ne suffit pas.</p><a *ngIf="peutConfigurer; else askAdmin" class="btn btn--small btn--outline" routerLink="/administration/dg" target="_blank" rel="noopener">Ouvrir Gestion du DG ↗</a><ng-template #askAdmin><p>Demandez à votre administrateur de vérifier le compte du DG.</p></ng-template></ng-container>
        <ng-template #genericHelp><p>Votre administrateur doit compléter la configuration du circuit.</p></ng-template>
        <small>Après correction, cliquez sur « Actualiser le circuit ». Les champs de votre demande sont conservés.</small>
      </div>
      <details *ngIf="!apercu && circuit.historique?.length"><summary>Historique des décisions</summary>
        <p *ngFor="let d of circuit.historique">{{d.date | date:'dd/MM/yyyy HH:mm'}} · {{d.nomSignataire}} · {{d.type}} : {{d.decision}}<br>{{d.commentaire}}</p>
      </details>
    </div>`,
  styles: [`:host{display:block}.circuit{margin:1rem 0}.preview-heading{display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap}.preview-heading p{margin:.2rem 0}.preview-heading small{color:#62796d}.configuration-help{background:#fff8ec;border:1px solid #ecdab7;border-radius:.6rem;padding:.8rem;font-size:.85rem}.configuration-help p{margin:0 0 .6rem}.configuration-help small{display:block;margin-top:.6rem}ol{display:flex;flex-wrap:wrap;gap:.65rem;list-style:none;padding:0}li{padding:.65rem .8rem;border:1px solid #cad5df;border-radius:.5rem;display:flex;flex-direction:column;gap:.2rem}li+li:before{content:'→';position:absolute;margin-left:-1.35rem}.approved{background:#edf7ee;border-color:#79a981}.current{background:#fff7dd;border-color:#d4ab40}.blockage{color:#9c2c22}small,span{font-size:.8rem}details p{font-size:.85rem}`]
})
export class RhCircuitComponent {
  get validationFinaleParDga(){return this.circuit?.etapes.some(e=>e.type==='DGA'||e.type==='AUTRE_DGA')===true;}
  @Input() circuit?: RhCircuitDto;
  @Input() apercu = false;
  @Input() afficherValidateurs = false;
  @Input() peutConfigurer = false;
  @Input() chargement = false;
  @Input() actualisationDisponible = false;
  @Output() actualiser = new EventEmitter<void>();
}
