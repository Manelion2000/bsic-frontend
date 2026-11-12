import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RhDemandesService,
  BaAutorisationSortieDto,
  BaAutorisationSortieRequestDto, RhCircuitDto
} from '../../services/rh-demandes.service';
import { AnnuaireService, BaAgenceDto, BaDepartementDto, BaServiceDto } from '../../services/annuaire.service';
import { BaUserDto, UsersService } from '../../services/users.service';
import {RhCircuitComponent} from '../../shared/rh-circuit/rh-circuit.component';
import {isAdministrator} from '../../services/administrator.guard';
import {extractErrorMessage} from '../../shared/error.utils';

@Component({
  selector: 'app-autorisation-sorties',
  standalone: true,
  imports: [CommonModule, FormsModule, RhCircuitComponent],
  templateUrl: './autorisation-sorties.component.html',
  styleUrl: './autorisation-sorties.component.scss'
})
export class AutorisationSortiesComponent implements OnInit {
  circuit?: RhCircuitDto;
  circuitLoading=false; circuitError='';
  get peutConfigurerCircuit(){return isAdministrator(this.currentUser || undefined);}
  busy = false;
  mesDemandes: BaAutorisationSortieDto[] = [];
  demandesAValider: BaAutorisationSortieDto[] = [];
  demandeSelectionnee: BaAutorisationSortieDto | null = null;
  directions: BaDepartementDto[] = [];
  services: BaServiceDto[] = [];
  agences: BaAgenceDto[] = [];
  currentUser: BaUserDto | null = null;
  message = '';

  form: BaAutorisationSortieRequestDto = {
    motif: '',
    dateSortie: '',
    typeStructure: 'DIRECTION'
  };

  constructor(
    private rhDemandesService: RhDemandesService,
    private annuaireService: AnnuaireService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.loadFormContext();
    this.reload();
  }

  loadFormContext(): void {
    this.loadCircuit();
    this.usersService.getUserWithMoreInfo().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.form.idDirection = user.idDepartement;
        this.form.idService = undefined;
        this.form.idAgence = undefined;
      },
      error: () => (this.message = 'Impossible de charger les informations utilisateur.')
    });

    this.annuaireService.getDepartements().subscribe({
      next: (data) => (this.directions = data || []),
      error: () => (this.message = 'Erreur chargement des directions.')
    });
    this.annuaireService.getServices().subscribe({
      next: (data) => (this.services = data || []),
      error: () => (this.message = 'Erreur chargement des services.')
    });
    this.annuaireService.getAgences().subscribe({
      next: (data) => (this.agences = data || []),
      error: () => (this.message = 'Erreur chargement des agences.')
    });
  }

  loadCircuit():void {
    if(this.circuitLoading || this.busy)return;
    this.circuitLoading=true;this.circuitError='';
    this.rhDemandesService.getCircuitApplicable('SORTIE').subscribe({next:c=>{this.circuit=c;this.circuitLoading=false;},error:e=>{this.circuit=undefined;this.circuitLoading=false;this.circuitError=extractErrorMessage(e,'Chargement du circuit impossible. Réessayez.');}});
  }

  reload(): void {
    this.rhDemandesService.getMesDemandesAutorisationSortie().subscribe({
      next: (data) => (this.mesDemandes = data || []),
      error: () => (this.message = 'Erreur chargement des demandes.')
    });
    this.rhDemandesService.getDemandesAutorisationSortieAValider().subscribe({
      next: (data) => (this.demandesAValider = data || []),
      error: () => (this.message = 'Erreur chargement des validations.')
    });
  }

  createDemande(): void {
    if (this.busy || this.circuitLoading || !this.circuit || this.circuit.blocage) return;
    if (!this.form.motif || !this.form.dateSortie || !this.form.typeStructure) {
      this.message = 'Motif, date et type de structure obligatoires.';
      return;
    }

    if (this.form.typeStructure === 'DIRECTION' && !this.form.idDirection) {
      this.message = 'Selectionnez une direction.';
      return;
    }
    if (this.form.typeStructure === 'SERVICE' && !this.form.idService) {
      this.message = 'Selectionnez un service.';
      return;
    }
    if (this.form.typeStructure === 'AGENCE' && !this.form.idAgence) {
      this.message = 'Selectionnez une agence.';
      return;
    }

    this.busy = true;
    this.rhDemandesService.createAutorisationSortie(this.form).subscribe({
      next: () => {
        this.busy = false;
        this.message = 'Demande envoyee.';
        this.form = {
          motif: '',
          dateSortie: '',
          typeStructure: 'DIRECTION',
          idDirection: this.currentUser?.idDepartement
        };
        this.reload();
      },
      error: e => {this.busy = false; this.message = e?.error?.message || e?.error?.detail || 'Erreur lors de la creation de la demande.';}
    });
  }

  onTypeStructureChange(): void {
    if (this.form.typeStructure === 'DIRECTION') {
      this.form.idService = undefined;
      this.form.idAgence = undefined;
      this.form.idDirection = this.currentUser?.idDepartement;
      return;
    }
    if (this.form.typeStructure === 'SERVICE') {
      this.form.idDirection = undefined;
      this.form.idAgence = undefined;
      this.form.idService = this.currentUser?.idService;
      return;
    }
    this.form.idDirection = undefined;
    this.form.idService = undefined;
    this.form.idAgence = this.currentUser?.idAgence;
  }

  valider(demande: BaAutorisationSortieDto): void {
    if (!demande.id || !demande.circuit?.peutDecider || this.busy) {
      return;
    }
    const commentaire = prompt('Commentaire de validation (facultatif) :');
    if (commentaire === null) {
      return;
    }
    this.busy = true;
    this.rhDemandesService.validerAutorisationSortie(demande.id, demande.circuit.etapeCourante, commentaire).subscribe({
      next: result => {
        this.busy = false;
        this.message = result.statutValidation === 'VALIDEE' ? 'Demande approuvée définitivement.' : 'Étape approuvée. La demande attend la validation suivante.';
        this.fermerDetails();
        this.reload();
      },
      error: e => {this.busy = false; this.message = e?.error?.message || e?.error?.detail || 'Validation impossible.'; this.reload();}
    });
  }

  rejeter(demande: BaAutorisationSortieDto): void {
    if (!demande.id || !demande.circuit?.peutDecider || this.busy) {
      return;
    }
    const commentaire = prompt('Motif du rejet:');
    if (!commentaire) {
      return;
    }
    this.busy = true;
    this.rhDemandesService.rejeterAutorisationSortie(demande.id, demande.circuit.etapeCourante, commentaire).subscribe({
      next: result => {
        this.busy = false;
        this.message = result.statutValidation === 'REJETEE' ? 'Demande rejetée.' : 'Refus enregistré. Les autres validateurs peuvent encore statuer.';
        this.fermerDetails();
        this.reload();
      },
      error: e => {this.busy = false; this.message = e?.error?.message || e?.error?.detail || 'Refus impossible.'; this.reload();}
    });
  }

  canProcessDemande(demande: BaAutorisationSortieDto): boolean {
    return demande.statutValidation === 'EN_ATTENTE'
      && demande.circuit?.peutDecider === true
      && this.demandesAValider.some((item) => item.id === demande.id);
  }

  ouvrirDetails(demande: BaAutorisationSortieDto): void {
    this.demandeSelectionnee = demande;
  }

  fermerDetails(): void {
    this.demandeSelectionnee = null;
  }

  telechargerPdf(id?: string): void {
    if (!id) {
      return;
    }
    this.rhDemandesService.downloadAutorisationSortiePdf(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `autorisation-sortie-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => (this.message = 'Erreur lors du telechargement du PDF.')
    });
  }

  visionnerPdf(id?: string): void {
    if (!id) {
      return;
    }
    this.rhDemandesService.downloadAutorisationSortiePdf(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 3000);
      },
      error: () => (this.message = 'Erreur lors de l ouverture du PDF.')
    });
  }
}
