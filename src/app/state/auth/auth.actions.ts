import { createAction, props } from '@ngrx/store';
import { IAuth } from './auth.state';

export const setAuth = createAction(
  '[Auth] Set Auth',
  props<{ userId: string; otp: string }>()
);
export const setAuthSuccess = createAction(
  '[Auth] Set Auth Success',
  props<{ auth: IAuth }>()
);
export const setAuthFailure = createAction(
  '[Auth] Set Auth Failure',
  props<{ error: string }>()
);

export const getAuth = createAction('[Auth] Get Auth');
export const getAuthSuccess = createAction(
  '[Auth] Get Auth Success',
  props<{ auth: IAuth }>()
);

export const loadAuth = createAction('[Auth] Load Auth');

export const logout = createAction('[Auth] Set Logout');
export const logoutSuccess = createAction('[Auth] Set Logout Success');
export const logoutFailure = createAction(
  '[Auth] Set Logout Failure',
  props<{ error: string }>()
);

export const showToast = createAction(
  '[Auth] Show Toast',
  props<{ message: string }>()
);
