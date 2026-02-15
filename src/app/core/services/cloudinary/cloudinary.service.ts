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
import {
  ReqCloudinaryImageMetadata,
  SemanticImage,
} from 'src/app/pages/add-product/add-product.page';

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
    productCode: string,
    shopId: string,
  ): Observable<Image[]> {
    const uploads$ = gallery.map((item: ReqCloudinaryImageMetadata, index) =>
      from(
        Http.uploadFile({
          url: 'https://api.cloudinary.com/v1_1/dvgac4hr2/image/upload',
          filePath: item.src,
          name: 'file',
          data: {
            upload_preset: 'ionic_products',
            folder: `citify/shops/${shopId}/${productCode}/gallery`,
            context: `order=${index}`,
            filename_override: item.id,
          },
        }),
      ).pipe(
        map((res: any) => {
          console.log('Cloudinary upload response:', res);
          return {
            id: item.id,
            order: item.order,
            src: item.src,

            cloudinary: {
              public_id: res.public_id,
              url: res.secure_url,
            },
            uploaded: { cloudinary: true, database: false },
          };
        }),
      ),
    );

    return forkJoin(uploads$);
  }

  delete(productCode: string, publicIds: string[]): Observable<any> {
    const url = `${environment.SERVER_URL_CLUSTERS}/cloudinary/delete`;
    const body = { productCode, publicIds };

    return this.http.post(url, body).pipe(
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  uploadProductGalleryWeb(
    gallery: ReqCloudinaryImageMetadata[],
    productCode: string,
    shopId: string,
  ): Observable<Image[]> {
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
            `citify/shops/${shopId}/products/${productCode}/gallery`,
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
                    public_id: res.public_id,
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

  uploadProductSKUThumbnailsWeb(
    sku: any[],
    productCode: string,
    shopId: string,
  ): any {
    // Step 1: Convert all blobs to File objects
    const blobPromises = sku.map((sku: any) =>
      this.imageService.blobUrlToBlob(sku.image?.copy?.src).then((blob) => ({
        blob,
        src: sku.image?.copy?.src,
        combination: sku.combination,
      })),
    );

    // Step 2: Wait for all blobs and return Observable
    return from(Promise.all(blobPromises)).pipe(
      switchMap((sku) => {
        const uploads$ = sku.map((sku: any) => {
          const formData = new FormData();

          formData.append('file', sku.blob);
          formData.append('filename_override', JSON.stringify(sku.combination));
          formData.append('upload_preset', 'ionic_products');
          formData.append(
            'folder',
            `citify/shops/${shopId}/products/${productCode}/sku`,
          );

          return this.http
            .post<any>(
              'https://api.cloudinary.com/v1_1/dvgac4hr2/image/upload',
              formData,
            )
            .pipe(
              map((res) => {
                return {
                  combination: sku.combination,
                  src: sku?.image?.src,
                  cloudinary: {
                    public_id: res.public_id,
                    url: res.secure_url,
                  },
                  uploaded: { cloudinary: true, database: false },
                };
              }),
              catchError((err) => {
                console.warn(
                  `SKU Thumbnail upload failed for ${sku.combination}:`,
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

  uploadProductSKUThumbnailsMobile(
    sku: any[],
    productCode: string,
    shopId: string,
  ): any {
    const uploads$ = sku.map((sku: any, index) =>
      from(
        Http.uploadFile({
          url: 'https://api.cloudinary.com/v1_1/dvgac4hr2/image/upload',
          filePath: sku.image?.copy?.src,
          name: 'file',
          data: {
            upload_preset: 'ionic_products',
            folder: `citify/shops/${shopId}/products/${productCode}/sku`,
            filename_override: JSON.stringify(sku.combination),
          },
        }),
      ).pipe(
        map((res: any) => {
          console.log('Cloudinary upload response:', res);
          return {
            combination: sku.combination,
            src: sku.image?.copy?.src,
            cloudinary: {
              public_id: res.public_id,
              url: res.secure_url,
            },
            uploaded: { cloudinary: true, database: false },
          };
        }),
      ),
    );

    return forkJoin(uploads$);
  }

  uploadProductSemanticImageWeb(
    semantic: SemanticImage,
    productCode: string,
    shopId: string,
  ): Observable<SemanticImage> {
    return from(this.imageService.blobUrlToBlob(semantic.copy.src)).pipe(
      switchMap((blob) => {
        const formData = new FormData();

        formData.append('file', blob);
        formData.append('filename_override', semantic.copy.id || 'semantic');
        formData.append('upload_preset', 'ionic_products');
        formData.append(
          'folder',
          `citify/shops/${shopId}/products/${productCode}/semantic`,
        );

        return this.http
          .post<any>(
            'https://api.cloudinary.com/v1_1/dvgac4hr2/image/upload',
            formData,
          )
          .pipe(
            map((res) => ({
              ...semantic,
              cloudinary: {
                public_id: res.public_id,
                url: res.secure_url,
              },
              uploaded: { cloudinary: true, database: false },
            })),
          );
      }),
    );
  }

  uploadProductSemanticImageMobile(
    semantic: SemanticImage,
    productCode: string,
    shopId: string,
  ): Observable<SemanticImage> {
    return from(
      Http.uploadFile({
        url: 'https://api.cloudinary.com/v1_1/dvgac4hr2/image/upload',
        filePath: semantic.copy.src,
        name: 'file',
        data: {
          upload_preset: 'ionic_products',
          folder: `citify/shops/${shopId}/products/${productCode}/semantic`,
          filename_override: semantic.copy.id || 'semantic',
        },
      }),
    ).pipe(
      map((res: any) => ({
        ...semantic,
        cloudinary: {
          public_id: res.public_id,
          url: res.secure_url,
        },
        uploaded: { cloudinary: true, database: false },
      })),
    );
  }

  isNative() {
    return Capacitor.isNativePlatform();
  }
}
