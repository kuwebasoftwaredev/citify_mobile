import { inject } from '@angular/core';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from '../../services/auth/auth.service';
import { Store } from '@ngrx/store';
import { logout } from 'src/app/state/auth/auth.actions';

export const refreshTokenInterceptor = (req: HttpRequest<any>, next: any) => {
  const AuthService = inject(Auth);
  const store = inject(Store);

  // Skip interceptor for Cloudinary uploads
  if (req.url.includes('https://api.cloudinary.com')) {
    return next(req); // just pass through, no withCredentials
  }

  // Always send cookies
  const reqWithCredentials = req.clone({
    withCredentials: true,
  });

  return next(reqWithCredentials).pipe(
    catchError((error: HttpErrorResponse) => {
      // Access token expired or invalid
      if (error.status === 401) {
        console.log('------x');
        return AuthService.rotateAccessToken().pipe(
          switchMap(() => {
            // Refresh successful → retry original request
            const retryReq = req.clone({ withCredentials: true });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            // Refresh failed → logout user
            store.dispatch(logout());

            return throwError(() => refreshErr);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
