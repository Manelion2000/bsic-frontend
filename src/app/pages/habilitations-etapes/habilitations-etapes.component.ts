import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HabilitationsService, BaEtapeDefinitionDto } from '../../services/habilitations.service';
import { AnnuaireService, BaDepartementDto, BaServiceDto } from '../../services/annuaire.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-habilitations-etapes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habilitations-etapes.component.html',
  styleUrl: './habilitations-etapes.component.scss'
})
export class HabilitationsEtapesComponent implements OnInit {
  etapes: BaEtapeDefinitionDto[] = [];
  departements: BaDepartementDto[] = [];
  services: BaServiceDto[] = [];
  form: BaEtapeDefinitionDto = { type: 'DEPARTEMENT' };
  message = '';
  submitted = false;
  showForm = false;

  constructor(
    private habilitationsService: HabilitationsService,
    private annuaireService: AnnuaireService
  ) {}

  ngOnInit(): void {
    this.load();
    this.annuaireService.getDepartements().subscribe({ next: (d) => (this.departements = d || []) });
    this.annuaireService.getServices().subscribe({ next: (s) => (this.services = s || []) });
  }

  load(): void {
    this.habilitationsService.getEtapes().subscribe({
      next: (data) => (this.etapes = data || []),
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des etapes.'))
    });
  }

  selectEtape(etape: BaEtapeDefinitionDto): void {
    this.form = { ...etape };
    this.showForm = true;
  }

  resetForm(): void {
    this.submitted = false;
    this.form = { type: 'DEPARTEMENT' };
    this.showForm = false;
  }

  openCreateForm(): void {
    this.form = { type: 'DEPARTEMENT' };
    this.submitted = false;
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
    const action$ = this.form.id
      ? this.habilitationsService.updateEtape(this.form.id, this.form)
      : this.habilitationsService.createEtape(this.form);
    action$.subscribe({
      next: () => {
        this.message = this.form.id ? 'Etape mise a jour.' : 'Etape creee.';
        this.resetForm();
        this.load();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la creation.'))
    });
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }
}



