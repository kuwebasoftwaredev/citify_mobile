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
export class CloudinaryService {
  constructor(
    private http: HttpClient,
    private authService: Auth,
    private store: Store,
    private imageService: ImageService,
  ) {}

  uploadProductGalleryMobile(
    gallery: ReqCloudinaryImageMetadata[],
    productId: string,
  ): Observable<Image[]> {
    const shopId = '345345345345'; // TODO: get shop ID dynamically

    const uploads$ = gallery.map((item: ReqCloudinaryImageMetadata, index) =>
      from(
        Http.uploadFile({
          url: 'https://api.cloudinary.com/v1_1/dvgac4hr2/image/upload',
          filePath: item.src,
          name: 'file',
          data: {
            upload_preset: 'ionic_products',
            folder: `citify/shops/${shopId}/${productId}/gallery`,
            context: `order=${index}`,
            filename_override: item.id,
          },
        }),
      ).pipe(
        map((res: any) => ({
          id: item.id,
          order: item.order,
          src: item.src,

          cloudinary: {
            publicId: res.public_id,
            url: res.secure_url,
          },
          uploaded: { cloudinary: true, database: false },
        })),
      ),
    );

    return forkJoin(uploads$);
  }

  uploadProductGalleryWeb(
    gallery: ReqCloudinaryImageMetadata[],
    productId: string,
  ): Observable<Image[]> {
    const shopId = '345345345345';

    // Step 1: Convert all blobs to File objects
    const blobPromises = gallery.map((img: ReqCloudinaryImageMetadata) =>
      this.imageService.blobUrlToBlob(img.src).then((blob) => ({
        blob,
        order: img.order,
        src: img.src,
        id: img.id,
      })),
    );

    // Step 2: Wait for all blobs and return Observable
    return from(Promise.all(blobPromises)).pipe(
      switchMap((filesWithOrder) => {
        const uploads$ = filesWithOrder.map((item) => {
          const formData = new FormData();

          formData.append('file', item.blob);
          formData.append('filename_override', item.id);
          formData.append('upload_preset', 'ionic_products');
          formData.append(
            'folder',
            `citify/shops/${shopId}/${productId}/gallery`,
          );
          formData.append('context', `order=${item.order}`);

          // // === Simulate failure for one image ===
          // if (item.order === 1) {
          //   // fail 2nd image for testing
          //   return of(null); // this image will be treated as failed
          // }

          return this.http
            .post<any>(
              'https://api.cloudinary.com/v1_1/dvgac4hr2/image/upload',
              formData,
            )
            .pipe(
              map((res) => {
                return {
                  id: item.id,
                  order: item.order,
                  src: item.src,
                  cloudinary: {
                    publicId: res.public_id,
                    url: res.secure_url,
                  },
                  uploaded: { cloudinary: true, database: false },
                };
              }),
              catchError((err) => {
                console.warn(
                  `Image upload failed for order ${item.order}:`,
                  err,
                );
                return of(null); // emit null for failed uploads
              }),
            );
        });

        return forkJoin(uploads$).pipe(
          map((results) => results.filter((res) => res !== null)), // only success
        );
      }),
    );
  }

  isNative() {
    return Capacitor.isNativePlatform();
  }
}
