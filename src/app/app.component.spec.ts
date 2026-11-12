import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import {provideHttpClient} from '@angular/common/http';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {FeatureService} from './services/feature.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideRouter([]), {provide:FeatureService,useValue:{load:()=>of({}),isEnabled:()=>false}}],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'bsic-frontend' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('bsic-frontend');
  });

  it('affiche le portail et le menu des demandes RH', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar__title')?.textContent).toContain('BSIC Burkina SA');
    expect(compiled.textContent).toContain("Autorisations d'absence");
  });

  it('affiche les modules DG et DGA à un administrateur même sans habilitations', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.currentUser = {roles: [{code: 'BA_ADMIN'}]};
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[href="/administration/dg"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[href="/administration/dga"]')).toBeTruthy();
  });

  it('masque les modules de création à un DGA sans rôle administrateur', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.currentUser = {fonction: 'DIRECTEUR_GENERAL_ADJOINT', roles: [{code: 'BA_DGA'}]};
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[href="/administration/dga"]')).toBeNull();
  });
  it('affiche le tableau de bord RH uniquement aux utilisateurs autorisés', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.currentUser = {roles: [{code: 'RH_CONSULTATION_ABSENCES'}]};
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[href="/reporting/rh-dashboard"]')).toBeTruthy();
    fixture.componentInstance.currentUser = {fonction: 'AGENT', roles: [{code: 'BA_CONNECT'}]};
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[href="/reporting/rh-dashboard"]')).toBeNull();
  });
  it('affiche le suivi uniquement lorsque le serveur autorise ce périmètre', () => {
    const fixture = TestBed.createComponent(AppComponent);fixture.componentInstance.currentUser = {roles: [{code: 'BA_ADMIN'}]};fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[href="/suivi-demandes"]')).toBeNull();
    fixture.componentInstance.suiviDemandesEnabled = true;fixture.detectChanges();expect(fixture.nativeElement.querySelector('[href="/suivi-demandes"]')).toBeTruthy();
    fixture.componentInstance.suiviDemandesEnabled = false;fixture.detectChanges();expect(fixture.nativeElement.querySelector('[href="/suivi-demandes"]')).toBeNull();
  });
  it('affiche le catalogue informatique indépendamment des habilitations selon le serveur', () => {
    const fixture = TestBed.createComponent(AppComponent);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[href="/informatique/plateformes"]')).toBeNull();
    fixture.componentInstance.plateformesEnabled = true;fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[href="/informatique/plateformes"]')).toBeTruthy();
  });
  it('affiche les extractions selon les capacités du serveur sans exiger le catalogue',()=>{
    const fixture=TestBed.createComponent(AppComponent);fixture.detectChanges();expect(fixture.nativeElement.querySelector('[href="/informatique/extractions"]')).toBeNull();fixture.componentInstance.extractionsEnabled=true;fixture.detectChanges();expect(fixture.nativeElement.querySelector('[href="/informatique/extractions"]')).toBeTruthy();expect(fixture.nativeElement.querySelector('[href="/informatique/plateformes"]')).toBeNull();
  });
});
