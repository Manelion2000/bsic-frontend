import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AbsenceStatut, BaRhDashboardDto, RhAbsenceRegistre, RhDashboardFilter, RhDemandesService } from '../../services/rh-demandes.service';
import { extractErrorMessage } from '../../shared/error.utils';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
registerLocaleData(localeFr);

@Component({
  selector: 'app-rh-dashboard', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  providers: [{provide: LOCALE_ID, useValue: 'fr'}],
  templateUrl: './rh-dashboard.component.html', styleUrl: './rh-dashboard.component.scss'
})
export class RhDashboardComponent implements OnInit, OnDestroy {
  data?: BaRhDashboardDto;
  debut = '';
  fin = '';
  idDepartement = '';
  idService = '';
  statut = '';
  recherche = '';
  view: 'registre' | 'agents' = 'registre';
  page = 0;
  readonly pageSize = 10;
  loading = false;
  exporting = '';
  message = '';
  updatedAt?: Date;
  selectedAbsence?: RhAbsenceRegistre;
  private appliedFilter?: {debut: string; fin: string; idDepartement: string; idService: string};
  private request?: Subscription;
  private exportRequest?: Subscription;
  readonly statuses: {code: AbsenceStatut; label: string; className: string}[] = [
    {code: 'EN_ATTENTE', label: 'En attente', className: 'pending'},
    {code: 'VALIDEE', label: 'Validée', className: 'approved'},
    {code: 'REJETEE', label: 'Rejetée', className: 'rejected'},
    {code: 'ANNULEE', label: 'Annulée', className: 'cancelled'}
  ];

  constructor(private readonly service: RhDemandesService) {}
  ngOnInit(): void { this.setPeriod('year'); }
  ngOnDestroy(): void { this.request?.unsubscribe(); this.exportRequest?.unsubscribe(); }
  setPeriod(period: 'month' | 'year' | '30days'): void {
    const today = new Date();
    const year = today.getFullYear(), month = today.getMonth();
    const start = period === 'year' ? new Date(year, 0, 1) : period === 'month' ? new Date(year, month, 1) : new Date(year, month, today.getDate() - 29);
    const end = period === 'year' ? new Date(year, 11, 31) : period === 'month' ? new Date(year, month + 1, 0) : today;
    this.debut = this.isoDate(start); this.fin = this.isoDate(end);
    this.reload();
  }
  reload(): void {
    if (!this.debut || !this.fin || this.fin < this.debut) {
      this.message = 'Choisissez une période valide : la fin doit suivre le début.';
      return;
    }
    this.request?.unsubscribe();
    const filter = {debut: this.debut, fin: this.fin, idDepartement: this.idDepartement, idService: this.idService};
    this.loading = true; this.message = ''; this.selectedAbsence = undefined;
    this.request = this.service.getRhDashboard(filter.debut, filter.fin, filter).subscribe({
      next: data => {
        this.data = data; this.appliedFilter = filter;
        this.updatedAt = new Date(); this.loading = false; this.page = 0;
      },
      error: error => {
        this.data = undefined; this.appliedFilter = undefined; this.loading = false;
        this.message = extractErrorMessage(error, 'Impossible de charger le tableau de bord RH.');
      }
    });
  }
  onDepartmentChange(): void { this.idService = ''; this.reload(); }
  focusDepartment(id: string): void { if (id) { this.idDepartement = id; this.onDepartmentChange(); } }
  resetStructure(): void { this.idDepartement = ''; this.idService = ''; this.reload(); }
  filterRegister(): void { this.page = 0; this.selectedAbsence = undefined; }
  focusAgent(name: string): void { this.recherche = name; this.statut = ''; this.view = 'registre'; this.filterRegister(); }
  get filteredServices() { return (this.data?.services || []).filter(s => !this.idDepartement || s.idDepartement === this.idDepartement); }
  get filtersChanged(): boolean {
    const applied = this.appliedFilter;
    return !applied || applied.debut !== this.debut || applied.fin !== this.fin || applied.idDepartement !== this.idDepartement || applied.idService !== this.idService;
  }
  get filteredRegister(): RhAbsenceRegistre[] {
    const search = this.recherche.trim().toLocaleLowerCase('fr');
    return (this.data?.registre || []).filter(row => (!this.statut || row.statutValidation === this.statut)
      && (!search || [row.nomCompletDemandeur, row.matriculeDemandeur, row.motif].some(value => value?.toLocaleLowerCase('fr').includes(search))));
  }
  get pageCount(): number { return Math.max(1, Math.ceil(this.filteredRegister.length / this.pageSize)); }
  get pagedRegister(): RhAbsenceRegistre[] { return this.filteredRegister.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize); }
  get registerDays(): number { return this.filteredRegister.filter(r => r.statutValidation === 'VALIDEE').reduce((sum, r) => sum + r.joursPeriode, 0); }
  get maxMonthly(): number { return Math.max(1, ...(this.data?.tendances || []).map(item => item.joursAbsence)); }
  get maxDepartment(): number { return Math.max(1, ...(this.data?.parDepartement || []).map(item => item.joursAbsence)); }
  monthlyHeight(value: number): number { return value / this.maxMonthly * 100; }
  departmentWidth(value: number): number { return value / this.maxDepartment * 100; }
  statusLabel(code: string): string { return this.statuses.find(s => s.code === code)?.label || code; }
  statusClass(code: string): string { return this.statuses.find(s => s.code === code)?.className || ''; }
  statusCount(code: string): number {
    if (!this.data) return 0;
    switch (code) {
      case 'EN_ATTENTE': return this.data.absencesEnAttente;
      case 'VALIDEE': return this.data.absencesValidees;
      case 'REJETEE': return this.data.absencesRejetees;
      case 'ANNULEE': return this.data.absencesAnnulees;
      default: return 0;
    }
  }
  statusWidth(code: string): number { return this.data?.absencesTotal ? this.statusCount(code) / this.data.absencesTotal * 100 : 0; }
  monthLabel(value: string): string {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('fr-FR', {month: 'short', year: '2-digit'}).format(new Date(year, month - 1, 1));
  }
  export(type: 'TOUT' | 'SORTIES' | 'ABSENCES' | 'AGENTS'): void {
    if (this.exporting || this.loading || this.filtersChanged || !this.appliedFilter) return;
    const filter = {...this.appliedFilter};
    const registerFilter: RhDashboardFilter = type === 'ABSENCES' ? {...filter, statut: this.statut, recherche: this.recherche.trim()} : filter;
    this.exporting = type; this.message = '';
    this.exportRequest = this.service.exportRhDashboard(type, filter.debut, filter.fin, registerFilter).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = `registre-rh-${type.toLowerCase()}-${filter.debut}-${filter.fin}.csv`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.exporting = '';
      },
      error: async error => {
        this.exporting = '';
        if (error.error instanceof Blob) {
          try { error = {...error, error: JSON.parse(await error.error.text())}; } catch { /* Conserver le message par défaut. */ }
        }
        this.message = extractErrorMessage(error, 'Impossible d’exporter le registre RH.');
      }
    });
  }
  private isoDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
}
