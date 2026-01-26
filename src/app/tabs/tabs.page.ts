import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Auth } from '../core/services/auth/auth.service';
import { Observable, Subject, takeUntil } from 'rxjs';
import { IUserData } from '../core/interfaces/user.interface';
import { IAuth, IAuthState } from '../state/auth/auth.state';
import { Store } from '@ngrx/store';
import { selectAuth } from '../state/auth/auth.selectors';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getAuth } from '../state/auth/auth.actions';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit {
  public auth$!: Observable<IAuth>;
  private destroyRef = inject(DestroyRef);
  constructor(private store: Store, private Auth: Auth) {}

  ngOnInit(): void {
    this.auth$ = this.store.select(selectAuth);
  }

  async vibrate() {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    console.log('-xx');
  }
}
