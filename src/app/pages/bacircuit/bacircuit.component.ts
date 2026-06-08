import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import {
  HabilitationsService,
  BaPlateformeDto,
  CircuitResponseDto,
  CircuitRequestDto
} from '../../services/habilitations.service';
import { AnnuaireService, BaDepartementDto } from '../../services/annuaire.service';
import { NotificationService } from '../../services/notification.service';

export interface CircuitDto {
  id?: string;
  code?: string;
  nomCircuit: string;
  plateformeId?: string;
  plateformeNom?: string;
  etapes: CircuitEtapeDto[];
  statut: 'ACTIF' | 'INACTIF' | 'EN_CONFIGURATION';
  actif?: boolean;
  dateCreation?: string;
  dateModification?: string;
  description?: string;
}

export interface CircuitEtapeDto {
  id: string;
  idEtapeDefinition: string;
  libelle: string;
  type: 'DEPARTEMENT' | 'SERVICE';
  ordre: number;
  nomDepartement?: string;
  nomService?: string;
}

@Component({
  selector: 'app-bacircuit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bacircuit.component.html',
  styleUrl: './bacircuit.component.scss'
})
export class BacircuitComponent implements OnInit {
  circuits: CircuitDto[] = [];
  plateformes: BaPlateformeDto[] = [];
  departements: BaDepartementDto[] = [];
  loading = false;
  showCreateForm = false;
  showLinkForm = false;
  searchTerm = '';
  selectedPlateforme = '';

  circuitForm: {
    nomCircuit: string;
    description: string;
    etapesIds: string[];
  } = {
    nomCircuit: '',
    description: '',
    etapesIds: []
  };
  linkForm: {
    plateformeId: string;
    circuitId: string;
  } = {
    plateformeId: '',
    circuitId: ''
  };

  constructor(
    private router: Router,
    private habilitationsService: HabilitationsService,
    private annuaireService: AnnuaireService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadReferences();
    this.loadCircuits();
  }

  goToCreateCircuit(): void {
    this.router.navigate(['/bacircuit-config']);
  }

  loadCircuits(): void {
    this.loading = true;
    this.habilitationsService.getPlateformes().pipe(
      switchMap((plateformes) =>
        this.habilitationsService.getCircuitsV2().pipe(
          switchMap((circuits) => of(this.mapCircuits(circuits || [], plateformes || [])))
        )
      )
    ).subscribe({
      next: (circuits) => {
        this.circuits = circuits;
        this.loading = false;
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de charger les circuits');
        this.loading = false;
      }
    });
  }

  loadReferences(): void {
    this.habilitationsService.getPlateformes().subscribe({
      next: (plateformes) => {
        this.plateformes = plateformes || [];
      }
    });

    this.annuaireService.getDepartements().subscribe({
      next: (departements) => {
        this.departements = departements || [];
      }
    });
  }

  createCircuit(): void {
    if (!this.circuitForm.nomCircuit) {
      this.notificationService.showWarning('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const payload: CircuitRequestDto = {
      libelle: this.circuitForm.nomCircuit,
      description: this.circuitForm.description,
      statutCircuit: 'EN_CONFIGURATION',
      actif: false
    };

    this.loading = true;
    this.habilitationsService.createCircuitV2(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess('Circuit cree', `Le circuit "${this.circuitForm.nomCircuit}" a ete cree avec succes`);
        this.resetForm();
        this.loadCircuits();
        this.loading = false;
      },
      error: (err) => {
        const message = err?.error?.message || 'Impossible de creer le circuit';
        this.notificationService.showError('Erreur', message);
        this.loading = false;
      }
    });
  }

  configureCircuit(circuitId: string): void {
    this.router.navigate(['/bacircuit-config', circuitId]);
  }

  viewCircuitDetails(circuitId: string): void {
    this.router.navigate(['/bacircuit-config', circuitId]);
  }

  deleteCircuit(circuit: CircuitDto): void {
    if (!circuit.id) {
      return;
    }
    if (confirm(`Etes-vous sur de vouloir supprimer le circuit "${circuit.nomCircuit}" ?`)) {
      this.habilitationsService.deleteCircuitV2(circuit.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Circuit supprime', 'Le circuit a ete supprime avec succes');
          this.loadCircuits();
        },
        error: () => this.notificationService.showError('Erreur', 'Impossible de supprimer le circuit')
      });
    }
  }

  toggleCircuitStatus(circuit: CircuitDto): void {
    if (!circuit.id) {
      return;
    }
    const request$ = circuit.statut === 'ACTIF'
      ? this.habilitationsService.desactiverCircuitV2(circuit.id)
      : this.habilitationsService.activerCircuitV2(circuit.id);
    request$.subscribe({
      next: () => {
        this.notificationService.showSuccess('Statut modifie', 'Le statut du circuit a ete mis a jour');
        this.loadCircuits();
      },
      error: (err) => {
        const message = err?.error?.message || 'Impossible de modifier le statut du circuit';
        this.notificationService.showError('Erreur', message);
      }
    });
  }

  resetForm(): void {
    this.circuitForm = {
      nomCircuit: '',
      description: '',
      etapesIds: []
    };
    this.showCreateForm = false;
  }

  get selectedDepartementsOrdered(): BaDepartementDto[] {
    return this.circuitForm.etapesIds
      .map((id) => this.departements.find((d) => d.id === id))
      .filter((d): d is BaDepartementDto => !!d);
  }

  moveEtapeUp(index: number): void {
    if (index <= 0) return;
    const arr = this.circuitForm.etapesIds;
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
  }

  moveEtapeDown(index: number): void {
    const arr = this.circuitForm.etapesIds;
    if (index >= arr.length - 1) return;
    [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
  }

  removeEtapeFromOrder(id?: string): void {
    if (!id) return;
    this.circuitForm.etapesIds = this.circuitForm.etapesIds.filter((x) => x !== id);
  }

  assignCircuitToPlateforme(): void {
    if (!this.linkForm.plateformeId || !this.linkForm.circuitId) {
      this.notificationService.showWarning('Formulaire incomplet', 'Selectionnez une plateforme et un circuit.');
      return;
    }
    const plateforme = this.plateformes.find((p) => p.id === this.linkForm.plateformeId);
    if (!plateforme?.id) {
      this.notificationService.showError('Erreur', 'Plateforme introuvable.');
      return;
    }
    this.loading = true;
    this.habilitationsService.updatePlateforme(plateforme.id, {
      ...plateforme,
      idCircuit: this.linkForm.circuitId
    }).subscribe({
      next: () => {
        this.notificationService.showSuccess('Liaison reussie', 'Le circuit a ete assigne a la plateforme.');
        this.linkForm = { plateformeId: '', circuitId: '' };
        this.showLinkForm = false;
        this.loadCircuits();
        this.loading = false;
      },
      error: (err) => {
        const message = err?.error?.message || 'Impossible d\'assigner le circuit a la plateforme.';
        this.notificationService.showError('Erreur', message);
        this.loading = false;
      }
    });
  }

  get filteredCircuits(): CircuitDto[] {
    let filtered = this.circuits;

    if (this.searchTerm) {
      filtered = filtered.filter(circuit =>
        circuit.nomCircuit.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (circuit.plateformeNom || '').toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (this.selectedPlateforme) {
      filtered = filtered.filter(circuit => circuit.plateformeId === this.selectedPlateforme);
    }

    return filtered;
  }

  get activeCircuitsCount(): number {
    return this.circuits.filter((c) => c.statut === 'ACTIF').length;
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'ACTIF': return 'status--success';
      case 'INACTIF': return 'status--error';
      case 'EN_CONFIGURATION': return 'status--warning';
      default: return '';
    }
  }

  getEtapeCount(circuit: CircuitDto): number {
    return circuit.etapes.length;
  }

  getEtapeTargetLabel(etape: CircuitEtapeDto): string {
    if (etape.type === 'SERVICE') {
      return etape.nomService || etape.libelle || 'Etape';
    }
    return etape.nomDepartement || etape.libelle || 'Etape';
  }

  toggleEtapeSelection(etapeId: string): void {
    const index = this.circuitForm.etapesIds.indexOf(etapeId);
    if (index > -1) {
      this.circuitForm.etapesIds.splice(index, 1);
    } else {
      this.circuitForm.etapesIds.push(etapeId);
    }
  }

  goToWorkflow(): void {
    this.router.navigate(['/bacircuit-workflow']);
  }

  private mapCircuits(circuits: CircuitResponseDto[], plateformes: BaPlateformeDto[]): CircuitDto[] {
    const plateformeByCircuit = new Map<string, BaPlateformeDto>();
    plateformes.forEach((p) => {
      if (p.idCircuit) {
        plateformeByCircuit.set(p.idCircuit, p);
      }
    });

    return circuits.map((c) => {
      const plateforme = c.id ? plateformeByCircuit.get(c.id) : undefined;
      return {
        id: c.id,
        code: c.code,
        nomCircuit: c.libelle || '',
        plateformeId: plateforme?.id,
        plateformeNom: plateforme?.nom || 'Non assigne',
        etapes: (c.etapes || []).map((e) => ({
          id: e.id || '',
          idEtapeDefinition: e.departementId || e.serviceId || '',
          libelle: e.departementLibelle || e.serviceLibelle || 'Etape',
          type: e.type || (e.serviceId ? 'SERVICE' : 'DEPARTEMENT'),
          ordre: e.ordre || 0,
          nomDepartement: e.departementLibelle,
          nomService: e.serviceLibelle
        })),
        statut: c.statutCircuit || (c.actif ? 'ACTIF' : 'INACTIF'),
        actif: c.actif,
        description: c.description
      };
    });
  }
}
