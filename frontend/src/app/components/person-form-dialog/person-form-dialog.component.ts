import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Person, PersonFormValue } from '../../models/person.model';
import { PeopleService } from '../../services/people.service';

export interface PersonDialogData {
  person: Person | null;
}

@Component({
  selector: 'app-person-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './person-form-dialog.component.html',
  styleUrl: './person-form-dialog.component.css'
})
export class PersonFormDialogComponent implements OnInit {
  form: FormGroup;
  photoPreview = '';
  fileError = '';
  departments = [
    'Aprendiz',
    'B2B',
    'Billing',
    'CCM',
    'CCM/RMP',
    'Cardiología',
    'Contabilidad',
    'Coordinación Especialista',
    'Direccion',
    'Finance',
    'IT',
    'Legal',
    'LOP',
    'Marketing',
    'Medical Assistant',
    'PAP',
    'RMP',
    'Recursos Humanos',
    'Servicios Generales'
  ];
  roles = [
    'Analista Contable',
    'Analista Contable Senior',
    'Analista Contable y Reporting',
    'Analista de Facturación y Cobros',
    'Analista de Marketing Digital',
    'Analista de Recursos Humanos',
    'Aprendiz Marketing',
    'Aprendiz Recursos Humanos',
    'Asistente Legal',
    'Asistente Médico enfocado en coordinación de Atención al Paciente',
    'Asistente Médico con enfoque en ciclo de Facturación',
    'Coordinador de Marketing Junior',
    'Direccion',
    'Director de Recursos Humanos',
    'Especialista en Generación de Leads B2B',
    'General Manager',
    'Gestor Médico con Énfasis Administrativo',
    'IT Asistencia Remota Junior',
    'Jefe de Contabilidad',
    'Manager Contable y Financiero',
    'Médico',
    'Office and Operations Manager',
    'Operaria de Limpieza y Servicios Generales',
    'Project Manager',
    'Revenue Cycle',
    'Servicio de Asistencia Remota'
  ];
  sites = ['Colina', '123', 'Medellin', 'Uruguay'];
  modes = ['Presencial', 'Remoto', 'Híbrido'];
  personTypes = ['Empleado', 'Contratista', 'Visitante', 'Practicante', 'Proveedor'];
  personStatuses = ['Activo', 'Inactivo', 'Retirado', 'Suspendido'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly peopleService: PeopleService,
    public dialogRef: MatDialogRef<PersonFormDialogComponent, PersonFormValue | null>,
    @Inject(MAT_DIALOG_DATA) public data: PersonDialogData
  ) {
    const p = data.person;
    this.form = this.fb.group({
      fullName: [p?.fullName ?? '', [Validators.required, Validators.maxLength(255)]],
      email: [p?.email ?? '', [Validators.required, Validators.email, Validators.maxLength(200)]],
      documentNumber: [p?.documentNumber ?? '', [Validators.required, Validators.maxLength(80)]],
      department: [p?.department ?? '', [Validators.required, Validators.maxLength(120)]],
      role: [p?.role ?? '', [Validators.required, Validators.maxLength(160)]],
      site: [p?.site ?? 'Colina', [Validators.required, Validators.maxLength(80)]],
      status: [p?.status ?? 'Activo', Validators.required],
      mode: [p?.mode ?? 'Presencial', Validators.required],
      personType: [p?.personType ?? 'Empleado', Validators.required],
      employeeCode: [p?.employeeCode ?? '', Validators.maxLength(80)],
      phone: [p?.phone ?? '', Validators.maxLength(60)],
      startDate: [this.formatDateForInput(p?.startDate) ?? ''],
      avatar: [p?.avatar ?? '']
    });
    this.photoPreview = p?.avatar ?? 'img/defecto_perfil.jpeg';
  }

  async ngOnInit(): Promise<void> {
    try {
      const catalogs = await this.peopleService.getCatalogs();
      this.departments = catalogs.areas.filter(item => item.activo).map(item => item.nombre);
      this.roles = catalogs.cargos.filter(item => item.activo).map(item => item.nombre);
      this.sites = catalogs.sedes.filter(item => item.activo).map(item => item.nombre);
      this.modes = catalogs.modalidades.filter(item => item.activo).map(item => item.nombre);
      this.personTypes = catalogs.tiposPersona.filter(item => item.activo).map(item => item.nombre);
      this.personStatuses = catalogs.estadosPersona.filter(item => item.activo).map(item => item.nombre);
    } catch {
      // Keep local fallbacks when catalogs are unavailable.
    }
  }

  get isEdit(): boolean {
    return Boolean(this.data.person);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value: PersonFormValue = { ...this.form.value };
    if (!value.avatar?.trim()) {
      value.avatar = 'img/defecto_perfil.jpeg';
    }
    this.dialogRef.close(value);
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    this.fileError = '';

    if (!file.type.startsWith('image/')) {
      this.fileError = 'Selecciona una imagen válida.';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      this.fileError = 'La imagen debe pesar máximo 3 MB.';
      return;
    }

    const dataUrl = await this.readFileAsDataUrl(file);
    this.form.patchValue({ avatar: dataUrl });
    this.photoPreview = dataUrl;
  }

  clearPhoto(): void {
    this.form.patchValue({ avatar: '' });
    this.photoPreview = 'img/defecto_perfil.jpeg';
    this.fileError = '';
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private formatDateForInput(value?: string): string {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
