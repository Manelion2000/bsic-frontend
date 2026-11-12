import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, switchMap } from 'rxjs';
import { CircuitWorkflowComponent } from '../../shared/circuit-workflow/circuit-workflow.component';
import { extractErrorMessage } from '../../shared/error.utils';
import { SuiviConfiguration, SuiviDemande, SuiviDemandesService, SuiviPage } from '../../services/suivi-demandes.service';

@Component({selector: 'app-suivi-demandes', standalone: true, imports: [CommonModule, FormsModule, CircuitWorkflowComponent],
  templateUrl: './suivi-demandes.component.html', styleUrl: './suivi-demandes.component.scss'})
export class SuiviDemandesComponent implements OnInit, OnDestroy {
  private readonly api = inject(SuiviDemandesService);
  @ViewChild(CircuitWorkflowComponent) workflow?: CircuitWorkflowComponent;
  configuration?: SuiviConfiguration;
  data?: SuiviPage;
  module = ''; etat = 'EN_ATTENTE'; recherche = ''; departementId = ''; page = 0;
  loading = false; opening = false; error = ''; updatedAt?: Date;
  private request?: Subscription;
  private detailRequest?: Subscription;
  readonly modules: Record<string, string> = {DEMARCHE: 'Démarche interne', ABSENCE: 'Absence', SORTIE: 'Autorisation de sortie',
    CONGE: 'Congé', REPRISE: 'Reprise de service', HABILITATION: 'Habilitation', REINITIALISATION: 'Réinitialisation de compte', EXTRACTION: 'Extraction Oracle'};
  readonly states: Record<string, string> = {EN_ATTENTE: 'En attente', APPROUVEE: 'Approuvée', REJETEE: 'Rejetée', ANNULEE: 'Annulée', RETIREE: 'Retirée', REMPLACEE: 'Remplacée', TERMINEE:'Terminée'};
  ngOnInit() { this.reload(); }
  ngOnDestroy() { this.request?.unsubscribe(); this.detailRequest?.unsubscribe(); }
  reload(page = 0) {
    this.workflow?.close();
    this.request?.unsubscribe(); this.detailRequest?.unsubscribe(); this.opening = false;
    this.loading = true; this.error = ''; this.data = undefined; this.configuration = undefined;
    // Recharger les droits et le rattachement à chaque fois, même si le menu était déjà ouvert.
    this.request = this.api.configuration().pipe(switchMap(config => {
      this.configuration = config;
      if (!config.autorise || config.blocage) throw new Error(config.blocage || 'Vous ne disposez plus de la permission de suivi.');
      if (config.perimetre === 'DEPARTEMENT') this.departementId = config.departement?.id || '';
      if (!config.modules.includes(this.module)) this.module = '';
      return this.api.list({module: this.module, etat: this.etat, recherche: this.recherche.trim(), departementId: this.departementId, page, size: 20});
    })).subscribe({
      next: data => { this.data = data; this.page = data.number; this.updatedAt = new Date(); this.loading = false; },
      error: error => { this.loading = false; this.data = undefined; this.error = extractErrorMessage(error, 'Impossible de charger le suivi des demandes.'); }
    });
  }
  show(row: SuiviDemande) {
    if (this.opening || this.loading) return;
    this.opening = true; this.error = '';
    this.detailRequest = this.api.detail(row).subscribe({
      next: detail => {
        this.opening = false;
        this.workflow?.openCircuit(`${this.modules[detail.demande.module] || detail.demande.module} · ${detail.demande.agent}`, detail.circuit);
      },
      error: error => {
        this.opening = false;
        // Une révocation ou une mutation peut intervenir entre la liste et le clic.
        if ([401, 403, 404].includes(error.status)) this.data = undefined;
        this.error = extractErrorMessage(error, 'Impossible de consulter cette évolution.');
      }
    });
  }
  trackRow(_index: number, row: SuiviDemande) { return `${row.module}:${row.id}`; }
  progress(row: SuiviDemande) { return row.etapesTotal ? Math.round(row.etapesValidees / row.etapesTotal * 100) : 0; }
}
