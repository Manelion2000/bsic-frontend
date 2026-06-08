import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BaRepriseServiceDto,
  BaRepriseServiceRequestDto,
  HabilitationsService
} from '../../services/habilitations.service';
import { BaUserDto, UsersService } from '../../services/users.service';

@Component({
  selector: 'app-reprises-service',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reprises-service.component.html',
  styleUrl: './reprises-service.component.scss'
})
export class ReprisesServiceComponent implements OnInit {
  mesDemandes: BaRepriseServiceDto[] = [];
  demandesAValider: BaRepriseServiceDto[] = [];
  demandeSelectionnee: BaRepriseServiceDto | null = null;
  currentUser: BaUserDto | null = null;
  message = '';
  loading = false;
  commentaire = '';

  form: BaRepriseServiceRequestDto = this.emptyForm();

  constructor(
    private habilitationsService: HabilitationsService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.usersService.getUserWithMoreInfo().subscribe({
      next: (user) => (this.currentUser = user),
      error: () => (this.message = 'Impossible de charger les informations utilisateur.')
    });
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.habilitationsService.getMesReprisesService().subscribe({
      next: (data) => {
        this.mesDemandes = data || [];
        this.loading = false;
      },
      error: () => {
        this.message = 'Erreur lors du chargement des demandes.';
        this.loading = false;
      }
    });
    this.habilitationsService.getReprisesServiceAValider().subscribe({
      next: (data) => (this.demandesAValider = data || []),
      error: () => (this.message = 'Erreur lors du chargement des validations.')
    });
  }

  createDemande(): void {
    if (!this.form.motifAbsence || !this.form.dateDebutConge || !this.form.dateFinConge || !this.form.dateReprise) {
      this.message = 'Le motif et toutes les dates sont obligatoires.';
      return;
    }
    if (this.form.dateFinConge < this.form.dateDebutConge) {
      this.message = 'La date de fin doit suivre la date de debut.';
      return;
    }
    if (this.form.dateReprise < this.form.dateFinConge) {
      this.message = 'La date de reprise ne peut pas preceder la fin de l absence.';
      return;
    }
    if (this.form.dateReprise > this.today()) {
      this.message = 'La reprise de service ne peut pas etre declaree dans le futur.';
      return;
    }
    this.habilitationsService.createRepriseService(this.form).subscribe({
      next: () => {
        this.message = 'Declaration de reprise envoyee au signataire.';
        this.form = this.emptyForm();
        this.reload();
      },
      error: () => (this.message = 'Erreur lors de la creation de la demande.')
    });
  }

  ouvrirDetails(demande: BaRepriseServiceDto): void {
    this.demandeSelectionnee = demande;
    this.commentaire = '';
  }

  fermerDetails(): void {
    this.demandeSelectionnee = null;
    this.commentaire = '';
  }

  canProcess(demande: BaRepriseServiceDto): boolean {
    return demande.statutValidation === 'EN_ATTENTE' && this.demandesAValider.some((item) => item.id === demande.id);
  }

  valider(): void {
    const id = this.demandeSelectionnee?.id;
    if (!id) return;
    this.habilitationsService.validerRepriseService(id, this.commentaire || undefined).subscribe({
      next: () => {
        this.message = 'Reprise validee et agent autorise a prendre service.';
        this.fermerDetails();
        this.reload();
      },
      error: () => (this.message = 'Erreur lors de la validation.')
    });
  }

  rejeter(): void {
    const id = this.demandeSelectionnee?.id;
    if (!id || !this.commentaire.trim()) {
      this.message = 'Le commentaire de rejet est obligatoire.';
      return;
    }
    this.habilitationsService.rejeterRepriseService(id, this.commentaire.trim()).subscribe({
      next: () => {
        this.message = 'Demande de reprise rejetee.';
        this.fermerDetails();
        this.reload();
      },
      error: () => (this.message = 'Erreur lors du rejet.')
    });
  }

  attestation(id: string | undefined, preview: boolean): void {
    if (!id) return;
    this.habilitationsService.downloadAttestationRepriseService(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        if (preview) {
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 3000);
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = `attestation-reprise-service-${id}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      },
      error: () => (this.message = 'Attestation indisponible. La reprise doit etre validee.')
    });
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  countValidees(): number {
    return this.mesDemandes.filter((demande) => demande.statutValidation === 'VALIDEE').length;
  }

  private emptyForm(): BaRepriseServiceRequestDto {
    return { motifAbsence: '', dateDebutConge: '', dateFinConge: '', dateReprise: '' };
  }
}
