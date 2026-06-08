import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HabilitationsService,
  BaAutorisationSortieDto,
  BaAutorisationSortieRequestDto
} from '../../services/habilitations.service';
import { AnnuaireService, BaAgenceDto, BaDepartementDto, BaServiceDto } from '../../services/annuaire.service';
import { BaUserDto, UsersService } from '../../services/users.service';

@Component({
  selector: 'app-autorisation-sorties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './autorisation-sorties.component.html',
  styleUrl: './autorisation-sorties.component.scss'
})
export class AutorisationSortiesComponent implements OnInit {
  mesDemandes: BaAutorisationSortieDto[] = [];
  demandesAValider: BaAutorisationSortieDto[] = [];
  demandeSelectionnee: BaAutorisationSortieDto | null = null;
  directions: BaDepartementDto[] = [];
  services: BaServiceDto[] = [];
  agences: BaAgenceDto[] = [];
  currentUser: BaUserDto | null = null;
  message = '';

  form: BaAutorisationSortieRequestDto = {
    motif: '',
    dateSortie: '',
    typeStructure: 'DIRECTION'
  };

  constructor(
    private habilitationsService: HabilitationsService,
    private annuaireService: AnnuaireService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.loadFormContext();
    this.reload();
  }

  loadFormContext(): void {
    this.usersService.getUserWithMoreInfo().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.form.idDirection = user.idDepartement;
        this.form.idService = undefined;
        this.form.idAgence = undefined;
      },
      error: () => (this.message = 'Impossible de charger les informations utilisateur.')
    });

    this.annuaireService.getDepartements().subscribe({
      next: (data) => (this.directions = data || []),
      error: () => (this.message = 'Erreur chargement des directions.')
    });
    this.annuaireService.getServices().subscribe({
      next: (data) => (this.services = data || []),
      error: () => (this.message = 'Erreur chargement des services.')
    });
    this.annuaireService.getAgences().subscribe({
      next: (data) => (this.agences = data || []),
      error: () => (this.message = 'Erreur chargement des agences.')
    });
  }

  reload(): void {
    this.habilitationsService.getMesDemandesAutorisationSortie().subscribe({
      next: (data) => (this.mesDemandes = data || []),
      error: () => (this.message = 'Erreur chargement des demandes.')
    });
    this.habilitationsService.getDemandesAutorisationSortieAValider().subscribe({
      next: (data) => (this.demandesAValider = data || []),
      error: () => (this.message = 'Erreur chargement des validations.')
    });
  }

  createDemande(): void {
    if (!this.form.motif || !this.form.dateSortie || !this.form.typeStructure) {
      this.message = 'Motif, date et type de structure obligatoires.';
      return;
    }

    if (this.form.typeStructure === 'DIRECTION' && !this.form.idDirection) {
      this.message = 'Selectionnez une direction.';
      return;
    }
    if (this.form.typeStructure === 'SERVICE' && !this.form.idService) {
      this.message = 'Selectionnez un service.';
      return;
    }
    if (this.form.typeStructure === 'AGENCE' && !this.form.idAgence) {
      this.message = 'Selectionnez une agence.';
      return;
    }

    this.habilitationsService.createAutorisationSortie(this.form).subscribe({
      next: () => {
        this.message = 'Demande envoyee.';
        this.form = {
          motif: '',
          dateSortie: '',
          typeStructure: 'DIRECTION',
          idDirection: this.currentUser?.idDepartement
        };
        this.reload();
      },
      error: () => (this.message = 'Erreur lors de la creation de la demande.')
    });
  }

  onTypeStructureChange(): void {
    if (this.form.typeStructure === 'DIRECTION') {
      this.form.idService = undefined;
      this.form.idAgence = undefined;
      this.form.idDirection = this.currentUser?.idDepartement;
      return;
    }
    if (this.form.typeStructure === 'SERVICE') {
      this.form.idDirection = undefined;
      this.form.idAgence = undefined;
      this.form.idService = this.currentUser?.idService;
      return;
    }
    this.form.idDirection = undefined;
    this.form.idService = undefined;
    this.form.idAgence = this.currentUser?.idAgence;
  }

  valider(id?: string): void {
    if (!id) {
      return;
    }
    const commentaire = prompt('Motif de validation:');
    if (!commentaire) {
      return;
    }
    this.habilitationsService.validerAutorisationSortie(id, commentaire).subscribe({
      next: () => {
        this.message = 'Demande validee.';
        this.fermerDetails();
        this.reload();
      },
      error: () => (this.message = 'Erreur lors de la validation.')
    });
  }

  rejeter(id?: string): void {
    if (!id) {
      return;
    }
    const commentaire = prompt('Motif du rejet:');
    if (!commentaire) {
      return;
    }
    this.habilitationsService.rejeterAutorisationSortie(id, commentaire).subscribe({
      next: () => {
        this.message = 'Demande rejetee.';
        this.fermerDetails();
        this.reload();
      },
      error: () => (this.message = 'Erreur lors du rejet.')
    });
  }

  canSelfValidate(demande: BaAutorisationSortieDto): boolean {
    return this.currentUser?.fonction === 'DIRECTEUR_GENERAL' && demande.statutValidation === 'EN_ATTENTE';
  }

  canProcessDemande(demande: BaAutorisationSortieDto): boolean {
    if (demande.statutValidation !== 'EN_ATTENTE') {
      return false;
    }
    if (this.currentUser?.fonction === 'DIRECTEUR_GENERAL') {
      return true;
    }
    return this.demandesAValider.some((d) => d.id === demande.id);
  }

  ouvrirDetails(demande: BaAutorisationSortieDto): void {
    this.demandeSelectionnee = demande;
  }

  fermerDetails(): void {
    this.demandeSelectionnee = null;
  }

  telechargerPdf(id?: string): void {
    if (!id) {
      return;
    }
    this.habilitationsService.downloadAutorisationSortiePdf(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `autorisation-sortie-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => (this.message = 'Erreur lors du telechargement du PDF.')
    });
  }

  visionnerPdf(id?: string): void {
    if (!id) {
      return;
    }
    this.habilitationsService.downloadAutorisationSortiePdf(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 3000);
      },
      error: () => (this.message = 'Erreur lors de l ouverture du PDF.')
    });
  }
}
