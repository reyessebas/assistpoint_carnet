import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent implements OnInit {
  // Business state
  email = '';
  password = '';
  loading = false;
  error = '';
  hidePassword = true;

  // UI state
  isDark = false;
  px = 0;
  py = 0;
  emailFocused = false;
  passFocused  = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.router.navigate(['/admin']);
    }
    this.isDark = localStorage.getItem('ap-theme') === 'dark';
    document.documentElement.classList.toggle('dark', this.isDark);
  }

  // Parallax on mouse move
  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.px = (e.clientX / window.innerWidth  - 0.5) * 28;
    this.py = (e.clientY / window.innerHeight - 0.5) * 28;
  }

  toggleDark(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('ap-theme', this.isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', this.isDark);
  }

  // Business logic
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
