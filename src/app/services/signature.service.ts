import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {API_BASE_URL} from './api.config';

export interface SignatureStatus { presente: boolean; miseAJour: string | null; empreinte: string | null; }

@Injectable({providedIn: 'root'})
export class SignatureService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/me/signature`;
  status() { return this.http.get<SignatureStatus>(this.url); }
  image() { return this.http.get(`${this.url}/image`, {responseType: 'blob'}); }
  preview(file: File) { const data = new FormData(); data.append('file', file); return this.http.post(`${this.url}/preview`, data, {responseType: 'blob'}); }
  upload(file: File) { const data = new FormData(); data.append('file', file); return this.http.put<SignatureStatus>(this.url, data); }
  remove() { return this.http.delete<void>(this.url); }
}
