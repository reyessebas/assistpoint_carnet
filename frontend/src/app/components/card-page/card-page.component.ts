import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Person } from '../../models/person.model';
import { PeopleService } from '../../services/people.service';
import { resolveAssetUrl } from '../../shared/app-urls';
import { createCarnetCanvas, downloadCanvasPng, drawCarnetToCanvas } from '../../shared/carnet-canvas';

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,119}$/;

@Component({
  selector: 'app-card-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './card-page.component.html',
  styleUrl: './card-page.component.css'
})
export class CardPageComponent implements OnInit {
  person: Person | null = null;
  loading = true;
  error = '';
  sharedView = false;
  readonly currentYear = new Date().getFullYear();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly peopleService: PeopleService
  ) {}

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token')?.trim() || '';
    this.sharedView = !this.router.url.startsWith('/admin/card/');
    if (!SHARE_TOKEN_PATTERN.test(token)) {
      this.error = 'No se encontró el carnet solicitado.';
      this.loading = false;
      return;
    }

    try {
      this.person = await this.peopleService.getPublicCard(token);
    } catch {
      this.error = 'No se encontró el carnet solicitado.';
    } finally {
      this.loading = false;
    }
  }

  get qrUrl(): string {
    if (!this.person) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(this.validationUrl)}`;
  }

  get validationUrl(): string {
    const token = this.person?.activeCarnet?.qr_token;
    return token ? `${window.location.origin}/validar-carnet/${token}` : `${window.location.origin}/validar-carnet/no-token`;
  }

  get cardUrl(): string {
    const token = this.person?.activeCarnet?.qr_token;
    return token ? `${window.location.origin}/card/${token}` : window.location.href;
  }

  resolveAvatar(): string {
    return resolveAssetUrl(this.person?.avatar);
  }

  openValidation(): void {
    window.open(this.validationUrl, '_blank', 'noopener,noreferrer');
  }

  async copyCardLink(): Promise<void> {
    if (!this.person) return;
    try {
      await navigator.clipboard.writeText(this.cardUrl);
    } catch {
      const input = document.createElement('input');
      input.value = this.cardUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
  }

  async downloadCard(): Promise<void> {
    if (!this.person) return;
    const { canvas, ctx } = createCarnetCanvas();
    if (!ctx) return;
    await drawCarnetToCanvas(ctx, this.person, { cardUrl: this.cardUrl, validationUrl: this.validationUrl });
    downloadCanvasPng(canvas, `carnet-${this.person.employeeCode || this.person.documentNumber || this.person.id}`);
  }

  goBack(): void {
    if (this.sharedView) return;
    void this.router.navigate(['/admin']);
  }

  get formattedId(): string {
    return String(this.person?.id ?? 0).padStart(4, '0');
  }

  statusClass(status: string): string {
    if (status === 'Activo') return 'status--active';
    if (status === 'Suspendido') return 'status--vacation';
    return 'status--inactive';
  }

  modeIcon(mode: string): string {
    if (mode === 'Remoto') return 'laptop';
    if (mode === 'Híbrido') return 'sync_alt';
    return 'business';
  }
}
