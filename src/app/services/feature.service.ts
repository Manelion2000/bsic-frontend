import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface AppFeatures {
  habilitations: boolean;
}

@Injectable({ providedIn: 'root' })
export class FeatureService {
  private readonly http = inject(HttpClient);
  private readonly featuresState = signal<AppFeatures>({ habilitations: false });
  private loadRequest?: Observable<AppFeatures>;

  readonly features = this.featuresState.asReadonly();

  isEnabled(feature: keyof AppFeatures): boolean {
    return this.featuresState()[feature];
  }

  load(): Observable<AppFeatures> {
    if (!this.loadRequest) {
      this.loadRequest = this.http.get<AppFeatures>(`${API_BASE_URL}/public/features`).pipe(
        catchError(() => of({ habilitations: false })),
        tap((features) => this.featuresState.set(features)),
        shareReplay(1)
      );
    }
    return this.loadRequest;
  }
}

export const habilitationsFeatureGuard: CanActivateFn = () => {
  const featureService = inject(FeatureService);
  const router = inject(Router);
  return featureService.load().pipe(
    map(() => featureService.isEnabled('habilitations') || router.createUrlTree(['/annuaire/annuaire']))
  );
};
