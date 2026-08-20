import { Component, ViewChild, effect, signal } from '@angular/core';
import { IonSearchbar, RefresherCustomEvent } from '@ionic/angular';
import { StatusBar } from '@capacitor/status-bar';
import { MapGlComponent } from 'src/app/shared/components/map-gl/map-gl.component';
import { Shop } from 'src/app/core/services/shop/shop.service';
import { finalize, map, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { ExploreFilters } from 'src/app/shared/models/filters.model';

@Component({
  selector: 'app-deals',
  templateUrl: 'deals.page.html',
  styleUrls: ['deals.page.scss'],
  standalone: false,
})
export class DealsPage {
  @ViewChild(MapGlComponent) mapComponent!: MapGlComponent;
  @ViewChild('searchbar', { static: false })
  searchbar!: IonSearchbar;
  cities$!: Observable<any>;
  words = [
    { emoji: '📦', text: 'Products' },
    { emoji: '🏪', text: 'Shops' },
    { emoji: '🎉', text: 'Events' },
  ];
  filters = signal<ExploreFilters>({
    searchAroundMe: false,
    radius: 3,
    regionIds: [],
    cityIds: [],
    condition: [],
    delivery: [],
    sortBy: 'relevance',
    productRating: null,
    shopRating: null,
    priceRange: {
      lower: 0,
      upper: 20000,
    },
    categories: [],
  });
  currentIndex = 0;
  currentWord = this.words[0];

  constructor(
    private ShopService: Shop,
    public router: Router,
    private navCtrl: NavController,
  ) {}

  ngOnInit() {
    // this.cities$ = this.ShopService.getShops().pipe(
    //   map((res: any) => res.data)
    // );
  }

  openNotifications() {
    this.navCtrl.navigateForward('/notifications');
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
      event.target.complete();
    }, 2000);
  }

  onFiltersApply(filters: ExploreFilters) {
    this.filters.set(filters);
  }
}
