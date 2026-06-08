import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  HabilitationsService,
  BaPlateformeDto,
  CircuitEtapeRequestDto,
  CircuitRequestDto,
  CircuitResponseDto
} from '../../services/habilitations.service';
import { AnnuaireService, BaDepartementDto, BaServiceDto } from '../../services/annuaire.service';
import { NotificationService } from '../../services/notification.service';

export interface CircuitConfigDto {
  id?: string;
  nomCircuit: string;
  plateformeId: string;
  plateformeNom: string;
  description?: string;
  etapesConfig: EtapeConfigDto[];
  statut: 'ACTIF' | 'INACTIF' | 'EN_CONFIGURATION';
}

export interface EtapeConfigDto {
  id: string;
  idEtapeDefinition: string;
  ordre: number;
  libelle: string;
  type: 'DEPARTEMENT' | 'SERVICE';
  fonctionRequise?: string;
  nomDepartement?: string;
  nomService?: string;
  delaiValidation?: number;
  obligatoire: boolean;
  conditions?: string;
}

export interface CircuitTemplateDto {
  id: string;
  nom: string;
  description: string;
  etapes: EtapeConfigDto[];
  estParDefaut: boolean;
}

@Component({
  selector: 'app-bacircuit-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bacircuit-config.component.html',
  styleUrl: './bacircuit-config.component.scss'
})
export class BacircuitConfigComponent implements OnInit {
  circuitId: string | null = null;
  circuit: CircuitConfigDto | null = null;
  plateformes: BaPlateformeDto[] = [];
  departements: BaDepartementDto[] = [];
  services: BaServiceDto[] = [];
  templates: CircuitTemplateDto[] = [];

  loading = false;
  saving = false;
  showTemplateSelector = false;

  circuitForm: CircuitConfigDto = {
    nomCircuit: '',
    plateformeId: '',
    plateformeNom: '',
    description: '',
    etapesConfig: [],
    statut: 'EN_CONFIGURATION'
  };

  draggedEtape: EtapeConfigDto | null = null;
  draggedIndex = -1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private habilitationsService: HabilitationsService,
    private annuaireService: AnnuaireService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.circuitId = this.route.snapshot.paramMap.get('id');
    this.loadReferences();
    if (this.circuitId) {
      this.loadCircuit();
    } else {
      this.initNewCircuit();
    }
  }

  loadCircuit(): void {
    if (!this.circuitId) return;
    this.loading = true;
    forkJoin({
      circuit: this.habilitationsService.getCircuitByIdV2(this.circuitId),
      plateformes: this.habilitationsService.getPlateformes()
    }).subscribe({
      next: ({ circuit, plateformes }) => {
        const plateforme = (plateformes || []).find((p) => p.idCircuit === circuit.id);
        const mapped = this.toCircuitConfig(circuit, plateforme);
        this.circuit = mapped;
        this.circuitForm = { ...mapped };
        this.loading = false;
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de charger le circuit');
        this.loading = false;
      }
    });
  }

  initNewCircuit(): void {
    this.circuitForm = {
      nomCircuit: '',
      plateformeId: '',
      plateformeNom: '',
      description: '',
      etapesConfig: [],
      statut: 'EN_CONFIGURATION'
    };
  }

  loadReferences(): void {
    this.habilitationsService.getPlateformes().subscribe({
      next: (plateformes) => this.plateformes = plateformes || []
    });
    this.annuaireService.getDepartements().subscribe({
      next: (departements) => this.departements = departements || []
    });
    this.annuaireService.getServices().subscribe({
      next: (services) => this.services = services || []
    });
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.templates = [
      {
        id: 'standard',
        nom: 'Circuit Standard',
        description: 'DIT -> DRH -> DGA -> DG',
        estParDefaut: true,
        etapes: [
          { id: '1', idEtapeDefinition: '', ordre: 1, libelle: 'Validation DIT', type: 'DEPARTEMENT', obligatoire: true },
          { id: '2', idEtapeDefinition: '', ordre: 2, libelle: 'Validation DRH', type: 'DEPARTEMENT', obligatoire: true },
          { id: '3', idEtapeDefinition: '', ordre: 3, libelle: 'Validation DGA', type: 'DEPARTEMENT', obligatoire: true },
          { id: '4', idEtapeDefinition: '', ordre: 4, libelle: 'Validation DG', type: 'DEPARTEMENT', obligatoire: true }
        ]
      }
    ];
  }

  onPlateformeChange(): void {
    const plateforme = this.plateformes.find((p) => p.id === this.circuitForm.plateformeId);
    this.circuitForm.plateformeNom = plateforme?.nom || '';
  }

  addEtape(): void {
    this.circuitForm.etapesConfig.push({
      id: Date.now().toString(),
      idEtapeDefinition: '',
      ordre: this.circuitForm.etapesConfig.length + 1,
      libelle: `Etape ${this.circuitForm.etapesConfig.length + 1}`,
      type: 'DEPARTEMENT',
      delaiValidation: 7,
      obligatoire: true,
      conditions: ''
    });
  }

  getDefinitionsForEtape(etape: EtapeConfigDto): { id: string; label: string }[] {
    if (etape.type === 'SERVICE') {
      return this.services
        .filter((s) => !!s.id)
        .map((s) => ({ id: s.id!, label: this.getServiceLabel(s) }));
    }
    return this.departements
      .filter((d) => !!d.id)
      .map((d) => ({ id: d.id!, label: this.getDepartementLabel(d) }));
  }

  onEtapeTypeChange(etape: EtapeConfigDto): void {
    etape.idEtapeDefinition = '';
    etape.nomDepartement = undefined;
    etape.nomService = undefined;
    etape.libelle = `Etape ${etape.ordre}`;
  }

  removeEtape(index: number): void {
    this.circuitForm.etapesConfig.splice(index, 1);
    this.reorderEtapes();
  }

  reorderEtapes(): void {
    this.circuitForm.etapesConfig.forEach((etape, index) => etape.ordre = index + 1);
  }

  moveEtapeUp(index: number): void {
    if (index <= 0) return;
    const temp = this.circuitForm.etapesConfig[index];
    this.circuitForm.etapesConfig[index] = this.circuitForm.etapesConfig[index - 1];
    this.circuitForm.etapesConfig[index - 1] = temp;
    this.reorderEtapes();
  }

  moveEtapeDown(index: number): void {
    if (index >= this.circuitForm.etapesConfig.length - 1) return;
    const temp = this.circuitForm.etapesConfig[index];
    this.circuitForm.etapesConfig[index] = this.circuitForm.etapesConfig[index + 1];
    this.circuitForm.etapesConfig[index + 1] = temp;
    this.reorderEtapes();
  }

  onDragStart(event: DragEvent, etape: EtapeConfigDto, index: number): void {
    this.draggedEtape = etape;
    this.draggedIndex = index;
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    if (!this.draggedEtape || this.draggedIndex === targetIndex) return;
    const etapes = [...this.circuitForm.etapesConfig];
    const draggedEtape = etapes.splice(this.draggedIndex, 1)[0];
    etapes.splice(targetIndex, 0, draggedEtape);
    this.circuitForm.etapesConfig = etapes;
    this.reorderEtapes();
    this.draggedEtape = null;
    this.draggedIndex = -1;
  }

  applyTemplate(template: CircuitTemplateDto): void {
    this.circuitForm.etapesConfig = template.etapes.map((etape, index) => ({
      ...etape,
      id: `${Date.now()}-${index}`,
      ordre: index + 1
    }));
    this.showTemplateSelector = false;
    this.notificationService.showSuccess('Template applique', `Le template "${template.nom}" a ete applique`);
  }

  saveCircuit(): void {
    if (!this.circuitForm.nomCircuit) {
      this.notificationService.showWarning('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (this.circuitForm.etapesConfig.length === 0) {
      this.notificationService.showWarning('Circuit vide', 'Un circuit doit contenir au moins une etape');
      return;
    }
    if (this.circuitForm.etapesConfig.some((e) => !e.idEtapeDefinition)) {
      this.notificationService.showWarning('Etapes invalides', 'Chaque etape doit etre associee a un departement ou un service.');
      return;
    }

    this.saving = true;
    const payload: CircuitRequestDto = {
      libelle: this.circuitForm.nomCircuit,
      description: this.circuitForm.description,
      statutCircuit: this.circuitForm.statut,
      actif: this.circuitForm.statut === 'ACTIF'
    };

    const etapesPayload: CircuitEtapeRequestDto[] = this.circuitForm.etapesConfig.map((etape, index) => ({
      type: etape.type,
      departementId: etape.type === 'DEPARTEMENT' ? etape.idEtapeDefinition : null,
      serviceId: etape.type === 'SERVICE' ? etape.idEtapeDefinition : null,
      roleId: null,
      ordre: index + 1,
      obligatoire: etape.obligatoire,
      actif: true,
      fonctionRequise: etape.fonctionRequise || null,
      delaiValidationJours: etape.delaiValidation || null,
      conditions: etape.conditions || null
    }));
    payload.etapes = etapesPayload;

    const circuit$ = this.circuitId
      ? this.habilitationsService.updateCircuitV2(this.circuitId, payload)
      : this.habilitationsService.createCircuitV2(payload);

    circuit$.subscribe({
      next: () => {
        this.notificationService.showSuccess('Circuit sauvegarde', 'La configuration du circuit a ete sauvegardee avec succes');
        this.saving = false;
        this.router.navigate(['/bacircuit']);
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de sauvegarder le circuit');
        this.saving = false;
      }
    });
  }

  finalizeCircuit(): void {
    if (this.circuitForm.etapesConfig.length === 0) {
      this.notificationService.showWarning('Aucune etape', 'Ajoutez au moins une etape avant de finaliser.');
      return;
    }
    this.saveCircuit();
  }

  testCircuit(): void {
    if (!this.circuitId) {
      this.notificationService.showWarning('Circuit non sauvegarde', 'Sauvegardez le circuit avant de le tester.');
      return;
    }
    this.notificationService.showInfo('Test en cours', 'Verification du circuit de validation...');
    this.habilitationsService.testerCircuitV2(this.circuitId).subscribe({
      next: (valid) => {
        if (valid) {
          this.notificationService.showSuccess('Test reussi', 'Le circuit fonctionne correctement');
          return;
        }
        this.notificationService.showWarning('Circuit invalide', 'Verifiez les etapes, leurs ordres et leurs structures.');
      },
      error: () => this.notificationService.showError('Erreur', 'Impossible de tester le circuit')
    });
  }

  duplicateCircuit(): void {
    if (!this.circuitId) {
      this.notificationService.showWarning('Circuit non sauvegarde', 'Sauvegardez le circuit avant de le dupliquer.');
      return;
    }
    const nouveauNom = prompt('Nom du nouveau circuit', `${this.circuitForm.nomCircuit} - copie`);
    if (!nouveauNom?.trim()) {
      return;
    }
    this.habilitationsService.dupliquerCircuitV2(this.circuitId, nouveauNom.trim()).subscribe({
      next: (circuit) => {
        this.notificationService.showSuccess('Circuit duplique', 'Le nouveau circuit a ete cree en configuration.');
        this.router.navigate(['/bacircuit-config', circuit.id]);
      },
      error: () => this.notificationService.showError('Erreur', 'Impossible de dupliquer le circuit')
    });
  }

  exportCircuit(): void {
    const data = JSON.stringify(this.circuitForm, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.circuitForm.nomCircuit.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.notificationService.showSuccess('Export reussi', 'Le circuit a ete exporte');
  }

  getTypeClass(type: string): string {
    return type === 'DEPARTEMENT' ? 'type--departement' : 'type--service';
  }

  getStatutClass(statut: string): string {
    if (statut === 'ACTIF') return 'status--success';
    if (statut === 'INACTIF') return 'status--error';
    return 'status--warning';
  }

  goBack(): void {
    this.router.navigate(['/bacircuit']);
  }

  onEtapeDefinitionChange(etape: EtapeConfigDto): void {
    const definitions = this.getDefinitionsForEtape(etape);
    const def = definitions.find((e) => e.id === etape.idEtapeDefinition);
    if (etape.type === 'SERVICE') {
      etape.nomService = def?.label;
      etape.nomDepartement = undefined;
      etape.libelle = def?.label || etape.libelle;
      return;
    }
    etape.nomDepartement = def?.label;
    etape.nomService = undefined;
    etape.libelle = def?.label || etape.libelle;
  }

  private toCircuitConfig(circuit: CircuitResponseDto, plateforme?: BaPlateformeDto): CircuitConfigDto {
    return {
      id: circuit.id,
      nomCircuit: circuit.libelle || '',
      plateformeId: plateforme?.id || '',
      plateformeNom: plateforme?.nom || '',
      description: circuit.description,
      etapesConfig: (circuit.etapes || []).map((etape, index) => ({
        id: etape.id || `${index + 1}`,
        idEtapeDefinition: etape.departementId || etape.serviceId || '',
        ordre: etape.ordre || index + 1,
        libelle: etape.departementLibelle || etape.serviceLibelle || `Etape ${index + 1}`,
        type: etape.type || (etape.serviceId ? 'SERVICE' : 'DEPARTEMENT'),
        nomDepartement: etape.departementLibelle,
        nomService: etape.serviceLibelle,
        fonctionRequise: etape.fonctionRequise || undefined,
        delaiValidation: etape.delaiValidationJours || 7,
        obligatoire: etape.obligatoire ?? true,
        conditions: etape.conditions || ''
      })),
      statut: circuit.statutCircuit || (circuit.actif ? 'ACTIF' : 'INACTIF')
    };
  }

  private getDepartementLabel(dep: BaDepartementDto): string {
    return dep.nom || dep.code || dep.id || 'Departement';
  }

  private getServiceLabel(service: BaServiceDto): string {
    return service.nom || service.code || service.id || 'Service';
  }
}
