# Workflow d'Habilitation BSIC

## Vue d'ensemble

Ce composant implémente le workflow complet d'habilitation tel que défini dans le backend bsic-service. Il permet de gérer l'ensemble du processus de validation des demandes d'habilitation.

## Workflow Implémenté

### 1. Définition des étapes (modèles de validation)
- **Création d'étapes** via `createEtapeDefinition`
- **Types d'étapes**: Département ou Service
- **Configuration**: Cible, libellé, fonction requise
- **Stockage**: Ces étapes servent de modèles pour les circuits

### 2. Création de la plateforme et des rôles
- **Plateforme**: Ex. "Windows", "Linux", "Applications"
- **Rôles**: Ex. "Utilisateur standard", "Administrateur"
- **Association**: Chaque rôle est lié à une plateforme

### 3. Liaison des étapes à la plateforme (circuit)
- **Configuration du circuit** via `updatePlateformeEtapesConfig`
- **Ordre obligatoire**: Définit la séquence de validation
- **Exemple**: DIT → DRH → DGA → DG
- **Unicité**: L'ordre est unique et obligatoire

### 4. Création de la fiche d'habilitation
- **Liaison compte + utilisateur** via `createFicheHabilitation`
- **Champs requis**: 
  - `idEmploye` (utilisateur bénéficiaire)
  - `idPlateformeRole` (compte/role demandé)
  - `motif`, `priorité`
- **Statut initial**: EN_COURS

### 5. Création des étapes de validation
#### Deux cas possibles :

**Cas 1: Étapes personnalisées**
- Toutes les étapes fournies sont obligatoires
- Aucune étape ne peut être sautée
- Validateurs spécifiés étape par étape

**Cas 2: Initialisation automatique**
- Le système initialise selon le circuit configuré
- Utilise `initEtapesFromPlateforme`
- Respecte l'ordre défini dans la plateforme

### 6. Processus de validation
- **Ordre séquentiel**: Les validations se font dans l'ordre
- **Contrôle d'accès**: Une étape ne peut être validée que si c'est l'étape courante
- **Statut global**: 
  - VALIDEE quand toutes les étapes sont validées
  - REJETEE en cas de rejet à une étape

## Architecture Technique

### Services

#### HabilitationWorkflowService
- **Gestion d'état**: BehaviorSubject pour les workflows
- **Configuration**: Gestion des configurations de plateforme
- **Validation**: Méthodes de validation/rejet
- **Synchronisation**: Rafraîchissement automatique des états

#### HabilitationsService
- **CRUD**: Opérations sur fiches, étapes, plateformes
- **Workflow**: Méthodes spécifiques au workflow
- **Configuration**: Gestion des circuits de validation

### Composants

#### HabilitationsWorkflowComponent
- **Mode création**: Nouvelle fiche avec workflow
- **Mode visualisation**: Suivi du workflow existant
- **Mode configuration**: Setup des circuits de validation
- **Interface responsive**: Adaptée mobile/desktop

## Fonctionnalités

### Interface Utilisateur

1. **Création de fiche**
   - Sélection employé/plateforme/rôle
   - Définition priorité/motif
   - Initialisation automatique du workflow

2. **Configuration de circuit**
   - Sélection plateforme
   - Choix et ordonnancement des étapes
   - Sauvegarde du circuit

3. **Visualisation du workflow**
   - Timeline des étapes
   - Barre de progression
   - Actions de validation/rejet
   - Historique des validations

4. **Validation d'étape**
   - Modal de confirmation
   - Commentaire obligatoire pour rejet
   - Mise à jour en temps réel

### États et Transitions

```
EN_COURS → VALIDEE (toutes les étapes validées)
EN_COURS → REJETEE (une étape rejetée)
EN_ATTENTE → VALIDE (validation étape)
EN_ATTENTE → REJETE (rejet étape)
```

### Notifications

- **Success**: Création, validation réussie
- **Warning**: Rejet d'étape
- **Error**: Erreur technique, validation échouée
- **Info**: Information de progression

## Sécurité

### Contrôles d'accès
- Validation rôle utilisateur
- Contrôle d'étape courante
- Autorisation par fonction requise

### Audit
- Historique complet des actions
- Timestamps de validation
- Commentaires de décision

## Integration Backend

### Endpoints utilisés

```typescript
// Étapes
POST /habilitations/etapes
PUT /habilitations/etapes/{id}
GET /habilitations/etapes

// Plateformes
POST /habilitations/plateformes
PUT /habilitations/plateformes/{id}
GET /habilitations/plateformes
PUT /habilitations/plateformes/{id}/etapes-config

// Fiches
POST /habilitations/fiches
GET /habilitations/fiches/{id}
POST /habilitations/fiches/{id}/etapes-from-plateforme
POST /habilitations/fiches/{id}/etapes-bulk

// Étapes de fiche
PUT /habilitations/fiches-etapes/{id}/status
GET /habilitations/fiches/{id}/etapes
GET /habilitations/fiches/{id}/workflow-status
```

## Performance

### Optimisations
- **Lazy loading**: Chargement à la demande
- **Caching**: BehaviorSubject pour état local
- **Parallel requests**: Création multiple d'étapes
- **Optimistic updates**: Mise à jour UI immédiate

### Responsive Design
- **Desktop**: Layout 2 colonnes
- **Tablette**: Adaptation intermédiaire
- **Mobile**: Interface verticale optimisée

## Utilisation

### Navigation
```typescript
// Créer nouvelle fiche
router.navigate(['/habilitations-workflow']);

// Voir workflow existant
router.navigate(['/habilitations-workflow', ficheId]);
```

### Configuration
```typescript
// Initialiser workflow
workflowService.initializeWorkflow(ficheId);

// Configurer circuit
workflowService.configurerCircuitPlateforme(plateformeId, etapesIds);
```

## Maintenance

### Logs
- Actions utilisateur
- Erreurs techniques
- Performances

### Monitoring
- Temps de validation
- Taux de rejet
- Progression globale

---

Ce workflow implémente une solution complète et professionnelle pour la gestion des habilitations BSIC, avec une interface moderne et une architecture robuste.
