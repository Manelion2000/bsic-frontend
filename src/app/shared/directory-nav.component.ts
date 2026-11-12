import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-directory-nav', standalone: true, imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `<nav aria-label="Espaces de l’annuaire">
    <a routerLink="/annuaire/annuaire" routerLinkActive="active">Contacts</a>
    <a routerLink="/annuaire/departements" routerLinkActive="active">Départements</a>
    <a routerLink="/annuaire/services" routerLinkActive="active">Services</a>
    <a routerLink="/annuaire/agences" routerLinkActive="active">Agences</a>
    <a *ngIf="management" routerLink="/annuaire/employes" routerLinkActive="active">Gestion des collaborateurs</a>
  </nav>`,
  styles: [`:host{display:block}nav{display:flex;gap:.35rem;flex-wrap:wrap;border-bottom:1px solid #dce6e4;padding-bottom:.6rem}a{font-size:.87rem;text-decoration:none;color:#526a72;padding:.65rem .9rem;border-radius:8px;font-weight:600}a:hover{background:#f1f6f4}a.active{background:#e4f2eb;color:#006b53}a:focus-visible{outline:3px solid #007565;outline-offset:2px}`]
})
export class DirectoryNavComponent { @Input() management = false; }
