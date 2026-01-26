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
import { firstValueFrom } from 'rxjs';

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
      this.productFormErrors = this.formService.getFormErrorMessages(
        this.productForm,
        this.productLabelMap,
      );
    }
  }

  createProductForm() {
    this.productForm = this.fb.group(
      {
        images: [[], [Validators.required, Validators.maxLength(3)]],
        productName: ['', Validators.required],
        description: ['', Validators.required],
        publishStatus: ['2', Validators.required],
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
            { name: 'size', options: ['small', 'medium', 'large'] },
            { name: 'brand', options: ['adidas', 'nike', 'underarmor'] },
          ],
          [Validators.required],
        ),
        skus: this.fb.array([], [Validators.required]),
        semanticSearch: this.fb.group({
          image: this.fb.group({
            src: ['', Validators.required],
            embedded: [[], Validators.required],
          }),
          text: this.fb.group({
            embedded: [[], Validators.required],
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

  // Set the default value to 'schedule'
  publishStatus: string = '2';

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
    moveItemInArray(this.copies, event.previousIndex, event.currentIndex);
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
      // API call for deleting the previous image using result.id  in cloudinary
      const publicIdToDelete = this.copies.find((copy) => copy.id === result.id)
        ?.cloudinary.publicId;
      console.log('publicIdToDeletee', publicIdToDelete);

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

  public isUploadGalleryTriggered = false;
  async uploadProductGalleryAPI(productId: string): Promise<Image[]> {
    try {
      const isAllUploaded = this.copies.every((img) => img.uploaded.cloudinary);
      console.log('1');
      if (isAllUploaded) {
        return [];
      }
      console.log('2');
      const gallery: ReqCloudinaryImageMetadata[] = this.copies
        .filter((img: Image) => !img.uploaded?.cloudinary)
        .map((img: Image, index: number) => ({
          src: img.src,
          order: index,
          id: img.id,
        }));

      const upload$ = this.cloudinaryService.isNative()
        ? this.cloudinaryService.uploadProductGalleryMobile(gallery, productId)
        : this.cloudinaryService.uploadProductGalleryWeb(gallery, productId);
      console.log('4', upload$);
      const cloudinaryUploads = await firstValueFrom(upload$);
      console.log('5');
      console.log('cloudinaryUploads', cloudinaryUploads);

      // Update copies to mark uploaded images
      this.copies = this.copies.map((copy: Image) => {
        // Check if this copy was uploaded
        const cloudinary = cloudinaryUploads.find((res) => res.id === copy.id);

        if (cloudinary) {
          // Mark as uploaded
          return {
            ...copy,

            cloudinary: {
              publicId: cloudinary.cloudinary.publicId,
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

      console.log('this.copies:after', this.copies);

      return cloudinaryUploads;
    } catch (error) {
      console.error('Error uploading product gallery:', error);
      return [];
    }
  }

  get someGalleryImagesNotUploadedInCloudinary() {
    return this.copies.some((copy) => !copy.uploaded.cloudinary);
  }
  public productId: string = '05586564854575';
  async saveProduct() {
    console.log('this.copies:before', this.copies);

    // Cloudinary Upload

    const productGallery: Image[] = await this.uploadProductGalleryAPI(
      this.productId,
    );

    return;

    // Check if form is valid
    this.isProductFormSubmitted = true;
    this.productForm.markAllAsTouched();

    // Update form errors
    this.productFormErrors = this.formService.getFormErrorMessages(
      this.productForm,
      this.productLabelMap,
    ) as any;

    if (this.productForm.invalid) return;

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
      .map((v: any) => `${v.name} options: ${v.options?.join(', ')}`)
      .join('; ')}.
    SKU Details: ${skuSummary.join(' ')}
    `.trim(),
    );

    // Set text embedding to form control
    this.productForm.get('semanticSearch.text.embedded')?.setValue(textVector);

    // Data to be sent to backend
    const productData = {
      productName: this.productForm.value.productName,
      description: this.productForm.value.description,
      category: this.productForm.value.category,
      subcategory: this.productForm.value.subcategory,
      publishStatus: this.productForm.value.publishStatus,
      scheduledDate: this.productForm.value.scheduledDate,
      hasVariants: this.productForm.value.hasVariants,
      variants: this.productForm.value.variants,
      skus: this.normalizeSKUImage(this.productForm.value.skus),
      textEmbedding: Array.from(textVector),
    };

    const formData = new FormData();

    formData.append(
      'imageEmbedding',
      new Blob([new Float32Array(imageVector).buffer], {
        type: 'application/octet-stream',
      }),
    );
    formData.append('data', JSON.stringify(productData));
  }

  normalizeSKUImage(sku: any) {
    return sku.map((sku: any) => {
      return { ...sku, image: sku.image?.copy?.src };
    });
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
    this.skus.removeAt(index);
  }
  get variants(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  get skus(): FormArray {
    return this.productForm.get('skus') as FormArray;
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
    const result: GroupedError[] = [];

    Object.keys(this.productForm.controls).forEach((controlName) => {
      const value = this.productFormErrors[controlName];

      if (Array.isArray(value) && value.length) {
        result.push({
          control: controlName,
          label: this.productLabelMap[controlName] ?? controlName,
          messages: value,
        });
      }
    });

    return result;
  }

  public semanticImage: SemanticImage = {
    original: { src: '', id: '' },
    copy: { src: '', id: '' },
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
