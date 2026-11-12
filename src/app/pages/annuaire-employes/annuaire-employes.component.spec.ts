import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgForm } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { AnnuaireEmployesComponent } from './annuaire-employes.component';
import { AnnuaireService } from '../../services/annuaire.service';
import { UsersService } from '../../services/users.service';
describe('AnnuaireEmployesComponent',()=>{
  let api:jasmine.SpyObj<UsersService>;
  beforeEach(async()=>{api=jasmine.createSpyObj('UsersService',['getUsers','createUser','updateUser','deleteUser']);api.getUsers.and.returnValue(of([]));api.createUser.and.returnValue(of(undefined));api.updateUser.and.returnValue(of(undefined));api.deleteUser.and.returnValue(of('Supprimé'));
    await TestBed.configureTestingModule({imports:[AnnuaireEmployesComponent],providers:[provideRouter([]),{provide:UsersService,useValue:api},{provide:AnnuaireService,useValue:{getServices:()=>of([{id:'s',nom:'Support',idDepartement:'d'}]),getDepartements:()=>of([{id:'d',nom:'Informatique'}]),getAgences:()=>of([])}}]}).compileComponents();});
  const form=()=>({invalid:false} as NgForm);
  function fixture(){const f=TestBed.createComponent(AnnuaireEmployesComponent);f.detectChanges();return f;}
  it('crée un agent avec département et service sans chef ou directeur configurés',fakeAsync(()=>{const f=fixture();const c=f.componentInstance;c.startCreate();c.form={prenom:'Agent',nom:'Test',email:'agent@bsic.bf',telephone:'70000000',sexe:'MASCULIN',fonction:'AGENT',idDepartement:'d',idService:'s'};f.detectChanges();tick();expect(f.nativeElement.querySelector('[name="idSuperieur"]').required).toBeFalse();expect(f.nativeElement.querySelector('[name="idSuperieurSecondaire"]').required).toBeFalse();c.create(form());expect(api.createUser).toHaveBeenCalledTimes(1);expect(api.createUser.calls.mostRecent().args[0].idSuperieur).toBeUndefined();expect(c.dialog.nativeElement.open).toBeFalse();tick(4000);f.destroy();}));
  it('récupère les deux responsables dans le bon ordre et refuse une double saisie',fakeAsync(()=>{const f=fixture();const c=f.componentInstance;c.allUsers=[{id:'chief',fonction:'CHEF_SERVICE',idService:'s',activated:true},{id:'director',fonction:'DIRECTEUR',idDepartement:'d',activated:true}];c.startCreate();c.form={fonction:'AGENT',idDepartement:'d',idService:'s'};c.onFonctionChange();expect(c.form.idSuperieur).toBe('chief');expect(c.form.idSuperieurSecondaire).toBe('director');const wait=new Subject<void>();api.createUser.and.returnValue(wait);c.create(form());c.create(form());expect(api.createUser).toHaveBeenCalledTimes(1);expect(api.createUser.calls.mostRecent().args[0].idSuperieur).toBe('chief');c.resetForm();expect(c.dialog.nativeElement.open).toBeTrue();wait.next();expect(c.dialog.nativeElement.open).toBeFalse();tick(4000);f.destroy();}));
  it('remplace le chef après un changement de service par le formulaire',fakeAsync(()=>{
    const f=fixture(),c=f.componentInstance;c.services.push({id:'s2',nom:'Développement',idDepartement:'d'});c.allUsers=[{id:'c1',fonction:'CHEF_SERVICE',idService:'s',idDepartement:'d',activated:true},{id:'c2',fonction:'CHEF_SERVICE',idService:'s2',idDepartement:'d',activated:true},{id:'director',fonction:'DIRECTEUR',idDepartement:'d',activated:true}];
    c.startCreate();c.form={fonction:'AGENT',idDepartement:'d',idService:'s'};c.onServiceChange();f.detectChanges();tick();expect(c.form.idSuperieur).toBe('c1');
    const service=f.nativeElement.querySelector('[name="idService"]');service.value='s2';service.dispatchEvent(new Event('change'));f.detectChanges();tick();expect(c.form.idSuperieur).toBe('c2');expect(c.form.idSuperieurSecondaire).toBe('director');expect(f.nativeElement.querySelector('[name="idSuperieur"]').disabled).toBeTrue();f.destroy();
  }));
  it('permet de préciser un titulaire parmi plusieurs et conserve un choix éligible',()=>{
    const f=fixture(),c=f.componentInstance;c.allUsers=[{id:'c1',fonction:'CHEF_SERVICE',idService:'s',idDepartement:'d',activated:true},{id:'c2',fonction:'CHEF_SERVICE',idService:'s',idDepartement:'d',activated:true},{id:'inactive',fonction:'CHEF_SERVICE',idService:'s',idDepartement:'d',activated:false}];c.startCreate();c.form={fonction:'AGENT',idDepartement:'d',idService:'s'};c.onServiceChange();f.detectChanges();expect(c.form.idSuperieur).toBeUndefined();expect(c.availableChefsService.map(u=>u.id)).toEqual(['c1','c2']);expect(f.nativeElement.textContent).toContain('Plusieurs chefs disponibles');c.form.idSuperieur='c2';c.fillHierarchy();expect(c.form.idSuperieur).toBe('c2');f.destroy();
  });
  it('présente une ancienne fiche inversée dans l’ordre N+1 puis N+2 sans écrire immédiatement',()=>{
    const f=fixture(),c=f.componentInstance;c.allUsers=[{id:'chief',prenom:'Chef',fonction:'CHEF_SERVICE',idService:'s',idDepartement:'d',activated:true},{id:'director',prenom:'Directeur',fonction:'DIRECTEUR',idDepartement:'d',activated:true}];
    c.selectEmploye({id:'agent',fonction:'AGENT',idDepartement:'d',idService:'s',idSuperieur:'director',idSuperieurSecondaire:'chief'});expect(c.form.idSuperieur).toBe('chief');expect(c.form.idSuperieurSecondaire).toBe('director');expect(c.form.nomCompletSuperieur).toBe('Chef');expect(api.updateUser).not.toHaveBeenCalled();c.resetForm();f.destroy();
  });
  it('annule une suppression sans envoyer de requête',()=>{const f=fixture();const c=f.componentInstance;c.requestDelete({id:'agent',nom:'Test'});expect(c.deleteDialog.nativeElement.open).toBeTrue();c.cancelDelete();expect(api.deleteUser).not.toHaveBeenCalled();expect(c.deleteDialog.nativeElement.open).toBeFalse();f.destroy();});
});
