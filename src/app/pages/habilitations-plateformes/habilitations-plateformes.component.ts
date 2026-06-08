import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HabilitationsService, BaPlateformeDto, CircuitResponseDto } from '../../services/habilitations.service';

import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-habilitations-plateformes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habilitations-plateformes.component.html',
  styleUrl: './habilitations-plateformes.component.scss'
})
export class HabilitationsPlateformesComponent implements OnInit {
  plateformes: BaPlateformeDto[] = [];
  circuits: CircuitResponseDto[] = [];
  form: BaPlateformeDto = {};
  message = '';
  submitted = false;
  showForm = false;

  constructor(private habilitationsService: HabilitationsService) {}

  ngOnInit(): void {
    this.load();
    this.loadCircuits();
  }

  load(): void {
    this.habilitationsService.getPlateformes().subscribe({
      next: (data) => (this.plateformes = data || []),
      error: (err) => (this.message = this.extractError(err, 'Erreur lors du chargement des plateformes.'))
    });
  }

  selectPlateforme(p: BaPlateformeDto): void {
    this.form = { ...p };
    this.showForm = true;
  }

  resetForm(): void {
    this.submitted = false;
    this.form = {};
    this.showForm = false;
  }

  openCreateForm(): void {
    this.form = { typePlateforme: 'RESEAUX' };
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
      ? this.habilitationsService.updatePlateforme(this.form.id, this.form)
      : this.habilitationsService.createPlateforme(this.form);
    action$.subscribe({
      next: () => {
        this.message = this.form.id ? 'Plateforme mise a jour.' : 'Plateforme creee.';
        this.resetForm();
        this.load();
      },
      error: (err) => (this.message = this.extractError(err, 'Erreur lors de la creation.'))
    });
  }

  loadCircuits(): void {
    this.habilitationsService.getCircuitsActifsV2().subscribe({
      next: (data) => (this.circuits = data || []),
      error: () => (this.circuits = [])
    });
  }

  private extractError(err: any, fallback: string): string {
    return extractErrorMessage(err, fallback);
  }
}



