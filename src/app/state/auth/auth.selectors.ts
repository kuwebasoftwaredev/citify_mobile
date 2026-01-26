import { createSelector, createFeatureSelector } from '@ngrx/store';

import * as _ from 'lodash';
import { IAuthState } from './auth.state';
export const selectAuthState = createFeatureSelector<IAuthState>('auth');

export const selectAuth = createSelector(
  selectAuthState,
  (state) => state.account
);
