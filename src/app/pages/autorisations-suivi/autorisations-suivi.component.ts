import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnnuaireService, BaDepartementDto } from '../../services/annuaire.service';
import { BaUserDto, UsersService } from '../../services/users.service';
import { BaAutorisationSortieSuiviDto, BaRhDemandesFilter, RhDemandesService } from '../../services/rh-demandes.service';

@Component({
  selector: 'app-autorisations-suivi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './autorisations-suivi.component.html',
  styleUrl: '../rh-stats-shared/rh-stats-shared.scss'
})
export class AutorisationsSuiviComponent implements OnInit {
  rows: BaAutorisationSortieSuiviDto[] = [];
  users: BaUserDto[] = [];
  departements: BaDepartementDto[] = [];
  filter: BaRhDemandesFilter = {};
  page = 0;
  size = 20;
  totalElements = 0;
  loading = false;
  message = '';

  constructor(private service: RhDemandesService, private usersService: UsersService, private annuaireService: AnnuaireService) {}

  ngOnInit(): void {
    this.usersService.getUsers().subscribe((data) => (this.users = data || []));
    this.annuaireService.getDepartements().subscribe((data) => (this.departements = data || []));
    this.reload();
  }

  reload(page = 0): void {
    this.page = page;
    this.loading = true;
    this.service.getSuiviAutorisations(this.cleanFilter(), this.page, this.size).subscribe({
      next: (data) => { this.rows = data.content || []; this.totalElements = data.totalElements || 0; this.loading = false; },
      error: () => { this.message = 'Impossible de charger le suivi des autorisations.'; this.loading = false; }
    });
  }

  reset(): void { this.filter = {}; this.reload(0); }
  next(): void { if ((this.page + 1) * this.size < this.totalElements) this.reload(this.page + 1); }
  prev(): void { if (this.page > 0) this.reload(this.page - 1); }
  private cleanFilter(): BaRhDemandesFilter { return Object.fromEntries(Object.entries(this.filter).filter(([, v]) => v !== undefined && v !== null && v !== '')) as BaRhDemandesFilter; }
}
