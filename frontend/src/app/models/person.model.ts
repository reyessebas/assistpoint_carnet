export interface Person {
  id: number;
  fullName: string;
  email: string;
  department: string;
  role: string;
  site: string;
  status: 'Activo' | 'Inactivo' | 'Vacaciones' | string;
  mode: 'Presencial' | 'Remoto' | 'Híbrido' | string;
  avatar: string;
}

export interface PersonFormValue {
  fullName: string;
  email: string;
  department: string;
  role: string;
  site: string;
  status: string;
  mode: string;
  avatar: string;
}
