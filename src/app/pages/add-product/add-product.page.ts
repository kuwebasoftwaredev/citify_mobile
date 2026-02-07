import { ModalController, RefresherCustomEvent } from '@ionic/angular';
import { StatusBar } from '@capacitor/status-bar';
import { ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { base64ToBlob, blobToBase64 } from 'base64-blob';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  Component,
  ElementRef,
  Input,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import * as _ from 'lodash';
import { EditImageComponent } from 'src/app/shared/components/edit-image/edit-image.component';
import { CustomOverlay } from 'src/app/core/services/overlay/custom-overlay.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { VariantFormComponent } from './variant-form/variant-form/variant-form.component';
import { minTomorrowValidator } from 'src/app/shared/form-validators/min-tomorrow.validator';
import { ToastController } from '@ionic/angular';
import { variantsRequiredIfEnabled } from 'src/app/shared/form-validators/variantsRequiredIfEnabled.validator';
import { VariantFormComponent as a } from 'src/app/shared/swipe-sheets/variant-form/variant-form/variant-form.component';
import { SkuFormComponent as b } from 'src/app/shared/swipe-sheets/sku-form/sku-form/sku-form.component';
import {
  Image,
  ImageService,
  OpenGalleryResult,
  OpenGalleryResultSKU,
} from 'src/app/core/services/image/image.service';
import {
  FormErrorMap,
  FormService,
} from 'src/app/core/services/form/form.service';
import { TermsComponentComponent } from 'src/app/shared/swipe-sheets/terms/terms.component/terms.component.component';
import { ImageEmbedService } from 'src/app/core/services/transformer/image-embed/image-embed.service';
import { TextEmbedService } from 'src/app/core/services/transformer/text-embed/text-embed';
import { HttpRequest } from 'src/app/core/services/http-request/http-request.service';
import { CloudinaryService } from 'src/app/core/services/cloudinary/cloudinary.service';
import { firstValueFrom, forkJoin, from, map, of, switchMap, tap } from 'rxjs';
import { ProductService } from 'src/app/core/services/product/product.service';

type GroupedError = {
  control: string;
  label: string;
  messages: string[];
};

export interface Variant {
  name: string;
  options: string[];
}

export interface SemanticImage {
  original: { src: string; id: string };
  copy: { src: string; id: string };
  uploaded: { cloudinary: boolean; database: boolean };
  cloudinary: { public_id: string; url: string };
}

export interface ReqCloudinaryImageMetadata {
  id: string;
  order: number;
  src: string;
}

export type TermsType =
  | 'marketplace'
  | 'prohibitedItems'
  | 'subscription'
  | 'privacy'
  | 'sellerCodeOfConduct'
  | 'returnRefundDispute'
  | 'legalDisclaimer';

@Component({
  selector: 'app-add-product',
  templateUrl: 'add-product.page.html',
  styleUrls: ['add-product.page.scss'],
  standalone: false,
})
export class AddProductPage {
  sheetRef: any;
  editingIndex: number | null = null;
  public showCropper = false;
  public webcamImage: object | null | string = null; //latest snapshot
  originals: Image[] = [];
  copies: Image[] = [];
  public productForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private bottomSheet: ModalController,
    private imageService: ImageService,
    private formService: FormService,
    private imageEmbedService: ImageEmbedService,
    private textEmbedService: TextEmbedService,
    private cloudinaryService: CloudinaryService,
    private productService: ProductService,
  ) {
    this.createProductForm();
  }

  ngOnInit() {
    this.productForm.valueChanges.subscribe(() => {
      if (this.isProductFormSubmitted) {
        this.updateFormErrors();
      }
    });
  }

  ionViewWillEnter() {
    StatusBar.setOverlaysWebView({ overlay: false });
    StatusBar.setBackgroundColor({ color: '#f7d94f' });
  }

  updateFormErrors(type: 'product' | 'sku' = 'product') {
    if (type === 'product') {
      this.productFormErrors = this.formService.checkForm(
        this.productForm,
        this.productLabelMap,
      );
    }
  }

  createProductForm() {
    this.productForm = this.fb.group(
      {
        images: [[], [Validators.required, Validators.maxLength(6)]],
        productName: ['', Validators.required],
        description: ['', Validators.required],
        publishingType: ['SCHEDULED', Validators.required],
        category: [[], Validators.required],
        subcategory: [[], Validators.required],
        scheduledDate: [
          this.defaultDate,
          [Validators.required, minTomorrowValidator()],
        ],
        hasVariants: [false],
        variants: this.fb.array(
          [
            { name: 'color', options: ['red', 'blue', 'green'] },
            // { name: 'color', options: ['red', 'blue', 'green'] },
            // { name: 'size', options: ['small', 'medium', 'large'] },
            // { name: 'brand', options: ['adidas', 'nike', 'underarmor'] },
          ],
          [Validators.required],
        ),
        skus: this.fb.array([], [Validators.required]),
        semanticSearch: this.fb.group({
          image: this.fb.group({
            hasSemanticSearch: [true, Validators.requiredTrue],
            src: [''],
            embedded: [[]],
          }),
          text: this.fb.group({
            hasSemanticSearch: [true, Validators.requiredTrue],
            embedded: [[]],
          }),
        }),
      },
      { validators: variantsRequiredIfEnabled() },
    );
  }

  private syncImagesToForm(result?: OpenGalleryResult) {
    if (result) {
      this.copies = result?.copies;
      this.originals = result?.originals;
    }

    this.productForm.get('images')?.setValue(this.copies);
    this.productForm.get('images')?.markAsTouched();
    this.productForm.get('images')?.updateValueAndValidity();

    this.semanticImageFormControl?.setValue(this.semanticImage.copy.src);
    this.semanticImageFormControl?.markAsTouched();
    this.semanticImageFormControl?.updateValueAndValidity();
  }

  onScheduleChange(event: any) {
    const isoDate = event.detail.value;
    this.productForm.get('scheduledAt')?.setValue(isoDate);
  }

  public hasVariants: boolean = false;

  onToggleChange(event: any) {
    this.hasVariants = event.detail.checked;
  }
  defaultDate = this.getTomorrowStartISO();
  getTomorrowStartISO(): string {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(0, 0, 0, 0); // start of tomorrow
    return d.toISOString();
  }

  isProductFormSubmitted: boolean = false;
  async openGalleryForProduct() {
    this.productForm.get('images')?.markAsTouched();
    if (_.size(this.copies) >= 3) return;

    const result = await this.imageService.openGallery({
      type: 'product',
      copies: this.copies,
      originals: this.originals,
      max: 9,
    });
    this.syncImagesToForm(result);
    this.updateFormErrors();
  }

  async openCamera(type: 'product' | 'sku' = 'product') {
    this.productForm.get('images')?.markAsTouched();

    const result = await this.imageService.openCamera({
      type: 'product',
      copies: this.copies,
      originals: this.originals,
    });
    this.syncImagesToForm(result);
    this.updateFormErrors();
  }

  originalsSKU: { index: number; img: Image }[] = [];
  copiesSKU: { index: number; img: Image }[] = [];

  processProductImages() {
    const formData = new FormData();
    this.copies.forEach(async (copy: any, index: any) => {
      let file: File;

      if (copy.notWebpath) {
        console.log('--------0');
        // cropped image
        const blob = await base64ToBlob(copy.img);
        file = new File([blob], `photo_${index}.png`, {
          type: blob.type,
        });
      } else {
        // webPath from Capacitor
        const result = await Filesystem.readFile({
          path: copy.img, // this can be webPath or path
        });

        const blob = await base64ToBlob(
          `data:image/jpeg;base64,${result.data}`,
        );

        console.log('--------1', blob);
        file = new File([blob], `photo_${index}.png`, { type: blob.type });
      }

      formData.append('prod_pictures', file);
    });

    return formData;
  }

  async openTerms(type: TermsType) {
    const breakpoint = type === 'prohibitedItems' ? 0.5 : 0.7;
    const modal = await this.bottomSheet.create({
      component: TermsComponentComponent,
      breakpoints: [breakpoint, 1],
      initialBreakpoint: breakpoint,
      backdropBreakpoint: 0,
      handle: true,
      componentProps: {
        type,
      },
    });
    await modal.present();
  }

  drop(event: any) {
    console.log('drop');
    moveItemInArray(this.copies, event.previousIndex, event.currentIndex);
    this.isGalleryOrderChanged = true;
    this.syncImagesToForm();
    this.updateFormErrors();
  }

  remove(imageDetails: Image, type: 'product' | 'sku' = 'product') {
    if (type === 'product') {
      this.copies = this.copies.filter(
        (copy: any) => copy.id != imageDetails.id,
      );
      this.originals = this.originals.filter(
        (copy: any) => copy.id != imageDetails.id,
      );
    }

    this.syncImagesToForm();
    this.updateFormErrors();
  }

  openCropper(imageDetails: Image, type: 'product' | 'sku' = 'product') {
    const image = this.originals.find(
      (original) => original.id == imageDetails.id,
    );

    if (!image) {
      return;
    }

    this.imageService.openCropper(image).subscribe((result) => {
      const publicId = this.copies.find((copy) => copy.id === result.id)
        ?.cloudinary.public_id;

      // Push the publicId into the publicIdCloudinary array
      if (publicId) this.publicIdCloudinaryForRemoval.push(publicId);

      this.updateImage(result.src, result.id, 'product');
    });
  }

  updateImage(src: string, id: string, type: 'product' | 'sku' = 'product') {
    if (type === 'product') {
      this.copies = this.copies.map((copy: any) => {
        if (copy.id === id) {
          return {
            ...copy,
            src: src,
            cloudinary: { publicId: '', url: '' },
            uploaded: { cloudinary: false, database: false },
          };
        } else {
          return { ...copy };
        }
      });

      this.syncImagesToForm();
    }
  }

  async saveAsDraft() {}

  productLabelMap: Record<string, string> = {
    images: 'Product Images',
    productName: 'Product Name',
    description: 'Description',
    category: 'Category',
    subcategory: 'Sub Category',
    variants: 'Product Variants',
    skus: 'Product SKU',
  };

  public productFormErrors: FormErrorMap = {};

  private buildSkuEmbeddingText(
    combination: { variant: string; value: string }[],
    price?: number,
  ) {
    const variantText = combination
      .map((c) => `${c.variant} is ${c.value}`)
      .join(', ');

    return `
This product variant has ${variantText}.
${price ? `The price is ${price} pesos.` : ''}
`;
  }

  public isUploadSKUThumbnailTriggered = false;
  async uploadProductSKUThumbnailsAPI(
    productId: string,
    shopId: string,
  ): Promise<Image[]> {
    try {
      const isAllUploaded = this.skus.value.every(
        (sku: any) => sku.image?.uploaded?.cloudinary,
      );

      if (isAllUploaded) {
        return [];
      }

      await this.deleteMarkedCloudinaryImages();

      const sku: any[] = this.skus.value.filter(
        (sku: any) => !sku.image?.uploaded?.cloudinary,
      );

      if (_.size(sku) === 0) {
        return [];
      }

      const upload$ = this.cloudinaryService.isNative()
        ? this.cloudinaryService.uploadProductSKUThumbnailsMobile(
            sku,
            productId,
            shopId,
          )
        : this.cloudinaryService.uploadProductSKUThumbnailsWeb(
            sku,
            productId,
            shopId,
          );
      const cloudinaryUploads: any[] = await firstValueFrom(upload$);

      // Update copies to mark uploaded images
      const updateSKU = this.skus.value.map((sku: any) => {
        // Check if this copy was uploaded
        const cloudinary = cloudinaryUploads.find((res) =>
          _.isEqual(res.combination, sku.combination),
        );

        if (cloudinary) {
          // Mark as uploaded
          return {
            ...sku,
            image: {
              ...sku.image,
              cloudinary: {
                public_id: cloudinary.cloudinary.public_id,
                url: cloudinary.cloudinary.url,
              },
              uploaded: { cloudinary: true, database: false },
            },
          };
        } else {
          return { ...sku };
        }
      });
      this.skus.patchValue(updateSKU);

      this.syncImagesToForm();
      this.isUploadSKUThumbnailTriggered = true;

      return cloudinaryUploads;
    } catch (error) {
      console.error('Error uploading product sku thumbnail:', error);
      return [];
    }
  }

  public isUploadGalleryTriggered = false;
  async uploadProductGalleryAPI(
    productId: string,
    shopId: string,
  ): Promise<Image[]> {
    try {
      const isAllUploaded = this.copies.every((img) => img.uploaded.cloudinary);

      if (isAllUploaded) {
        return [];
      }

      await this.deleteMarkedCloudinaryImages();

      const gallery: ReqCloudinaryImageMetadata[] = this.copies
        .map((img: Image, index: number) =>
          img.uploaded?.cloudinary
            ? null
            : {
                src: img.src,
                order: index,
                id: img.id,
              },
        )
        .filter(Boolean) as ReqCloudinaryImageMetadata[];

      if (_.size(gallery) === 0) {
        return [];
      }

      const upload$ = this.cloudinaryService.isNative()
        ? this.cloudinaryService.uploadProductGalleryMobile(
            gallery,
            productId,
            shopId,
          )
        : this.cloudinaryService.uploadProductGalleryWeb(
            gallery,
            productId,
            shopId,
          );
      const cloudinaryUploads = await firstValueFrom(upload$);

      // Update copies to mark uploaded images
      this.copies = this.copies.map((copy: Image) => {
        // Check if this copy was uploaded
        const cloudinary = cloudinaryUploads.find((res) => res.id === copy.id);

        if (cloudinary) {
          // Mark as uploaded
          return {
            ...copy,
            cloudinary: {
              public_id: cloudinary.cloudinary.public_id,
              url: cloudinary.cloudinary.url,
            },
            uploaded: { cloudinary: true, database: false },
          };
        } else {
          return { ...copy };
        }
      });

      this.syncImagesToForm();
      this.isUploadGalleryTriggered = true;

      return cloudinaryUploads;
    } catch (error) {
      console.error('Error uploading product gallery:', error);
      return [];
    }
  }
  get someGalleryImagesNotUploadedInCloudinary() {
    return this.copies.some((copy) => !copy.uploaded.cloudinary);
  }

  public productId!: string;
  public shopId!: string;
  public publicIdCloudinaryForRemoval: string[] = [];
  public status = 'PRESAVED';
  public isGalleryOrderChanged = false;

  private async deleteMarkedCloudinaryImages() {
    if (_.size(this.publicIdCloudinaryForRemoval) === 0) return;

    await firstValueFrom(
      this.cloudinaryService.delete(
        this.productId,
        this.publicIdCloudinaryForRemoval,
      ),
    );
  }

  async saveProduct() {
    // Check if form is valid
    this.isProductFormSubmitted = true;
    this.productForm.markAllAsTouched();

    // Update form errors
    this.productFormErrors = this.formService.checkForm(
      this.productForm,
      this.productLabelMap,
    ) as any;

    // Check if form is valid
    if (this.productForm.invalid) return;

    if (!this.productId) {
      //  Generate image embedding (Float32Array ~2.3 MB)
      const imageVector = await this.imageEmbedService.embedImage(
        this.productForm.get('semanticSearch.image.src')?.value,
      );

      // Set image embedding to form control
      this.productForm
        .get('semanticSearch.image.embedded')
        ?.setValue(imageVector);

      // Build SKU summary text for text embedding
      const skuSummary = this.productForm.value.skus.map((sku: any) => {
        return this.buildSkuEmbeddingText(sku.combination, sku.price);
      });

      // Generate text embedding (Float32Array ~3 KB)
      const textVector = await this.textEmbedService.embed(
        `Product name: ${this.productForm.value.productName}.
         Description: ${this.productForm.value.description}.
         Category: ${this.productForm.value.category.join(', ')}.
         Subcategory: ${this.productForm.value.subcategory.join(', ')}.
         Variants: ${this.productForm.value.variants
           .map(
             (v: any) => `${v.name} 
         options: ${v.options?.join(', ')}`,
           )
           .join('; ')}.SKU Details: ${skuSummary.join(' ')}`.trim(),
      );

      // Set text embedding to form control
      this.productForm
        .get('semanticSearch.text.embedded')
        ?.setValue(textVector);

      // Data to be sent to backend
      const productData = {
        gallery: this.productForm.value.gallery,
        name: this.productForm.value.productName,
        status: this.status,
        description: this.productForm.value.description,
        category: this.productForm.value.category,
        subcategory: this.productForm.value.subcategory,
        publishingType: this.productForm.value.publishingType,
        scheduledDate: this.productForm.value.scheduledDate,
        textEmbedding: Array.from(textVector),
        imageEmbedding: Array.from(imageVector),
        skus: this.normalizeSKUImage(this.productForm.value.skus),
        hasVariants: this.productForm.value.hasVariants,
        variants: this.productForm.value.variants,
      };

      // Product pre-saved
      this.productService
        .saveProductWeb(productData)
        .pipe(
          switchMap((response: any) => {
            const saveProductResponse = response.data;
            this.productId = saveProductResponse?.product?._id;
            this.shopId = saveProductResponse?.product?.shopId;

            if (_.size(this.gallery) === 0) {
              return of(response);
            }

            return forkJoin({
              gallery: this.uploadProductGalleryAPI(
                this.productId,
                this.shopId,
              ),
              skuThumbnails: this.uploadProductSKUThumbnailsAPI(
                this.productId,
                this.shopId,
              ),
            }).pipe(
              map((response) => ({
                saveProductResponse,
                response,
              })),
            );
          }),

          // After gallery upload, update the product with the Cloudinary URLs
          switchMap((result: any) => {
            // Check if there are any image in gallery that has not been uploaded in database
            const gallery = this.copies
              .filter(
                (img) => img.uploaded?.cloudinary && !img.uploaded?.database,
              )
              .map(({ src, ...otherProps }, index) => ({
                ...otherProps,
                order: index,
                uploaded: { cloudinary: true, database: true },
              }));

            const skus = this.skus.value
              .filter(
                (sku: any) =>
                  sku.image.uploaded?.cloudinary &&
                  !sku.image.uploaded?.database,
              )
              .map((sku: any) => ({
                ...sku,
                image: {
                  ...sku.image,
                  uploaded: {
                    ...sku.image.uploaded,
                    database: true,
                  },
                },
              }));
            console.log('--------------skus', skus);

            if (_.size(gallery) === 0 && _.size(skus) === 0) return of(result);

            const prop: any = {
              ...(_.size(gallery) && { gallery }),
              ...(_.size(skus) && { skus }),
            };

            console.log('prop', prop);

            return this.productService
              .updateProductWeb(this.productId, prop)
              .pipe(
                tap((response: any) => {
                  const public_ids = response.data.gallery.map(
                    (img: any) => img.cloudinary?.public_id,
                  );

                  this.copies = this.copies.map((copy) => {
                    if (public_ids.includes(copy.cloudinary?.public_id)) {
                      return {
                        ...copy,
                        uploaded: {
                          ...copy.uploaded,
                          database: true,
                        },
                      };
                    }
                    return copy;
                  });
                }),
              );
          }),
        )
        .subscribe({
          next: (finalResult) => {
            console.log('Product saved successfully:', finalResult);
            console.log('this.copies', this.copies);

            // Handle success (e.g., show a success message, navigate away, etc.)
          },
          error: (error) => {
            console.error('Error saving product:', error);
            // Handle error (e.g., show an error message)
          },
        });
    } else {
      console.log('PRODUCT UPDATE!');
      // Cloudinary Upload

      // Upload gallery
      from(this.uploadProductGalleryAPI(this.productId, this.shopId)).pipe(
        map((uploadedImages) => ({
          uploadedImages,
        })),
      );

      // this.isGalleryOrderChanged = true;

      // Compare if it has changes from the original data
      // If yes, proceed to update
      // If no, skip the update
    }
  }

  normalizeSKUImage(sku: any) {
    console.log('sku', sku);
    return sku.map((sku: any) => ({
      ...sku,
      image: {
        cloudinary: {
          url: sku.image?.secure_url,
          public_id: '',
        },
      },
      uploaded: { cloudinary: false, database: false },
    }));
  }

  get errorKeys(): string[] {
    return Object.keys(this.productFormErrors);
  }

  async openVariantForm(i: number | null = null) {
    const modal = await this.bottomSheet.create({
      component: a,
      breakpoints: [0, 0.7, 1],
      initialBreakpoint: 0.7,
      backdropBreakpoint: 0,
      handle: true,
      componentProps: {
        initialData: !_.isNil(i) ? this.variants.at(i).value : null,
      },
    });
    await modal.present();

    // Get the component instance
    const { data, role } = await modal.onDidDismiss();
    console.log('role', role, 'data', data);
    if (role === 'save' && data) {
      this.addVariant(data, i);
    }
  }
  addVariant(formgroup: FormGroup, i: number | null) {
    if (i !== null) {
      this.variants.setControl(i, formgroup); // update existing variant
    } else {
      this.variants.push(formgroup); // add new variant
    }

    this.clearSKUsCombination();
    this.sheetRef.dismiss();
  }
  removeVariant(index: number) {
    this.variants.removeAt(index);
    this.clearSKUsCombination();
  }
  removeSKU(index: number) {
    const publicId = this.skus.at(index).value?.image?.cloudinary?.public_id;
    // Push the publicId into the publicIdCloudinary array
    if (!_.isNil(publicId)) this.publicIdCloudinaryForRemoval.push(publicId);
    this.skus.removeAt(index);
  }
  get variants(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  get skus(): FormArray {
    return this.productForm.get('skus') as FormArray;
  }

  get gallery(): Image[] {
    return this.productForm.get('images')?.value;
  }

  public tempSKUFormId!: number;

  async openSKUForm(i: any | null = null) {
    const modal = await this.bottomSheet.create({
      component: b,
      breakpoints: [0, 0.7, 1],
      initialBreakpoint: 0.7,
      backdropBreakpoint: 0,
      handle: true,
      componentProps: {
        variants: this.variants,
        skus: this.skus,
        initialData: !_.isNil(i) ? this.skus.at(i).value : null,
      },
    });

    await modal.present();

    // Get the component instance
    const { data, role } = await modal.onDidDismiss();

    if (role === 'save' && data) {
      this.addSKU(data, i);
    } else {
      this.skus.markAsTouched();
    }
  }

  addSKU(skuForm: any, i: any) {
    if (!_.isNil(i)) {
      this.skus.setControl(i, skuForm);
    } else {
      this.skus.push(skuForm);
    }

    console.log('--------this.skus', this.skus.value);

    this.sheetRef.dismiss();
  }

  get groupedErrors(): GroupedError[] {
    return this.formService.getFormErrorMessages(
      this.productForm,
      this.productLabelMap,
      this.productFormErrors,
    );
  }

  public semanticImage: SemanticImage = {
    original: { src: '', id: '' },
    copy: { src: '', id: '' },
    uploaded: {
      cloudinary: false,
      database: false,
    },
    cloudinary: {
      public_id: '',
      url: '',
    },
  };

  get semanticImageFormControl(): FormControl {
    return this.productForm.get('semanticSearch.image.src') as FormControl;
  }

  async openGalleryForSingle() {
    this.semanticImage = await this.imageService.openGallerySingle(
      this.semanticImage,
    );

    this.syncImagesToForm();
    this.updateFormErrors();

    console.log('-----------productForm', this.productForm.value);
  }

  async openCameraSingle() {
    this.semanticImage = await this.imageService.openCameraSingle(
      this.semanticImage,
    );

    this.syncImagesToForm();
    this.updateFormErrors();
  }

  removeSemanticImage() {
    this.semanticImage = {
      original: { src: '', id: '' },
      copy: { src: '', id: '' },
      uploaded: { cloudinary: false, database: false },
      cloudinary: { public_id: '', url: '' },
    };

    this.syncImagesToForm();
    this.updateFormErrors();
  }

  openCropperSemanticImage() {
    if (!this.semanticImage.original.src) {
      return;
    }
    this.imageService
      .openCropper(this.semanticImage.original)
      .subscribe((result) => {
        this.semanticImage.copy.src = result.src;
      });
  }

  /**
   * Clears the `combination` array for each SKU.
   * Other properties (image, price, stock) remain untouched.
   */
  clearSKUsCombination() {
    const skus = this.skus as FormArray;

    if (skus.length === 0) return;

    skus.controls.forEach((control) => {
      const sku = control as FormGroup;

      sku.patchValue({
        combination: [],
      });

      sku.get('combination')?.markAsTouched();
      sku.get('combination')?.updateValueAndValidity();
    });
  }
}
