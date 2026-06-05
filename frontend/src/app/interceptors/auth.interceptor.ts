import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/login') || url.includes('/api/auth/refresh') || url.includes('/api/auth/logout');
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getAccessToken();
  const authRequest = token && !isAuthEndpoint(request.url)
    ? request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      })
    : request;

  return next(authRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint(request.url)) {
        return throwError(() => error);
      }

      return from(authService.refreshAccessToken()).pipe(
        switchMap((session) => {
          if (!session?.accessToken) {
            void router.navigate(['/login']);
            return throwError(() => error);
          }

          return next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${session.accessToken}` }
            })
          );
        }),
        catchError(() => {
          authService.clearSession();
          void router.navigate(['/login']);
          return throwError(() => error);
        })
      );
    })
  );
};
