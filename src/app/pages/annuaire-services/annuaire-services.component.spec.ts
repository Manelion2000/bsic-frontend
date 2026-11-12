import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgForm } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { AnnuaireServicesComponent } from './annuaire-services.component';
import { AnnuaireService, BaServiceDto } from '../../services/annuaire.service';
import { UsersService } from '../../services/users.service';
describe('AnnuaireServicesComponent',()=>{
  let api:jasmine.SpyObj<AnnuaireService>;let users:jasmine.SpyObj<UsersService>;
  beforeEach(async()=>{api=jasmine.createSpyObj('AnnuaireService',['getServices','getDepartements','createService','updateService']);api.getServices.and.returnValue(of([{id:'s',nom:'Contrôle',nomDepartement:'Opérations',code:'CTRL'}]));api.getDepartements.and.returnValue(of([{id:'d',nom:'Opérations'}]));api.createService.and.returnValue(of({}));users=jasmine.createSpyObj('UsersService',['getUserWithMoreInfo']);users.getUserWithMoreInfo.and.returnValue(of({roles:[{code:'BA_ADMIN'}]}));await TestBed.configureTestingModule({imports:[AnnuaireServicesComponent],providers:[provideRouter([]),{provide:AnnuaireService,useValue:api},{provide:UsersService,useValue:users}]}).compileComponents();});
  function fixture(){const f=TestBed.createComponent(AnnuaireServicesComponent);f.detectChanges();return f;}
  it('recherche sans accents et permet de consulter les contacts du service',()=>{const f=fixture();const c=f.componentInstance;c.searchTerm='controle operations';f.detectChanges();expect(c.filteredServices.length).toBe(1);expect(f.nativeElement.querySelector('a[href="/annuaire/annuaire?serviceId=s"]')).not.toBeNull();f.destroy();});
  it('réserve la gestion à un administrateur même par appel du composant',()=>{users.getUserWithMoreInfo.and.returnValue(of({roles:[]}));const f=fixture();const c=f.componentInstance;c.openCreateForm();c.create({invalid:false} as NgForm);expect(api.createService).not.toHaveBeenCalled();expect(c.dialog.nativeElement.open).toBeFalse();f.destroy();});
  it('ne ferme pas une saisie en cours et empêche son double enregistrement',fakeAsync(()=>{const wait=new Subject<BaServiceDto>();api.createService.and.returnValue(wait);const f=fixture();const c=f.componentInstance;c.openCreateForm();c.form={code:'NEW',nom:'Nouveau',idDepartement:'d'};f.detectChanges();tick();c.create({invalid:false} as NgForm);c.create({invalid:false} as NgForm);expect(api.createService).toHaveBeenCalledTimes(1);c.closeFormModal();expect(c.dialog.nativeElement.open).toBeTrue();wait.next({});expect(c.dialog.nativeElement.open).toBeFalse();expect(c.isSaving).toBeFalse();f.destroy();}));
  it('réinitialise la pagination quand la recherche est saisie',fakeAsync(()=>{const f=fixture();f.componentInstance.pageIndex=5;const input=f.nativeElement.querySelector('input[type="text"]');input.value='controle';input.dispatchEvent(new Event('input'));tick();expect(f.componentInstance.pageIndex).toBe(0);f.destroy();}));
});
