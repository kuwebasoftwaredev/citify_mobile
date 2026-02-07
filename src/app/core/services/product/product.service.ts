import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Http } from '@capacitor-community/http';
import {
  catchError,
  from,
  switchMap,
  throwError,
  map,
  Observable,
  forkJoin,
  of,
} from 'rxjs';
import { Auth } from '../auth/auth.service';
import { Store } from '@ngrx/store';
import { logout } from 'src/app/state/auth/auth.actions';
import { Capacitor } from '@capacitor/core';
import { Image, ImageService } from '../image/image.service';
import { ReqCloudinaryImageMetadata } from 'src/app/pages/add-product/add-product.page';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(
    private http: HttpClient,
    private authService: Auth,
    private store: Store,
    private imageService: ImageService,
  ) {}

  saveProductWeb(data: any): Observable<any> {
    return this.http
      .post(`${environment.SERVER_URL_CLUSTERS}/product/createProduct`, data, {
        withCredentials: true,
      })
      .pipe(
        map((response: any) => {
          return response;
        }),
      );
  }

  updateProductWeb(productId: string, data: any): Observable<any> {
    return this.http
      .put(
        `${environment.SERVER_URL_CLUSTERS}/product/updateProduct/${productId}`,
        data,
        {
          withCredentials: true,
        },
      )
      .pipe(
        map((response: any) => {
          return response;
        }),
      );
  }
}
