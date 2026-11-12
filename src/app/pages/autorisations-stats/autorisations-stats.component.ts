import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnnuaireService, BaDepartementDto } from '../../services/annuaire.service';
import { BaUserDto, UsersService } from '../../services/users.service';
import { BaRhDemandesFilter, BaRhDemandesStatsDto, BaStatItemDto, RhDemandesService } from '../../services/rh-demandes.service';

@Component({
  selector: 'app-autorisations-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './autorisations-stats.component.html',
  styleUrl: '../rh-stats-shared/rh-stats-shared.scss'
})
export class AutorisationsStatsComponent implements OnInit {
  stats?: BaRhDemandesStatsDto;
  filter: BaRhDemandesFilter = {};
  users: BaUserDto[] = [];
  departements: BaDepartementDto[] = [];
  loading = false;
  message = '';

  constructor(private service: RhDemandesService, private usersService: UsersService, private annuaireService: AnnuaireService) {}

  ngOnInit(): void {
    this.usersService.getUsers().subscribe((data) => (this.users = data || []));
    this.annuaireService.getDepartements().subscribe((data) => (this.departements = data || []));
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.service.getStatistiquesAutorisations(this.cleanFilter()).subscribe({
      next: (stats) => { this.stats = stats; this.loading = false; },
      error: () => { this.message = 'Impossible de charger les statistiques des autorisations.'; this.loading = false; }
    });
  }

  reset(): void { this.filter = {}; this.reload(); }
  max(items: BaStatItemDto[] = []): number { return Math.max(1, ...items.map((i) => i.valeur || 0)); }
  private cleanFilter(): BaRhDemandesFilter { return Object.fromEntries(Object.entries(this.filter).filter(([, v]) => v !== undefined && v !== null && v !== '')) as BaRhDemandesFilter; }
}
