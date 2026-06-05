import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent implements OnInit {
  email = '';
  password = '';
  loading = false;
  error = '';
  hidePassword = true;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.router.navigate(['/admin']);
    }
  }

  async onSubmit(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      await this.authService.login(this.email.trim().toLowerCase(), this.password);
      await this.router.navigate(['/admin']);
    } catch {
      this.error = 'Credenciales inválidas. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }
}
