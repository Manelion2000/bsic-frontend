import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { HabilitationWorkflowService, 
         HabilitationWorkflow, 
         WorkflowStep, 
         WorkflowConfig,
         BaFicheHabilitationDto,
         BaPlateformeDto,
         BaPlateformeRoleDto,
         BaEtapeDefinitionDto,
         BaFicheHabilitationEtapeDto
       } from '../../services/habilitation-workflow.service';
import { HabilitationsService } from '../../services/habilitations.service';
import { AnnuaireService, BaUserDto } from '../../services/annuaire.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-habilitations-workflow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habilitations-workflow.component.html',
  styleUrl: './habilitations-workflow.component.scss'
})
export class HabilitationsWorkflowComponent implements OnInit, OnDestroy {
  ficheId: string | null = null;
  workflow$: Observable<HabilitationWorkflow> | null = null;
  config$: Observable<WorkflowConfig> | null = null;
  
  // Formulaire de création de fiche
  ficheForm: BaFicheHabilitationDto = {
    priorite: 'NORMALE',
    statutHabilitation: 'EN_COURS'
  };
  
  // Formulaire de configuration de circuit
  circuitForm: {
    plateformeId: string;
    etapesIds: string[];
  } = {
    plateformeId: '',
    etapesIds: []
  };
  
  // Formulaire de validation d'étape
  validationForm: {
    etapeId: string;
    commentaire: string;
    action: 'VALIDER' | 'REJETER';
  } = {
    etapeId: '',
    commentaire: '',
    action: 'VALIDER'
  };
  
  // État
  loading = false;
  submitted = false;
  showCreateForm = false;
  showCircuitConfig = false;
  showValidationModal = false;
  selectedEtape: WorkflowStep | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: HabilitationWorkflowService,
    private habilitationsService: HabilitationsService,
    private annuaireService: AnnuaireService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID de la fiche depuis l'URL
    this.ficheId = this.route.snapshot.paramMap.get('id');
    
    if (this.ficheId) {
      // Mode visualisation/modification du workflow
      this.workflow$ = this.workflowService.getWorkflow(this.ficheId);
    } else {
      // Mode création de nouvelle fiche
      this.showCreateForm = true;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // === GESTION DE LA FICHE ===
  
  createFiche(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.notificationService.showWarning('Formulaire invalide', 'Veuillez renseigner tous les champs obligatoires');
      return;
    }

    this.loading = true;
    this.workflowService.createFicheWithWorkflow(this.ficheForm).subscribe({
      next: (fiche) => {
        this.notificationService.showSuccess('Fiche créée', `La fiche pour ${fiche.nomCompletEmploye} a été créée avec succès`);
        this.router.navigate(['/habilitations-workflow', fiche.id]);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // === CONFIGURATION DU CIRCUIT ===
  
  toggleEtapeSelection(etapeId: string): void {
    const index = this.circuitForm.etapesIds.indexOf(etapeId);
    if (index > -1) {
      this.circuitForm.etapesIds.splice(index, 1);
    } else {
      this.circuitForm.etapesIds.push(etapeId);
    }
  }

  toggleCircuitConfig(): void {
    this.showCircuitConfig = !this.showCircuitConfig;
    if (this.showCircuitConfig) {
      this.loadCircuitConfig();
    }
  }

  loadCircuitConfig(): void {
    if (this.circuitForm.plateformeId) {
      this.config$ = this.workflowService.getWorkflowConfig(this.circuitForm.plateformeId);
    }
  }

  configurerCircuit(): void {
    if (!this.circuitForm.plateformeId || this.circuitForm.etapesIds.length === 0) {
      this.notificationService.showWarning('Configuration incomplète', 'Veuillez sélectionner une plateforme et au moins une étape');
      return;
    }

    this.loading = true;
    this.workflowService.configurerCircuitPlateforme(
      this.circuitForm.plateformeId, 
      this.circuitForm.etapesIds
    ).subscribe({
      next: () => {
        this.notificationService.showSuccess('Circuit configuré', 'Le circuit de validation a été configuré avec succès');
        this.loading = false;
        this.showCircuitConfig = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // === VALIDATION DES ÉTAPES ===
  
  openValidationModal(etape: WorkflowStep, action: 'VALIDER' | 'REJETER'): void {
    this.selectedEtape = etape;
    this.validationForm = {
      etapeId: etape.id,
      commentaire: '',
      action
    };
    this.showValidationModal = true;
  }

  closeValidationModal(): void {
    this.showValidationModal = false;
    this.selectedEtape = null;
    this.validationForm = { etapeId: '', commentaire: '', action: 'VALIDER' };
  }

  validerEtape(): void {
    if (!this.selectedEtape) return;

    this.loading = true;
    const action$ = this.validationForm.action === 'VALIDER'
      ? this.workflowService.validerEtape(this.validationForm.etapeId, this.validationForm.commentaire)
      : this.workflowService.rejeterEtape(this.validationForm.etapeId, this.validationForm.commentaire);

    action$.subscribe({
      next: () => {
        this.loading = false;
        this.closeValidationModal();
        // Le workflow sera automatiquement rafraîchi
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // === UTILITAIRES ===
  
  getStatutClass(statut: string): string {
    switch (statut) {
      case 'EN_COURS': return 'status--pending';
      case 'VALIDEE': return 'status--success';
      case 'REJETEE': return 'status--error';
      default: return '';
    }
  }

  getEtapeClass(etape: WorkflowStep): string {
    if (etape.isCompleted) return 'etape--completed';
    if (etape.isCurrent) return 'etape--current';
    return 'etape--pending';
  }

  getProgressColor(progress: number): string {
    if (progress === 100) return 'progress--success';
    if (progress > 0) return 'progress--warning';
    return 'progress--pending';
  }

  getPriorityClass(priorite?: string): string {
    switch (priorite) {
      case 'HAUTE': return 'priority--high';
      case 'BASSE': return 'priority--low';
      default: return 'priority--normal';
    }
  }

  // Navigation
  goToEtapes(): void {
    this.router.navigate(['/habilitations-etapes']);
  }

  goToPlateformes(): void {
    this.router.navigate(['/habilitations-plateformes']);
  }

  goToRoles(): void {
    this.router.navigate(['/habilitations-roles']);
  }

  goToFiches(): void {
    this.router.navigate(['/habilitations-fiches']);
  }
}
