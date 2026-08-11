import { Component, ViewChild } from '@angular/core';
import { IonSearchbar, RefresherCustomEvent } from '@ionic/angular';
import { StatusBar } from '@capacitor/status-bar';
import { MapComponent } from 'src/app/shared/components/map/map/map.component';
import { Shop } from 'src/app/core/services/shop/shop.service';
import { finalize, map, Observable } from 'rxjs';

@Component({
  selector: 'app-deals',
  templateUrl: 'deals.page.html',
  styleUrls: ['deals.page.scss'],
  standalone: false,
})
export class DealsPage {
  @ViewChild(MapComponent) mapComponent!: MapComponent;
  @ViewChild('searchbar', { static: false })
  searchbar!: IonSearchbar;

  cities$!: Observable<any>;
  words = [
    { emoji: '📦', text: 'Products' },
    { emoji: '🏪', text: 'Shops' },
    { emoji: '🎉', text: 'Events' },
  ];

  currentIndex = 0;
  currentWord = this.words[0];
  constructor(private ShopService: Shop) {}

  ngOnInit() {
    // this.cities$ = this.ShopService.getShops().pipe(
    //   map((res: any) => res.data)
    // );
  }

  nextHint() {
    this.currentIndex = (this.currentIndex + 1) % this.words.length;
    this.currentWord = this.words[this.currentIndex];
  }

  ionViewWillEnter() {
    StatusBar.setOverlaysWebView({ overlay: true });
    StatusBar.setBackgroundColor({ color: '#00000000' });
    this.cities$ = this.ShopService.getShops().pipe(
      map((res: any) => res.data),
    );
  }

  ionViewWillLeave() {}

  onMapDragend(event: any) {}

  handleRefresh(event: RefresherCustomEvent) {
    setTimeout(() => {
      // Any calls to load data go here
      event.target.complete();
    }, 2000);
  }
}
