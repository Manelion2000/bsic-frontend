import {TestBed} from '@angular/core/testing';
import {of, Subject, throwError} from 'rxjs';
import {SignatureService} from '../../services/signature.service';
import {MaSignatureComponent} from './ma-signature.component';

describe('MaSignatureComponent', () => {
  let api: jasmine.SpyObj<SignatureService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('SignatureService', ['status', 'image', 'preview', 'upload', 'remove']);
    api.status.and.returnValue(of({presente:false,miseAJour:null,empreinte:null}));
    api.preview.and.returnValue(of(new Blob(['normalized'],{type:'image/png'})));
    TestBed.configureTestingModule({imports:[MaSignatureComponent],providers:[{provide:SignatureService,useValue:api}]});
    spyOn(URL, 'createObjectURL').and.returnValue('blob:signature-test'); spyOn(URL, 'revokeObjectURL');
  });
  function choose(c:MaSignatureComponent,file:File) { c.choose({target:{files:[file],value:'selected'}} as unknown as Event); }
  it('keeps the upload explicit and preserves the selection when rejected', () => {
    const c=TestBed.createComponent(MaSignatureComponent).componentInstance;c.ngOnInit();
    const file=new File(['png'], 'signature.png',{type:'image/png'});choose(c,file);expect(api.upload).not.toHaveBeenCalled();
    api.upload.and.returnValue(throwError(()=>({error:{message:'Image illisible'}})));c.save();
    expect(c.selected).toBe(file);expect(c.error).toBe('Image illisible');expect(c.busy).toBeFalse();
  });
  it('rejects oversized or unsupported files without uploading', () => {
    const c=TestBed.createComponent(MaSignatureComponent).componentInstance;c.ngOnInit();
    choose(c,new File(['<svg/>'],'signature.svg',{type:'image/svg+xml'}));expect(c.selected).toBeUndefined();
    choose(c,new File([new Uint8Array(2*1024*1024+1)],'large.png',{type:'image/png'}));expect(c.selected).toBeUndefined();expect(api.upload).not.toHaveBeenCalled();
  });
  it('uses the server preview for all supported formats, including TIFF without a browser MIME type',()=>{
    const c=TestBed.createComponent(MaSignatureComponent).componentInstance;c.ngOnInit();
    for(const [name,type] of [['scan.png','image/png'],['scan.jpg','image/jpeg'],['scan.webp','image/webp'],['scan.bmp','image/bmp'],['scan.gif','image/gif'],['scan.tiff','']]){
      const file=new File(['image'],name,{type});choose(c,file);expect(api.preview).toHaveBeenCalledWith(file);expect(c.preview).toBe('blob:signature-test');expect(c.previewLoading).toBeFalse();
    }
    expect(api.upload).not.toHaveBeenCalled();
  });
  it('blocks saving until dimensions and format are checked and ignores a cancelled preview',()=>{
    const pending=new Subject<Blob>();api.preview.and.returnValue(pending);
    const c=TestBed.createComponent(MaSignatureComponent).componentInstance;c.ngOnInit();choose(c,new File(['image'],'scan.tif',{type:'image/tiff'}));c.save();
    expect(c.previewLoading).toBeTrue();expect(api.upload).not.toHaveBeenCalled();c.cancelSelection();pending.next(new Blob(['old']));
    expect(c.preview).toBe('');expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('does not save an image rejected by the dimension check',()=>{
    api.preview.and.returnValue(throwError(()=>({error:{message:'Dimensions invalides'}})));
    const c=TestBed.createComponent(MaSignatureComponent).componentInstance;c.ngOnInit();choose(c,new File(['image'],'scan.png',{type:'image/png'}));c.save();
    expect(c.error).toBe('Dimensions invalides');expect(c.preview).toBe('');expect(api.upload).not.toHaveBeenCalled();
  });
  it('requires removal confirmation and ignores an old preview after removal', () => {
    const response=new Subject<Blob>();api.status.and.returnValue(of({presente:true,miseAJour:null,empreinte:'a'}));api.image.and.returnValue(response);api.remove.and.returnValue(of(undefined));
    const c=TestBed.createComponent(MaSignatureComponent).componentInstance;c.ngOnInit();c.remove();expect(api.remove).not.toHaveBeenCalled();
    c.confirmRemoval=true;c.remove();response.next(new Blob(['old'],{type:'image/png'}));
    expect(c.status?.presente).toBeFalse();expect(c.savedPreview).toBe('');expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('disposes the preview URL when leaving the page', () => {
    const fixture=TestBed.createComponent(MaSignatureComponent);const c=fixture.componentInstance;c.ngOnInit();choose(c,new File(['png'],'s.png',{type:'image/png'}));fixture.destroy();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:signature-test');
  });
});
