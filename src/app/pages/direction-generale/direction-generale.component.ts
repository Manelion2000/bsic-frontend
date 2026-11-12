import { TemporaryPasswordComponent } from '../../shared/temporary-password.component';
import { TemporaryCredential } from '../../services/users.service';
import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule, NgForm} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {forkJoin, Observable, of, Subject, takeUntil} from 'rxjs';
import {BaUserDto} from '../../services/users.service';
import {BaDgaPoleValidateurDto} from '../../services/habilitations.service';
import {DirectionGeneraleRequest, DirectionGeneraleService, DirectionKind} from '../../services/direction-generale.service';
import {extractErrorMessage} from '../../shared/error.utils';

@Component({
  selector: 'app-direction-generale', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TemporaryPasswordComponent],
  templateUrl: './direction-generale.component.html', styleUrl: './direction-generale.component.scss'
})
export class DirectionGeneraleComponent implements OnInit, OnDestroy {
  credential?:TemporaryCredential;
  kind: DirectionKind = 'dg';
  users: BaUserDto[] = [];
  assignments: BaDgaPoleValidateurDto[] = [];
  form: DirectionGeneraleRequest = this.emptyForm();
  assignment: BaDgaPoleValidateurDto = {};
  mode: 'creation' | 'affectation' | null = null;
  loading = false;
  loadFailed = false;
  busy = false;
  submitted = false;
  message = '';
  error = '';
  pendingDeactivationId?: string;
  readonly poles = ['OPERATIONS', 'DEVELOPPEMENT'] as const;
  private readonly destroyed$ = new Subject<void>();

  constructor(private api: DirectionGeneraleService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroyed$)).subscribe(data => {
      this.kind = data['kind'] === 'dga' ? 'dga' : 'dg';
      this.mode = null; this.message = ''; this.error = ''; this.load();
    });
  }
  ngOnDestroy(): void { this.credential = undefined; this.destroyed$.next(); this.destroyed$.complete(); }
  get title(): string { return this.kind === 'dg' ? 'Directeur général (DG)' : 'Directeurs généraux adjoints (DGA)'; }
  get availableUsers(): BaUserDto[] { return this.users.filter(user => this.available(user)); }
  get activeDg(): BaUserDto | undefined { return this.availableUsers[0]; }
  get canCreate(): boolean { return !this.loading && !this.loadFailed && !this.busy && (this.kind === 'dga' || !this.activeDg); }
  available(user: BaUserDto): boolean { return user.activated === true && user.locked !== true; }
  name(user: BaUserDto): string { return [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || user.username || ''; }
  poleLabel(pole?: string): string { return pole === 'OPERATIONS' ? 'Opérations' : 'Développement'; }
  today(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  currentAssignments(pole: string): BaDgaPoleValidateurDto[] {
    const today = this.today();
    return this.assignments.filter(a => a.pole === pole && a.actif !== false && !!a.dateDebut && a.dateDebut <= today && (!a.dateFin || a.dateFin >= today));
  }
  accountAvailable(assignment: BaDgaPoleValidateurDto): boolean {
    return this.availableUsers.some(user => user.id === assignment.idDga);
  }

  load(): void {
    this.loading = true; this.loadFailed = false;
    forkJoin({users: this.api.getUsers(this.kind), assignments: this.kind === 'dga' ? this.api.getAssignments() : of([])})
      .pipe(takeUntil(this.destroyed$)).subscribe({
        next: data => { this.users = data.users; this.assignments = data.assignments; this.loading = false; },
        error: err => { this.loading = false; this.loadFailed = true; this.error = extractErrorMessage(err, 'Impossible de charger la direction générale.'); }
      });
  }

  openCreate(pole: 'OPERATIONS' | 'DEVELOPPEMENT' = 'OPERATIONS'): void {
    if (!this.canCreate) return;
    this.form = {...this.emptyForm(), pole, dateDebut: this.today()};
    this.mode = 'creation'; this.submitted = false; this.error = ''; this.message = '';
  }
  openAssignment(value?: BaDgaPoleValidateurDto): void {
    if (this.busy || this.loading || this.loadFailed) return;
    this.assignment = value ? {...value} : {pole: 'OPERATIONS', dateDebut: this.today(), actif: true};
    this.mode = 'affectation'; this.submitted = false; this.error = ''; this.message = '';
  }
  close(): void { if (!this.busy) { this.mode = null; this.submitted = false; } }

  save(formRef: NgForm): void {
    if (this.busy) return;
    this.submitted = true; this.error = ''; this.message = '';
    const dates = this.mode === 'affectation' ? this.assignment : this.form;
    if (formRef.invalid || (this.kind === 'dga' && (!dates.pole || !dates.dateDebut))) {
      this.error = 'Veuillez renseigner les champs obligatoires.'; return;
    }
    if (this.kind === 'dga' && dates.dateFin && dates.dateDebut && dates.dateFin < dates.dateDebut) {
      this.error = 'La date de fin doit suivre la date de début.'; return;
    }
    this.busy = true;
    const payload: DirectionGeneraleRequest = {
      nom: this.form.nom.trim(), prenom: this.form.prenom.trim(), email: this.form.email.trim(),
      telephone: this.form.telephone.trim(), sexe: this.form.sexe, matricule: this.form.matricule?.trim() || undefined,
      ...(this.kind === 'dga' ? {pole: this.form.pole, dateDebut: this.form.dateDebut, dateFin: this.form.dateFin || undefined} : {})
    };
    const mode = this.mode;
    const request: Observable<BaUserDto | BaDgaPoleValidateurDto> = mode === 'affectation'
      ? this.api.saveAssignment({...this.assignment, dateFin: this.assignment.dateFin || undefined})
      : this.api.create(this.kind, payload);
    request.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (created) => {
        this.busy = false; this.mode = null;
        this.message = mode === 'affectation' ? 'Affectation enregistrée.'
          : this.kind === 'dg' ? 'Compte DG créé.' : 'Compte DGA créé et rattaché à son pôle.';
        this.credential = mode === 'creation' ? (created as BaUserDto).initialCredential : undefined;
        this.load();
      },
      error: err => { this.busy = false; this.error = extractErrorMessage(err, 'Impossible d’enregistrer le responsable.'); }
    });
  }
  deactivate(value: BaDgaPoleValidateurDto): void {
    if (!value.id || this.busy) return;
    this.busy = true; this.error = ''; this.message = '';
    this.api.deactivateAssignment(value.id).pipe(takeUntil(this.destroyed$)).subscribe({
      next: () => { this.busy = false; this.pendingDeactivationId = undefined; this.message = 'Affectation désactivée. Le compte est conservé.'; this.load(); },
      error: err => { this.busy = false; this.error = extractErrorMessage(err, 'Impossible de désactiver cette affectation.'); }
    });
  }
  private emptyForm(): DirectionGeneraleRequest { return {nom: '', prenom: '', email: '', telephone: '', sexe: 'MASCULIN'}; }
}
