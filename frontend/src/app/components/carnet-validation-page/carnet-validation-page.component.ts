import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CarnetValidation } from '../../models/person.model';
import { PeopleService } from '../../services/people.service';
import { resolveAssetUrl } from '../../shared/app-urls';

@Component({
  selector: 'app-carnet-validation-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './carnet-validation-page.component.html',
  styleUrl: './carnet-validation-page.component.css'
})
export class CarnetValidationPageComponent implements OnInit {
  result: CarnetValidation | null = null;
  loading = true;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly peopleService: PeopleService
  ) {}

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token') || '';
    try {
      this.result = await this.peopleService.validateCarnet(token);
    } catch {
      this.error = 'El carnet no existe o el enlace de validación no es correcto.';
    } finally {
      this.loading = false;
    }
  }

  resolveAvatar(): string {
    return resolveAssetUrl(this.result?.person?.avatar);
  }

  formatDate(value?: string): string {
    if (!value) return 'No definida';
    return new Intl.DateTimeFormat('es-CO', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(value));
  }
}
