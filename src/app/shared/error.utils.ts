import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string' && err.trim()) return err;

  if (err instanceof HttpErrorResponse) {
    if (err.error instanceof ProgressEvent || err.status === 0) {
      return 'Erreur reseau. Verifier la connexion ou le serveur.';
    }
    if (typeof err.error === 'string' && err.error.trim()) return err.error;
    const nested = err.error?.message || err.error?.error || err.error?.detail;
    if (typeof nested === 'string' && nested.trim()) return nested;
    if (typeof err.message === 'string' && err.message.trim()) return err.message;
  }

  if (err instanceof ProgressEvent) {
    return 'Erreur reseau. Verifier la connexion ou le serveur.';
  }

  const message = err?.error?.message || err?.error?.error || err?.error?.detail || err?.error || err?.message;
  if (typeof message === 'string' && message.trim()) return message;

  return fallback;
}
