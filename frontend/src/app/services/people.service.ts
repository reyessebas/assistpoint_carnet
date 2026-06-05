import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../shared/app-urls';
import { Person, PersonFormValue } from '../models/person.model';
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