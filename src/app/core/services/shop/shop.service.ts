import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Http } from '@capacitor-community/http';
import { catchError, from, switchMap, throwError, map } from 'rxjs';
import { Auth } from '../auth/auth.service';
import { Store } from '@ngrx/store';
import { logout } from 'src/app/state/auth/auth.actions';

@Injectable({
  providedIn: 'root',
})
export class Shop {
  constructor(
    private http: HttpClient,
    private authService: Auth,
    private store: Store,
  ) {}

  getShops() {
    if (environment.platform === 'mobile-dev') {
      const municipalities = [
        'Cebu City',
        'Manila City',
        'Bacolod City',
        'Bago City',
      ];

      const query = encodeURIComponent(JSON.stringify(municipalities));

      const promise = Http.get({
        url: `${environment.SERVER_URL_CLUSTERS}/shop/getShops?municipality=${query}`,
        headers: { 'Content-Type': 'application/json' },
        params: {},
        data: {},
        webFetchExtra: {
          credentials: 'include',
        },
      });

      return from(promise).pipe(
        map((response: any) => {
          return {
            status: response.status,
            success: response.data?.success,
            redis: response.data?.redis,
            data: response.data?.data,
          };
        }),
        catchError((error: any) => {
          if (error?.status === 401) {
            return this.authService.rotateAccessToken().pipe(
              switchMap(() => from(promise)),
              catchError((refreshErr) => {
                this.store.dispatch(logout());
                return throwError(() => refreshErr);
              }),
            );
          }

          return throwError(() => error);
        }),
      );
    }

    return this.http
      .get(
        `${environment.SERVER_URL_CLUSTERS}/shop/getShops?municipality=["Cebu City", "Bacolod City", "Bago City"]`,
        {
          withCredentials: true,
        },
      )
      .pipe(
        map((response: any) => {
          return {
            status: response.status,
            data: response.data,
          };
        }),
      );
  }
}
