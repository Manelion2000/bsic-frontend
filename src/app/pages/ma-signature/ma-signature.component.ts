import {CommonModule} from '@angular/common';
import {Component, DestroyRef, OnDestroy, OnInit, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SignatureService, SignatureStatus} from '../../services/signature.service';
import {extractErrorMessage} from '../../shared/error.utils';

@Component({selector: 'app-ma-signature', standalone: true, imports: [CommonModule], templateUrl: './ma-signature.component.html', styleUrl: './ma-signature.component.scss'})
export class MaSignatureComponent implements OnInit, OnDestroy {
  private readonly api = inject(SignatureService);
  private readonly destroy = inject(DestroyRef);
  status?: SignatureStatus;
  selected?: File;
  savedPreview = '';
  preview = '';
  busy = false;
  loading = true;
  error = '';
  success = '';
  confirmRemoval = false;
  private imageRequest = 0;
  private selectionRequest = 0;
  previewLoading = false;
  readonly formats = 'PNG, JPEG, WebP, BMP, GIF fixe ou TIFF à une page';
  readonly acceptedFiles = '.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff,image/png,image/jpeg,image/webp,image/bmp,image/gif,image/tiff';
  get displayedPreview() { return this.selected ? this.preview : this.savedPreview; }

  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.api.status().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: s => { this.status = s; this.loading = false; if (s.presente) this.loadImage(); else { this.imageRequest++; this.revoke(this.savedPreview); this.savedPreview = ''; } },
      error: e => { this.loading = false; this.error = extractErrorMessage(e, 'Impossible de charger votre signature.'); }
    });
  }
  private loadImage() {
    const request = ++this.imageRequest;
    this.api.image().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: blob => { if (request !== this.imageRequest) return; this.revoke(this.savedPreview); this.savedPreview = URL.createObjectURL(blob); },
      error: e => { if (request === this.imageRequest) this.error = extractErrorMessage(e, 'Aperçu indisponible. Réessayez le chargement.'); }
    });
  }
  choose(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file || this.busy) return;
    this.error = ''; this.success = ''; this.confirmRemoval = false;
    this.cancelSelection();
    const type = file.type.toLowerCase();
    const supported = ['image/png','image/jpeg','image/jpg','image/webp','image/bmp','image/x-bmp','image/x-ms-bmp','image/gif','image/tiff','image/x-tiff'].includes(type);
    const missingType = (!type || type === 'application/octet-stream') && /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name);
    if ((!supported && !missingType) || file.size > 2 * 1024 * 1024 || file.size === 0) {
      this.error = `Choisissez une image ${this.formats} de 2 Mo maximum.`; return;
    }
    this.selected = file; this.previewLoading = true;
    const request = ++this.selectionRequest;
    this.api.preview(file).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: blob => { if (request !== this.selectionRequest) return; this.preview = URL.createObjectURL(blob); this.previewLoading = false; },
      error: e => { if (request !== this.selectionRequest) return; this.previewLoading = false; this.error = extractErrorMessage(e, 'Cette image ne peut pas être utilisée comme signature.'); }
    });
  }
  cancelSelection() { this.selectionRequest++; this.previewLoading = false; this.revoke(this.preview); this.preview = ''; this.selected = undefined; }
  save() {
    if (!this.selected || !this.preview || this.previewLoading || this.busy || this.loading) return;
    this.busy = true; this.error = ''; this.success = '';
    this.api.upload(this.selected).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: s => { this.status = s; this.busy = false; this.cancelSelection(); this.success = 'Votre signature est enregistrée. Elle sera apposée lors de vos prochaines approbations.'; this.loadImage(); },
      error: e => { this.busy = false; this.error = extractErrorMessage(e, 'Enregistrement impossible.'); }
    });
  }
  remove() {
    if (this.busy || !this.confirmRemoval) return;
    this.busy = true; this.error = ''; this.success = '';
    this.api.remove().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { this.imageRequest++; this.status = {presente: false, miseAJour: null, empreinte: null}; this.revoke(this.savedPreview); this.savedPreview = ''; this.busy = false; this.confirmRemoval = false; this.cancelSelection(); this.success = 'Signature retirée. Les visas déjà enregistrés sont conservés.'; },
      error: e => { this.busy = false; this.error = extractErrorMessage(e, 'Retrait impossible.'); }
    });
  }
  private revoke(url: string) { if (url) URL.revokeObjectURL(url); }
  ngOnDestroy() { this.revoke(this.preview); this.revoke(this.savedPreview); }
}
