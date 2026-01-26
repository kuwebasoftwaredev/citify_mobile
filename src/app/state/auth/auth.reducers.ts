import { createReducer, on } from '@ngrx/store';
import { IAuthState, IAuth } from './auth.state';
import * as AuthAction from './auth.actions';

export const initialState: IAuthState = {
  account: {} as IAuth,
  error: null,
};

export const authReducer = createReducer(
  initialState,
  on(AuthAction.setAuthSuccess, (state, { auth }) => ({
    ...state,
    account: auth,
    error: null,
  })),

  on(AuthAction.setAuthFailure, (state) => ({
    ...state,
    error: state.error,
  }))
);
