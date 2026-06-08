import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface BaCategorieDto {
  id?: string;
  code?: string;
  nom?: string;
}

export interface BaProductDto {
  id?: string;
  name?: string;
  description?: string;
  price?: number | null;
  idCategorie?: string;
  nomCategorie?: string;
}

@Injectable({ providedIn: 'root' })
export class ParamService {
  private categorieUrl = `${API_BASE_URL}/categories`;
  private productUrl = `${API_BASE_URL}/products`;

  constructor(private http: HttpClient) {}

  getCategories(): Observable<BaCategorieDto[]> {
    return this.http.get<BaCategorieDto[]>(this.categorieUrl);
  }

  createCategorie(dto: BaCategorieDto): Observable<BaCategorieDto> {
    return this.http.post<BaCategorieDto>(this.categorieUrl, dto);
  }

  updateCategorie(id: string, dto: BaCategorieDto): Observable<BaCategorieDto> {
    return this.http.put<BaCategorieDto>(`${this.categorieUrl}/${id}`, dto);
  }

  deleteCategorie(id: string): Observable<void> {
    return this.http.delete<void>(`${this.categorieUrl}/${id}`);
  }

  getProducts(): Observable<BaProductDto[]> {
    return this.http.get<BaProductDto[]>(this.productUrl);
  }

  createProduct(dto: BaProductDto): Observable<BaProductDto> {
    return this.http.post<BaProductDto>(this.productUrl, dto);
  }

  updateProduct(id: string, dto: BaProductDto): Observable<BaProductDto> {
    return this.http.put<BaProductDto>(`${this.productUrl}/${id}`, dto);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.productUrl}/${id}`);
  }
}
