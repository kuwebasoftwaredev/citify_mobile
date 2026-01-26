import { Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';

import { catchError, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { IAuth } from './auth.state';
import * as AuthAction from './auth.actions';
import { Auth } from 'src/app/core/services/auth/auth.service';
import { ToastController } from '@ionic/angular';
import { Preferences } from '@capacitor/preferences';
import { Router } from '@angular/router';

@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Actions,
    private AuthService: Auth,
    private toastController: ToastController,
    private router: Router
  ) {}

  setAuth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthAction.setAuth),
      mergeMap(({ userId, otp }) =>
        this.AuthService.checkOTP(userId, otp).pipe(
          tap((response: any) => {
            console.log('Auth:', JSON.stringify(response));
          }),
          mergeMap((response: any) => {
            if (response.success) {
              const auth: IAuth = response.data?.account;

              return from(
                Preferences.set({ key: 'auth', value: JSON.stringify(auth) })
              ).pipe(
                map(() => AuthAction.setAuthSuccess({ auth })),
                catchError((err) =>
                  of(
                    AuthAction.setAuthFailure({ error: err.message }),
                    AuthAction.showToast({ message: 'Failed to save auth' })
                  )
                )
              );
            } else {
              return of(
                AuthAction.setAuthFailure({ error: response.data.message }),
                AuthAction.showToast({ message: response.data.message })
              );
            }
          }),

          catchError((error: any) => {
            return of(
              AuthAction.setAuthFailure({
                error: error.message,
              }),
              AuthAction.showToast({ message: error.message })
            );
          })
        )
      )
    )
  );
  loadAuth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() =>
        from(Preferences.get({ key: 'auth' })).pipe(
          map(({ value }) => {
            if (!value) {
              return AuthAction.logout;
            }
            const auth = JSON.parse(value);

            switch (auth.role) {
              case 'buyer':
                this.AuthService.navigate('/tabs/home');
                break;
              case 'seller':
                this.AuthService.navigate('/tabs/home');
                break;
            }
            return AuthAction.setAuthSuccess({ auth });
          }),
          catchError(() => of(AuthAction.logout()))
        )
      )
    )
  );

  getAuth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() =>
        from(Preferences.get({ key: 'auth' })).pipe(
          map((res) =>
            res?.value
              ? AuthAction.getAuthSuccess({ auth: JSON.parse(res.value) })
              : AuthAction.logout()
          ),
          catchError(() => of(AuthAction.logout()))
        )
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthAction.logout),
      switchMap(() =>
        from(Preferences.remove({ key: 'auth' })).pipe(
          map(() => AuthAction.logoutSuccess()),
          catchError((error) => of(AuthAction.logoutFailure({ error })))
        )
      )
    )
  );
  logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthAction.logoutSuccess),
        tap(() => {
          this.router.navigateByUrl('/login', { replaceUrl: true });
        })
      ),
    { dispatch: false }
  );
}
