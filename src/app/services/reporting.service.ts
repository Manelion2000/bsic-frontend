import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class ReportingService {
  constructor(private http: HttpClient) {}

  reportProduits(): Observable<Blob> {
    return throwError(() => new Error('Endpoint /api/reporting/products indisponible dans le backend actuel.'));
  }

  reportFicheHabilitation(id: string): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/reporting/habilitations/fiches/${id}`, { responseType: 'blob' });
  }
}
