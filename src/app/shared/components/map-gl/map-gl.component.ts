import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import * as maplibregl from 'maplibre-gl';
import { Subject, takeUntil } from 'rxjs';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import { Geolocation } from 'src/app/core/services/geolocation/geolocation.service';

type Coordinates = [number, number];

type MapShop = {
  id?: string | number;
  name?: string;
  coordinates?: { lat?: number | string; lng?: number | string };
};

type MapCity = {
  name?: string;
  shops?: MapShop[];
};

@Component({
  selector: 'app-map-gl',
  templateUrl: './map-gl.component.html',
  styleUrls: ['./map-gl.component.scss'],
  standalone: true,
  imports: [DecimalPipe],
})
export class MapGlComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
  private static readonly shopsSourceId = 'shops';
  private static readonly shopClustersLayerId = 'shop-clusters';
  private static readonly shopClusterCountLayerId = 'shop-cluster-count';
  private static readonly shopMarkersLayerId = 'shop-markers';
  private static readonly radiusSourceId = 'search-radius';
  private static readonly radiusFillLayerId = 'search-radius-fill';
  private static readonly radiusOutlineLayerId = 'search-radius-outline';

  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  /** MapLibre instance, exposed to match the former map component API. */
  map?: maplibregl.Map;

  @Input() cities: MapCity[] = [];
  @Input() buyers: any[] = [];
  @Input() subject: any = {};
  @Input() radius = 0;
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

  @Output() dragend = new EventEmitter<{ lat: number; lng: number }>();

  private readonly destroy$ = new Subject<void>();
  private mapInitTimeout?: ReturnType<typeof setTimeout>;
  private mapLoaded = false;
  private userMarker?: maplibregl.Marker;
  private buyerMarkers: maplibregl.Marker[] = [];

  productListSheet: any;
  topRatedShopsSheet: any;
  nearShopsSheet: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private geolocationService: Geolocation,
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const queryRadius = Number(params['radius']);

        if (Number.isFinite(queryRadius) && queryRadius > 0) {
          this.radius = queryRadius * 1000;
          this.updateRadiusCircle();
        }
      });
  }

  ngAfterViewInit(): void {
    this.mapInitTimeout = setTimeout(() => this.initializeMap());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapLoaded) {
      return;
    }

    if (changes['cities']) {
      this.addNearShops();
    }

    if (changes['buyers']) {
      // this.addNearBuyers();
    }

    if (changes['subject'] || changes['radius'] || changes['disabled']) {
      this.setUserMapPin('buyer', Boolean(changes['subject']));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.mapInitTimeout);

    if (this.themeMediaQuery && this.themeListener) {
      this.themeMediaQuery.removeEventListener('change', this.themeListener);
    }

    this.userMarker?.remove();
    this.buyerMarkers.forEach((marker) => marker.remove());
    this.map?.remove();
    this.map = undefined;
  }

  private themeMediaQuery?: MediaQueryList;
  private themeListener?: (event: MediaQueryListEvent) => void;
  private initializeMap(): void {
    this.map?.remove();

    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: this.getMapStyle(),
      center: [122.95581735004998, 10.683557706359178],
      zoom: 9,
      minZoom: 9,
      maxZoom: 20,
      maxBounds: [
        [115.5, 4.4],
        [127.5, 21.5],
      ],
    });

    this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    this.themeListener = () => {
      if (!this.map) {
        return;
      }

      this.map.setStyle(this.getMapStyle());

      this.map.once('style.load', async () => {
        await this.loadMapImages();
        this.hideUnwantedMapLabelsAndRoutes();

        this.addShopLayers();
        this.addNearShops();
        // this.addRadiusLayers();
        // this.addNearBuyers();
        this.setUserMapPin('buyer', false);
      });
    };

    this.themeMediaQuery.addEventListener('change', this.themeListener);

    this.map.on('error', (event) => {
      console.error('❌ MAPLIBRE ERROR:', event);
    });

    this.map.on('webglcontextlost', (event) => {
      console.error('❌ WEBGL CONTEXT LOST', event);
    });

    // this.map.addControl(
    //   new maplibregl.NavigationControl({ showCompass: false }),
    //   'top-left',
    // );

    this.map.on('load', async () => {
      await this.loadMapImages();
      this.hideUnwantedMapLabelsAndRoutes();

      this.mapLoaded = true;

      this.addShopLayers();
      // this.addRadiusLayers();
      this.addNearShops();
      // this.addNearBuyers();
      this.setUserMapPin('buyer', false);
      this.map?.resize();
    });
  }

  private getMapStyle(): string {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'https://tiles.openfreemap.org/styles/dark'
      : 'https://tiles.openfreemap.org/styles/bright';
  }

  private addShopLayers(): void {
    if (!this.map || this.map.getSource(MapGlComponent.shopsSourceId)) {
      return;
    }

    this.map.addSource(MapGlComponent.shopsSourceId, {
      type: 'geojson',
      data: this.emptyPoints(),
      cluster: true,
      clusterMaxZoom: 15,
      clusterMinPoints: 5,
      clusterRadius: 60,
    });

    // Cluster pin + count
    this.map.addLayer({
      id: MapGlComponent.shopClustersLayerId,
      type: 'symbol',
      source: MapGlComponent.shopsSourceId,
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': 'clusterPin',
        'icon-size': 1,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 15,
        'text-anchor': 'bottom',
        'text-offset': [0, -4.5],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#a102f6',
        'text-halo-width': 4,
      },
    } as any);

    // Individual shop pin
    this.map.addLayer({
      id: MapGlComponent.shopMarkersLayerId,
      type: 'symbol',
      source: MapGlComponent.shopsSourceId,

      filter: ['!', ['has', 'point_count']],

      layout: {
        'icon-image': 'shopPin',
        'icon-size': 1,
        'icon-ignore-placement': true,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
      },
    } as any);

    this.map.on('click', MapGlComponent.shopClustersLayerId, (event: any) =>
      this.expandCluster(event),
    );
    this.map.on('click', MapGlComponent.shopMarkersLayerId, (event: any) =>
      this.openShopPopup(event),
    );

    for (const layerId of [
      MapGlComponent.shopClustersLayerId,
      MapGlComponent.shopMarkersLayerId,
    ]) {
      this.map.on('mouseenter', layerId, () => {
        if (this.map) {
          this.map.getCanvas().style.cursor = 'pointer';
        }
      });
      this.map.on('mouseleave', layerId, () => {
        if (this.map) {
          this.map.getCanvas().style.cursor = '';
        }
      });
    }
  }

  private async loadMapImages(): Promise<void> {
    if (!this.map) {
      return;
    }

    const shopPinURL = new URL('assets/icons/pin.png', document.baseURI).href;
    const shopPinImage = await this.map.loadImage(shopPinURL);
    const clusterPinURL = new URL('assets/icons/favicon.png', document.baseURI)
      .href;
    const clusterPinImage = await this.map.loadImage(clusterPinURL);

    this.map.addImage('shopPin', shopPinImage.data);
    this.map.addImage('clusterPin', clusterPinImage.data);
  }

  private addRadiusLayers(): void {
    if (!this.map || this.map.getSource(MapGlComponent.radiusSourceId)) {
      return;
    }

    this.map.addSource(MapGlComponent.radiusSourceId, {
      type: 'geojson',
      data: this.emptyPolygons(),
    });

    this.map.addLayer({
      id: MapGlComponent.radiusFillLayerId,
      type: 'fill',
      source: MapGlComponent.radiusSourceId,
      paint: {
        'fill-color': '#f8da50',
        'fill-opacity': 0.3,
      },
    } as any);

    this.map.addLayer({
      id: MapGlComponent.radiusOutlineLayerId,
      type: 'line',
      source: MapGlComponent.radiusSourceId,
      paint: {
        'line-color': '#f8da50',
        'line-opacity': 0.65,
        'line-width': 1,
      },
    } as any);
  }

  /** Replaces Leaflet markercluster with MapLibre's GeoJSON clustering. */
  addNearShops(): void {
    const source = this.map?.getSource(MapGlComponent.shopsSourceId) as
      | maplibregl.GeoJSONSource
      | undefined;

    if (!source) {
      return;
    }

    void source.setData(this.createShopFeatures());
  }

  addNearBuyers(): void {
    this.buyerMarkers.forEach((marker) => marker.remove());
    this.buyerMarkers = [];

    if (!this.map) {
      return;
    }

    for (const buyer of this.buyers) {
      const coordinates = this.getCoordinates(buyer);
      if (!coordinates) {
        continue;
      }

      const marker = new maplibregl.Marker({
        element: this.createPin(
          'https://cdn-icons-png.flaticon.com/128/8587/8587894.png',
          40,
        ),
        anchor: 'bottom',
      })
        .setLngLat(coordinates)
        .setPopup(
          new maplibregl.Popup({ offset: 24 }).setText(
            String(buyer?.name ?? 'Buyer'),
          ),
        )
        .addTo(this.map);

      this.buyerMarkers.push(marker);
    }
  }

  setUserMapPin(userType: 'buyer' | 'seller' = 'buyer', animate = true): void {
    const coordinates = this.getCoordinates(this.subject);

    console.log('coordinates', coordinates);

    this.userMarker?.remove();
    this.userMarker = undefined;
    this.updateRadiusCircle(coordinates ?? undefined);

    if (!this.map || !coordinates) {
      return;
    }

    const iconUrl =
      userType === 'buyer'
        ? 'https://cdn-icons-png.flaticon.com/128/8587/8587894.png'
        : 'https://cdn-icons-png.flaticon.com/128/869/869432.png';

    this.userMarker = new maplibregl.Marker({
      element: this.createPin(iconUrl, 50),
      draggable: !this.disabled,
      anchor: 'bottom',
    })
      .setLngLat(coordinates)
      .setPopup(
        new maplibregl.Popup({ offset: 30 }).setText('Current location'),
      )
      .addTo(this.map);

    this.userMarker.on('dragend', () => {
      const position = this.userMarker?.getLngLat();
      if (!position) {
        return;
      }

      this.subject = {
        coordinates: { lat: position.lat, lng: position.lng },
      };
      this.updateRadiusCircle([position.lng, position.lat]);
      this.dragend.emit({ lat: position.lat, lng: position.lng });
    });

    if (animate) {
      this.map.flyTo({ center: coordinates, zoom: 12, essential: true });
    }
  }

  private updateRadiusCircle(
    center = this.getCoordinates(this.subject) ?? undefined,
  ): void {
    const source = this.map?.getSource(MapGlComponent.radiusSourceId) as
      | maplibregl.GeoJSONSource
      | undefined;

    if (!source) {
      return;
    }

    const data =
      center && this.radius > 0
        ? this.createRadiusFeature(center, this.radius)
        : this.emptyPolygons();

    void source.setData(data);
  }

  onRadiusInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const radius = input.valueAsNumber;

    if (!Number.isFinite(radius)) {
      return;
    }

    this.radius = radius;
    this.updateRadiusCircle();
  }

  onRadiusChange(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { radius: Math.round(this.radius / 1000) },
      queryParamsHandling: 'merge',
    });
  }

  private async getCurrentPosition(): Promise<void> {
    try {
      const position = await this.geolocationService.getCurrentPosition();
      this.subject = {
        coordinates: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
      };
      this.dragend.emit(this.subject.coordinates);
      this.setUserMapPin();
    } catch (error) {
      console.error('Unable to get the current location.', error);
    }
  }

  private updateLocByUserClick(lat: number, lng: number): void {
    this.subject = { coordinates: { lat, lng } };
    this.dragend.emit({ lat, lng });
    this.setUserMapPin();
  }

  private expandCluster(event: any): void {
    const feature = event.features?.[0];
    const source = this.map?.getSource(MapGlComponent.shopsSourceId) as
      | maplibregl.GeoJSONSource
      | undefined;

    if (!feature || !source || feature.geometry?.type !== 'Point') {
      return;
    }

    const clusterId = Number(feature.properties?.['cluster_id']);
    const center = feature.geometry.coordinates as Coordinates;

    void source.getClusterExpansionZoom(clusterId).then((zoom) => {
      this.map?.easeTo({ center, zoom });
    });
  }

  private openShopPopup(event: any): void {
    const feature = event.features?.[0];

    if (!feature || feature.geometry?.type !== 'Point') {
      return;
    }

    const coordinates = feature.geometry.coordinates as Coordinates;
    const name = this.escapeHtml(
      String(feature.properties?.['name'] ?? 'Shop'),
    );
    const city = this.escapeHtml(String(feature.properties?.['city'] ?? ''));

    new maplibregl.Popup({ offset: 12 })
      .setLngLat(coordinates)
      .setHTML(`<strong>${name}</strong>${city ? `<br>${city}` : ''}`)
      .addTo(this.map!);
  }

  private createShopFeatures(): FeatureCollection<Point> {
    const features: Feature<Point>[] = [];
    const cities = this.generateMockCities(); //this.cities;

    for (const city of cities) {
      for (const shop of city.shops ?? []) {
        const coordinates = this.getCoordinates(shop);
        if (!coordinates) {
          continue;
        }

        features.push({
          type: 'Feature',
          properties: {
            id: String(shop.id ?? ''),
            name: shop.name ?? 'Shop',
            city: city.name ?? '',
          },
          geometry: { type: 'Point', coordinates },
        });
      }
    }

    return { type: 'FeatureCollection', features };
  }

  /** Mirrors the temporary data used by the Leaflet component when no shops are supplied. */
  generateMockCities(): MapCity[] {
    const locations = [
      { name: 'Iloilo City', lat: 10.7202, lng: 122.5621 },
      { name: 'Manila', lat: 14.5995, lng: 120.9842 },
      { name: 'Cebu City', lat: 10.3157, lng: 123.8854 },
      { name: 'Davao City', lat: 7.1907, lng: 125.4553 },
      { name: 'Bacolod City', lat: 10.6765, lng: 122.9509 },
    ];

    return locations.map((city) => ({
      name: city.name,
      shops: Array.from({ length: 100 }, (_, index) => ({
        id: `${city.name}-${index}`,
        name: `Shop ${index + 1} ${city.name}`,
        coordinates: {
          lat: city.lat + (Math.random() - 0.5) * 0.15,
          lng: city.lng + (Math.random() - 0.5) * 0.15,
        },
      })),
    }));
  }

  private createRadiusFeature(
    [centerLng, centerLat]: Coordinates,
    radiusMeters: number,
  ): FeatureCollection<Polygon> {
    const points = 64;
    const latitudeDelta = radiusMeters / 111_320;
    const longitudeDelta =
      radiusMeters / (111_320 * Math.cos((centerLat * Math.PI) / 180));
    const ring: Coordinates[] = [];

    for (let index = 0; index <= points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      ring.push([
        centerLng + Math.sin(angle) * longitudeDelta,
        centerLat + Math.cos(angle) * latitudeDelta,
      ]);
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [ring] },
        },
      ],
    };
  }

  private emptyPoints(): FeatureCollection<Point> {
    return { type: 'FeatureCollection', features: [] };
  }

  private emptyPolygons(): FeatureCollection<Polygon> {
    return { type: 'FeatureCollection', features: [] };
  }

  private hideUnwantedMapLabelsAndRoutes(): void {
    if (!this.map) {
      return;
    }

    const style = this.map.getStyle();

    for (const layer of style.layers ?? []) {
      const sourceLayer =
        'source-layer' in layer ? layer['source-layer'] : undefined;

      const layerId = layer.id.toLowerCase();
      const source = String(sourceLayer ?? '').toLowerCase();

      const isPoiOrWaterwayLabel =
        layer.type === 'symbol' &&
        (sourceLayer === 'poi' || sourceLayer === 'waterway');

      const isFerryLayer =
        layerId.includes('ferry') ||
        layerId.includes('ferries') ||
        source.includes('ferry');

      if (isPoiOrWaterwayLabel || isFerryLayer) {
        this.map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    }
  }

  private getCoordinates(value: any): Coordinates | null {
    const coordinates = value?.coordinates ?? value;
    const lat = Number(coordinates?.lat);
    const lng = Number(coordinates?.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null;
    }

    return [lng, lat];
  }

  private createPin(url: string, size: number): HTMLImageElement {
    const element = document.createElement('img');
    element.src = url;
    element.alt = '';
    element.width = size;
    element.height = size;
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    element.style.objectFit = 'contain';
    element.style.cursor = 'pointer';
    return element;
  }

  private escapeHtml(value: string): string {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return value.replace(/[&<>"']/g, (character) => replacements[character]);
  }

  public productVisibility = false;
  public distanceVisibility = false;
  public ratingVisibility = false;

  toggleProductVisibility(): void {
    if (this.productListSheet) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: 'products' },
      queryParamsHandling: 'merge',
    });
  }

  toggleTopRatedShopsVisibility(): void {
    if (this.topRatedShopsSheet) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: 'topRatedShops' },
      queryParamsHandling: 'merge',
    });
  }

  toggleNearShopsVisibility(): void {
    if (this.nearShopsSheet) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: 'topNearShops' },
      queryParamsHandling: 'merge',
    });
  }
}
