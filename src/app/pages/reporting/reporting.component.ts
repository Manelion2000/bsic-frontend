import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportingService } from '../../services/reporting.service';

@Component({
  selector: 'app-reporting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporting.component.html',
  styleUrl: './reporting.component.scss'
})
export class ReportingComponent {
  ficheId = '';
  message = '';

  constructor(private reportingService: ReportingService) {}

  downloadProduits(): void {
    this.reportingService.reportProduits().subscribe({
      next: (blob) => this.saveBlob(blob, 'produits.pdf'),
      error: () => (this.message = 'Rapport produits non disponible dans le backend bsic-service actuel.')
    });
  }

  downloadFiche(): void {
    if (!this.ficheId) {
      this.message = 'Renseigner l\'id de la fiche.';
      return;
    }
    this.reportingService.reportFicheHabilitation(this.ficheId).subscribe({
      next: (blob) => this.saveBlob(blob, `fiche-${this.ficheId}.pdf`),
      error: () => (this.message = 'Erreur lors de la generation de la fiche.')
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
    this.message = `Telechargement lance: ${filename}`;
  }
}
