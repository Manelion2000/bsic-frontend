import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { HabilitationsService, 
         BaEtapeDefinitionDto, 
         BaPlateformeDto, 
         BaPlateformeRoleDto, 
         BaFicheHabilitationDto, 
         BaFicheHabilitationEtapeDto 
       } from './habilitations.service';
import { BaUserDto } from './annuaire.service';
import { UsersService } from './users.service';
import { NotificationService } from '../services/notification.service';

export interface WorkflowStep {
  id: string;
  type: 'DEPARTEMENT' | 'SERVICE';
  libelle: string;
  fonctionRequise?: string;
  targetId?: string;
  targetName?: string;
  ordre: number;
  isCompleted: boolean;
  isCurrent: boolean;
  canValidate: boolean;
  validator?: BaUserDto;
  status: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  dateValidation?: string;
  commentaire?: string;
}

export interface HabilitationWorkflow {
  fiche: BaFicheHabilitationDto;
  plateforme: BaPlateformeDto;
  role: BaPlateformeRoleDto;
  etapes: WorkflowStep[];
  currentEtape?: WorkflowStep;
  progress: number;
  canValidateCurrent: boolean;
  canRejeter: boolean;
  statutGlobal: 'EN_COURS' | 'VALIDEE' | 'REJETEE';
}

export interface WorkflowConfig {
  etapes: BaEtapeDefinitionDto[];
  plateforme: BaPlateformeDto;
  availableRoles: BaPlateformeRoleDto[];
  availableUsers: BaUserDto[];
}

@Injectable({
  providedIn: 'root'
})
export class HabilitationWorkflowService {
  private workflows = new Map<string, BehaviorSubject<HabilitationWorkflow>>();
  private configs = new Map<string, BehaviorSubject<WorkflowConfig>>();

  constructor(
    private habilitationsService: HabilitationsService,
    private usersService: UsersService,
    private notificationService: NotificationService
  ) {}

  // Initialiser le workflow pour une fiche
  initializeWorkflow(ficheId: string): Observable<HabilitationWorkflow> {
    if (!this.workflows.has(ficheId)) {
      this.workflows.set(ficheId, new BehaviorSubject<HabilitationWorkflow>({} as HabilitationWorkflow));
    }

    return combineLatest([
      this.habilitationsService.getFicheById(ficheId),
      this.loadEtapesForFiche(ficheId)
    ]).pipe(
      map(([fiche, etapes]) => this.buildWorkflow(fiche, etapes)),
      tap(workflow => {
        this.workflows.get(ficheId)?.next(workflow);
      }),
      catchError(error => {
        this.notificationService.showError('Erreur workflow', 'Impossible de charger le workflow d\'habilitation');
        return throwError(() => error);
      })
    );
  }

  // Obtenir le workflow d'une fiche
  getWorkflow(ficheId: string): Observable<HabilitationWorkflow> {
    if (!this.workflows.has(ficheId)) {
      return this.initializeWorkflow(ficheId);
    }
    return this.workflows.get(ficheId)!.asObservable();
  }

  // Initialiser la configuration pour une plateforme
  initializeWorkflowConfig(plateformeId: string): Observable<WorkflowConfig> {
    if (!this.configs.has(plateformeId)) {
      this.configs.set(plateformeId, new BehaviorSubject<WorkflowConfig>({} as WorkflowConfig));
    }

    return combineLatest([
      this.habilitationsService.getPlateformes().pipe(
        map(plateformes => plateformes.find(p => p.id === plateformeId))
      ),
      this.habilitationsService.getEtapesByPlateforme(plateformeId),
      this.habilitationsService.getPlateformeRoles(plateformeId),
      this.usersService.getUsers()
    ]).pipe(
      map(([plateforme, etapes, roles, users]) => ({
        plateforme: plateforme || {} as BaPlateformeDto,
        etapes: etapes, // Toutes les étapes disponibles
        availableRoles: roles || [],
        availableUsers: users || []
      })),
      tap(config => {
        this.configs.get(plateformeId)?.next(config);
      }),
      catchError(error => {
        this.notificationService.showError('Erreur configuration', 'Impossible de charger la configuration du workflow');
        return throwError(() => error);
      })
    );
  }

  // Obtenir la configuration d'une plateforme
  getWorkflowConfig(plateformeId: string): Observable<WorkflowConfig> {
    if (!this.configs.has(plateformeId)) {
      return this.initializeWorkflowConfig(plateformeId);
    }
    return this.configs.get(plateformeId)!.asObservable();
  }

  // Créer une nouvelle fiche avec workflow
  createFicheWithWorkflow(fiche: BaFicheHabilitationDto, etapes?: BaFicheHabilitationEtapeDto[]): Observable<BaFicheHabilitationDto> {
    return this.habilitationsService.createFiche(fiche).pipe(
      switchMap(createdFiche => {
        if (etapes && etapes.length > 0) {
          // Créer les étapes personnalisées
          return this.createEtapesForFiche(createdFiche.id!, etapes).pipe(
            map(() => createdFiche)
          );
        } else {
          // Initialiser les étapes depuis la plateforme
          return this.habilitationsService.initEtapesFromPlateforme(createdFiche.id!).pipe(
            map(() => createdFiche)
          );
        }
      }),
      tap(fiche => {
        this.notificationService.showSuccess('Fiche créée', 'La fiche d\'habilitation et son workflow ont été créés avec succès');
      }),
      catchError(error => {
        this.notificationService.showError('Erreur création', 'Impossible de créer la fiche d\'habilitation');
        return throwError(() => error);
      })
    );
  }

  // Valider une étape
  validerEtape(etapeId: string, commentaire?: string): Observable<BaFicheHabilitationEtapeDto> {
    return this.habilitationsService.updateEtapeStatus(etapeId, 'VALIDE', commentaire).pipe(
      tap(() => {
        this.notificationService.showSuccess('Étape validée', 'L\'étape a été validée avec succès');
        // Mettre à jour le workflow
        this.refreshWorkflowForEtape(etapeId);
      }),
      catchError(error => {
        this.notificationService.showError('Erreur validation', 'Impossible de valider cette étape');
        return throwError(() => error);
      })
    );
  }

  // Rejeter une étape
  rejeterEtape(etapeId: string, commentaire: string): Observable<BaFicheHabilitationEtapeDto> {
    return this.habilitationsService.updateEtapeStatus(etapeId, 'REJETE', commentaire).pipe(
      tap(() => {
        this.notificationService.showWarning('Étape rejetée', 'L\'étape a été rejetée. Le workflow est terminé.');
        // Mettre à jour le workflow
        this.refreshWorkflowForEtape(etapeId);
      }),
      catchError(error => {
        this.notificationService.showError('Erreur rejet', 'Impossible de rejeter cette étape');
        return throwError(() => error);
      })
    );
  }

  // Configurer le circuit d'une plateforme
  configurerCircuitPlateforme(plateformeId: string, etapesIds: string[]): Observable<void> {
    // Trier les étapes par ordre
    const etapesOrdonnees = etapesIds.map((id, index) => ({ id, ordre: index + 1 }));
    
    return this.habilitationsService.updatePlateformeEtapesConfig(plateformeId, etapesOrdonnees).pipe(
      tap(() => {
        this.notificationService.showSuccess('Circuit configuré', 'Le circuit de validation a été configuré avec succès');
      }),
      catchError(error => {
        this.notificationService.showError('Erreur configuration', 'Impossible de configurer le circuit de validation');
        return throwError(() => error);
      })
    );
  }

  // Méthodes privées
  private loadEtapesForFiche(ficheId: string): Observable<BaFicheHabilitationEtapeDto[]> {
    return this.habilitationsService.getFichesEtapes(ficheId);
  }

  private createEtapesForFiche(ficheId: string, etapes: BaFicheHabilitationEtapeDto[]): Observable<BaFicheHabilitationEtapeDto[]> {
    return this.habilitationsService.createEtapesForFiche(ficheId, etapes);
  }

  private buildWorkflow(fiche: BaFicheHabilitationDto, etapes: BaFicheHabilitationEtapeDto[]): HabilitationWorkflow {
    const etapesTriees = etapes.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    
    const workflowSteps: WorkflowStep[] = etapesTriees.map((etape, index) => ({
      id: etape.id!,
      type: etape.typeEtape!,
      libelle: etape.fonctionRequise || `Étape ${index + 1}`,
      fonctionRequise: etape.fonctionRequise,
      targetId: etape.idDepartement || etape.idService,
      targetName: etape.nomDepartement || etape.nomService,
      ordre: etape.ordre || index + 1,
      isCompleted: etape.statutValidation === 'VALIDE',
      isCurrent: etape.statutValidation === 'EN_ATTENTE' && 
                 (index === 0 || etapesTriees[index - 1].statutValidation === 'VALIDE'),
      canValidate: etape.statutValidation === 'EN_ATTENTE' && 
                  (index === 0 || etapesTriees[index - 1].statutValidation === 'VALIDE'),
      validator: etape.idValidateur ? {
        id: etape.idValidateur,
        nomComplet: etape.nomCompletValidateur
      } as BaUserDto : undefined,
      status: etape.statutValidation!,
      dateValidation: etape.dateValidation,
      commentaire: etape.commentaire
    }));

    const currentEtape = workflowSteps.find(step => step.isCurrent);
    const completedSteps = workflowSteps.filter(step => step.isCompleted).length;
    const progress = workflowSteps.length > 0 ? (completedSteps / workflowSteps.length) * 100 : 0;

    return {
      fiche,
      plateforme: { 
        id: '', 
        code: fiche.nomPlateforme || '', 
        nom: fiche.nomPlateforme || '' 
      } as BaPlateformeDto,
      role: { 
        id: fiche.idPlateformeRole || '', 
        nom: fiche.nomRole || '', 
        niveauAcces: '', 
        idPlateforme: '', 
        nomPlateforme: fiche.nomPlateforme || '' 
      } as BaPlateformeRoleDto,
      etapes: workflowSteps,
      currentEtape,
      progress,
      canValidateCurrent: currentEtape?.canValidate || false,
      canRejeter: currentEtape?.canValidate || false,
      statutGlobal: fiche.statutHabilitation || 'EN_COURS'
    };
  }

  private refreshWorkflowForEtape(etapeId: string): void {
    // Trouver la fiche associée à cette étape et rafraîchir le workflow
    this.workflows.forEach((workflow$, ficheId) => {
      workflow$.subscribe(workflow => {
        const etapeInWorkflow = workflow.etapes.find(e => e.id === etapeId);
        if (etapeInWorkflow) {
          this.initializeWorkflow(ficheId).subscribe();
        }
      });
    });
  }
}
