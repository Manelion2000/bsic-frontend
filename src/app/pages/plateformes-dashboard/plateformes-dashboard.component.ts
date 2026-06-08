import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BaPlateformeDashboardStatsDto,
  BaPlateformeDto,
  BaPlateformeStatsFilter,
  BaStatItemDto,
  HabilitationsService
} from '../../services/habilitations.service';
import { AnnuaireService, BaDepartementDto } from '../../services/annuaire.service';
import { BaUserDto, UsersService } from '../../services/users.service';

@Component({
  selector: 'app-plateformes-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plateformes-dashboard.component.html',
  styleUrl: './plateformes-dashboard.component.scss'
})
export class PlateformesDashboardComponent implements OnInit {
  stats?: BaPlateformeDashboardStatsDto;
  plateformes: BaPlateformeDto[] = [];
  departements: BaDepartementDto[] = [];
  users: BaUserDto[] = [];
  loading = false;
  message = '';
  filter: BaPlateformeStatsFilter = {};

  constructor(
    private habilitationsService: HabilitationsService,
    private annuaireService: AnnuaireService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.habilitationsService.getPlateformes().subscribe((data) => (this.plateformes = data || []));
    this.annuaireService.getDepartements().subscribe((data) => (this.departements = data || []));
    this.usersService.getUsers().subscribe((data) => (this.users = data || []));
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.message = '';
    this.habilitationsService.getPlateformeDashboardStats(this.cleanFilter()).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: () => {
        this.message = 'Impossible de charger les statistiques plateformes.';
        this.loading = false;
      }
    });
  }

  reset(): void {
    this.filter = {};
    this.reload();
  }

  max(items: BaStatItemDto[] = []): number {
    return Math.max(1, ...items.map((item) => item.valeur || 0));
  }

  private cleanFilter(): BaPlateformeStatsFilter {
    return Object.fromEntries(Object.entries(this.filter).filter(([, value]) => value !== undefined && value !== null && value !== '')) as BaPlateformeStatsFilter;
  }
}
