import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HabilitationsService, BaFicheHabilitationDto, BaFicheHabilitationEtapeDto } from '../../services/habilitations.service';
import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-habilitations-validations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habilitations-validations.component.html',
  styleUrl: './habilitations-validations.component.scss'
})
export class HabilitationsValidationsComponent implements OnInit {
  fiches: BaFicheHabilitationDto[] = [];
  selectedFiche: BaFicheHabilitationDto | null = null;
  message = '';
  loading = false;
  detailLoading = false;
  detailVisible = false;
  isProcessing = false;

  constructor(private habilitationsService: HabilitationsService) {}

  ngOnInit(): void {
    this.loadFiches();
  }

  loadFiches(): void {
    this.loading = true;
    this.habilitationsService.getMyFicheValidations().subscribe({
      next: (data) => {
        this.fiches = data || [];
        if (this.detailVisible && this.selectedFiche?.id) {
          const stillVisible = this.fiches.some((fiche) => fiche.id === this.selectedFiche?.id);
          if (stillVisible) {
            this.loadFicheDetail(this.selectedFiche.id, false);
          } else {
            this.selectedFiche = null;
            this.detailVisible = false;
          }
        }
        this.loading = false;
      },
      error: (err) => {
        this.message = extractErrorMessage(err, 'Erreur lors du chargement des fiches.');
        this.loading = false;
      }
    });
  }

  getCurrentEtape(fiche: BaFicheHabilitationDto): BaFicheHabilitationEtapeDto | undefined {
    return (fiche.etapes || [])
      .filter((e) => e.statutValidation === 'EN_ATTENTE')
      .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))[0];
  }

  getEtapeLabel(fiche: BaFicheHabilitationDto): string {
    const etape = this.getCurrentEtape(fiche);
    if (!etape) {
      return '-';
    }

    const niveau = etape.typeEtape === 'SERVICE'
      ? etape.nomService
      : etape.nomDepartement;
    const fallbackNiveau = niveau || etape.nomDepartementValidateur;
    const fonction = etape.roleLibelle
      ? ` (Role: ${etape.roleLibelle})`
      : etape.fonctionRequise ? ` (${this.formatFonction(etape.fonctionRequise)})` : '';

    return `#${etape.ordre || '-'} - ${fallbackNiveau || 'Niveau de validation'}${fonction}`;
  }

  getValidateurLabel(fiche: BaFicheHabilitationDto): string {
    const etape = this.getCurrentEtape(fiche);
    if (!etape) {
      return '-';
    }
    if (etape.roleLibelle) {
      return `Role: ${etape.roleLibelle}`;
    }
    return etape.nomCompletValidateur || 'Selon la hierarchie';
  }

  loadFicheDetail(id?: string, reveal = true): void {
    if (!id) {
      this.message = 'Fiche introuvable.';
      return;
    }
    if (reveal) {
      this.detailVisible = true;
    }
    this.detailLoading = true;
    this.habilitationsService.getFicheById(id).subscribe({
      next: (fiche) => {
        this.selectedFiche = {
          ...fiche,
          etapes: [...(fiche.etapes || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
        };
        this.detailLoading = false;
      },
      error: (err) => {
        this.message = extractErrorMessage(err, 'Erreur lors du chargement du detail de la fiche.');
        this.detailLoading = false;
        if (reveal) {
          this.detailVisible = false;
        }
      }
    });
  }

  closeDetail(): void {
    this.detailVisible = false;
    this.selectedFiche = null;
  }

  getStructureLabel(etape: BaFicheHabilitationEtapeDto): string {
    return etape.nomService || etape.nomDepartement || etape.nomDepartementValidateur || '-';
  }

  getEtapeStatusLabel(statut?: string): string {
    if (!statut) {
      return '-';
    }
    return this.formatFonction(statut);
  }

  private formatFonction(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  validerCurrentEtape(fiche: BaFicheHabilitationDto): void {
    const etape = this.getCurrentEtape(fiche);
    if (!etape?.id) {
      this.message = 'Aucune etape en attente pour cette fiche.';
      return;
    }
    this.isProcessing = true;
    this.habilitationsService.updateEtapeStatus(etape.id, 'VALIDE').subscribe({
      next: () => {
        this.message = `Etape ${etape.ordre || ''} validee avec succes.`;
        this.isProcessing = false;
        if (this.selectedFiche?.id === fiche.id) {
          this.loadFicheDetail(fiche.id, false);
        }
        this.loadFiches();
      },
      error: (err) => {
        this.message = extractErrorMessage(err, 'Erreur lors de la validation.');
        this.isProcessing = false;
      }
    });
  }

  rejeterCurrentEtape(fiche: BaFicheHabilitationDto): void {
    const etape = this.getCurrentEtape(fiche);
    if (!etape?.id) {
      this.message = 'Aucune etape en attente pour cette fiche.';
      return;
    }
    const motif = window.prompt('Motif de rejet (obligatoire) :') || '';
    if (!motif.trim()) {
      this.message = 'Le motif de rejet est obligatoire.';
      return;
    }
    this.isProcessing = true;
    this.habilitationsService.updateEtapeStatus(etape.id, 'REJETE', motif.trim()).subscribe({
      next: () => {
        this.message = `Etape ${etape.ordre || ''} rejetee.`;
        this.isProcessing = false;
        if (this.selectedFiche?.id === fiche.id) {
          this.loadFicheDetail(fiche.id, false);
        }
        this.loadFiches();
      },
      error: (err) => {
        this.message = extractErrorMessage(err, 'Erreur lors du rejet.');
        this.isProcessing = false;
      }
    });
  }
}
