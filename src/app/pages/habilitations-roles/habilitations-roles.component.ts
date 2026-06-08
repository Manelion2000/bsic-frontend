import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HabilitationsService, BaPlateformeRoleDto, BaPlateformeDto } from '../../services/habilitations.service';

@Component({
  selector: 'app-habilitations-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habilitations-roles.component.html',
  styleUrl: './habilitations-roles.component.scss'
})
export class HabilitationsRolesComponent implements OnInit {
  plateformeRoles: BaPlateformeRoleDto[] = [];
  plateformes: BaPlateformeDto[] = [];
  selectedPlateformeId = '';
  form: BaPlateformeRoleDto = {};
  message = '';
  showForm = false;

  constructor(private habilitationsService: HabilitationsService) {}

  ngOnInit(): void {
    this.loadPlateformes();
  }

  loadPlateformes(): void {
    this.habilitationsService.getPlateformes().subscribe({
      next: (data) => (this.plateformes = data || []),
      error: () => (this.message = 'Erreur lors du chargement des plateformes.')
    });
  }

  loadRoles(): void {
    if (!this.selectedPlateformeId) {
      this.plateformeRoles = [];
      return;
    }
    this.habilitationsService.getPlateformeRoles(this.selectedPlateformeId).subscribe({
      next: (data) => (this.plateformeRoles = data || []),
      error: () => (this.message = 'Erreur lors du chargement des roles plateforme.')
    });
  }

  selectRole(pr: BaPlateformeRoleDto): void {
    this.form = { ...pr };
    this.showForm = true;
  }

  resetForm(): void {
    this.form = {};
    this.showForm = false;
  }

  openCreateForm(): void {
    this.form = {};
    this.showForm = true;
  }

  closeFormModal(): void {
    this.resetForm();
  }

  create(): void {
    const action$ = this.form.id
      ? this.habilitationsService.updatePlateformeRole(this.form.id, this.form)
      : this.habilitationsService.createPlateformeRole(this.form);
    action$.subscribe({
      next: () => {
        this.message = this.form.id ? 'Association mise a jour.' : 'Association creee.';
        this.resetForm();
        this.loadRoles();
      },
      error: () => (this.message = 'Erreur lors de la creation.')
    });
  }
}
