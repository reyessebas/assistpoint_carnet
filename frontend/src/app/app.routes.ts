import { Routes } from '@angular/router';

import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { CardPageComponent } from './components/card-page/card-page.component';
import { CarnetValidationPageComponent } from './components/carnet-validation-page/carnet-validation-page.component';
import { LoginPageComponent } from './components/login-page/login-page.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard] },
  { path: 'card/:id', component: CardPageComponent },
  { path: 'validar-carnet/:token', component: CarnetValidationPageComponent },
  { path: '**', redirectTo: 'login' }
];
