import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';
import {
  ReunionsService,
  BaReunionDto
} from '../../services/reunions.service';
import {
  AnnuaireService,
  BaAgenceDto,
  BaDepartementDto,
  BaServiceDto
} from '../../services/annuaire.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-reunions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reunions.component.html',
  styleUrl: './reunions.component.scss'
})
export class ReunionsComponent implements OnInit {
  reunions: BaReunionDto[] = [];
  form: BaReunionDto = this.getDefaultForm();
  departements: BaDepartementDto[] = [];
  services: BaServiceDto[] = [];
  agences: BaAgenceDto[] = [];
  selectedPvFile: File | null = null;
  pvFileName = '';
  message = '';
  submitted = false;
  searchTerm = '';
  filterScope: 'ALL' | 'DEPARTEMENT' | 'SERVICE' | 'AGENCE' = 'ALL';
  filterScopeId = '';
  pageSize = 8;
  pageIndex = 0;
  showForm = false;

  constructor(
    private reunionsService: ReunionsService,
    private annuaireService: AnnuaireService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadReferences();
  }

  get filteredReunions(): BaReunionDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.reunions.filter((r) => {
      const matchesTerm = !term || `${r.titre || ''} ${r.objet || ''}`.toLowerCase().includes(term);
      const matchesScope = this.matchesScopeFilter(r);
      return matchesTerm && matchesScope;
    });
  }

  get pagedReunions(): BaReunionDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredReunions.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredReunions.length / this.pageSize));
  }

  get dateHeureLocalValue(): string {
    if (!this.form.dateHeure) {
      return '';
    }
    const date = new Date(this.form.dateHeure);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  load(): void {
    this.reunionsService.getReunions().subscribe({
      next: (data) => {
        this.reunions = data || [];
        this.pageIndex = 0;
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des reunions.'))
    });
  }

  selectReunion(reunion: BaReunionDto): void {
    this.form = { ...reunion };
    this.selectedPvFile = null;
    this.pvFileName = '';
    this.showForm = true;
  }

  resetForm(): void {
    this.submitted = false;
    this.selectedPvFile = null;
    this.pvFileName = '';
    this.form = this.getDefaultForm();
    this.showForm = false;
  }

  openCreateForm(): void {
    this.submitted = false;
    this.selectedPvFile = null;
    this.pvFileName = '';
    this.form = this.getDefaultForm();
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

    if (!this.form.idDepartement && !this.form.idAgence) {
      this.message = 'Veuillez selectionner un departement ou une agence.';
      return;
    }

    if (!this.form.id && !this.selectedPvFile) {
      this.message = 'Veuillez uploader le PV de la reunion.';
      return;
    }

    const upload$: Observable<string | null> = this.selectedPvFile
      ? this.reunionsService.uploadDocument(this.selectedPvFile)
      : of(this.form.procesVerbalId ?? null);

    upload$.pipe(
      switchMap((documentId) => {
        const payload: BaReunionDto = {
          ...this.form,
          procesVerbalId: documentId ?? this.form.procesVerbalId
        };
        return this.form.id
          ? this.reunionsService.updateReunion(this.form.id, payload)
          : this.reunionsService.createReunion(payload);
      })
    ).subscribe({
      next: () => {
        this.message = this.form.id ? 'Reunion mise a jour.' : 'Reunion creee.';
        this.resetForm();
        this.load();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la creation.'))
    });
  }

  onScopeChange(scope: 'departement' | 'agence'): void {
    if (scope !== 'departement') this.form.idDepartement = undefined;
    this.form.idService = undefined;
    if (scope !== 'agence') this.form.idAgence = undefined;
  }

  onDateHeureChange(value: string): void {
    if (!value) {
      this.form.dateHeure = undefined;
      return;
    }
    this.form.dateHeure = new Date(value).toISOString();
  }

  onPvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;
    this.selectedPvFile = file;
    this.pvFileName = file ? file.name : '';
  }

  prevPage(): void {
    this.pageIndex = Math.max(0, this.pageIndex - 1);
  }

  nextPage(): void {
    this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1);
  }

  onFilterScopeChange(): void {
    this.filterScopeId = '';
    this.pageIndex = 0;
  }

  onFilterScopeIdChange(): void {
    this.pageIndex = 0;
  }

  get filterOptions(): Array<{ id?: string; nom?: string }> {
    if (this.filterScope === 'DEPARTEMENT') return this.departements;
    if (this.filterScope === 'SERVICE') return this.services;
    if (this.filterScope === 'AGENCE') return this.agences;
    return [];
  }

  getRelationLabel(reunion: BaReunionDto): string {
    if (reunion.nomDepartement) return `Departement: ${reunion.nomDepartement}`;
    if (reunion.nomService) return `Service: ${reunion.nomService}`;
    if (reunion.nomAgence) return `Agence: ${reunion.nomAgence}`;
    return '-';
  }

  openPv(reunion: BaReunionDto): void {
    if (!reunion.procesVerbalId) {
      this.message = 'Aucun PV disponible pour cette reunion.';
      return;
    }
    const url = `/api/documents/${reunion.procesVerbalId}`;
    window.open(url, '_blank', 'noopener');
  }

  downloadPv(reunion: BaReunionDto): void {
    if (!reunion.procesVerbalId) {
      this.message = 'Aucun PV disponible pour cette reunion.';
      return;
    }
    const url = `/api/documents/${reunion.procesVerbalId}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `pv-reunion-${reunion.id || reunion.procesVerbalId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private loadReferences(): void {
    this.annuaireService.getDepartements().subscribe({
      next: (data) => (this.departements = data || []),
      error: () => (this.departements = [])
    });
    this.annuaireService.getServices().subscribe({
      next: (data) => (this.services = data || []),
      error: () => (this.services = [])
    });
    this.annuaireService.getAgences().subscribe({
      next: (data) => (this.agences = data || []),
      error: () => (this.agences = [])
    });
  }

  private getDefaultForm(): BaReunionDto {
    return {
      dateHeure: new Date().toISOString(),
      valideParDirecteur: false
    };
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }

  private matchesScopeFilter(reunion: BaReunionDto): boolean {
    if (this.filterScope === 'ALL' || !this.filterScopeId) {
      return true;
    }
    if (this.filterScope === 'DEPARTEMENT') {
      return reunion.idDepartement === this.filterScopeId;
    }
    if (this.filterScope === 'SERVICE') {
      return reunion.idService === this.filterScopeId;
    }
    return reunion.idAgence === this.filterScopeId;
  }
}
