import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../shared/app-urls';
import { Catalogs, Carnet, CarnetValidation, Person, PersonFormValue } from '../models/person.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PeopleService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  getAll(): Promise<Person[]> {
    return firstValueFrom(this.http.get<Person[]>(`${API_BASE_URL}/people`, { headers: this.headers() }));
  }

  getById(id: number): Promise<Person> {
    return firstValueFrom(this.http.get<Person>(`${API_BASE_URL}/people/${id}`, { headers: this.headers() }));
  }

  create(person: PersonFormValue): Promise<Person> {
    return firstValueFrom(this.http.post<Person>(`${API_BASE_URL}/people`, person, { headers: this.headers(true) }));
  }

  update(id: number, person: PersonFormValue): Promise<Person> {
    return firstValueFrom(this.http.put<Person>(`${API_BASE_URL}/people/${id}`, person, { headers: this.headers(true) }));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE_URL}/people/${id}`, { headers: this.headers(true) }));
  }

  bulkDelete(ids: number[]): Promise<{ requested: number; deleted: number; deletedIds: number[]; missingIds: number[] }> {
    return firstValueFrom(this.http.post<{ requested: number; deleted: number; deletedIds: number[]; missingIds: number[] }>(
      `${API_BASE_URL}/people/bulk-delete`,
      { ids },
      { headers: this.headers(true) }
    ));
  }

  getCatalogs(): Promise<Catalogs> {
    return firstValueFrom(this.http.get<Catalogs>(`${API_BASE_URL.replace(/\/$/, '')}/catalogs`, { headers: this.headers() }));
  }

  createCatalogItem(type: 'areas' | 'cargos' | 'sedes' | 'modalidades' | 'tiposPersona', item: Record<string, unknown>): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API_BASE_URL.replace(/\/$/, '')}/catalogs/${type}`, item, { headers: this.headers(true) }));
  }

  updateCatalogItem(type: 'areas' | 'cargos' | 'sedes' | 'modalidades' | 'tiposPersona', id: number, item: Record<string, unknown>): Promise<unknown> {
    return firstValueFrom(this.http.put(`${API_BASE_URL.replace(/\/$/, '')}/catalogs/${type}/${id}`, item, { headers: this.headers(true) }));
  }

  deleteCatalogItem(type: 'areas' | 'cargos' | 'sedes' | 'modalidades' | 'tiposPersona', id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE_URL.replace(/\/$/, '')}/catalogs/${type}/${id}`, { headers: this.headers(true) }));
  }

  exportCsv(): Promise<Blob> {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/people/export`, {
      headers: this.headers(true),
      responseType: 'blob'
    }));
  }

  generateCarnet(personId: number): Promise<Carnet> {
    return firstValueFrom(this.http.post<Carnet>(`${API_BASE_URL}/people/${personId}/carnets`, {}, { headers: this.headers(true) }));
  }

  markCarnetDelivered(personId: number, method = 'Correo'): Promise<Carnet> {
    return firstValueFrom(this.http.post<Carnet>(`${API_BASE_URL}/people/${personId}/carnets/deliver`, { metodo_entrega: method }, { headers: this.headers(true) }));
  }

  validateCarnet(token: string): Promise<CarnetValidation> {
    return firstValueFrom(this.http.get<CarnetValidation>(`${API_BASE_URL.replace(/\/$/, '')}/carnets/validate/${encodeURIComponent(token)}`));
  }

  importPeople(people: PersonFormValue[]): Promise<{ created: Person[]; updated: Person[]; skipped: Array<{ documentNumber: string; email: string; error: string }> }> {
    return firstValueFrom(this.http.post<{ created: Person[]; updated: Person[]; skipped: Array<{ documentNumber: string; email: string; error: string }> }>(
      `${API_BASE_URL}/people/import`,
      { people },
      { headers: this.headers(true) }
    ));
  }

  private headers(requireAuth = false): HttpHeaders {
    const token = this.authService.getAccessToken();

    if (requireAuth && token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      });
    }

    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }
}
