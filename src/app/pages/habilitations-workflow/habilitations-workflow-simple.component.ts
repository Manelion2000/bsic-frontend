import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { HabilitationsService, 
         BaFicheHabilitationDto,
         BaPlateformeDto,
         BaPlateformeRoleDto,
         BaEtapeDefinitionDto,
         BaFicheHabilitationEtapeDto
       } from '../../services/habilitations.service';
import { BaUserDto } from '../../services/annuaire.service';
import { UsersService } from '../../services/users.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-habilitations-workflow-simple',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habilitations-workflow-simple.component.html',
  styleUrl: './habilitations-workflow-simple.component.scss'
})
export class HabilitationsWorkflowSimpleComponent implements OnInit {
  ficheId: string | null = null;
  fiche: BaFicheHabilitationDto | null = null;
  etapes: BaFicheHabilitationEtapeDto[] = [];
  plateforme: BaPlateformeDto | null = null;
  role: BaPlateformeRoleDto | null = null;
  
  // Données pour les formulaires
  plateformes: BaPlateformeDto[] = [];
  roles: BaPlateformeRoleDto[] = [];
  employes: BaUserDto[] = [];
  etapesDefinitions: BaEtapeDefinitionDto[] = [];
  
  // Formulaire de création
  ficheForm: BaFicheHabilitationDto = {
    priorite: 'NORMALE',
    statutHabilitation: 'EN_COURS'
  };
  
  // Formulaire de validation
  validationForm: {
    etapeId: string;
    commentaire: string;
    action: 'VALIDER' | 'REJETER';
  } = {
    etapeId: '',
    commentaire: '',
    action: 'VALIDER'
  };
  
  // Formulaire de configuration de circuit
  circuitForm: {
    plateformeId: string;
    etapesIds: string[];
    nomCircuit: string;
  } = {
    plateformeId: '',
    etapesIds: [],
    nomCircuit: ''
  };
  
  // État
  loading = false;
  submitted = false;
  showCreateForm = false;
  showCircuitConfig = false;
  showValidationModal = false;
  selectedEtape: BaFicheHabilitationEtapeDto | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private habilitationsService: HabilitationsService,
    private usersService: UsersService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.ficheId = this.route.snapshot.paramMap.get('id');
    
    if (this.ficheId) {
      this.loadFicheData();
    } else {
      this.showCreateForm = true;
      this.loadReferences();
    }
  }

  // === CHARGEMENT DES DONNÉES ===
  
  loadFicheData(): void {
    if (!this.ficheId) return;
    
    this.loading = true;
    this.habilitationsService.getFicheById(this.ficheId).subscribe({
      next: (fiche) => {
        this.fiche = fiche;
        this.loadEtapesForFiche();
        this.loading = false;
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de charger la fiche d\'habilitation');
        this.loading = false;
      }
    });
  }

  loadEtapesForFiche(): void {
    if (!this.ficheId) return;
    
    this.habilitationsService.getFichesEtapes(this.ficheId).subscribe({
      next: (etapes) => {
        this.etapes = etapes.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de charger les étapes');
      }
    });
  }

  loadReferences(): void {
    this.habilitationsService.getPlateformes().subscribe({
      next: (plateformes) => {
        this.plateformes = plateformes || [];
      }
    });

    this.usersService.getUsers().subscribe({
      next: (employes) => {
        this.employes = employes || [];
      }
    });

    this.habilitationsService.getEtapes().subscribe({
      next: (etapes) => {
        this.etapesDefinitions = etapes || [];
      }
    });
  }

  loadRolesForPlateforme(): void {
    if (!this.ficheForm.idPlateformeRole) {
      this.roles = [];
      return;
    }
    
    // Extraire l'ID de la plateforme depuis le rôle sélectionné
    const selectedRole = this.roles.find(r => r.id === this.ficheForm.idPlateformeRole);
    if (selectedRole?.idPlateforme) {
      this.habilitationsService.getPlateformeRoles(selectedRole.idPlateforme).subscribe({
        next: (roles) => {
          this.roles = roles || [];
        }
      });
    }
  }

  // === CRÉATION DE FICHE ===
  
  createFiche(formRef: NgForm): void {
    this.submitted = true;
    if (formRef.invalid) {
      this.notificationService.showWarning('Formulaire invalide', 'Veuillez renseigner tous les champs obligatoires');
      return;
    }

    this.loading = true;
    this.habilitationsService.createFiche(this.ficheForm).subscribe({
      next: (fiche) => {
        this.notificationService.showSuccess('Fiche créée', `La fiche a été créée avec succès`);
        
        // Initialiser les étapes automatiquement
        this.habilitationsService.initEtapesFromPlateforme(fiche.id!).subscribe({
          next: () => {
            this.notificationService.showSuccess('Étapes initialisées', 'Les étapes de validation ont été créées automatiquement');
            this.router.navigate(['/habilitations-workflow', fiche.id]);
          },
          error: () => {
            this.notificationService.showError('Erreur', 'Erreur lors de l\'initialisation des étapes');
          }
        });
        
        this.loading = false;
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de créer la fiche d\'habilitation');
        this.loading = false;
      }
    });
  }

  // === CONFIGURATION DU CIRCUIT ===
  
  toggleCircuitConfig(): void {
    this.showCircuitConfig = !this.showCircuitConfig;
    if (this.showCircuitConfig) {
      this.loadCircuitData();
    }
  }

  loadCircuitData(): void {
    this.loadReferences();
  }

  toggleEtapeSelection(etapeId: string): void {
    const index = this.circuitForm.etapesIds.indexOf(etapeId);
    if (index > -1) {
      this.circuitForm.etapesIds.splice(index, 1);
    } else {
      this.circuitForm.etapesIds.push(etapeId);
    }
  }

  moveEtapeUp(index: number): void {
    if (index > 0) {
      const temp = this.circuitForm.etapesIds[index];
      this.circuitForm.etapesIds[index] = this.circuitForm.etapesIds[index - 1];
      this.circuitForm.etapesIds[index - 1] = temp;
    }
  }

  moveEtapeDown(index: number): void {
    if (index < this.circuitForm.etapesIds.length - 1) {
      const temp = this.circuitForm.etapesIds[index];
      this.circuitForm.etapesIds[index] = this.circuitForm.etapesIds[index + 1];
      this.circuitForm.etapesIds[index + 1] = temp;
    }
  }

  configurerCircuit(): void {
    if (!this.circuitForm.plateformeId || this.circuitForm.etapesIds.length === 0) {
      this.notificationService.showWarning('Configuration incomplète', 'Veuillez sélectionner une plateforme et au moins une étape');
      return;
    }

    this.loading = true;
    const etapesConfig = this.circuitForm.etapesIds.map((id, index) => ({ id, ordre: index + 1 }));
    
    this.habilitationsService.updatePlateformeEtapesConfig(this.circuitForm.plateformeId, etapesConfig).subscribe({
      next: () => {
        this.notificationService.showSuccess('Circuit configuré', `Le circuit "${this.circuitForm.nomCircuit}" a été configuré avec succès`);
        this.resetCircuitForm();
        this.loading = false;
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de configurer le circuit');
        this.loading = false;
      }
    });
  }

  resetCircuitForm(): void {
    this.circuitForm = {
      plateformeId: '',
      etapesIds: [],
      nomCircuit: ''
    };
    this.showCircuitConfig = false;
  }

  getEtapesSelectionnees(): BaEtapeDefinitionDto[] {
    return this.etapesDefinitions.filter(etape => this.circuitForm.etapesIds.includes(etape.id!));
  }

  // === VALIDATION DES ÉTAPES ===
  
  openValidationModal(etape: BaFicheHabilitationEtapeDto, action: 'VALIDER' | 'REJETER'): void {
    this.selectedEtape = etape;
    this.validationForm = {
      etapeId: etape.id!,
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
      ? this.habilitationsService.updateEtapeStatus(this.validationForm.etapeId, 'VALIDE', this.validationForm.commentaire)
      : this.habilitationsService.updateEtapeStatus(this.validationForm.etapeId, 'REJETE', this.validationForm.commentaire);

    action$.subscribe({
      next: () => {
        const actionText = this.validationForm.action === 'VALIDER' ? 'validée' : 'rejetée';
        this.notificationService.showSuccess('Étape ' + actionText, `L'étape a été ${actionText} avec succès`);
        this.closeValidationModal();
        this.loadFicheData(); // Recharger les données
        this.loading = false;
      },
      error: () => {
        this.notificationService.showError('Erreur', 'Impossible de mettre à jour cette étape');
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
      case 'EN_ATTENTE': return 'status--pending';
      case 'VALIDE': return 'status--success';
      case 'REJETE': return 'status--error';
      default: return '';
    }
  }

  getEtapeClass(etape: BaFicheHabilitationEtapeDto): string {
    if (etape.statutValidation === 'VALIDE') return 'etape--completed';
    if (etape.statutValidation === 'REJETE') return 'etape--rejected';
    if (this.isCurrentEtape(etape)) return 'etape--current';
    return 'etape--pending';
  }

  isCurrentEtape(etape: BaFicheHabilitationEtapeDto): boolean {
    const index = this.etapes.indexOf(etape);
    if (index === 0) return etape.statutValidation === 'EN_ATTENTE';
    
    const previousEtape = this.etapes[index - 1];
    return etape.statutValidation === 'EN_ATTENTE' && previousEtape.statutValidation === 'VALIDE';
  }

  canValidateEtape(etape: BaFicheHabilitationEtapeDto): boolean {
    return this.isCurrentEtape(etape);
  }

  getProgress(): number {
    if (this.etapes.length === 0) return 0;
    const completed = this.etapes.filter(e => e.statutValidation === 'VALIDE').length;
    return (completed / this.etapes.length) * 100;
  }

  // === NAVIGATION ===
  
  goToEtapes(): void {
    this.router.navigate(['/habilitations-etapes']);
  }

  goToPlateformes(): void {
    this.router.navigate(['/habilitations-plateformes']);
  }

  goToFiches(): void {
    this.router.navigate(['/habilitations-fiches']);
  }

  createNewFiche(): void {
    this.showCreateForm = true;
    this.fiche = null;
    this.ficheId = null;
    this.etapes = [];
    this.showCircuitConfig = false;
  }
}
