import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BaHabilitationComptePlateformeDto,
  HabilitationCompteStatut,
  HabilitationsService
} from '../../services/habilitations.service';

@Component({
  selector: 'app-habilitations-comptes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habilitations-comptes.component.html',
  styleUrl: './habilitations-comptes.component.scss'
})
export class HabilitationsComptesComponent implements OnInit {
  comptes: BaHabilitationComptePlateformeDto[] = [];
  statutFiltre: HabilitationCompteStatut | 'TOUS' = 'A_CREER';
  message = '';
  loading = false;
  commentaire = '';
  selected: BaHabilitationComptePlateformeDto | null = null;

  constructor(private habilitationsService: HabilitationsService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    const statut = this.statutFiltre === 'TOUS' ? undefined : this.statutFiltre;
    this.habilitationsService.getComptesPlateforme(statut).subscribe({
      next: (data) => {
        this.comptes = data || [];
        this.loading = false;
      },
      error: () => {
        this.message = 'Erreur lors du chargement des comptes plateforme.';
        this.loading = false;
      }
    });
  }

  setFiltre(statut: HabilitationCompteStatut | 'TOUS'): void {
    this.statutFiltre = statut;
    this.reload();
  }

  ouvrir(compte: BaHabilitationComptePlateformeDto): void {
    this.selected = compte;
    this.commentaire = compte.commentaireCreation || '';
  }

  fermer(): void {
    this.selected = null;
    this.commentaire = '';
  }

  demarrer(compte: BaHabilitationComptePlateformeDto = this.selected as BaHabilitationComptePlateformeDto): void {
    if (!compte?.id) return;
    this.habilitationsService.demarrerCreationComptePlateforme(compte.id, this.commentaire).subscribe({
      next: () => {
        this.message = 'Creation du compte demarree.';
        this.fermer();
        this.reload();
      },
      error: () => (this.message = 'Impossible de demarrer la creation du compte.')
    });
  }

  marquerCree(compte: BaHabilitationComptePlateformeDto = this.selected as BaHabilitationComptePlateformeDto): void {
    if (!compte?.id) return;
    this.habilitationsService.marquerComptePlateformeCree(compte.id, this.commentaire).subscribe({
      next: () => {
        this.message = 'Compte marque comme cree.';
        this.fermer();
        this.reload();
      },
      error: () => (this.message = 'Impossible de marquer le compte comme cree.')
    });
  }

  count(statut: HabilitationCompteStatut): number {
    return this.comptes.filter((c) => c.statutCreation === statut).length;
  }
}
