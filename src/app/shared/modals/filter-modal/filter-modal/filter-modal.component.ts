import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonRadio,
  IonRadioGroup,
  IonRange,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ExploreFilters } from 'src/app/shared/models/filters.model';
import { NgxStarsModule } from 'ngx-stars';

@Component({
  selector: 'app-filter-modal',
  host: {
    class: 'ion-page',
  },
  templateUrl: './filter-modal.component.html',
  styleUrls: ['./filter-modal.component.scss'],
  imports: [
    CommonModule,
    NgxStarsModule,
    IonButton,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonRadio,
    IonRadioGroup,
    IonRange,
    IonToggle,
    IonToolbar,
  ],
})
export class FilterModalComponent implements OnInit {
  @Input() filters!: ExploreFilters;
  @Output() apply = new EventEmitter<ExploreFilters>();
  @Output() close = new EventEmitter<void>();

  // Other filters
  otherFilters = signal({
    condition: [] as string[],
    sellerType: [] as string[],
    delivery: [] as string[],
    availability: [] as string[],
    priceType: [] as string[],
    sortBy: 'recommended',
  });
  // Price Range Filter
  rangeValue = signal({
    lower: 0,
    upper: 12000,
  });
  // Map Filter
  radius = signal(5);
  radiusOptions = [1, 5, 10, 20, 50];
  searchAroundMe = signal(true);
  // Categories
  categories = [
    { id: 'all', name: 'All', icon: 'apps' },
    { id: 'electronics', name: 'Electronics', icon: 'mobile_3' },
    { id: 'automotive', name: 'Automotive', icon: 'directions_car' },
    { id: 'services', name: 'Services', icon: 'map' },
    { id: 'home', name: 'Home', icon: 'home_and_garden' },
    { id: 'sports', name: 'Sports', icon: 'sports_basketball' },
  ];
  selectedCategories = signal<string[]>([]);

  readonly pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  constructor() {}

  ngOnInit() {}

  onRangeChange(event: any) {
    const value = event.detail.value;

    if (value.lower >= value.upper) {
      // Restore previous valid values
      event.target.value = this.rangeValue();
      return;
    }

    this.rangeValue.set({
      lower: value.lower,
      upper: value.upper,
    });
  }

  formatPrice(value: number): string {
    return `P${value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  onRadiusChange(event: any) {
    const value = event.detail.value;

    this.radius.set(this.radiusOptions[value]);

    console.log('Radius changed:', this.radius());
  }

  toggleSearchAroundMe() {
    this.searchAroundMe.update((value) => !value);
  }

  onCategorySelect(id: string) {
    if (id === 'all') {
      this.selectedCategories.set([]);
      return;
    }

    this.selectedCategories.update((selected) => {
      if (selected.includes(id)) {
        return selected.filter((x) => x !== id);
      }

      return [...selected, id];
    });
  }
}
