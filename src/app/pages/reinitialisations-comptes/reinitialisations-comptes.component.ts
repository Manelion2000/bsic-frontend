import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BaPlateformeDto,
  BaReinitialisationCompteDto,
  HabilitationsService
} from '../../services/habilitations.service';

@Component({
  selector: 'app-reinitialisations-comptes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reinitialisations-comptes.component.html',
  styleUrl: './reinitialisations-comptes.component.scss'
})
export class ReinitialisationsComptesComponent implements OnInit {
  plateformes: BaPlateformeDto[] = [];
  mesDemandes: BaReinitialisationCompteDto[] = [];
  aValider: BaReinitialisationCompteDto[] = [];
  aTraiter: BaReinitialisationCompteDto[] = [];
  selected: BaReinitialisationCompteDto | null = null;
  message = '';
  commentaire = '';
  form = { idPlateforme: '', motif: '' };

  constructor(private habilitationsService: HabilitationsService) {}

  ngOnInit(): void {
    this.habilitationsService.getPlateformes().subscribe({ next: (data) => (this.plateformes = data || []) });
    this.reload();
  }

  reload(): void {
    this.habilitationsService.getMesReinitialisationsCompte().subscribe({ next: (d) => (this.mesDemandes = d || []) });
    this.habilitationsService.getReinitialisationsCompteAValider().subscribe({ next: (d) => (this.aValider = d || []) });
    this.habilitationsService.getReinitialisationsCompteATraiter().subscribe({ next: (d) => (this.aTraiter = d || []) });
  }

  create(): void {
    if (!this.form.idPlateforme || !this.form.motif.trim()) {
      this.message = 'Plateforme et motif obligatoires.';
      return;
    }
    this.habilitationsService.createReinitialisationCompte(this.form).subscribe({
      next: () => {
        this.message = 'Demande de reinitialisation envoyee.';
        this.form = { idPlateforme: '', motif: '' };
        this.reload();
      },
      error: () => (this.message = 'Creation refusee. Verifiez que le compte existe deja et est cree.')
    });
  }

  ouvrir(demande: BaReinitialisationCompteDto): void {
    this.selected = demande;
    this.commentaire = '';
  }

  fermer(): void {
    this.selected = null;
    this.commentaire = '';
  }

  currentEtape(demande: BaReinitialisationCompteDto | null): string | undefined {
    return demande?.etapes?.find((e) => e.statutValidation === 'EN_ATTENTE')?.id;
  }

  valider(): void {
    const id = this.currentEtape(this.selected);
    if (!id) return;
    this.habilitationsService.updateReinitialisationEtapeStatus(id, 'VALIDE', this.commentaire).subscribe({
      next: () => { this.message = 'Avis valide.'; this.fermer(); this.reload(); },
      error: () => (this.message = 'Validation impossible.')
    });
  }

  rejeter(): void {
    const id = this.currentEtape(this.selected);
    if (!id || !this.commentaire.trim()) {
      this.message = 'Le commentaire de rejet est obligatoire.';
      return;
    }
    this.habilitationsService.updateReinitialisationEtapeStatus(id, 'REJETE', this.commentaire).subscribe({
      next: () => { this.message = 'Demande rejetee.'; this.fermer(); this.reload(); },
      error: () => (this.message = 'Rejet impossible.')
    });
  }

  demarrer(): void {
    if (!this.selected?.idTraitement) return;
    this.habilitationsService.demarrerTraitementReinitialisation(this.selected.idTraitement, this.commentaire).subscribe({
      next: () => { this.message = 'Traitement demarre.'; this.fermer(); this.reload(); },
      error: () => (this.message = 'Traitement refuse pour ce type de plateforme.')
    });
  }

  marquerTraitee(): void {
    if (!this.selected?.idTraitement) return;
    this.habilitationsService.marquerReinitialisationTraitee(this.selected.idTraitement, this.commentaire).subscribe({
      next: () => { this.message = 'Reinitialisation marquee comme traitee.'; this.fermer(); this.reload(); },
      error: () => (this.message = 'Traitement refuse pour ce type de plateforme.')
    });
  }
}
