import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {
  HabilitationsService,
  BaFicheHabilitationDto,
  BaPlateformeDto
} from '../../services/habilitations.service';
import { ReportingService } from '../../services/reporting.service';
import { BaUserDto } from '../../services/annuaire.service';
import { UsersService } from '../../services/users.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-habilitations-fiches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habilitations-fiches.component.html',
  styleUrl: './habilitations-fiches.component.scss'
})
export class HabilitationsFichesComponent implements OnInit {
  fiches: BaFicheHabilitationDto[] = [];
  plateformes: BaPlateformeDto[] = [];
  employes: BaUserDto[] = [];
  selectedPlateformeId = '';
  selectedPlateformeIds: string[] = [];
  selectedEmployeId = '';
  form: BaFicheHabilitationDto = { priorite: 'NORMALE', statutHabilitation: 'EN_COURS' };
  message = '';
  submitted = false;
  searchTerm = '';
  pageSize = 8;
  pageIndex = 0;
  deletingId: string | null = null;
  showForm = false;

  constructor(
    private habilitationsService: HabilitationsService,
    private usersService: UsersService,
    private reportingService: ReportingService
  ) {}

  ngOnInit(): void {
    this.loadFiches();
    this.loadPlateformes();
    this.loadEmployes();
  }

  get filteredFiches(): BaFicheHabilitationDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.fiches;
    return this.fiches.filter((f) =>
      `${f.nomCompletEmploye || ''} ${f.nomPlateforme || ''} ${f.nomDirectionEmploye || ''}`
        .toLowerCase()
        .includes(term)
    );
  }

  get pagedFiches(): BaFicheHabilitationDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredFiches.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredFiches.length / this.pageSize));
  }

  loadFiches(): void {
    this.habilitationsService.getFiches().subscribe({
      next: (data) => {
        this.fiches = data || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des fiches.'))
    });
  }

  loadPlateformes(): void {
    this.habilitationsService.getPlateformes().subscribe({
      next: (data) => (this.plateformes = data || []),
      error: () => {}
    });
  }

  loadEmployes(): void {
    this.usersService.getUsers().subscribe({
      next: (data) => (this.employes = data || [])
    });
  }

  loadPlateformeRoles(): void {
    if (!this.selectedPlateformeIds.length) {
      this.form.idCircuit = undefined;
      this.form.nomCircuit = undefined;
      this.form.nomPlateforme = undefined;
      this.form.idsPlateformes = [];
      this.form.nomsPlateformes = [];
      return;
    }
    const selected = this.plateformes.filter((p) => p.id && this.selectedPlateformeIds.includes(p.id));
    const circuitIds = Array.from(new Set(selected.map((p) => p.idCircuit).filter(Boolean)));
    this.form.idsPlateformes = selected.map((p) => p.id as string);
    this.form.nomsPlateformes = selected.map((p) => p.nom || '');
    this.form.nomPlateforme = selected.map((p) => p.nom).filter(Boolean).join(', ');
    this.form.idCircuit = circuitIds.length === 1 ? circuitIds[0] : undefined;
    this.form.nomCircuit = circuitIds.length === 1 ? selected.find((p) => p.idCircuit === circuitIds[0])?.libelleCircuit : undefined;
  }

  onEmployeChange(): void {
    if (!this.selectedEmployeId) {
      this.form.idEmploye = undefined;
      this.form.nomCompletEmploye = undefined;
      this.form.matriculeEmploye = undefined;
      this.form.idServiceEmploye = undefined;
      this.form.nomServiceEmploye = undefined;
      this.form.idDepartementEmploye = undefined;
      this.form.nomDepartementEmploye = undefined;
      this.form.idDirectionEmploye = undefined;
      this.form.nomDirectionEmploye = undefined;
      this.form.idAgenceEmploye = undefined;
      this.form.nomAgenceEmploye = undefined;
      this.form.fonctionEmploye = undefined;
      this.form.telephoneMobileEmploye = undefined;
      return;
    }
    const employe = this.employes.find((e) => e.id === this.selectedEmployeId);
    if (!employe) {
      return;
    }
    this.form.idEmploye = employe.id;
    this.form.nomCompletEmploye = `${employe.nom || ''} ${employe.prenom || ''}`.trim();
    this.form.matriculeEmploye = employe.matricule;
    this.form.idServiceEmploye = employe.idService;
    this.form.nomServiceEmploye = employe.nomService;
    this.form.idDepartementEmploye = employe.idDepartement;
    this.form.nomDepartementEmploye = employe.nomDepartement;
    this.form.idDirectionEmploye = employe.idDepartement;
    this.form.nomDirectionEmploye = employe.nomDepartement;
    this.form.idAgenceEmploye = employe.idAgence;
    this.form.nomAgenceEmploye = employe.nomAgence;
    this.form.fonctionEmploye = employe.fonction as any;
    this.form.telephoneMobileEmploye = employe.telephoneMobile;
  }

  selectFiche(fiche: BaFicheHabilitationDto): void {
    this.form = { ...fiche };
    this.selectedEmployeId = fiche.idEmploye || '';
    this.selectedPlateformeIds = fiche.idsPlateformes?.length
      ? [...fiche.idsPlateformes]
      : this.plateformes.filter((p) => p.idCircuit === fiche.idCircuit).slice(0, 1).map((p) => p.id as string);
    this.selectedPlateformeId = this.selectedPlateformeIds[0] || '';
    this.showForm = true;
  }

  resetForm(): void {
    this.submitted = false;
    this.form = { priorite: 'NORMALE', statutHabilitation: 'EN_COURS' };
    this.selectedEmployeId = '';
    this.selectedPlateformeId = '';
    this.selectedPlateformeIds = [];
    this.showForm = false;
  }

  openCreateForm(): void {
    this.submitted = false;
    this.form = { priorite: 'NORMALE', statutHabilitation: 'EN_COURS' };
    this.selectedEmployeId = '';
    this.selectedPlateformeId = '';
    this.selectedPlateformeIds = [];
    this.showForm = true;
  }

  closeFormModal(): void {
    this.resetForm();
  }

  create(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    if (!this.form.idEmploye) {
      this.message = 'Selectionnez un utilisateur.';
      return;
    }

    const submit = () => {
      if (!this.selectedPlateformeIds.length) {
        this.message = 'Selectionnez au moins une plateforme.';
        return;
      }
      if (!this.form.idCircuit) {
        this.message = 'Toutes les plateformes selectionnees doivent etre liees au meme circuit.';
        return;
      }
      this.habilitationsService.createFiche(this.form).subscribe({
        next: () => {
          this.message = 'Fiche creee.';
          this.resetForm();
          this.loadFiches();
        },
        error: (err) => (this.message = this.extractError(err, 'Erreur lors de la creation.'))
      });
    };

    if (this.form.idCircuit) {
      submit();
      return;
    }

    // Securite: recharger la plateforme au moment du submit pour recuperer son circuit lie.
    this.habilitationsService.getPlateformes().subscribe({
      next: (plateformes) => {
        this.plateformes = plateformes || [];
        this.loadPlateformeRoles();
        submit();
      },
      error: (err) => {
        this.message = this.extractError(err, 'Impossible de verifier la plateforme selectionnee.');
      }
    });
  }

  initEtapes(ficheId?: string): void {
    const id = ficheId || this.form.id;
    if (!id) {
      this.message = 'Selectionner une fiche.';
      return;
    }
    this.habilitationsService.initEtapesFromPlateforme(id).subscribe({
      next: () => (this.message = 'Etapes initialisees.'),
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de l\'initialisation des etapes.'))
    });
  }

  prevPage(): void {
    this.pageIndex = Math.max(0, this.pageIndex - 1);
  }

  nextPage(): void {
    this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1);
  }

  deleteFiche(fiche: BaFicheHabilitationDto): void {
    if (!fiche.id) {
      this.message = 'Fiche introuvable.';
      return;
    }
    if (!confirm(`Supprimer la fiche de "${fiche.nomCompletEmploye || 'cet employe'}" ?`)) {
      return;
    }

    this.deletingId = fiche.id;
    this.habilitationsService.deleteFiche(fiche.id).subscribe({
      next: () => {
        this.message = 'Fiche supprimee.';
        this.fiches = this.fiches.filter((f) => f.id !== fiche.id);
        if (this.form.id === fiche.id) {
          this.resetForm();
        }
        this.pageIndex = Math.min(this.pageIndex, this.totalPages - 1);
        this.deletingId = null;
      },
      error: (err) => {
        this.message = this.extractError(err, 'Erreur lors de la suppression.');
        this.deletingId = null;
      }
    });
  }

  downloadFichePdf(fiche: BaFicheHabilitationDto): void {
    if (!fiche.id) {
      this.message = 'Fiche introuvable.';
      return;
    }
    this.reportingService.reportFicheHabilitation(fiche.id).subscribe({
      next: (blob) => {
        const filename = `fiche-habilitation-${fiche.id}.pdf`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
        this.message = `Telechargement lance: ${filename}`;
      },
      error: (err) => {
        this.message = this.extractError(err, 'Erreur lors de la generation du PDF.');
      }
    });
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }
}



