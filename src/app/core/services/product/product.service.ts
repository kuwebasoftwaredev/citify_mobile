import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Http } from '@capacitor-community/http';
import { catchError, from, map, Observable, switchMap, throwError } from 'rxjs';
import { Auth } from '../auth/auth.service';
import { Store } from '@ngrx/store';
import { logout } from 'src/app/state/auth/auth.actions';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(
    private http: HttpClient,
    private authService: Auth,
    private store: Store,
  ) {}

  saveProduct(data: any): Observable<any> {
    if (environment.platform === 'mobile-dev') {
      const promise = Http.post({
        url: `${environment.SERVER_URL_CLUSTERS}/product/createProduct`,
        headers: { 'Content-Type': 'application/json' },
        params: {},
        data,
        webFetchExtra: {
          credentials: 'include',
        },
      });

      return from(promise).pipe(
        map((response: any) => {
          return {
            status: response.status,
            success: response.data?.success,
            data: response.data?.data ?? response.data,
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
      .post(`${environment.SERVER_URL_CLUSTERS}/product/createProduct`, data, {
        withCredentials: true,
      })
      .pipe(
        map((response: any) => {
          return response;
        }),
      );
  }

  updateProduct(productCode: string, data: any): Observable<any> {
    if (environment.platform === 'mobile-dev') {
      const promise = Http.put({
        url: `${environment.SERVER_URL_CLUSTERS}/product/updateProduct/${productCode}`,
        headers: { 'Content-Type': 'application/json' },
        params: {},
        data,
        webFetchExtra: {
          credentials: 'include',
        },
      });

      return from(promise).pipe(
        map((response: any) => {
          return {
            status: response.status,
            success: response.data?.success,
            data: response.data?.data ?? response.data,
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
      .put(
        `${environment.SERVER_URL_CLUSTERS}/product/updateProduct/${productCode}`,
        data,
        {
          withCredentials: true,
        },
      )
      .pipe(
        map((response: any) => {
          return response;
        }),
      );
  }

  getProduct(productCode: string): Observable<any> {
    if (environment.platform === 'mobile-dev') {
      const promise = Http.get({
        url: `${environment.SERVER_URL_CLUSTERS}/product/getProduct/${productCode}`,
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
            data: response.data?.data ?? response.data,
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
        `${environment.SERVER_URL_CLUSTERS}/product/getProduct/${productCode}`,
        {
          withCredentials: true,
        },
      )
      .pipe(
        map((response: any) => {
          return response;
        }),
      );
  }
}
