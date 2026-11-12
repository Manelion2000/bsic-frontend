import { Routes } from '@angular/router';
import { habilitationsFeatureGuard } from './services/feature.service';
import { authGuard, passwordChangeGuard } from './services/auth.guard';
import { administratorGuard } from './services/administrator.guard';
import { rhReportingGuard } from './services/rh-reporting.guard';
import {processusManagerGuard} from './services/processus.service';
import {congesRhGuard} from './services/conges.service';
import {suiviDemandesGuard} from './services/suivi-demandes.service';
import {plateformesGuard} from './services/plateformes.service';
import {extractionsGuard} from './services/extractions.service';

export const routes: Routes = [
  { path: 'mon-compte/signature', loadComponent: () => import('./pages/ma-signature/ma-signature.component').then(m => m.MaSignatureComponent), canActivate: [authGuard] },
  { path: '', loadComponent: () => import('./pages/annuaire-global/annuaire-global.component').then(m => m.AnnuaireGlobalComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'changer-mot-de-passe',loadComponent:()=>import('./pages/password-change/password-change.component').then(m=>m.PasswordChangeComponent),canActivate:[passwordChangeGuard] },
  { path: 'annuaire-public', loadComponent: () => import('./pages/annuaire-global/annuaire-global.component').then(m => m.AnnuaireGlobalComponent) },
  { path: 'demarches', loadComponent: () => import('./pages/processus/processus.component').then(m => m.ProcessusComponent), canActivate: [authGuard] },
  { path: 'suivi-demandes', loadComponent: () => import('./pages/suivi-demandes/suivi-demandes.component').then(m => m.SuiviDemandesComponent), canActivate: [authGuard, suiviDemandesGuard] },
  { path: 'circuits', loadComponent: () => import('./pages/processus/processus.component').then(m => m.ProcessusComponent), data: {studio: true}, canActivate: [authGuard, processusManagerGuard] },
  { path: 'users', loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent), canActivate: [authGuard] },
  { path: 'administration/dg', loadComponent: () => import('./pages/direction-generale/direction-generale.component').then(m => m.DirectionGeneraleComponent), data: {kind: 'dg'}, canActivate: [authGuard, administratorGuard] },
  { path: 'administration/dga', loadComponent: () => import('./pages/direction-generale/direction-generale.component').then(m => m.DirectionGeneraleComponent), data: {kind: 'dga'}, canActivate: [authGuard, administratorGuard] },
  { path: 'roles', loadComponent: () => import('./pages/roles/roles.component').then(m => m.RolesComponent), canActivate: [authGuard, administratorGuard] },
  { path: 'profils', loadComponent: () => import('./pages/profils/profils.component').then(m => m.ProfilsComponent), canActivate: [authGuard, administratorGuard] },
  { path: 'annuaire/services', loadComponent: () => import('./pages/annuaire-services/annuaire-services.component').then(m => m.AnnuaireServicesComponent), canActivate: [authGuard] },
  { path: 'annuaire/departements', loadComponent: () => import('./pages/annuaire-departements/annuaire-departements.component').then(m => m.AnnuaireDepartementsComponent), canActivate: [authGuard] },
  { path: 'annuaire/agences', loadComponent: () => import('./pages/annuaire-agences/annuaire-agences.component').then(m => m.AnnuaireAgencesComponent), canActivate: [authGuard] },
  { path: 'annuaire/employes', loadComponent: () => import('./pages/annuaire-employes/annuaire-employes.component').then(m => m.AnnuaireEmployesComponent), canActivate: [authGuard, administratorGuard] },
  { path: 'annuaire/annuaire', loadComponent: () => import('./pages/annuaire-global/annuaire-global.component').then(m => m.AnnuaireGlobalComponent), canActivate: [authGuard] },
  { path: 'informatique/plateformes', loadComponent: () => import('./pages/plateformes-catalogue/plateformes-catalogue.component').then(m => m.PlateformesCatalogueComponent), canActivate: [authGuard, plateformesGuard] },
  { path: 'informatique/extractions', loadComponent: () => import('./pages/extractions/extractions.component').then(m => m.ExtractionsComponent), canActivate: [authGuard, extractionsGuard] },
  { path: 'informatique/plateformes/:id', loadComponent: () => import('./pages/plateformes-catalogue/plateformes-catalogue.component').then(m => m.PlateformesCatalogueComponent), canActivate: [authGuard, plateformesGuard] },
  { path: 'habilitations/plateformes', redirectTo: 'informatique/plateformes', pathMatch: 'full' },
  { path: 'habilitations/fiches', loadComponent: () => import('./pages/habilitations-fiches/habilitations-fiches.component').then(m => m.HabilitationsFichesComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'habilitations/validations', loadComponent: () => import('./pages/habilitations-validations/habilitations-validations.component').then(m => m.HabilitationsValidationsComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'habilitations/comptes', loadComponent: () => import('./pages/habilitations-comptes/habilitations-comptes.component').then(m => m.HabilitationsComptesComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'habilitations/reinitialisations-comptes', loadComponent: () => import('./pages/reinitialisations-comptes/reinitialisations-comptes.component').then(m => m.ReinitialisationsComptesComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'habilitations/statistiques-plateformes', loadComponent: () => import('./pages/plateformes-dashboard/plateformes-dashboard.component').then(m => m.PlateformesDashboardComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'habilitations/suivi-plateformes', loadComponent: () => import('./pages/plateformes-suivi/plateformes-suivi.component').then(m => m.PlateformesSuiviComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'habilitations/delegations-validation', loadComponent: () => import('./pages/validation-delegations/validation-delegations.component').then(m => m.ValidationDelegationsComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'habilitations/dga-poles', loadComponent: () => import('./pages/dga-pole-validateurs/dga-pole-validateurs.component').then(m => m.DgaPoleValidateursComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'habilitations-workflow', loadComponent: () => import('./pages/habilitations-workflow/habilitations-workflow-simple.component').then(m => m.HabilitationsWorkflowSimpleComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'bacircuit', loadComponent: () => import('./pages/bacircuit/bacircuit.component').then(m => m.BacircuitComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'bacircuit-config', loadComponent: () => import('./pages/bacircuit-config/bacircuit-config.component').then(m => m.BacircuitConfigComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'bacircuit-config/:id', loadComponent: () => import('./pages/bacircuit-config/bacircuit-config.component').then(m => m.BacircuitConfigComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'bacircuit-workflow', loadComponent: () => import('./pages/bacircuit-workflow/bacircuit-workflow.component').then(m => m.BacircuitWorkflowComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'autorisation-sorties', loadComponent: () => import('./pages/autorisation-sorties/autorisation-sorties.component').then(m => m.AutorisationSortiesComponent), canActivate: [authGuard] },
  { path: 'conges', loadComponent: () => import('./pages/conges/conges.component').then(m => m.CongesComponent), canActivate: [authGuard] },
  { path: 'conges/rh', loadComponent: () => import('./pages/conges-rh/conges-rh.component').then(m => m.CongesRhComponent), canActivate: [authGuard, congesRhGuard] },
  { path: 'reprises-service', loadComponent: () => import('./pages/reprises-service/reprises-service.component').then(m => m.ReprisesServiceComponent), canActivate: [authGuard] },
  { path: 'autorisations-absence', loadComponent: () => import('./pages/autorisations-absence/autorisations-absence.component').then(m => m.AutorisationsAbsenceComponent), canActivate: [authGuard] },
  { path: 'reporting/rh-dashboard', loadComponent: () => import('./pages/rh-dashboard/rh-dashboard.component').then(m => m.RhDashboardComponent), canActivate: [authGuard, rhReportingGuard] },
  { path: 'reunions', loadComponent: () => import('./pages/reunions/reunions.component').then(m => m.ReunionsComponent), canActivate: [authGuard] },
  { path: 'reporting', loadComponent: () => import('./pages/reporting/reporting.component').then(m => m.ReportingComponent), canActivate: [authGuard, habilitationsFeatureGuard] },
  { path: 'reporting/autorisations-statistiques', loadComponent: () => import('./pages/autorisations-stats/autorisations-stats.component').then(m => m.AutorisationsStatsComponent), canActivate: [authGuard] },
  { path: 'reporting/autorisations-suivi', loadComponent: () => import('./pages/autorisations-suivi/autorisations-suivi.component').then(m => m.AutorisationsSuiviComponent), canActivate: [authGuard] },
  { path: 'reporting/reprises-statistiques', loadComponent: () => import('./pages/reprises-stats/reprises-stats.component').then(m => m.ReprisesStatsComponent), canActivate: [authGuard] },
  { path: 'reporting/reprises-suivi', loadComponent: () => import('./pages/reprises-suivi/reprises-suivi.component').then(m => m.ReprisesSuiviComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
