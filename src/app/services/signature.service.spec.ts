import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController,provideHttpClientTesting} from '@angular/common/http/testing';
import {SignatureService} from './signature.service';
import {API_BASE_URL} from './api.config';

describe('SignatureService',()=>{
  let api:SignatureService;let http:HttpTestingController;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});api=TestBed.inject(SignatureService);http=TestBed.inject(HttpTestingController);});
  afterEach(()=>http.verify());
  it('uploads multipart content to the authenticated account without a user identifier',()=>{
    const file=new File(['png'],'signature.png',{type:'image/png'});api.upload(file).subscribe();const req=http.expectOne(`${API_BASE_URL}/me/signature`);
    expect(req.request.method).toBe('PUT');expect(req.request.body.get('file')).toBe(file);expect(req.request.body.has('userId')).toBeFalse();expect(req.request.headers.has('Content-Type')).toBeFalse();req.flush({presente:true});
  });
  it('fetches the private preview as a blob',()=>{api.image().subscribe();const req=http.expectOne(`${API_BASE_URL}/me/signature/image`);expect(req.request.responseType).toBe('blob');req.flush(new Blob());});
  it('requests a normalized preview without changing the saved signature',()=>{const file=new File(['tiff'],'scan.tif',{type:'image/tiff'});api.preview(file).subscribe();const req=http.expectOne(`${API_BASE_URL}/me/signature/preview`);expect(req.request.method).toBe('POST');expect(req.request.responseType).toBe('blob');expect(req.request.body.get('file')).toBe(file);req.flush(new Blob(['normalized'],{type:'image/png'}));});
});
