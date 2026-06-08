# Guide de Configuration des Circuits de Validation BSIC

## Vue d'ensemble

Ce guide présente l'approche complète pour mettre en place des circuits de validation d'habilitation dans le système BSIC. Les circuits permettent de définir des workflows de validation personnalisés pour chaque plateforme.

## Architecture des Composants

### 1. BacircuitComponent (`/bacircuit`)
**Rôle**: Interface principale de gestion des circuits
- **Fonctionnalités**:
  - Liste des circuits existants
  - Création de nouveaux circuits
  - Filtrage et recherche
  - Actions rapides (configurer, dupliquer, supprimer)
- **Navigation**: `/bacircuit`

### 2. BacircuitConfigComponent (`/bacircuit-config`)
**Rôle**: Configuration détaillée des circuits
- **Fonctionnalités**:
  - Configuration des étapes de validation
  - Drag & drop pour l'ordonnancement
  - Templates prédéfinis
  - Test et validation des circuits
- **Navigation**: `/bacircuit-config/:id`

### 3. BacircuitWorkflowComponent (`/bacircuit-workflow`)
**Rôle**: Workflow guidé de mise en place
- **Fonctionnalités**:
  - Templates de workflow
  - Suivi de progression
  - Guide étape par étape
  - Actions contextuelles
- **Navigation**: `/bacircuit-workflow`

## Processus de Configuration Complète

### Étape 1: Accès à la Gestion des Circuits

1. **Navigation**:
   ```
   Menu principal → Habilitations → Circuits
   URL: /bacircuit
   ```

2. **Interface**:
   - Liste des circuits existants avec statut
   - Bouton "Nouveau Circuit"
   - Filtres par plateforme et recherche

### Étape 2: Création d'un Nouveau Circuit

#### Option A: Création Directe
1. Cliquer sur "Nouveau Circuit"
2. Remplir le formulaire:
   - **Nom du Circuit**: Ex: "Circuit Standard Windows"
   - **Plateforme**: Sélectionner la plateforme cible
   - **Description**: Optionnel mais recommandé
3. **Sélection des Étapes**:
   - Choisir les étapes de validation disponibles
   - Ordre chronologique important
   - Types: Département ou Service

#### Option B: Via Workflow Guidé
1. Cliquer sur "Workflow" dans le header
2. **Choisir un Template**:
   - **Simple**: 1h 15min, 2 étapes
   - **Standard**: 2h 30min, 5 étapes (recommandé)
   - **Complet**: 4h 00min, 5 étapes avancées
3. **Configurer le Workflow**:
   - Nom du circuit
   - Plateforme cible
   - Description

### Étape 3: Configuration Détaillée

1. **Accès**: `/bacircuit-config/:id` ou bouton "Configurer"
2. **Informations Générales**:
   - Nom et description
   - Plateforme associée
   - Statut (En configuration / Actif / Inactif)

3. **Configuration des Étapes**:
   - **Ajout**: Bouton "Ajouter une étape"
   - **Ordre**: Drag & drop ou flèches haut/bas
   - **Détails de chaque étape**:
     - Nom de l'étape
     - Type (Département/Service)
     - Fonction requise
     - Délai de validation (en jours)
     - Caractère obligatoire
     - Conditions spécifiques

4. **Templates Prédéfinis**:
   - **Circuit Standard**: DIT → DRH → DGA → DG
   - **Circuit Simple**: Manager → DRH
   - **Circuit Complet**: Employé → Manager → DIT → DRH → DGA → DG

### Étape 4: Test et Validation

1. **Test du Circuit**:
   - Bouton "Tester" dans la configuration
   - Simulation du workflow
   - Vérification des étapes

2. **Validation**:
   - Vérifier l'ordre des étapes
   - Confirmer les délais
   - Valider les conditions

### Étape 5: Activation

1. **Mise en Production**:
   - Changer le statut vers "Actif"
   - Sauvegarder la configuration
   - Notifier les utilisateurs

2. **Déploiement**:
   - Le circuit est disponible pour les fiches d'habilitation
   - Les nouvelles demandes suivent ce workflow

## Templates Disponibles

### Template Standard
- **Complexité**: Moyenne
- **Durée**: 2h 30min
- **Étapes**: 5
- **Idéal pour**: La plupart des plateformes standards
- **Workflow**: Analyse → Configuration étapes → Setup plateforme → Création rôles → Test

### Template Simple
- **Complexité**: Simple
- **Durée**: 1h 15min
- **Étapes**: 2
- **Idéal pour**: Petites équipes, besoins simples
- **Workflow**: Configuration rapide → Test simple

### Template Complet
- **Complexité**: Complexe
- **Durée**: 4h 00min
- **Étapes**: 5
- **Idéal pour**: Grandes organisations, besoins complexes
- **Workflow**: Audit complet → Configuration multi-niveaux → Intégration → Test complet → Formation

## Bonnes Pratiques

### 1. Planification
- **Analyser les besoins**: Comprendre le processus de validation existant
- **Identifier les acteurs**: Qui doit valider à chaque étape ?
- **Définir les délais**: Temps raisonnable pour chaque validation

### 2. Configuration
- **Ordre logique**: Du plus proche au plus loin hiérarchiquement
- **Étapes obligatoires**: Marquer les validations critiques
- **Conditions claires**: Spécifier quand une étape s'applique

### 3. Test
- **Scénarios de test**: Couvrir tous les cas possibles
- **Utilisateurs test**: Tester avec de vrais profils
- **Validation complète**: S'assurer que le workflow fonctionne

### 4. Maintenance
- **Surveillance**: Suivre les performances des circuits
- **Optimisation**: Ajuster les délais et conditions
- **Documentation**: Garder les configurations à jour

## Intégration Technique

### Services Backend
```typescript
// Services utilisés
HabilitationsService
- getPlateformes()
- getEtapes()
- updatePlateformeEtapesConfig()
- getEtapesByPlateforme()

NotificationService
- showSuccess()
- showError()
- showWarning()
```

### Modèles de Données
```typescript
interface CircuitDto {
  id?: string;
  nomCircuit: string;
  plateformeId: string;
  plateformeNom: string;
  etapes: CircuitEtapeDto[];
  statut: 'ACTIF' | 'INACTIF' | 'EN_CONFIGURATION';
}

interface EtapeConfigDto {
  id: string;
  idEtapeDefinition: string;
  ordre: number;
  libelle: string;
  type: 'DEPARTEMENT' | 'SERVICE';
  fonctionRequise?: string;
  delaiValidation?: number;
  obligatoire: boolean;
}
```

### Navigation
```typescript
// Routes principales
/bacircuit                    // Liste des circuits
/bacircuit-config/:id         // Configuration détaillée
/bacircuit-workflow           // Workflow guidé

// Routes liées
/habilitations-etapes         // Gestion des étapes
/habilitations-plateformes    // Gestion des plateformes
/habilitations-workflow       // Workflow d'habilitation
```

## Dépannage

### Problèmes Courants

1. **Circuit ne s'applique pas**
   - Vérifier que le statut est "Actif"
   - Confirmer que la plateforme est correcte
   - Redémarrer le workflow

2. **Ordre des étapes incorrect**
   - Utiliser le drag & drop pour réordonner
   - Sauvegarder après modification
   - Tester avec une nouvelle fiche

3. **Délais trop courts/longs**
   - Ajuster dans la configuration
   - Considérer la charge de travail
   - Prévoir des délais raisonnables

4. **Template ne s'applique pas**
   - Vérifier la compatibilité avec la plateforme
   - Adapter les étapes si nécessaire
   - Créer un circuit personnalisé

### Support Technique

- **Logs**: Consulter les logs du backend pour les erreurs
- **Notifications**: Vérifier les messages d'erreur dans l'interface
- **Documentation**: Référencer ce guide et la documentation technique

## Conclusion

La mise en place des circuits de validation BSIC est un processus structuré qui permet de créer des workflows adaptés aux besoins spécifiques de chaque organisation. En suivant ce guide et en utilisant les composants disponibles, vous pouvez configurer efficacement des circuits robustes et flexibles.

Pour toute question ou problème, n'hésitez pas à consulter l'équipe de support technique ou à référencer la documentation complète du système BSIC.
