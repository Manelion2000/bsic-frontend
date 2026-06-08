import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  HabilitationsService,
  BaPlateformeDto,
  CircuitResponseDto,
  CircuitRequestDto
} from '../../services/habilitations.service';
import { NotificationService } from '../../services/notification.service';

export interface WorkflowStepDto {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'CURRENT' | 'SKIPPED';
  icon: string;
  type?: 'DEPARTEMENT' | 'SERVICE';
  targetId?: string;
  action?: string;
  completedAt?: string;
  estimatedTime?: string;
  prerequisites?: string[];
  nextSteps?: string[];
}

export interface CircuitWorkflowDto {
  id: string;
  nomCircuit: string;
  plateformeNom: string;
  steps: WorkflowStepDto[];
  currentStep: number;
  progress: number;
  estimatedTotalTime: string;
  startedAt?: string;
  completedAt?: string;
}

export interface WorkflowTemplateDto {
  id: string;
  nom: string;
  description: string;
  steps: WorkflowStepDto[];
  complexite: 'SIMPLE' | 'MOYENNE' | 'COMPLEXE';
  dureeEstimee: string;
  popularite: number;
  tags: string[];
}

@Component({
  selector: 'app-bacircuit-workflow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bacircuit-workflow.component.html',
  styleUrl: './bacircuit-workflow.component.scss'
})
export class BacircuitWorkflowComponent implements OnInit {
  workflows: CircuitWorkflowDto[] = [];
  templates: WorkflowTemplateDto[] = [];
  plateformes: BaPlateformeDto[] = [];
  currentWorkflow: CircuitWorkflowDto | null = null;

  loading = false;
  showTemplateSelector = false;
  showNewWorkflowForm = false;
  selectedTemplate: WorkflowTemplateDto | null = null;

  workflowForm: {
    nomCircuit: string;
    plateformeId: string;
    templateId: string;
    description: string;
  } = {
    nomCircuit: '',
    plateformeId: '',
    templateId: '',
    description: ''
  };

  constructor(
    private router: Router,
    private habilitationsService: HabilitationsService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
    this.loadReferences();
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.loading = true;
    forkJoin({
      plateformes: this.habilitationsService.getPlateformes(),
      circuits: this.habilitationsService.getCircuitsV2()
    }).subscribe({
      next: ({ plateformes, circuits }) => {
        this.workflows = this.mapWorkflows(circuits || [], plateformes || []);
        this.loading = false;
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de charger les workflows de circuits');
        this.loading = false;
      }
    });
  }

  loadTemplates(): void {
    this.templates = this.getMockTemplates();
  }

  loadReferences(): void {
    this.habilitationsService.getPlateformes().subscribe({
      next: (plateformes) => {
        this.plateformes = plateformes || [];
      }
    });
  }

  getMockTemplates(): WorkflowTemplateDto[] {
    return [
      {
        id: 'standard',
        nom: 'Circuit Standard',
        description: 'Workflow standard de mise en place',
        complexite: 'MOYENNE',
        dureeEstimee: '2h 30min',
        popularite: 85,
        tags: ['Standard', 'Validation'],
        steps: [
          { id: '1', title: 'Configurer les etapes', description: 'Definir les etapes de validation', status: 'PENDING', icon: 'layers', estimatedTime: '45 min' },
          { id: '2', title: 'Configurer la plateforme', description: 'Associer circuit et plateforme', status: 'PENDING', icon: 'settings', estimatedTime: '30 min' },
          { id: '3', title: 'Tester le circuit', description: 'Verifier le workflow', status: 'PENDING', icon: 'play-circle', estimatedTime: '15 min' }
        ]
      },
      {
        id: 'simple',
        nom: 'Circuit Simple',
        description: 'Workflow minimal',
        complexite: 'SIMPLE',
        dureeEstimee: '1h 15min',
        popularite: 70,
        tags: ['Simple', 'Rapide'],
        steps: [
          { id: '1', title: 'Configuration rapide', description: 'Creer et associer le circuit', status: 'PENDING', icon: 'zap', estimatedTime: '35 min' },
          { id: '2', title: 'Validation', description: 'Verifier le circuit', status: 'PENDING', icon: 'check', estimatedTime: '10 min' }
        ]
      }
    ];
  }

  selectTemplate(template: WorkflowTemplateDto): void {
    this.selectedTemplate = template;
    this.workflowForm.templateId = template.id;
    this.showTemplateSelector = false;
    this.showNewWorkflowForm = true;
  }

  createWorkflow(): void {
    if (!this.workflowForm.nomCircuit || !this.workflowForm.plateformeId) {
      this.notificationService.showWarning('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const plateforme = this.plateformes.find((p) => p.id === this.workflowForm.plateformeId);
    if (!plateforme?.id) {
      this.notificationService.showError('Erreur', 'Plateforme non trouvee');
      return;
    }

    const payload: CircuitRequestDto = {
      libelle: this.workflowForm.nomCircuit,
      description: this.workflowForm.description,
      actif: false
    };

    this.loading = true;
    this.habilitationsService.createCircuitV2(payload).subscribe({
      next: (created) => {
        if (!created.id) {
          this.notificationService.showError('Erreur', 'Creation du workflow echouee');
          this.loading = false;
          return;
        }
        this.habilitationsService.updatePlateforme(plateforme.id!, {
          ...plateforme,
          idCircuit: created.id
        }).subscribe({
          next: () => {
            this.notificationService.showSuccess('Workflow cree', `Le workflow "${this.workflowForm.nomCircuit}" a ete demarre`);
            this.resetForm();
            this.loadWorkflows();
            this.loading = false;
            this.router.navigate(['/bacircuit-config', created.id]);
          },
          error: () => {
            this.notificationService.showError('Erreur', 'Circuit cree, mais liaison plateforme impossible');
            this.loading = false;
          }
        });
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de creer le workflow');
        this.loading = false;
      }
    });
  }

  executeStep(_step: WorkflowStepDto): void {
    if (!this.currentWorkflow?.id) {
      this.notificationService.showWarning('Action indisponible', 'Workflow introuvable');
      return;
    }
    this.router.navigate(['/bacircuit-config', this.currentWorkflow.id]);
  }

  continueWorkflow(workflow: CircuitWorkflowDto): void {
    this.currentWorkflow = workflow;
    this.router.navigate(['/bacircuit-config', workflow.id]);
  }

  completeStep(workflow: CircuitWorkflowDto, stepIndex: number): void {
    const step = workflow.steps[stepIndex];
    step.status = 'COMPLETED';
    step.completedAt = new Date().toISOString();

    if (stepIndex < workflow.steps.length - 1) {
      workflow.currentStep = stepIndex + 1;
      workflow.steps[stepIndex + 1].status = 'CURRENT';
    } else {
      workflow.progress = 100;
      workflow.completedAt = new Date().toISOString();
      this.notificationService.showSuccess('Workflow termine', `Le circuit "${workflow.nomCircuit}" est pret`);
    }

    const completedSteps = workflow.steps.filter((s) => s.status === 'COMPLETED').length;
    workflow.progress = workflow.steps.length ? (completedSteps / workflow.steps.length) * 100 : 0;
  }

  pauseWorkflow(_workflow: CircuitWorkflowDto): void {
    this.notificationService.showInfo('Workflow en pause', 'Vous pouvez reprendre plus tard');
  }

  deleteWorkflow(workflow: CircuitWorkflowDto): void {
    if (!workflow.id) {
      return;
    }
    if (confirm(`Etes-vous sur de vouloir supprimer le workflow "${workflow.nomCircuit}" ?`)) {
      this.habilitationsService.deleteCircuitV2(workflow.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Workflow supprime', 'Le workflow a ete supprime');
          this.loadWorkflows();
        },
        error: () => this.notificationService.showError('Erreur', 'Impossible de supprimer le workflow')
      });
    }
  }

  duplicateWorkflow(workflow: CircuitWorkflowDto): void {
    const payload: CircuitRequestDto = {
      libelle: `${workflow.nomCircuit} (copie)`,
      description: `Copie de ${workflow.nomCircuit}`,
      actif: false
    };

    this.loading = true;
    this.habilitationsService.createCircuitV2(payload).subscribe({
      next: (created) => {
        if (!created.id) {
          this.notificationService.showError('Erreur', 'Impossible de dupliquer le workflow');
          this.loading = false;
          return;
        }

        const etapesPayload = workflow.steps
          .map((step, index) => ({
            type: step.type,
            departementId: step.type === 'DEPARTEMENT' ? (step.targetId || null) : null,
            serviceId: step.type === 'SERVICE' ? (step.targetId || null) : null,
            roleId: null,
            ordre: index + 1,
            obligatoire: true,
            actif: true
          }))
          .filter((e) => !!(e.departementId || e.serviceId));

        if (!etapesPayload.length) {
          this.notificationService.showSuccess('Workflow duplique', 'Le workflow a ete duplique sans etapes');
          this.loading = false;
          this.loadWorkflows();
          return;
        }

        this.habilitationsService.replaceCircuitEtapesV2(created.id, etapesPayload).subscribe({
          next: () => {
            this.notificationService.showSuccess('Workflow duplique', 'Le workflow a ete duplique');
            this.loading = false;
            this.loadWorkflows();
          },
          error: () => {
            this.notificationService.showError('Erreur', 'Workflow cree, mais duplication des etapes echouee');
            this.loading = false;
          }
        });
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de dupliquer le workflow');
        this.loading = false;
      }
    });
  }

  resetForm(): void {
    this.workflowForm = {
      nomCircuit: '',
      plateformeId: '',
      templateId: '',
      description: ''
    };
    this.showNewWorkflowForm = false;
    this.selectedTemplate = null;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'status--completed';
      case 'CURRENT': return 'status--current';
      case 'PENDING': return 'status--pending';
      case 'SKIPPED': return 'status--skipped';
      default: return '';
    }
  }

  getComplexityClass(complexite: string): string {
    switch (complexite) {
      case 'SIMPLE': return 'complexity--simple';
      case 'MOYENNE': return 'complexity--medium';
      case 'COMPLEXE': return 'complexity--complex';
      default: return '';
    }
  }

  getIconSvg(iconName: string): string {
    const icons: { [key: string]: string } = {
      'layers': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/>',
      'settings': '<circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M20.46 20.46l-4.24-4.24M1.54 20.46l4.24-4.24"/>',
      'users': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      'play-circle': '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
      'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
      'rocket': '<path d="M4.5 16.5c-1.5 1.5-1.5 4.5 0 6s4.5 1.5 6 0l10-10"/><path d="M13.5 6.5l6 6"/>',
      'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
      'check': '<polyline points="20 6 9 17 4 12"/>'
    };
    return icons[iconName] || icons['layers'];
  }

  goToCircuits(): void {
    this.router.navigate(['/bacircuit']);
  }

  private mapWorkflows(circuits: CircuitResponseDto[], plateformes: BaPlateformeDto[]): CircuitWorkflowDto[] {
    const plateformeByCircuitId = new Map<string, BaPlateformeDto>();
    (plateformes || []).forEach((p) => {
      if (p.idCircuit) {
        plateformeByCircuitId.set(p.idCircuit, p);
      }
    });

    return (circuits || []).map((circuit) => {
      const steps: WorkflowStepDto[] = (circuit.etapes || []).map((etape, index) => {
        const type = etape.type || (etape.serviceId ? 'SERVICE' : 'DEPARTEMENT');
        const targetName = type === 'SERVICE'
          ? (etape.serviceLibelle || 'Service')
          : (etape.departementLibelle || 'Departement');

        return {
          id: etape.id || `${index + 1}`,
          title: `${type} - ${targetName}`,
          description: `Etape ${index + 1} de validation`,
          status: circuit.actif ? 'COMPLETED' : (index === 0 ? 'CURRENT' : 'PENDING'),
          icon: type === 'SERVICE' ? 'users' : 'layers',
          type,
          targetId: type === 'SERVICE' ? etape.serviceId : etape.departementId,
          action: 'Configurer',
          estimatedTime: 'N/A'
        };
      });

      const completedCount = circuit.actif ? steps.length : 0;
      return {
        id: circuit.id || '',
        nomCircuit: circuit.libelle || 'Sans nom',
        plateformeNom: plateformeByCircuitId.get(circuit.id || '')?.nom || 'Non assigne',
        steps,
        currentStep: steps.length ? (circuit.actif ? Math.max(steps.length - 1, 0) : 0) : 0,
        progress: steps.length ? (completedCount / steps.length) * 100 : 0,
        estimatedTotalTime: `${steps.length} etape(s)`,
        startedAt: undefined,
        completedAt: circuit.actif ? new Date().toISOString() : undefined
      };
    });
  }
}
