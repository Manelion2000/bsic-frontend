import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BaDgaPoleValidateurDto, HabilitationsService } from '../../services/habilitations.service';
import { BaUserDto, UsersService } from '../../services/users.service';
import { extractErrorMessage } from '../../shared/error.utils';

@Component({
  selector: 'app-dga-pole-validateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dga-pole-validateurs.component.html',
  styleUrl: './dga-pole-validateurs.component.scss'
})
export class DgaPoleValidateursComponent implements OnInit {
  configs: BaDgaPoleValidateurDto[] = [];
  users: BaUserDto[] = [];
  form: BaDgaPoleValidateurDto = this.emptyForm();
  message = '';
  submitted = false;
  showForm = false;
  readonly poles = ['OPERATIONS', 'DEVELOPPEMENT'] as const;

  constructor(
    private habilitationsService: HabilitationsService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get dgaUsers(): BaUserDto[] {
    return (this.users || []).filter((user) =>
      user.fonction === 'DIRECTEUR_GENERAL_ADJOINT'
    );
  }

  loadData(): void {
    forkJoin({
      configs: this.habilitationsService.getDgaPoleValidateurs(),
      users: this.usersService.getUsers()
    }).subscribe({
      next: ({ configs, users }) => {
        this.configs = configs || [];
        this.users = users || [];
      },
      error: (err) => (this.message = extractErrorMessage(err, 'Erreur lors du chargement des DGA par pole.'))
    });
  }

  openCreateForm(): void {
    this.form = this.emptyForm();
    this.submitted = false;
    this.showForm = true;
  }

  selectConfig(config: BaDgaPoleValidateurDto): void {
    this.form = { ...config };
    this.submitted = false;
    this.showForm = true;
  }

  closeFormModal(): void {
    this.form = this.emptyForm();
    this.showForm = false;
    this.submitted = false;
  }

  save(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.message = 'Veuillez renseigner les champs obligatoires.';
      return;
    }
    const payload = { ...this.form, actif: this.form.actif !== false };
    const request = payload.id
      ? this.habilitationsService.updateDgaPoleValidateur(payload.id, payload)
      : this.habilitationsService.createDgaPoleValidateur(payload);
    request.subscribe({
      next: () => {
        this.message = payload.id ? 'Configuration DGA mise a jour.' : 'Configuration DGA creee.';
        this.closeFormModal();
        this.loadData();
      },
      error: (err) => (this.message = extractErrorMessage(err, 'Erreur lors de l’enregistrement.'))
    });
  }

  desactiver(config: BaDgaPoleValidateurDto): void {
    if (!config.id) return;
    this.habilitationsService.deleteDgaPoleValidateur(config.id).subscribe({
      next: () => {
        this.message = 'Configuration DGA desactivee.';
        this.loadData();
      },
      error: (err) => (this.message = extractErrorMessage(err, 'Erreur lors de la desactivation.'))
    });
  }

  userLabel(user: BaUserDto): string {
    const fullName = `${user.nom || ''} ${user.prenom || ''}`.trim();
    return fullName || user.username || user.email || user.id || '';
  }

  private emptyForm(): BaDgaPoleValidateurDto {
    return {
      pole: 'OPERATIONS',
      dateDebut: new Date().toISOString().slice(0, 10),
      actif: true
    };
  }
}
