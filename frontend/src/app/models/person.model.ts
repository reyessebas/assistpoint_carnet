export interface Person {
  id: number;
  fullName: string;
  documentNumber: string;
  department: string;
  role: string;
  site: string;
  status: 'Activo' | 'Inactivo' | 'Retirado' | 'Suspendido' | string;
  mode: 'Presencial' | 'Remoto' | 'Híbrido' | string;
  employeeCode?: string;
  phone?: string;
  bloodType?: string;
  emergencyContact?: string;
  startDate?: string;
  observations?: string;
  avatar: string;
  activeCarnet?: Carnet | null;
}

export interface Carnet {
  id: number;
  persona_id: number;
  codigo_carnet: string;
  qr_token: string;
  qr_url: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  estado_carnet: 'Vigente' | 'Vencido' | 'Anulado' | 'Extraviado' | 'Reemplazado' | 'Bloqueado' | string;
  version: number;
  archivo_url?: string;
  entregado: boolean | number;
  metodo_entrega?: string;
  fecha_entrega?: string;
  entregado_por?: string;
}

export interface CatalogItem {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean | number;
}

export interface SedeCatalogItem extends CatalogItem {
  direccion?: string;
  ciudad?: string;
}

export interface Catalogs {
  areas: CatalogItem[];
  cargos: CatalogItem[];
  sedes: SedeCatalogItem[];
  modalidades: CatalogItem[];
  estadosPersona: CatalogItem[];
  estadosCarnet: CatalogItem[];
}

export interface CarnetValidation {
  valid: boolean;
  reason: string;
  carnet: Carnet;
  person: {
    fullName: string;
    documentMasked: string;
    department: string;
    role: string;
    site: string;
    mode: string;
    bloodType: string;
    emergencyContact: string;
    status: string;
    avatar: string;
  } | null;
}

export interface PersonFormValue {
  fullName: string;
  documentNumber: string;
  department: string;
  role: string;
  site: string;
  status: string;
  mode: string;
  employeeCode?: string;
  phone?: string;
  bloodType?: string;
  emergencyContact?: string;
  startDate?: string;
  observations?: string;
  avatar: string;
}
