import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AnnuaireService,
  BaAgenceDto,
  BaAnnuaireDepartementDto,
  BaDepartementDto,
  BaServiceDto
} from '../../services/annuaire.service';

@Component({
  selector: 'app-annuaire-global',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annuaire-global.component.html',
  styleUrl: './annuaire-global.component.scss'
})
export class AnnuaireGlobalComponent implements OnInit {
  annuaire: BaAnnuaireDepartementDto[] = [];
  departements: BaDepartementDto[] = [];
  services: BaServiceDto[] = [];
  agences: BaAgenceDto[] = [];
  filters = {
    departementId: '',
    serviceId: '',
    agenceId: ''
  };
  message = '';

  constructor(private annuaireService: AnnuaireService) {}

  ngOnInit(): void {
    this.loadRefs();
    this.load();
  }

  loadRefs(): void {
    this.annuaireService.getDepartements().subscribe({ next: (d) => (this.departements = d || []) });
    this.annuaireService.getServices().subscribe({ next: (s) => (this.services = s || []) });
    this.annuaireService.getAgences().subscribe({ next: (a) => (this.agences = a || []) });
  }

  get filteredAgences(): BaAgenceDto[] {
    if (!this.filters.departementId) {
      return this.agences;
    }
    return this.agences.filter((a) => a.idDepartement === this.filters.departementId);
  }

  load(): void {
    this.annuaireService.getAnnuaire(
      this.filters.departementId || undefined,
      this.filters.serviceId || undefined,
      this.filters.agenceId || undefined
    ).subscribe({
      next: (data) => (this.annuaire = data || []),
      error: () => (this.message = 'Erreur lors du chargement de l\'annuaire.')
    });
  }

  reset(): void {
    this.filters = { departementId: '', serviceId: '', agenceId: '' };
    this.load();
  }
}
