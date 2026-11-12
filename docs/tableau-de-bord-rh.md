# Tableau de bord RH

Le menu **Reporting → Tableau de bord RH** ouvre `/reporting/rh-dashboard`.
L'accès est accordé aux comptes ayant le rôle `RH_CONSULTATION_ABSENCES`, aux
administrateurs `BA_ADMIN`, au DG et aux DGA. Un administrateur peut attribuer le
rôle « Consultation des absences RH » depuis la gestion des utilisateurs.
Le contrôle est appliqué dans le menu, sur la route et sur les API, y compris les
exports. Ce rôle de consultation ne donne pas de droit de validation hiérarchique.

## Comptabilisation

- Les jours comptés sont les **jours calendaires**, dates de début et de fin incluses.
- Seules les demandes `VALIDEE` alimentent les totaux de jours et d'agents concernés.
- Les demandes en attente ont un décompte prévisionnel distinct. Les demandes
  rejetées et annulées restent consultables dans le registre.
- Seuls les jours compris dans la période sélectionnée entrent dans le total.
  Exemple : une absence du 30 janvier au 2 février représente quatre jours,
  dont deux en janvier et deux en février. Un filtre limité à février compte deux jours.
- Les jours sont cumulés par agent : deux agents absents une journée représentent
  deux jours d'absence. Les totaux par mois, département et agent correspondent au
  total général.
- Le taux de validation concerne les absences validées et rejetées ; les demandes
  en attente et annulées sont exclues de ce pourcentage.
- Les sorties sont suivies séparément, sans ajouter de jours aux absences.

Les filtres de période, département et service s'appliquent à tout le tableau de
bord. La recherche et le statut filtrent uniquement le registre et son export.
Le bilan par agent conserve le cumul de la période et de l'équipe sélectionnées.
Les exports CSV utilisent les mêmes filtres que la vue correspondante et sont
compatibles avec Excel. Une nouvelle période doit être actualisée avant l'export.

## API et mise en service

- `GET /api/rh-dashboard` : indicateurs, tendances, bilans et registre.
- `GET /api/rh-dashboard/export` : export CSV ; `type=ABSENCES`, `AGENTS`, `SORTIES` ou `TOUT`.
- Filtres communs : `debut`, `fin`, `idDepartement`, `idService`.
- Filtres du registre exporté : `statut`, `recherche`.

Redémarrer `bsic-service` avec les classes actualisées et reconstruire le frontend
pour la mise en service. Cette évolution réutilise les tables et le rôle RH déjà
présents ; elle n'ajoute pas de migration Flyway.

## Vérification

Le frontend est vérifié par `npm test -- --watch=false --browsers=ChromeHeadless`
et `npm run build`. Le backend comporte `RhDashboardServiceTest` ainsi que deux
tests `rhDashboard*` dans `RhCircuitPostgresApiTest`, qui vérifient les API et les
requêtes réelles dans un schéma PostgreSQL temporaire.

Les tests PostgreSQL utilisent les variables `BSIC_MIGRATION_TEST_URL`,
`BSIC_MIGRATION_TEST_USERNAME` et `BSIC_MIGRATION_TEST_PASSWORD`. Ils ne modifient
pas les données métier existantes.
