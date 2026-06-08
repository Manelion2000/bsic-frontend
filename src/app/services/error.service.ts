import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  private messageSubject = new BehaviorSubject<string | null>(null);
  readonly message$ = this.messageSubject.asObservable();

  show(message: string): void {
    this.messageSubject.next(message);
  }

  clear(): void {
    this.messageSubject.next(null);
  }
}
