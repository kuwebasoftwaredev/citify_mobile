import { Injectable } from '@angular/core';

import {
  Camera,
  CameraResultType,
  CameraSource,
  GalleryPhotos,
} from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { base64ToBlob, blobToBase64 } from 'base64-blob';
import * as _ from 'lodash';
import { EditImageComponent } from 'src/app/shared/components/edit-image/edit-image.component';
import { CustomOverlay } from '../overlay/custom-overlay.service';
import { map } from 'rxjs';
import { SKUImage } from 'src/app/shared/swipe-sheets/sku-form/sku-form/sku-form.component';

export interface Image {
  src: string;
  id: string;
  cloudinary: {
    public_id: string;
    url: string;
  };
  uploaded: {
    cloudinary: boolean;
    database: boolean;
  };
  vector?: number[];
}

export interface OpenGalleryConfig {
  type: string;
  copies: Image[];
  originals: Image[];
  max?: number;
}

export interface OpenGalleryResultSKU {
  copies: { index: number; img: Image }[];
  originals: { index: number; img: Image }[];
}

export interface OpenGalleryResult {
  copies: Image[];
  originals: Image[];
}

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  constructor(private customOverlay: CustomOverlay) {}

  async openGallery(config: OpenGalleryConfig): Promise<OpenGalleryResult> {
    const { type, copies = [], originals = [], max = 3 } = config;

    const COPIES = copies;
    const ORIGINALS = originals;

    const images = await Camera.pickImages({
      quality: 60,
      limit: type === 'productImages' ? max - _.size(COPIES) : 1,
    });

    const imagesWithSize = await Promise.all(
      images.photos.map((photo: any) => this.getImageSize(photo.webPath!)),
    );

    imagesWithSize.forEach((image: any) => {
      const id = Math.random().toString(36).substring(2, 9);

      if (type === 'product') {
        // Push the original image and a generated ID into the original array
        ORIGINALS.push({
          src: image.src,

          cloudinary: {
            public_id: '',
            url: '',
          },
          uploaded: { cloudinary: false, database: false },
          id,
        });
        // Push the image and a generated ID into the copies array
        if (image.width === image.height) {
          COPIES.push({
            src: image.src,
            cloudinary: {
              public_id: '',
              url: '',
            },
            uploaded: { cloudinary: false, database: false },
            id,
          });
        } else {
          COPIES.push(this.autoCropSquare(image.src, id));
        }
      } else if (type === 'sku') {
        // Push the original image and a generated ID into the original array
        COPIES.pop();
        ORIGINALS.push({
          src: image.src,
          cloudinary: {
            public_id: '',
            url: '',
          },
          uploaded: { cloudinary: false, database: false },
          id,
        });
        // Push the image and a generated ID into the copies array
        if (image.width === image.height) {
          COPIES.pop();
          ORIGINALS.push({
            src: image.src,
            cloudinary: {
              public_id: '',
              url: '',
            },
            uploaded: { cloudinary: false, database: false },
            id,
          });
        } else {
          COPIES.push(this.autoCropSquare(image.src, id));
        }
      }
    });

    return {
      copies: COPIES,
      originals: ORIGINALS,
    };
  }

  async openGallerySingle(config: SKUImage): Promise<SKUImage> {
    const images = await Camera.pickImages({
      quality: 60,
      limit: 1,
    });

    const imagesWithSize = await Promise.all(
      images.photos.map((photo: any) => this.getImageSize(photo.webPath!)),
    );

    imagesWithSize.forEach((image: any) => {
      const id = Math.random().toString(36).substring(2, 9);
      config.copy.id = id;
      config.original.id = id;
      config.original.src = image.src;
      config = {
        ...config,
        uploaded: {
          cloudinary: false,
          database: false,
        },
        cloudinary: {
          public_id: '',
          url: '',
        },
      };

      if (image.width === image.height) {
        config.copy.src = image.src;
      } else {
        const crop = this.autoCropSquare(image.src, id);
        config.copy.src = crop.src;
      }
    });

    return config;
  }

  async openCameraSingle(config: SKUImage): Promise<SKUImage> {
    const file = await Camera.getPhoto({
      source: CameraSource.Camera,
      quality: 60,
      allowEditing: false,
      resultType: CameraResultType.Uri,
    });

    const image = await this.getImageSize(file.webPath!);
    const id = Math.random().toString(36).substring(2, 9);

    config.copy.id = id;
    config.original.id = id;
    config.original.src = image.src;

    if (image.width === image.height) {
      config.copy.src = image.src;
    } else {
      const crop = this.autoCropSquare(image.src, id);
      config.copy.src = crop.src;
    }

    return config;
  }

  async openCamera(config: OpenGalleryConfig): Promise<OpenGalleryResult> {
    const { type, copies = [], originals = [] } = config;

    const COPIES = copies;
    const ORIGINALS = originals;

    const file = await Camera.getPhoto({
      source: CameraSource.Camera,
      quality: 60,
      allowEditing: false,
      resultType: CameraResultType.Uri,
    });

    const imagesWithSize = await this.getImageSize(file.webPath!);
    const id = Math.random().toString(36).substring(2, 9);
    if (type === 'product') {
      // Push the original image and a generated ID into the original array
      ORIGINALS.push({
        src: imagesWithSize.src,
        cloudinary: {
          public_id: '',
          url: '',
        },
        uploaded: { cloudinary: false, database: false },
        id,
      });
      // Push the image and a generated ID into the copies array
      if (imagesWithSize.width === imagesWithSize.height) {
        COPIES.push({
          src: imagesWithSize.src,
          cloudinary: {
            public_id: '',
            url: '',
          },
          uploaded: { cloudinary: false, database: false },
          id,
        });
      } else {
        this.autoCropSquare(imagesWithSize.src, id);
      }
    } else if (type === 'sku') {
      // Push the original image and a generated ID into the original array
      ORIGINALS.pop();
      ORIGINALS.push({
        src: imagesWithSize.src,
        cloudinary: {
          public_id: '',
          url: '',
        },
        uploaded: { cloudinary: false, database: false },
        id,
      });
      // Push the image and a generated ID into the copies array
      if (imagesWithSize.width === imagesWithSize.height) {
        COPIES.pop();
        COPIES.push({
          src: imagesWithSize.src,
          cloudinary: {
            public_id: '',
            url: '',
          },
          uploaded: { cloudinary: false, database: false },
          id,
        });
      } else {
        this.autoCropSquare(imagesWithSize.src, id);
      }
    }

    return {
      copies: COPIES,
      originals: ORIGINALS,
    };
  }

  openCropper(image: any) {
    const customOverlay = this.customOverlay.open(EditImageComponent, {
      src: image.src,
    });

    return customOverlay.afterCrop$.pipe(
      map((src) => ({
        src,
        id: image.id,
        uploaded: image.uploaded,
        cloudinary: image.cloudinary,
      })),
    );
  }

  getImageSize(src: string): Promise<{
    src: string;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;

      img.onload = () => {
        resolve({
          src,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };

      img.onerror = reject;
    });
  }

  autoCropSquare(src: string, id: string): Image {
    const img = new Image();
    img.src = src;
    const size = Math.min(img.width, img.height); // square size
    const startX = (img.width - size) / 2;
    const startY = (img.height - size) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);
    }

    const imgSrc = canvas.toDataURL('image/png', 0.1);

    return {
      src: imgSrc,
      cloudinary: {
        public_id: '',
        url: '',
      },
      uploaded: { cloudinary: false, database: false },
      id,
    };
  }

  async blobUrlToBlob(blobUrl: string): Promise<Blob> {
    const res = await fetch(blobUrl);
    return await res.blob();
  }
}
