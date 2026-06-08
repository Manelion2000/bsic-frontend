import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BaPlateformeDto,
  BaPlateformeStatsFilter,
  BaPlateformeUsageRowDto,
  HabilitationsService
} from '../../services/habilitations.service';
import { AnnuaireService, BaDepartementDto } from '../../services/annuaire.service';
import { BaUserDto, UsersService } from '../../services/users.service';

@Component({
  selector: 'app-plateformes-suivi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plateformes-suivi.component.html',
  styleUrl: './plateformes-suivi.component.scss'
})
export class PlateformesSuiviComponent implements OnInit {
  rows: BaPlateformeUsageRowDto[] = [];
  plateformes: BaPlateformeDto[] = [];
  departements: BaDepartementDto[] = [];
  users: BaUserDto[] = [];
  filter: BaPlateformeStatsFilter = {};
  page = 0;
  size = 20;
  totalElements = 0;
  loading = false;
  message = '';

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

  reload(page = 0): void {
    this.page = page;
    this.loading = true;
    this.message = '';
    this.habilitationsService.getSuiviPlateformes(this.cleanFilter(), this.page, this.size).subscribe({
      next: (data) => {
        this.rows = data.content || [];
        this.totalElements = data.totalElements || 0;
        this.loading = false;
      },
      error: () => {
        this.message = 'Impossible de charger le suivi plateformes.';
        this.loading = false;
      }
    });
  }

  reset(): void {
    this.filter = {};
    this.reload(0);
  }

  next(): void {
    if ((this.page + 1) * this.size < this.totalElements) this.reload(this.page + 1);
  }

  prev(): void {
    if (this.page > 0) this.reload(this.page - 1);
  }

  private cleanFilter(): BaPlateformeStatsFilter {
    return Object.fromEntries(Object.entries(this.filter).filter(([, value]) => value !== undefined && value !== null && value !== '')) as BaPlateformeStatsFilter;
  }
}
