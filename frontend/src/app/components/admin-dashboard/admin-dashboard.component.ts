import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PersonFormDialogComponent, PersonDialogData } from '../person-form-dialog/person-form-dialog.component';
import { CatalogItem, Catalogs, Person, PersonFormValue, SedeCatalogItem } from '../../models/person.model';
import { AuthService } from '../../services/auth.service';
import { PeopleService } from '../../services/people.service';
import { resolveAssetUrl } from '../../shared/app-urls';
import { createCarnetCanvas, downloadCanvasPng, drawCarnetToCanvas } from '../../shared/carnet-canvas';

type CatalogType = 'areas' | 'cargos' | 'sedes' | 'modalidades';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  // ── Business state (unchanged) ──
  people: Person[] = [];
  loading = true;
  error = '';
  notice = '';
  search = '';
  filterDepartment = '';
  filterSite = '';
  filterStatus = '';
  sortNewestFirst = true;
  viewMode: 'list' | 'carnets' = 'list';
  adminSection: 'people' | CatalogType = 'people';
  catalogView: CatalogType = 'areas';
  catalogs: Catalogs | null = null;
  selectedPersonIds = new Set<number>();
  private messageTimer: ReturnType<typeof window.setTimeout> | null = null;

  dataSource = new MatTableDataSource<Person>([]);

  // ── UI state ──
  isDark = false;
  sidebarOpen = false;

  constructor(
    private readonly peopleService: PeopleService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly dialog: MatDialog
  ) {}

  async ngOnInit(): Promise<void> {
    this.isDark = localStorage.getItem('ap-theme') === 'dark';
    document.documentElement.classList.toggle('dark', this.isDark);
    await this.loadPeople();
  }

  toggleDark(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('ap-theme', this.isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', this.isDark);
  }

  toggleMobileSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeMobileSidebar(): void {
    this.sidebarOpen = false;
  }

  ngOnDestroy(): void {
    this.clearMessageTimer();
  }

  async loadPeople(): Promise<void> {
    this.loading = true;
    this.clearMessages();
    try {
      this.people = await this.peopleService.getAll();
      this.applyFilter();
    } catch (error: any) {
      this.showError(error?.error?.error || 'No fue posible cargar las personas desde la API.');
      return;
    } finally {
      this.loading = false;
    }

    try {
      await this.loadCatalogs();
    } catch (error: any) {
      this.showError(error?.error?.error || 'Las personas cargaron, pero no fue posible cargar los catálogos.');
    } finally {
      this.loading = false;
    }
  }

  async loadCatalogs(): Promise<void> {
    this.catalogs = await this.peopleService.getCatalogs();
  }

  async addCatalogItem(type: CatalogType): Promise<void> {
    const labels = { areas: 'área', cargos: 'cargo', sedes: 'sede', modalidades: 'modalidad' };
    const nombre = prompt(`Nombre de la nueva ${labels[type]}:`);
    if (!nombre?.trim()) return;

    try {
      await this.peopleService.createCatalogItem(type, { nombre: nombre.trim() });
      await this.loadCatalogs();
      this.showNotice(`${labels[type][0].toUpperCase()}${labels[type].slice(1)} agregada correctamente.`);
    } catch {
      this.showError(`No se pudo agregar la ${labels[type]}. Verifica que no exista previamente.`);
    }
  }

  async editCatalogItem(type: CatalogType, item: CatalogItem | SedeCatalogItem): Promise<void> {
    const nombre = prompt('Nuevo nombre:', item.nombre);
    if (!nombre?.trim()) return;
    try {
      await this.peopleService.updateCatalogItem(type, item.id, { ...item, nombre: nombre.trim() });
      await this.loadCatalogs();
      await this.loadPeople();
      this.showNotice('Catálogo actualizado correctamente.');
    } catch (error: any) {
      this.showError(error?.error?.error || 'No se pudo actualizar el catálogo.');
    }
  }

  async deleteCatalogItem(type: CatalogType, item: CatalogItem | SedeCatalogItem): Promise<void> {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    try {
      await this.peopleService.deleteCatalogItem(type, item.id);
      await this.loadCatalogs();
      this.showNotice('Catálogo eliminado correctamente.');
    } catch (error: any) {
      this.showError(error?.error?.error || 'No se pudo eliminar. Puede estar asociado a personas existentes.');
    }
  }

  get catalogItems(): Array<CatalogItem | SedeCatalogItem> {
    if (!this.catalogs) return [];
    return this.catalogs[this.catalogView] || [];
  }

  selectAdminSection(section: 'people' | CatalogType): void {
    this.adminSection = section;
    this.clearMessages();
    this.clearTransientState();
    if (section !== 'people') {
      this.catalogView = section;
    }
  }

  get catalogTitle(): string {
    const titles = {
      areas: 'Áreas',
      cargos: 'Cargos',
      sedes: 'Sedes',
      modalidades: 'Modalidades'
    };
    return titles[this.catalogView];
  }

  applyFilter(): void {
    const search = this.search.trim().toLowerCase();
    const filtered = this.people.filter(person => {
      const matchesDept = !this.filterDepartment || person.department === this.filterDepartment;
      const matchesSite = !this.filterSite || person.site === this.filterSite;
      const matchesStatus = !this.filterStatus || person.status === this.filterStatus;
      const haystack = [person.fullName, person.documentNumber, person.employeeCode, person.department, person.role, person.site, person.bloodType, person.emergencyContact].join(' ').toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesDept && matchesSite && matchesStatus && matchesSearch;
    });

    this.dataSource.data = filtered.sort((a, b) =>
      this.sortNewestFirst ? b.id - a.id : a.id - b.id
    );

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
    this.clearMessages();
    this.search = '';
    this.filterDepartment = '';
    this.filterSite = '';
    this.filterStatus = '';
    this.applyFilter();
  }

  private clearTransientState(): void {
    this.clearMessages();
    this.search = '';
    this.filterDepartment = '';
    this.filterSite = '';
    this.filterStatus = '';
    this.selectedPersonIds.clear();
    this.applyFilter();
  }

  togglePersonSelection(person: Person, checked: boolean): void {
    if (checked) {
      this.selectedPersonIds.add(person.id);
    } else {
      this.selectedPersonIds.delete(person.id);
    }
  }

  isSelected(person: Person): boolean {
    return this.selectedPersonIds.has(person.id);
  }

  selectActiveFiltered(): void {
    this.dataSource.data.forEach(person => this.selectedPersonIds.add(person.id));
    this.showNotice(`${this.dataSource.data.length} personas filtradas seleccionadas.`);
  }

  clearSelection(): void {
    this.selectedPersonIds.clear();
  }

  async deleteSelectedPeople(): Promise<void> {
    const selected = this.people.filter(person => this.selectedPersonIds.has(person.id));
    if (selected.length === 0) {
      this.showError('No hay personas seleccionadas para eliminar.');
      return;
    }
    if (!confirm(`¿Eliminar ${selected.length} persona(s) seleccionada(s)?`)) return;
    try {
      const result = await this.peopleService.bulkDelete(selected.map(person => person.id));
      this.selectedPersonIds.clear();
      await this.loadPeople();
      if (result.deleted === selected.length) {
        this.showNotice(`${result.deleted} persona(s) eliminada(s) correctamente.`);
      } else {
        this.showNotice(`${result.deleted} de ${selected.length} persona(s) eliminada(s).`);
      }
    } catch (error: any) {
      this.showError(error?.error?.error || 'No se pudieron eliminar las personas seleccionadas.');
    }
  }

  toggleSort(): void {
    this.sortNewestFirst = !this.sortNewestFirst;
    this.applyFilter();
  }

  setViewMode(mode: 'list' | 'carnets'): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.clearTransientState();
  }

  showNotice(message: string, delay = 6000): void {
    this.notice = message;
    this.error = '';
    this.scheduleMessageClear(delay);
  }

  showError(message: string, delay = 9000): void {
    this.error = message;
    this.scheduleMessageClear(delay);
  }

  clearMessages(): void {
    this.error = '';
    this.notice = '';
    this.clearMessageTimer();
  }

  private scheduleMessageClear(delay: number): void {
    this.clearMessageTimer();
    this.messageTimer = window.setTimeout(() => {
      this.error = '';
      this.notice = '';
      this.messageTimer = null;
    }, delay);
  }

  private clearMessageTimer(): void {
    if (!this.messageTimer) return;
    window.clearTimeout(this.messageTimer);
    this.messageTimer = null;
  }

  openPersonDialog(person: Person | null = null): void {
    const dialogRef = this.dialog.open<PersonFormDialogComponent, PersonDialogData, PersonFormValue | null>(
      PersonFormDialogComponent,
      {
        width: '880px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'person-dialog-panel',
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
        this.showNotice(person ? 'Persona actualizada correctamente.' : 'Persona creada correctamente.');
      } catch (error: any) {
        this.showError(error?.error?.error || error?.error?.message || 'No se pudo guardar la persona. Verifica los datos e intenta de nuevo.');
      }
    });
  }

  async deletePerson(person: Person): Promise<void> {
    if (!confirm(`¿Eliminar a ${person.fullName}?`)) return;
    try {
      await this.peopleService.delete(person.id);
      await this.loadPeople();
      this.showNotice('Persona eliminada correctamente.');
    } catch {
      this.showError('No se pudo eliminar la persona.');
    }
  }

  async exportPeople(): Promise<void> {
    try {
      const blob = new Blob([this.buildPeopleCsv(this.dataSource.data)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `assist-point-personas-filtradas-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      this.showError('No se pudo exportar la información.');
    }
  }

  private buildPeopleCsv(people: Person[]): string {
    const headers = ['EMPLEADO ID', 'NOMBRE', 'DOCUMENTO', 'FECHA DE INGRESO', 'ÁREA', 'CARGO', 'CELULAR', 'RH', 'CONTACTO DE EMERGENCIA', 'SEDE', 'ESTADO'];
    const rows = people.map(person => [
      person.employeeCode || '',
      person.fullName,
      person.documentNumber,
      this.formatCsvDate(person.startDate),
      person.department,
      person.role,
      person.phone || '',
      person.bloodType || '',
      person.emergencyContact || '',
      person.site,
      person.status
    ]);
    return [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  private formatCsvDate(value?: string): string {
    return value ? String(value).slice(0, 10) : '';
  }

  downloadSelectedCarnets(activeOnly = false): void {
    const selected = this.people.filter(person => this.selectedPersonIds.has(person.id));
    const people = activeOnly ? selected.filter(person => person.status === 'Activo') : selected;
    this.downloadCarnetBundle(people, activeOnly ? 'carnets_activos_seleccionados' : 'carnets_seleccionados');
  }

  downloadFilteredActiveCarnets(): void {
    const people = this.dataSource.data.filter(person => person.status === 'Activo');
    if (people.length === 0) {
      this.showError('No hay personas activas con los filtros actuales.');
      return;
    }
    const parts = ['personas_activas'];
    if (this.filterSite) parts.push(this.filterSite);
    if (this.filterDepartment) parts.push(this.filterDepartment);
    const blob = new Blob([this.buildPeopleCsv(people)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${parts.join('_').replace(/[^a-z0-9_-]+/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private downloadCarnetBundle(people: Person[], filenameBase: string): void {
    if (people.length === 0) {
      this.showError('No hay carnets activos para descargar con la selección actual.');
      return;
    }
    people.forEach((person, index) => {
      window.setTimeout(() => {
        this.downloadPersonCardPng(person, `${filenameBase}_${person.employeeCode || person.documentNumber || person.id}`);
      }, index * 250);
    });
  }

  private async downloadPersonCardPng(person: Person, filenameBase: string): Promise<void> {
    const { canvas, ctx } = createCarnetCanvas();
    if (!ctx) return;
    const publicCardUrl = this.cardUrlFor(person);
    await drawCarnetToCanvas(ctx, person, { cardUrl: publicCardUrl, validationUrl: this.validationUrlFor(person) });
    downloadCanvasPng(canvas, `${filenameBase}_${new Date().toISOString().slice(0, 10)}`);
  }

  private validationUrlFor(person: Person): string {
    return person.activeCarnet?.qr_token ? `${window.location.origin}/validar-carnet/${person.activeCarnet.qr_token}` : this.cardUrlFor(person);
  }

  cardUrlFor(person: Person): string {
    return person.activeCarnet?.qr_token ? `${window.location.origin}/card/${person.activeCarnet.qr_token}` : '';
  }

  async copyCardLink(person: Person): Promise<void> {
    const url = this.cardUrlFor(person);
    if (!url) {
      this.showError('Esta persona no tiene un token público de carnet disponible.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    this.showNotice(`Link del carnet copiado: ${person.fullName}`);
  }

  async importPeopleFromFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    try {
      if (!this.isAllowedImportFile(file)) {
        this.showError('Formato no permitido. Importa un archivo .xlsx, .xls o .csv.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        this.showError('El archivo supera el tamaño máximo permitido de 8 MB.');
        return;
      }
      const people = await this.parsePeopleImportFile(file);
      if (people.length === 0) {
        this.showError('El archivo no contiene personas válidas.');
        return;
      }
      const result = await this.peopleService.importPeople(people);
      await this.loadPeople();
      this.showNotice(`Importación lista: ${result.created.length} creadas, ${result.updated.length} actualizadas, ${result.skipped.length} con error u omitidas.`);
      if (result.skipped.length > 0) {
        this.showError(result.skipped.slice(0, 3).map(item => `${item.documentNumber || 'Sin documento'}: ${item.error}`).join(' | '), 12000);
      }
    } catch {
      this.showError('No se pudo importar el archivo. Revisa que la primera fila tenga encabezados como NOMBRE, DOCUMENTO, ÁREA, CARGO, SEDE, RH y CONTACTO DE EMERGENCIA.');
    }
  }

  private isAllowedImportFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
  }

  private async parsePeopleImportFile(file: File): Promise<PersonFormValue[]> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) {
      return this.parsePeopleRows(this.parseCsvRows(await file.text()));
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | Date | null>>(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: ''
    });
    return this.parsePeopleRows(rows);
  }

  private parseCsvRows(csv: string): string[][] {
    const lines = csv.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];
    const separator = lines[0].includes(';') ? ';' : ',';
    return lines.map(line => this.splitCsvLine(line, separator));
  }

  private parsePeopleRows(rows: Array<Array<string | number | Date | null>>): PersonFormValue[] {
    const [headerRow, ...bodyRows] = rows.filter(row => row.some(value => String(value ?? '').trim()));
    if (!headerRow) return [];

    const headers = headerRow.map(header => this.normalizeHeader(String(header ?? '')));
    const hasHeader = (aliases: string[]) => aliases.some(alias => headers.includes(alias));
    const requiredGroups = [
      ['nombre', 'nombre_completo', 'full_name', 'fullname'],
      ['documento', 'document_number', 'documentnumber', 'cedula', 'identificacion']
    ];
    const missingRequired = requiredGroups.filter(group => !hasHeader(group));
    if (missingRequired.length > 0) {
      this.showError('Faltan encabezados requeridos: NOMBRE y DOCUMENTO.');
      return [];
    }

    return bodyRows
      .map(row => this.mapImportedRow(headers, row))
      .filter(person => person.fullName && person.documentNumber);
  }

  private mapImportedRow(headers: string[], values: Array<string | number | Date | null>): PersonFormValue {
    const row = new Map(headers.map((header, index) => [header, values[index] ?? '']));
    const pickRaw = (...keys: string[]) => keys.map(key => row.get(key)).find(value => this.cellToString(value).trim()) ?? '';
    const pick = (...keys: string[]) => this.cellToString(pickRaw(...keys));
    return {
      fullName: pick('nombre', 'nombre_completo', 'full_name', 'fullname'),
      documentNumber: pick('documento', 'document_number', 'documentnumber', 'cedula', 'identificacion'),
      employeeCode: pick('empleado_id', 'codigo_empleado', 'codigo', 'employee_code', 'employeeid'),
      department: pick('area', 'departamento', 'department') || 'Sin área',
      role: pick('cargo', 'role', 'puesto') || 'Sin cargo',
      site: pick('sede', 'site') || 'Colina',
      status: this.normalizeImportedStatus(pick('estado', 'estado_persona', 'status') || 'Activo'),
      mode: pick('modalidad', 'mode') || 'Presencial',
      phone: pick('celular', 'telefono', 'telefono_celular', 'numero_celular', 'movil', 'phone', 'mobile'),
      bloodType: pick('rh', 'tipo_sangre', 'tipo_de_sangre', 'blood_type', 'bloodtype'),
      emergencyContact: pick(
        'contacto_emergencia',
        'contacto_de_emergencia',
        'contacto',
        'emergencia',
        'telefono_emergencia',
        'telefono_de_emergencia',
        'celular_emergencia',
        'celular_de_emergencia',
        'numero_emergencia',
        'numero_de_emergencia',
        'numero_contacto_emergencia',
        'numero_de_contacto_de_emergencia',
        'contacto_emergency',
        'emergency_contact',
        'emergencycontact',
        'emergency_phone',
        'emergency_number'
      ),
      startDate: this.normalizeImportedDate(pickRaw('fecha_ingreso', 'fecha_de_ingreso', 'fecha_ingreso_', 'fecha._ingreso', 'start_date')),
      observations: pick('observaciones', 'observations'),
      avatar: pick('foto_url', 'avatar', 'foto') || 'img/defecto_perfil.jpeg'
    };
  }

  private splitCsvLine(line: string, separator: string): string[] {
    const values: string[] = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === separator && !quoted) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  private normalizeHeader(header: string): string {
    return header.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  }

  private cellToString(value: unknown): string {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number.isInteger(value) ? value.toFixed(0) : String(value);
    }
    return String(value).replace(/\s+/g, ' ').trim();
  }

  private normalizeImportedStatus(value: string): string {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'activo') return 'Activo';
    if (normalized === 'inactivo') return 'Inactivo';
    if (normalized === 'retirado') return 'Retirado';
    if (normalized === 'suspendido') return 'Suspendido';
    return 'Activo';
  }

  private normalizeImportedDate(value: unknown): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
      return excelEpoch.toISOString().slice(0, 10);
    }
    const raw = String(value || '').trim();
    if (!raw) return '';
    const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    const slashDate = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (slashDate) {
      const first = Number(slashDate[1]);
      const second = Number(slashDate[2]);
      const month = second > 12 ? first : second;
      const day = second > 12 ? second : first;
      return `${slashDate[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return raw;
  }

  viewCard(person: Person): void {
    const token = person.activeCarnet?.qr_token;
    if (!token) {
      this.showError('Esta persona no tiene un token público de carnet disponible.');
      return;
    }
    void this.router.navigate(['/admin/card', token]);
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
    if (status === 'Suspendido') return 'vacaciones';
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
    if (status === 'Suspendido') return 'vacation';
    return 'inactive';
  }
}
