import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpRequest } from '../http-request/http-request.service';
import { from, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IResponse } from '../../interfaces/response.interface';
import { Http } from '@capacitor-community/http';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(
    private router: Router,
    private hrs: HttpRequest,
    private http: HttpClient
  ) {}

  checkCredentials$(email: string, password: string) {
    if (environment.platform === 'mobile-dev') {
      const promise = Http.post({
        url: `${environment.SERVER_URL_CLUSTERS}/user/authenticate`,
        headers: { 'Content-Type': 'application/json' },
        params: {},
        data: { email, password },
      });

      return from(promise);
    }

    return this.http
      .post(
        `${environment.SERVER_URL_CLUSTERS}/user/authenticate`,
        { email, password },
        { observe: 'response' }
      )
      .pipe(
        map((response: any) => {
          console.log('-----response', response);
          return {
            status: response.status,
            data: response.body,
            headers: response.headers,
          };
        })
      );
  }

  rotateAccessToken() {
    if (environment.platform === 'mobile-dev') {
      const promise = Http.put({
        url: `${environment.SERVER_URL_CLUSTERS}/user/rotateAccessToken`,
        headers: { 'Content-Type': 'application/json' },
        params: {},
        data: {},
        webFetchExtra: {
          credentials: 'include', // same as withCredentials: true
        },
      });

      return from(promise);
    }

    return this.http
      .put(`${environment.SERVER_URL_CLUSTERS}/user/rotateAccessToken`, {
        withCredentials: true,
      })
      .pipe(
        map((response: any) => ({
          status: response.status,
          data: response.body,
          headers: response.headers,
        }))
      );
  }

  checkOTP(userId: string, otp: string) {
    if (environment.platform === 'mobile-dev') {
      const promise = Http.post({
        url: `${environment.SERVER_URL_CLUSTERS}/user/checkOTP`,
        headers: { 'Content-Type': 'application/json' },
        params: {},
        data: { userId: userId, otp: otp },
        webFetchExtra: {
          credentials: 'include',
        },
      });

      return from(promise).pipe(
        map((response: any) => ({
          status: response.status,
          success: response.data.success,
          data: response.data.data,
          headers: response.headers,
        }))
      );
    }
    return this.http
      .post(
        `${environment.SERVER_URL_CLUSTERS}/user/checkOTP`,
        { userId: userId, otp: otp },
        { withCredentials: true }
      )
      .pipe();
  }

  navigate(path: string) {
    let params = {};

    this.router.navigate([path], {
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  async checkRole(): Promise<string> {
    return new Promise((resolve) => {
      this.hrs.request('get', 'user/getAuthUser', {}, (response: IResponse) => {
        try {
          const { role } = response.data;
          if (response.success) resolve(role);
          else this.router.navigate(['login']);
        } catch (error) {
          this.router.navigate(['login']);
        }
      });
    });
  }

  getUserAuth() {
    return new Promise((resolve) => {
      this.hrs.request('get', 'user/getUserAuth', {}, (response: IResponse) => {
        const stringified = JSON.stringify(response.data);
        localStorage.setItem('account', stringified);
        resolve(null);
      });
    });
  }
}
