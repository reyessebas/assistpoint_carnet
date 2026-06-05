import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Person } from '../../models/person.model';
import { PeopleService } from '../../services/people.service';
import { resolveAssetUrl } from '../../shared/app-urls';

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
  readonly currentYear = new Date().getFullYear();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly peopleService: PeopleService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      void this.router.navigate(['/login']);
      return;
    }
    try {
      this.person = await this.peopleService.getById(id);
    } catch {
      this.error = 'No se encontró la persona solicitada.';
    } finally {
      this.loading = false;
    }
  }

  get qrUrl(): string {
    if (!this.person) return '';
    const currentUrl = `${window.location.origin}/card/${this.person.id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}`;
  }

  resolveAvatar(): string {
    return resolveAssetUrl(this.person?.avatar);
  }

  printCard(): void {
    window.print();
  }

  goBack(): void {
    void this.router.navigate(['/admin']);
  }

  get formattedId(): string {
    return String(this.person?.id ?? 0).padStart(4, '0');
  }

  statusClass(status: string): string {
    if (status === 'Activo') return 'status--active';
    if (status === 'Vacaciones') return 'status--vacation';
    return 'status--inactive';
  }

  modeIcon(mode: string): string {
    if (mode === 'Remoto') return 'laptop';
    if (mode === 'Híbrido') return 'sync_alt';
    return 'business';
  }
}
