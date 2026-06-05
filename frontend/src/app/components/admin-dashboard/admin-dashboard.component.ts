import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { PersonFormDialogComponent, PersonDialogData } from '../person-form-dialog/person-form-dialog.component';
import { Person, PersonFormValue } from '../../models/person.model';
import { AuthService } from '../../services/auth.service';
import { PeopleService } from '../../services/people.service';
import { resolveAssetUrl } from '../../shared/app-urls';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatChipsModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  people: Person[] = [];
  loading = true;
  error = '';
  search = '';
  filterDepartment = '';
  filterSite = '';
  filterStatus = '';
  sortNewestFirst = true;
  viewMode: 'list' | 'carnets' = 'list';

  displayedColumns = ['avatar', 'fullName', 'department', 'site', 'status', 'mode', 'actions'];
  dataSource = new MatTableDataSource<Person>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private readonly peopleService: PeopleService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly dialog: MatDialog
  ) {}

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  async ngOnInit(): Promise<void> {
    await this.loadPeople();
  }

  async loadPeople(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.people = await this.peopleService.getAll();
      this.applyFilter();
    } catch {
      this.error = 'No fue posible cargar las personas desde la API.';
    } finally {
      this.loading = false;
    }
  }

  applyFilter(): void {
    const search = this.search.trim().toLowerCase();
    const filtered = this.people.filter(person => {
      const matchesDept = !this.filterDepartment || person.department === this.filterDepartment;
      const matchesSite = !this.filterSite || person.site === this.filterSite;
      const matchesStatus = !this.filterStatus || person.status === this.filterStatus;
      const haystack = [person.fullName, person.email, person.department, person.role, person.site].join(' ').toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesDept && matchesSite && matchesStatus && matchesSearch;
    });

    this.dataSource.data = filtered.sort((a, b) =>
      this.sortNewestFirst ? b.id - a.id : a.id - b.id
    );

    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  get departments(): string[] {
    return [...new Set(this.people.map(p => p.department))].sort();
  }

  get statuses(): string[] {
    return [...new Set(this.people.map(p => p.status))].sort();
  }

  get sites(): string[] {
    return [...new Set(this.people.map(p => p.site || 'Colina'))].sort();
  }

  get stats() {
    return {
      total: this.people.length,
      active: this.people.filter(p => p.status === 'Activo').length,
      departments: new Set(this.people.map(p => p.department)).size,
      sites: new Set(this.people.map(p => p.site || 'Colina')).size
    };
  }

  get hasActiveFilters(): boolean {
    return Boolean(this.search || this.filterDepartment || this.filterSite || this.filterStatus);
  }

  clearFilters(): void {
    this.search = '';
    this.filterDepartment = '';
    this.filterSite = '';
    this.filterStatus = '';
    this.applyFilter();
  }

  toggleSort(): void {
    this.sortNewestFirst = !this.sortNewestFirst;
    this.applyFilter();
  }

  openPersonDialog(person: Person | null = null): void {
    const dialogRef = this.dialog.open<PersonFormDialogComponent, PersonDialogData, PersonFormValue | null>(
      PersonFormDialogComponent,
      {
        width: '620px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: { person }
      }
    );

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        if (person) {
          await this.peopleService.update(person.id, result);
        } else {
          await this.peopleService.create(result);
        }
        await this.loadPeople();
      } catch {
        this.error = 'No se pudo guardar la persona. Verifica los datos e intenta de nuevo.';
      }
    });
  }

  async deletePerson(person: Person): Promise<void> {
    if (!confirm(`¿Eliminar a ${person.fullName}?`)) return;
    try {
      await this.peopleService.delete(person.id);
      await this.loadPeople();
    } catch {
      this.error = 'No se pudo eliminar la persona.';
    }
  }

  viewCard(person: Person): void {
    void this.router.navigate(['/card', person.id]);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  resolveAvatar(person: Person): string {
    return resolveAssetUrl(person.avatar);
  }

  avatarInitials(fullName: string): string {
    const words = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'AP';
    const first = words[0]?.[0] ?? '';
    const second = words.length > 1 ? words[1]?.[0] ?? '' : words[0]?.[1] ?? '';
    return `${first}${second}`.toUpperCase();
  }

  statusColor(status: string): string {
    if (status === 'Activo') return 'activo';
    if (status === 'Vacaciones') return 'vacaciones';
    return 'inactivo';
  }

  modeIcon(mode: string): string {
    if (mode === 'Remoto') return 'laptop';
    if (mode === 'Híbrido') return 'sync_alt';
    return 'business';
  }

  trackById(_: number, person: Person): number {
    return person.id;
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'list' ? 'carnets' : 'list';
  }

  get filteredPeopleForCarnets(): Person[] {
    return this.dataSource.data;
  }

  statusClassCard(status: string): string {
    if (status === 'Activo') return 'active';
    if (status === 'Vacaciones') return 'vacation';
    return 'inactive';
  }
}
