import { Component } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { StatusBar } from '@capacitor/status-bar';
import { logout } from 'src/app/state/auth/auth.actions';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  constructor(private store: Store) {}

  async ionViewWillEnter() {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#f7d94f' }); // red example
  }

  ionViewDidEnter() {
    this.tabsEl = document.querySelector('ion-tabs') as HTMLElement;
    this.headerEl = document.querySelector('ion-header') as HTMLElement;
  }

  public lastY = 0;
  public tabsEl!: HTMLElement;
  public headerEl!: HTMLElement;
  async onScroll(ev: any) {
    const y = ev.detail.scrollTop;
    console.log(ev);
    console.log('y', y);
    console.log('lastY', this.lastY);

    if (y > this.lastY) {
      this.tabsEl.classList.add('hide');
      this.headerEl.classList.add('change-color');
      this.lastY = y;
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } else if (y < this.lastY) {
      this.tabsEl.classList.remove('hide');
      this.headerEl.classList.remove('change-color');
      this.lastY = y;
      await StatusBar.setBackgroundColor({ color: '#f7d94f' });
    }
  }

  onScrollEnd(ev: any) {
    const scrollElement = ev.target as HTMLIonContentElement;

    scrollElement.getScrollElement().then((el) => {
      const scrollPosition = el.scrollTop + el.clientHeight;
      const scrollHeight = el.scrollHeight;

      if (scrollPosition >= scrollHeight - 10) {
        // reached bottom
        console.log('trigger load ');
      }
    });
  }

  handleRefresh(event: RefresherCustomEvent) {
    setTimeout(() => {
      // Any calls to load data go here
      event.target.complete();
    }, 2000);
  }

  logout() {
    this.store.dispatch(logout());
  }
}
