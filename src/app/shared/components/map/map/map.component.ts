import {
  AfterViewInit,
  Component,
  DoCheck,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  firstValueFrom,
  Observable,
  Subject,
  Subscriber,
  takeUntil,
} from 'rxjs';
// import { GeolocationService } from "../../services/geolocation/geolocation.service";
// import { HttpRequestService } fromp "src/app/http-request/http-request.service";

// import { ProductListComponent } from "src/app/bottom-sheets/product-list/product-list.component";
// import { BottomSheetProvider } from "swipe-bottom-sheet/angular";
import { size } from 'lodash';
import { Geolocation } from 'src/app/core/services/geolocation/geolocation.service';
// import { ShopListComponent } from "src/app/bottom-sheets/shop-list/shop-list.component";
declare let L: any; // Declare Leaflet from the global scope

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
  map: any;
  circle: any;
  marker: any;

  @Input() cities: any[] = [];
  @Input() buyers: any[] = [];
  @Input() subject: any = {};
  @Input() radius: number = 0;
  @Input() detectCurrentLocation = false;
  @Input() checkDBLocation = false;
  @Input() disabled = true;
  @Input() isShop = false;
  @Input() nearestShopButton = false;
  @Input() topRatedShopButton = false;

  @HostBinding('style.height') @Input() height = '100%';
  @HostBinding('style.z-index') @Input() zIndex = '1';
  @HostBinding('style.border-radius') @Input() borderRadius = '0px';
  @HostBinding('style.display') display = 'block';
  @HostBinding('style.overflow') overflow = 'hidden';

  @Output() dragend = new EventEmitter<any>();
  destroy$ = new Subject<void>();

  productListSheet: any;
  topRatedShopsSheet: any;
  nearShopsSheet: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    // private hrs: HttpRequestService,
    private GeolocationService: Geolocation // private swipeSheet: BottomSheetProvider
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (params: any) => {
        if (params.radius) this.radius = params.radius * 1000;

        if (params.view === 'products' && !this.productListSheet) {
          // console.log('-----x');
          // this.productListSheet = this.swipeSheet
          //   .show(ProductListComponent, {
          //     title: '',
          //     props: {},
          //     stops: [200, 800],
          //   })
          //   .then(() => {
          //     this.productListSheet = null;
          //     this.nearShopsSheet = null;
          //     this.topRatedShopsSheet = null;
          //     this.router.navigate([], {
          //       relativeTo: this.route,
          //       queryParams: { view: null },
          //       queryParamsHandling: 'merge',
          //     });
          //   });
          // this.productVisibility = true;
        } else {
          // this.productVisibility = false;
        }

        if (params.view === 'topNearShops' && !this.nearShopsSheet) {
          // this.nearShopsSheet = this.swipeSheet
          //   .show(ShopListComponent, {
          //     title: '',
          //     props: {
          //       sortBy: 'distance',
          //     },
          //     stops: [200, 800],
          //   })
          //   .then(() => {
          //     this.productListSheet = null;
          //     this.nearShopsSheet = null;
          //     this.topRatedShopsSheet = null;
          //     this.router.navigate([], {
          //       relativeTo: this.route,
          //       queryParams: { view: null },
          //       queryParamsHandling: 'merge',
          //     });
          //   });
          // this.distanceVisibility = true;
        } else {
          // this.distanceVisibility = false;
        }

        if (params.view === 'topRatedShops' && !this.topRatedShopsSheet) {
          // this.topRatedShopsSheet = await this.swipeSheet
          //   .show(ShopListComponent, {
          //     title: '',
          //     props: {
          //       sortBy: 'rating',
          //     },
          //     stops: [200, 800],
          //   })
          //   .then(() => {
          //     this.productListSheet = null;
          //     this.nearShopsSheet = null;
          //     this.topRatedShopsSheet = null;
          //     this.router.navigate([], {
          //       relativeTo: this.route,
          //       queryParams: { view: null },
          //       queryParamsHandling: 'merge',
          //     });
          //   });
          // this.ratingVisibility = true;
        } else {
          // this.ratingVisibility = false;
        }
      });
  }

  private mapInitTimeout: any;
  ngAfterViewInit(): void {
    this.bootUp();
  }

  bootUp() {
    // We wrap map initialization in a setTimeout to ensure Angular has fully
    // rendered the map container div. If Leaflet initializes before the container
    // has proper width/height, tiles may not load correctly, showing only one SVG.
    this.mapInitTimeout = setTimeout(() => {
      this.loadMap();

      if (this.map) {
        // Leaflet caches the container size at initialization.
        // invalidateSize() forces Leaflet to recalculate the map size and redraw
        // all tiles. This fixes the common problem where only part of the map loads
        // or tiles are missing until you pan/zoom.
        this.map.invalidateSize();
      }
    }, 0);
  }

  cleanUp() {
    console.log('Map cleanUp');
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.mapInitTimeout);
    if (this.map) {
      this.map.off(); // Remove all event listeners
      this.map.remove(); // Completely removes the map and its layers from the DOM
      this.map = null;
    }

    if (this.circle) {
      this.circle.remove(); // Optional: remove the circle layer if it exists
      this.circle = null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.addNearShops();

    if (
      changes['subject'] &&
      this.subject?.coordinates?.lat &&
      this.subject?.coordinates?.lng
    ) {
      console.log('Map initializing with subject:', this.subject);
      this.loadMap();
    }
  }

  ngOnDestroy(): void {
    console.log('Map destroyed');
    this.cleanUp();
  }

  private getCurrentPosition() {
    return new Promise((resolve, reject) => {
      this.GeolocationService.getCurrentPosition()
        .then((position) => {
          this.subject = {
            coordinates: {
              lat: position.coords.latitude.toString(),
              lng: position.coords.longitude.toString(),
            },
          };
          this.dragend.emit(this.subject.coordinates);
          resolve(this.subject);
        })
        .catch((err) => {
          console.error(err);
          resolve(null);
        });
    });
  }

  private async getPositionFromDB() {
    // const { data } = (await firstValueFrom(
    //   this.hrs.request('getV2', `user/getAuthUser`, {})
    // )) as any;
    // this.subject = {
    //   coordinates: {
    //     lat: data.coordinates.lat.toString(),
    //     lng: data.coordinates.lng.toString(),
    //   },
    // };
  }

  private async getShopCoordinates() {
    // const { data } = (await firstValueFrom(
    //   this.hrs.request('getV2', `shop/getShop`, {})
    // )) as any;
    // this.subject = {
    //   coordinates: {
    //     lat: data.coordinates.lat.toString(),
    //     lng: data.coordinates.lng.toString(),
    //   },
    // };
    // this.dragend.emit(this.subject.coordinates);
  }

  private updateLocByUserClick(lat: string, lng: string) {
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }

    if (this.circle) {
      this.map.removeLayer(this.circle);
    }

    // Move the radius circle alog with the marker
    if (this.radius > 0) this.circle.setLatLng([lat, lng]);

    this.subject = {
      coordinates: {
        lat: lat.toString(),
        lng: lng.toString(),
      },
    };
    this.dragend.emit(this.subject.coordinates);
    this.setUserMapPin();
  }

  private async loadMap() {
    // Destroy existing map if already initialized
    if (this.map) {
      this.map.off(); // Remove all event listeners
      this.map.remove(); // Properly destroy the map
      this.map = null; // Clear the reference
    }

    // if (!this.isShop) {
    //   if (this.checkDBLocation) await this.getPositionFromDB();
    //   else await this.getCurrentPosition();
    // } else if (this.isShop) {
    //   await this.getShopCoordinates();
    // }

    this.map = L.map('map', {
      center: [12.8797, 121.774], // Center of the Philippines

      minZoom: 5,
      maxZoom: 25,
      maxBounds: [
        [4.5, 116.0], // Southwest corner (Palawan)
        [21.0, 127.0], // Northeast corner (Batanes)
      ],
      maxBoundsViscosity: 1.0, // Fully restrict panning outside bounds
      zoomAnimation: true,
      fadeAnimation: true,
      zoomControl: false,
    }).setView([0, 5], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 5,
      maxZoom: 25,
      detectRetina: true,
    }).addTo(this.map);

    this.addZoomControl();
    this.addRadiusSlider(); // to remove
    // if (!this.isShop) {
    //   this.addRadiusSlider();
    //   this.addGPSButton();
    // }

    // if (!this.isShop) this.setUserMapPin();
    // else this.setUserMapPin('seller');

    // if (!this.isShop) {

    //   this.map.on('click', (event: any) => {
    //     const { lat, lng } = event.latlng;

    //     this.updateLocByUserClick(lat, lng);
    //   });
    // } else {
    //   this.addNearBuyers();
    // }
  }

  addZoomControl(): void {
    // Create the zoom control
    const zoomControl = L.control.zoom({
      position: 'topleft',
      zoomInText:
        '<ion-icon name="add-sharp" style="color: #f8da50;"></ion-icon> ',
      zoomOutText:
        '<ion-icon name="remove-sharp" style="color: #f8da50;"></ion-icon>',
    });

    // Add it to the map
    zoomControl.addTo(this.map);
    const zoomInButton = document.querySelector(
      '.leaflet-control-zoom-in'
    ) as HTMLElement;
    if (zoomInButton) {
      zoomInButton.style.display = 'flex';
      zoomInButton.style.alignItems = 'center';
      zoomInButton.style.justifyContent = 'center';
    }

    const zoomOutButton = document.querySelector(
      '.leaflet-control-zoom-out'
    ) as HTMLElement;
    if (zoomOutButton) {
      zoomOutButton.style.display = 'flex';
      zoomOutButton.style.alignItems = 'center';
      zoomOutButton.style.justifyContent = 'center';
    }
    // Access and style its container element
    const container = zoomControl.getContainer();
    container.style.background = 'white';
    container.style.borderRadius = '10px';
    container.style.padding = '4px';
    container.style.border = 'none';
  }

  addGPSButton(): void {
    const gpsButton = L.control({ position: 'topleft' });

    gpsButton.onAdd = () => {
      const container = L.DomUtil.create('div', 'gps-control');
      container.innerHTML = `
        <style>     
        #gpsButton {
          background: white;
          border-radius: 10px;
          top: 35px;
          color: #f8da50;
          padding: 4px;
          border: none;  
          width: 38px;      
          }
          </style>
        <button id="gpsButton"> <i class="material-icons">gps_fixed</i></button>
      `;

      const gpsButton = container.querySelector(
        '#gpsButton'
      ) as HTMLLabelElement;

      gpsButton.addEventListener('click', async (event) => {
        await this.getCurrentPosition();
        if (this.marker) {
          this.map.removeLayer(this.marker);
        }

        if (this.circle) {
          this.map.removeLayer(this.circle);
        }
        this.setUserMapPin();
      });

      return container;
    };
    gpsButton.addTo(this.map);
  }

  addRadiusSlider(): void {
    const sliderControl = L.control({ position: 'topright' });

    sliderControl.onAdd = () => {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      container.innerHTML = `
  <style>
 
    #radius-slider {
      -webkit-appearance: none; 
      appearance: none;
      width: 150px;
      height: 8px; 
      border-radius: 10px;
      background: #ddd; 
      outline: none; 
    }

    #radius-value {
      color: #f8da50;
    }
   
    #radius-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px; 
      height: 20px; 
      border-radius: 50%;
      background: #f8da50;
      cursor: pointer; 
    }


    #radius-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #f8da50; 
      cursor: pointer;
    }

  </style>
`;

      if (this.radius > 0) {
        container.innerHTML += `<input id="radius-slider" type="range" min="3000" max="20000" value="" step="1000">
  <label id="radius-value">3 KM</label>`;
      }

      // Prevent map drag while interacting with slider
      L.DomEvent.disableClickPropagation(container);

      if (this.radius > 0) {
        // Set custom CSS
        Object.assign(container.style, {
          background: 'white',
          padding: '10px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          font: 'Poppins',
          fontFamily: 'Poppins, sans-serif',
          border: 'none',
        });

        // Handle slider input
        let slider = container.querySelector(
          '#radius-slider'
        ) as HTMLInputElement;
        const label = container.querySelector(
          '#radius-value'
        ) as HTMLLabelElement;
        slider.value = this.radius.toString();

        label.textContent = `${(this.radius / 1000).toFixed(0)} KM`;
        slider.addEventListener('input', (event) => {
          const newRadius = Number(slider.value);
          this.circle.setRadius(newRadius);
          label.textContent = `${(newRadius / 1000).toFixed(0)} KM`;
        });

        slider.addEventListener('change', () => {
          const radius = (Number(slider.value) / 1000).toFixed(0);

          // Perform actions AFTER the user stops sliding

          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
              radius: radius,
            },
            queryParamsHandling: 'merge',
          });
        });
      }

      return container;
    };

    sliderControl.addTo(this.map);
  }

  addNearShops() {
    if (size(this.cities) <= 0) return;
    const SHOPIcon = L.divIcon({
      html: `<img src="https://cdn-icons-png.flaticon.com/128/869/869432.png" style="width: 40px; height: 40px;" />`,
      className: 'xxxx', // Remove default styles
      iconSize: [40, 40],
    });

    this.cities.forEach((city) => {
      for (const shop of city.shops) {
        const marker = L.marker([shop.coordinates.lat, shop.coordinates.lng], {
          icon: SHOPIcon,
        }).addTo(this.map);

        // Optional popup
        marker.bindPopup('Angular Leaflet');

        marker.on('click', () => {});
      }
    });

    // Listen to zoom changes and scale icons
    this.map.on('zoomend', () => {
      const zoom = this.map.getZoom();
      console.log('Zoom level:', zoom);
      const scale = zoom / 2; // Adjust as needed
      document.querySelectorAll('.xxxx img').forEach((el: any) => {
        el.style.width = `${40 - scale}px`;
        el.style.height = `${40 - scale}px`;
      });
    });
  }

  addNearBuyers() {
    //Buyers Marker
    if (size(this.buyers) > 0) {
      const BuyerIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/128/8587/8587894.png',
        iconSize: [40, 40], // Width and height
        iconAnchor: [20, 40], // Pinpoint position (center-bottom)
        popupAnchor: [0, -40], // Position relative to the marker
      });
      this.buyers.forEach((buyer) => {
        L.marker([buyer.coordinates.lat, buyer.coordinates.lng], {
          draggable: false,
          icon: BuyerIcon,
        })
          .bindPopup()
          .addTo(this.map);
      });
    }
    //END
  }

  setUserMapPin(userType = 'buyer') {
    if (this.radius > 0 && userType === 'buyer') {
      this.circle = L.circle(
        [this.subject.coordinates.lat, this.subject.coordinates.lng],
        {
          color: 'transparent',
          fillColor: '#f8da50',
          fillOpacity: 0.3,
          stroke: false,
          radius: this.radius, // 1km in meters
        }
      ).addTo(this.map);
    }
    //END

    // this.getCurrentPosition().subscribe((position: any) => {
    this.map.flyTo(
      [this.subject.coordinates.lat, this.subject.coordinates.lng],
      12,
      { animate: true }
    );

    const iconUrl =
      userType === 'buyer'
        ? 'https://cdn-icons-png.flaticon.com/128/8587/8587894.png'
        : 'https://cdn-icons-png.flaticon.com/128/869/869432.png';
    //USER LOC MARKER
    const userLoc = L.icon({
      iconUrl,
      iconSize: [50, 50], // Width and height
      iconAnchor: [20, 40], // Pinpoint position (center-bottom)
      popupAnchor: [0, -40], // Position relative to the marker
    });
    this.marker = L.marker(
      [this.subject.coordinates.lat, this.subject.coordinates.lng],
      {
        draggable: !this.disabled,
        icon: userLoc,
      }
    )
      .bindPopup('Angular Leaflet')
      .addTo(this.map);

    // Listen for drag events
    this.marker.on('dragend', (event: any) => {
      console.log('Map::dragend');
      const position = event.target.getLatLng();
      // Move the radius circle alog with the marker
      console.log('======,this.radius', this.radius);
      if (this.radius > 0) this.circle.setLatLng([position.lat, position.lng]);
      this.dragend.emit(position);
    });
    // });
  }

  public productVisibility = false;
  public distanceVisibility = false;
  public ratingVisibility = false;
  public async toggleProductVisibility() {
    if (this.productListSheet) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: 'products' },
      queryParamsHandling: 'merge',
    });
  }

  toggleTopRatedShopsVisibility() {
    if (this.topRatedShopsSheet) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: 'topRatedShops' },
      queryParamsHandling: 'merge',
    });
  }

  toggleNearShopsVisibility() {
    if (this.nearShopsSheet) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: 'topNearShops' },
      queryParamsHandling: 'merge',
    });
  }
}
