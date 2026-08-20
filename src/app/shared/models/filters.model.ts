export interface ExploreFilters {
  searchAroundMe: boolean;
  radius: number;

  regionIds: string[];
  cityIds: string[];

  condition: string[];
  delivery: string[];
  sortBy: string;

  productRating: number | null;
  shopRating: number | null;

  priceRange: {
    lower: number;
    upper: number;
  };

  categories: string[];
}
