import { Component, ViewChild } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
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
  cities$!: Observable<any>;
  constructor(private ShopService: Shop) {}

  ngOnInit() {
    // this.cities$ = this.ShopService.getShops().pipe(
    //   map((res: any) => res.data)
    // );
  }

  ionViewWillEnter() {
    StatusBar.setOverlaysWebView({ overlay: false });
    StatusBar.setBackgroundColor({ color: '#f7d94f' });
    this.cities$ = this.ShopService.getShops().pipe(
      map((res: any) => res.data)
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
