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
import { ActivatedRoute } from '@angular/router';
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
import { SkuFormComponent } from 'src/app/shared/swipe-sheets/sku-form/sku-form/sku-form.component';
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
import { CloudinaryService } from 'src/app/core/services/cloudinary/cloudinary.service';
import { firstValueFrom, forkJoin, from, map, of, switchMap, tap } from 'rxjs';
import { ProductService } from 'src/app/core/services/product/product.service';
import { CategoryService } from 'src/app/core/services/category/category.service';

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
  vector?: number[];
}

export interface ReqCloudinaryImageMetadata {
  id: string;
  order: number;
  src: string;
}

type SelectedSubcategory = {
  code: number;
  name: string;
};

type SelectedCategory = {
  code: number;
  name: string;
};

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
    private categoryService: CategoryService,
    private route: ActivatedRoute,
  ) {
    this.createProductForm();
  }

  ngOnInit() {
    this.productForm.valueChanges.subscribe(() => {
      if (this.isProductFormSubmitted) {
        this.updateFormErrors();
      }
    });

    this.productForm.get('category')?.valueChanges.subscribe((value) => {
      const normalized = this.normalizeSelectedCategories(value);
      if (!_.isEqual(value, normalized)) {
        this.productForm.get('category')?.setValue(normalized, {
          emitEvent: false,
        });
      }

      this.pruneSelectedSubcategoriesByCategory();
    });

    this.loadCategoryTree();
    this.checkProductCodeURLParams();
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
        images: [[], [Validators.required, Validators.maxLength(10)]],
        productName: ['', Validators.required],
        description: ['', Validators.required],
        publishingType: ['SCHEDULED', Validators.required],
        category: [[], Validators.required],
        subcategory: [[], Validators.required],
        scheduledDate: [
          this.defaultDate,
          [Validators.required, minTomorrowValidator()],
        ],
        variants: this.fb.array(
          [
            // { name: 'color', options: ['red'] },
            // { name: 'color', options: ['red', 'blue', 'green'] },
            // { name: 'size', options: ['small', 'medium', 'large'] },
            // { name: 'brand', options: ['adidas', 'nike', 'underarmor'] },
          ],
          [Validators.required],
        ),
        skus: this.fb.array([], [Validators.required]),
        semanticImage: [null, Validators.required],
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

    if (this.semanticImage?.copy?.src) {
      this.semanticImageFormControl?.setValue({
        cloudinary: this.semanticImage.cloudinary,
        uploaded: this.semanticImage.uploaded,
        vector: this.semanticImage.vector,
        src: this.semanticImage?.copy?.src,
      });
    } else {
      this.semanticImageFormControl?.setValue(null);
    }

    this.semanticImageFormControl?.markAsTouched();
    this.semanticImageFormControl?.updateValueAndValidity();

    console.log('this.productForm', this.productForm.value);
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

  removeGalleryImage(index: number, imageDetails: Image) {
    const removedImage = this.copies[index];
    console.log('-----copies', this.copies);
    console.log('-----imageDetails', imageDetails);
    this.copies = this.copies.filter((copy: any) => copy.id != imageDetails.id);
    this.originals = this.originals.filter(
      (copy: any) => copy.id != imageDetails.id,
    );

    console.log('-----this.copies', this.copies);

    const publicId = removedImage?.cloudinary?.public_id;
    // Push the publicId into the publicIdCloudinary array
    if (!_.isNil(publicId)) this.publicIdCloudinaryForRemoval.push(publicId);

    console.log('-----------publicId', publicId);
    console.log('-----------productForm', this.productForm.value);

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
    semanticImage: 'AI Image Search',
  };

  public productFormErrors: FormErrorMap = {};
  public categoryTree: any[] = [];
  private subcategoryParentMap = new Map<number, number | null>();
  private subcategoryNodeMap = new Map<number, any>();
  public isSubcategoryModalOpen = false;

  get mainCategories(): any[] {
    return (this.categoryTree || []).filter((cat: any) => !cat.parent_code);
  }

  compareCategoryByCode = (
    current: SelectedCategory | null,
    compare: SelectedCategory | null,
  ): boolean => {
    return current?.code === compare?.code;
  };

  private getCategoryNameByCode(code: number): string {
    return this.subcategoryNodeMap.get(code)?.name ?? '';
  }

  private normalizeSelectedCategories(value: any): SelectedCategory[] {
    const list = Array.isArray(value) ? value : value ? [value] : [];

    return list
      .map((item: any) => {
        if (item && typeof item === 'object') {
          const code = Number(item.code);
          if (!Number.isFinite(code)) return null;
          return {
            code,
            name: item.name ?? this.getCategoryNameByCode(code),
          };
        }

        const code = Number(item);
        if (!Number.isFinite(code)) return null;

        return {
          code,
          name: this.getCategoryNameByCode(code),
        };
      })
      .filter((item): item is SelectedCategory => !!item);
  }

  private getSelectedCategoryCodes(): number[] {
    return this.normalizeSelectedCategories(
      this.productForm.get('category')?.value,
    ).map((item) => item.code);
  }

  getSelectedCategoryNames(): string[] {
    return this.normalizeSelectedCategories(
      this.productForm.get('category')?.value,
    )
      .map((item) => item.name)
      .filter((name) => !!name);
  }

  private pruneSelectedSubcategoriesByCategory() {
    const allowedCodes = new Set<number>(
      this.getSubcategoryListForSelectedCategories().map((node) => node.code),
    );
    const selected = this.subcategory.value || [];
    const filtered = (Array.isArray(selected) ? selected : []).filter(
      (item: SelectedSubcategory) => allowedCodes.has(item?.code),
    );

    if (!_.isEqual(selected, filtered)) {
      this.subcategory.setValue(filtered);
      this.subcategory.markAsTouched();
      this.subcategory.updateValueAndValidity();
    }
  }

  private loadCategoryTree() {
    this.categoryService.getCategoryTree().subscribe({
      next: (response: any) => {
        this.categoryTree =
          response?.data ?? response?.categories ?? response ?? [];
        this.buildSubcategoryIndex();
      },
      error: (error) => {
        console.error('Error loading category tree:', error);
      },
    });
  }

  private buildSubcategoryIndex() {
    this.subcategoryParentMap.clear();
    this.subcategoryNodeMap.clear();

    const walk = (nodes: any[]) => {
      (nodes || []).forEach((node: any) => {
        this.subcategoryParentMap.set(node.code, node.parent_code ?? null);
        this.subcategoryNodeMap.set(node.code, node);
        if (node.subcategories?.length) {
          walk(node.subcategories);
        }
      });
    };

    walk(this.categoryTree || []);
  }

  private flattenSubcategories(categories: any[]): any[] {
    const result: any[] = [];
    const stack = (categories || []).map((cat: any) => ({
      node: cat,
      path: [cat.name],
    }));

    while (stack.length) {
      const current = stack.shift();
      if (!current?.node) continue;

      result.push({
        ...current.node,
        labelPath: current.path.join(' > '),
      });

      if (current.node.subcategories?.length) {
        current.node.subcategories.forEach((child: any) => {
          stack.push({
            node: child,
            path: [...current.path, child.name],
          });
        });
      }
    }

    return result;
  }

  getSubcategoriesForSelectedCategories(): any[] {
    const selectedCodes = this.getSelectedCategoryCodes();
    if (!selectedCodes.length) return [];

    const categories = this.categoryTree.filter((cat: any) =>
      selectedCodes.includes(cat.code),
    );

    const subcategories = categories.flatMap((cat: any) =>
      this.flattenSubcategories(cat.subcategories || []),
    );

    const seen = new Set<number>();
    return subcategories.filter((sub: any) => {
      if (seen.has(sub.code)) return false;
      seen.add(sub.code);
      return true;
    });
  }

  getSubcategoryListForSelectedCategories(): any[] {
    const selectedCodes = this.getSelectedCategoryCodes();
    if (!selectedCodes.length) return [];

    const categories = this.categoryTree.filter((cat: any) =>
      selectedCodes.includes(cat.code),
    );

    const result: any[] = [];
    const walk = (nodes: any[], depth: number) => {
      (nodes || []).forEach((node: any) => {
        result.push({ ...node, depth });
        if (node.subcategories?.length) {
          walk(node.subcategories, depth + 1);
        }
      });
    };

    categories.forEach((cat: any) => walk(cat.subcategories || [], 0));

    const seen = new Set<number>();
    return result.filter((sub: any) => {
      if (seen.has(sub.code)) return false;
      seen.add(sub.code);
      return true;
    });
  }

  isSubcategorySelected(code: number): boolean {
    const selected = this.productForm.get('subcategory')?.value || [];
    return Array.isArray(selected)
      ? selected.some((item: SelectedSubcategory) => item?.code === code)
      : false;
  }

  isSubcategoryVisible(node: any): boolean {
    if (!node?.parent_code) return true;

    const selectedCategoryCodes = this.getSelectedCategoryCodes();

    if (selectedCategoryCodes.includes(node.parent_code)) {
      return true;
    }

    if (!this.isSubcategorySelected(node.parent_code)) {
      return false;
    }

    const parentNode = this.subcategoryNodeMap.get(node.parent_code);
    if (!parentNode) return false;

    return this.isSubcategoryVisible(parentNode);
  }

  openSubcategoryModal() {
    this.isSubcategoryModalOpen = true;
  }

  closeSubcategoryModal() {
    this.isSubcategoryModalOpen = false;
  }

  private collectDescendantCodes(node: any): number[] {
    const codes: number[] = [];
    const stack = [...(node?.subcategories || [])];
    while (stack.length) {
      const current = stack.shift();
      if (!current) continue;
      codes.push(current.code);
      if (current.subcategories?.length) {
        stack.push(...current.subcategories);
      }
    }
    return codes;
  }

  toggleSubcategory(node: any, checked: boolean) {
    const selected = new Map<number, SelectedSubcategory>();
    (this.subcategory.value || []).forEach((item: SelectedSubcategory) => {
      if (item?.code) {
        selected.set(item.code, item);
      }
    });

    if (checked) {
      selected.set(node.code, { code: node.code, name: node.name });
    } else {
      selected.delete(node.code);
      if (node.subcategories?.length) {
        this.collectDescendantCodes(node).forEach((code) =>
          selected.delete(code),
        );
      }
    }

    this.subcategory.setValue(Array.from(selected.values()));
    this.subcategory.markAsTouched();
    this.subcategory.updateValueAndValidity();

    console.log('this.productForm.value', this.productForm.value);
  }

  private normalizeSelectedSubcategories(value: any): SelectedSubcategory[] {
    const list = Array.isArray(value) ? value : value ? [value] : [];

    return list
      .map((item: any) => {
        if (item && typeof item === 'object') {
          const code = Number(item.code);
          if (!Number.isFinite(code)) return null;
          return {
            code,
            name: item.name || this.subcategoryNodeMap.get(code)?.name || '',
          };
        }

        const code = Number(item);
        if (!Number.isFinite(code)) return null;

        return {
          code,
          name: this.subcategoryNodeMap.get(code)?.name || '',
        };
      })
      .filter((item): item is SelectedSubcategory => !!item);
  }

  private checkProductCodeURLParams() {
    this.route.paramMap.subscribe((params) => {
      const productCode = params.get('productCode');
      if (!productCode) return;

      this.productCode = productCode;
      this.fetchProductForEdit(productCode);
    });
  }

  private extractServiceData(response: any): any {
    return response?.data?.data ?? response?.data ?? response ?? {};
  }

  private extractProductFromResponse(response: any): any {
    const data = this.extractServiceData(response);
    return data?.product ?? data;
  }

  private normalizeProductGallery(gallery: any): Image[] {
    const list = Array.isArray(gallery) ? gallery : [];

    return list
      .map((item: any, index: number) => {
        const src = item?.src || item?.cloudinary?.url || item?.copy?.src || '';
        if (!src) return null;

        const cloudinary = item?.cloudinary ?? {
          public_id: item?.public_id ?? '',
          url: item?.url ?? '',
        };

        const hasCloudinary = !!(cloudinary?.public_id || cloudinary?.url);

        return {
          id: item?.id || item?._id || `gallery-${index}`,
          src,
          cloudinary: {
            public_id: cloudinary?.public_id ?? '',
            url: cloudinary?.url ?? '',
          },
          uploaded: {
            cloudinary: item?.uploaded?.cloudinary ?? hasCloudinary,
            database: item?.uploaded?.database ?? hasCloudinary,
          },
        } as Image;
      })
      .filter((img): img is Image => !!img);
  }

  private normalizeSKUCombinationForForm(combination: any) {
    if (Array.isArray(combination)) {
      return combination;
    }

    if (combination && typeof combination === 'object') {
      return Object.entries(combination)
        .filter(([key]) => key !== 'disabled')
        .map(([variant, value]) => ({
          variant,
          value: String(value ?? ''),
        }));
    }

    return [];
  }

  private normalizeProductSkus(skus: any): any[] {
    const list = Array.isArray(skus) ? skus : [];

    return list.map((sku: any, index: number) => {
      const imageData = sku?.image ?? {};
      const cloudinary = imageData?.cloudinary ?? {
        public_id: imageData?.public_id ?? '',
        url: imageData?.url ?? '',
      };
      const fallbackSrc =
        imageData?.src ||
        cloudinary?.url ||
        imageData?.cloudinary?.secure_url ||
        '';
      const imageId =
        imageData?.copy?.id || imageData?.original?.id || `sku-image-${index}`;
      const hasCloudinary = !!(cloudinary?.public_id || cloudinary?.url);

      return {
        ...sku,
        combination: this.normalizeSKUCombinationForForm(sku?.combination),
        image: {
          original: {
            src: imageData?.original?.src || fallbackSrc,
            id: imageData?.original?.id || imageId,
          },
          copy: {
            src: imageData?.copy?.src || fallbackSrc,
            id: imageData?.copy?.id || imageId,
          },
          uploaded: {
            cloudinary: imageData?.uploaded?.cloudinary ?? hasCloudinary,
            database: imageData?.uploaded?.database ?? hasCloudinary,
          },
          cloudinary: {
            public_id: cloudinary?.public_id ?? '',
            url: cloudinary?.url ?? '',
          },
        },
        price: Number(sku?.price ?? 0),
        stock: Number(sku?.stock ?? 0),
      };
    });
  }

  private normalizeProductSemanticImage(product: any): SemanticImage {
    const semantic =
      product?.semanticImage ??
      product?.semantic_image ??
      product?.semanticSearch?.image ??
      {};

    const cloudinary = semantic?.cloudinary ?? {
      public_id: semantic?.public_id ?? '',
      url: semantic?.url ?? '',
    };
    const src =
      semantic?.copy?.src ||
      semantic?.original?.src ||
      semantic?.src ||
      cloudinary?.url ||
      '';
    const id =
      semantic?.copy?.id ||
      semantic?.original?.id ||
      semantic?.id ||
      `semantic-${product?._id || 'image'}`;
    const hasCloudinary = !!(cloudinary?.public_id || cloudinary?.url);

    return {
      original: {
        src: semantic?.original?.src || src,
        id: semantic?.original?.id || id,
      },
      copy: {
        src: semantic?.copy?.src || src,
        id: semantic?.copy?.id || id,
      },
      uploaded: {
        cloudinary: semantic?.uploaded?.cloudinary ?? hasCloudinary,
        database: semantic?.uploaded?.database ?? hasCloudinary,
      },
      cloudinary: {
        public_id: cloudinary?.public_id ?? '',
        url: cloudinary?.url ?? '',
      },
      vector: Array.isArray(semantic?.vector) ? semantic.vector : [],
    };
  }

  private fetchProductForEdit(productCode: string) {
    this.productService.getProduct(productCode).subscribe({
      next: (response: any) => {
        console.log('response', response);
        const product = response.data;
        if (!product) return;

        this.shopId = product.shopId ?? this.shopId;

        this.productForm.patchValue({
          productName: product.name ?? '',
          description: product.description ?? '',
          category: this.normalizeSelectedCategories(product.category),
          subcategory: this.normalizeSelectedSubcategories(product.subcategory),
          publishingType: product.publishingType ?? 'SCHEDULED',
          scheduledDate: product.scheduledDate ?? this.defaultDate,
        });

        this.hasVariants = _.size(product.variants) > 0;

        if (Array.isArray(product.variants)) {
          this.variants.clear();
          product.variants.forEach((variant: any) => {
            this.variants.push(
              this.fb.group({
                name: [variant?.name ?? ''],
                options: [variant?.options ?? []],
              }),
            );
          });
        }

        const galleryImages = this.normalizeProductGallery(product.gallery);
        this.copies = galleryImages;
        this.originals = [...galleryImages];
        this.productForm.get('images')?.setValue(galleryImages);
        this.productForm.get('images')?.updateValueAndValidity();

        const normalizedSkus = this.normalizeProductSkus(product.skus);
        this.skus.clear();
        normalizedSkus.forEach((sku: any) => {
          this.skus.push(
            this.fb.group({
              combination: [sku.combination ?? []],
              image: [sku.image ?? []],
              price: [sku.price ?? 0],
              stock: [sku.stock ?? 0],
            }),
          );
        });
        this.skus.updateValueAndValidity();

        this.semanticImage = this.normalizeProductSemanticImage(product);
        if (this.semanticImage.copy.src) {
          this.semanticImageFormControl?.setValue({
            cloudinary: this.semanticImage.cloudinary,
            uploaded: this.semanticImage.uploaded,
            vector: this.semanticImage.vector,
            src: this.semanticImage.copy.src,
          });
        } else {
          this.semanticImageFormControl?.setValue(null);
        }
        this.semanticImageFormControl?.updateValueAndValidity();
      },
      error: (error: any) => {
        console.error('Error fetching product for edit:', error);
      },
    });
  }

  onSubcategoryItemClick(node: any, event: Event) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('ion-checkbox')) {
      return;
    }

    const nextChecked = !this.isSubcategorySelected(node.code);
    this.toggleSubcategory(node, nextChecked);
  }

  getSelectedSubcategoryNames(): string[] {
    const selected = this.subcategory.value || [];
    if (!Array.isArray(selected)) return [];
    return selected
      .map((item: any) => {
        const code =
          item && typeof item === 'object' ? Number(item.code) : Number(item);
        const fallbackName = Number.isFinite(code)
          ? this.subcategoryNodeMap.get(code)?.name || ''
          : '';
        return (item?.name || fallbackName || '').trim();
      })
      .filter((name: string) => !!name);
  }

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

  public isUploadSemanticImageTriggered = false;
  async uploadProductSemanticImageAPI(
    productId: string,
    shopId: string,
  ): Promise<SemanticImage | null> {
    try {
      if (this.semanticImage.uploaded.cloudinary) {
        return null;
      }

      const upload$ = this.cloudinaryService.isNative()
        ? this.cloudinaryService.uploadProductSemanticImageMobile(
            this.semanticImage,
            productId,
            shopId,
          )
        : this.cloudinaryService.uploadProductSemanticImageWeb(
            this.semanticImage,
            productId,
            shopId,
          );

      const cloudinaryUpload = await firstValueFrom(upload$);

      this.semanticImage = {
        ...this.semanticImage,
        cloudinary: {
          public_id: cloudinaryUpload.cloudinary.public_id,
          url: cloudinaryUpload.cloudinary.url,
        },
        uploaded: { cloudinary: true, database: false },
      };

      // Update form
      this.semanticImageFormControl.patchValue(this.semanticImage);

      this.isUploadSemanticImageTriggered = true;

      return this.semanticImage;
    } catch (error) {
      console.error('Error uploading semantic image:', error);
      return null;
    }
  }
  get someGalleryImagesNotUploadedInCloudinary() {
    return this.copies.some((copy) => !copy.uploaded.cloudinary);
  }

  public productCode!: string;
  public shopId!: string;
  public publicIdCloudinaryForRemoval: string[] = [];
  public status = 'PRESAVED';
  public isGalleryOrderChanged = false;

  private async deleteMarkedCloudinaryImages() {
    if (_.size(this.publicIdCloudinaryForRemoval) === 0) return;
    console.log(
      'this.publicIdCloudinaryForRemoval',
      this.publicIdCloudinaryForRemoval,
    );
    const x = await firstValueFrom(
      this.cloudinaryService.delete(
        this.productCode,
        this.publicIdCloudinaryForRemoval,
      ),
    );
    console.log('-----------x', x);
    this.publicIdCloudinaryForRemoval = [];
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

    if (!this.productCode) {
      const categoryList = this.normalizeSelectedCategories(
        this.productForm.value.category,
      );

      //  Generate image embedding (Float32Array ~2.3 MB)
      const imageVector = await this.imageEmbedService.embedImage(
        this.semanticImageFormControl?.value?.src,
      );
      this.semanticImage.vector = imageVector;

      // Set image embedding to form control
      this.semanticImageFormControl.patchValue(this.semanticImage);

      // Build SKU summary text for text embedding
      const skuSummary = this.productForm.value.skus.map((sku: any) => {
        return this.buildSkuEmbeddingText(sku.combination, sku.price);
      });

      // Generate text embedding (Float32Array ~3 KB)
      const textVector = await this.textEmbedService.embed(
        `Product name: ${this.productForm.value.productName}.
         Description: ${this.productForm.value.description}.
         Category: ${categoryList.map((cat) => cat.name).join(', ')}.
         Subcategory: ${this.getSelectedSubcategoryNames().join(', ')}.
         Variants: ${this.productForm.value.variants
           .map(
             (v: any) => `${v.name} 
         options: ${v.options?.join(', ')}`,
           )
           .join('; ')}.SKU Details: ${skuSummary.join(' ')}`.trim(),
      );

      // Data to be sent to backend
      const productData = {
        gallery: this.gallery.value,
        name: this.productForm.value.productName,
        status: this.status,
        description: this.productForm.value.description,
        category: categoryList,
        subcategory: this.productForm.value.subcategory,
        publishingType: this.productForm.value.publishingType,
        scheduledDate: this.productForm.value.scheduledDate,
        semantic_image: {
          cloudinary: this.semanticImage.cloudinary,
          upload: this.semanticImage.uploaded,
        },
        textEmbedding: Array.from(textVector),
        imageEmbedding: Array.from(imageVector),
        skus: this.normalizeSKUImage(this.productForm.value.skus),
        variants: this.productForm.value.variants,
      };

      // Product pre-saved
      this.productService
        .saveProduct(productData)
        .pipe(
          switchMap((response: any) => {
            const saveProductResponse = response.data;
            const savedProduct =
              saveProductResponse?.product ?? saveProductResponse;
            this.productCode = savedProduct?.productCode;
            this.shopId = savedProduct?.shopId;

            if (_.size(this.gallery) === 0) {
              return of(response);
            }

            return forkJoin({
              gallery: this.uploadProductGalleryAPI(
                this.productCode,
                this.shopId,
              ),
              skuThumbnails: this.uploadProductSKUThumbnailsAPI(
                this.productCode,
                this.shopId,
              ),
              semanticImage: this.uploadProductSemanticImageAPI(
                this.productCode,
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

            const semanticImage = {
              cloudinary: this.semanticImage.cloudinary,
              uploaded: {
                ...this.semanticImage.uploaded,
                database: true,
              },
            };

            if (_.size(gallery) === 0 && _.size(skus) === 0) return of(result);

            const prop: any = {
              ...(_.size(gallery) && { gallery }),
              ...(_.size(skus) && { skus }),
              ...(_.size(semanticImage) && { semanticImage }),
            };

            console.log('-----props', prop);

            return this.productService
              .updateProduct(this.productCode, prop)
              .pipe(
                tap((response: any) => {
                  const updateProductResponse = response.data;
                  const public_ids = (updateProductResponse?.gallery ?? []).map(
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
      const categoryList = this.normalizeSelectedCategories(
        this.productForm.value.category,
      );

      // Generate image embedding for vector image
      const imageVector = await this.imageEmbedService.embedImage(
        this.semanticImageFormControl?.value?.src,
      );
      this.semanticImage.vector = imageVector;
      this.semanticImageFormControl.patchValue(this.semanticImage);

      // Build SKU summary text for text embedding
      const skuSummary = this.productForm.value.skus.map((sku: any) => {
        return this.buildSkuEmbeddingText(sku.combination, sku.price);
      });

      // Generate text embedding
      const textVector = await this.textEmbedService.embed(
        `Product name: ${this.productForm.value.productName}.
         Description: ${this.productForm.value.description}.
         Category: ${categoryList.map((cat) => cat.name).join(', ')}.
         Subcategory: ${this.getSelectedSubcategoryNames().join(', ')}.
         Variants: ${this.productForm.value.variants
           .map(
             (v: any) => `${v.name} 
         options: ${v.options?.join(', ')}`,
           )
           .join('; ')}.SKU Details: ${skuSummary.join(' ')}`.trim(),
      );
      console.log(
        '-this.productForm.value.gallery',
        this.productForm.value.gallery,
      );
      const productData = {
        gallery: this.gallery.value,
        name: this.productForm.value.productName,
        status: this.status,
        description: this.productForm.value.description,
        category: categoryList,
        subcategory: this.productForm.value.subcategory,
        publishingType: this.productForm.value.publishingType,
        scheduledDate: this.productForm.value.scheduledDate,
        semantic_image: {
          cloudinary: this.semanticImage.cloudinary,
          upload: this.semanticImage.uploaded,
        },
        textEmbedding: Array.from(textVector),
        imageEmbedding: Array.from(imageVector),
        skus: this.normalizeSKUImage(this.productForm.value.skus),
        variants: this.productForm.value.variants,
      };

      console.log('-----------productData', productData);

      this.productService
        .updateProduct(this.productCode, productData)
        .pipe(
          switchMap((response: any) => {
            const updateProductResponse = response?.data;
            const updatedProduct =
              updateProductResponse?.product ?? updateProductResponse;
            this.shopId = updatedProduct?.shopId ?? this.shopId;

            if (!this.shopId) {
              return of(response);
            }

            return forkJoin({
              gallery: this.uploadProductGalleryAPI(
                this.productCode,
                this.shopId,
              ),
              skuThumbnails: this.uploadProductSKUThumbnailsAPI(
                this.productCode,
                this.shopId,
              ),
              semanticImage: this.uploadProductSemanticImageAPI(
                this.productCode,
                this.shopId,
              ),
            }).pipe(
              map((uploadResponse) => ({
                updateProductResponse,
                uploadResponse,
              })),
            );
          }),
          switchMap((result: any) => {
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

            const semanticImage =
              this.semanticImage.uploaded?.cloudinary &&
              !this.semanticImage.uploaded?.database
                ? {
                    cloudinary: this.semanticImage.cloudinary,
                    uploaded: {
                      ...this.semanticImage.uploaded,
                      database: true,
                    },
                  }
                : null;

            if (_.size(gallery) === 0 && _.size(skus) === 0 && !semanticImage) {
              return of(result);
            }

            const prop: any = {
              ...(_.size(gallery) && { gallery }),
              ...(_.size(skus) && { skus }),
              ...(semanticImage && { semanticImage }),
            };

            return this.productService
              .updateProduct(this.productCode, prop)
              .pipe(
                tap((response: any) => {
                  const updatedData = response?.data ?? {};
                  const public_ids = (updatedData?.gallery ?? []).map(
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

                  if (semanticImage) {
                    this.semanticImage = {
                      ...this.semanticImage,
                      uploaded: {
                        ...this.semanticImage.uploaded,
                        database: true,
                      },
                    };
                    this.semanticImageFormControl.patchValue(
                      this.semanticImage,
                    );
                  }
                }),
              );
          }),
        )
        .subscribe({
          next: (finalResult) => {
            console.log('Product updated successfully:', finalResult);
          },
          error: (error) => {
            console.error('Error updating product:', error);
          },
        });
    }
  }

  normalizeSKUImage(sku: any) {
    console.log('sku', sku);
    return sku.map((sku: any) => ({
      ...sku,
      // image: {
      //   cloudinary: {
      //     url: sku.image?.secure_url,
      //     public_id: '',
      //   },
      // },
      // uploaded: { cloudinary: false, database: false },
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

  get category(): FormControl {
    return this.productForm.get('category') as FormControl;
  }

  get subcategory(): FormControl {
    return this.productForm.get('subcategory') as FormControl;
  }

  get variants(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  get skus(): FormArray {
    return this.productForm.get('skus') as FormArray;
  }

  get gallery(): FormControl<Image[]> {
    return this.productForm.get('images') as FormControl<Image[]>;
  }

  public tempSKUFormId!: number;

  async openSKUForm(i: any | null = null) {
    const modal = await this.bottomSheet.create({
      component: SkuFormComponent,
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

    console.log('role', role);
    console.log('data', data);

    if (role === 'save' && data) {
      this.addSKU(data, i);
    } else {
      this.skus.markAsTouched();
    }
  }

  addSKU(data: any, i: any) {
    if (!_.isNil(i)) {
      console.log('i', this.skus.at(i).value);
      console.log('skuForm', data);

      if (data.newImage) {
        this.publicIdCloudinaryForRemoval.push(
          this.skus.at(i).value?.image?.cloudinary?.public_id,
        );
      }

      this.skus.setControl(i, data.SKUForm);
    } else {
      this.skus.push(data.SKUForm);
    }

    console.log('--------this.skus', this.skus.value);
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
    vector: [],
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
    return this.productForm.get('semanticImage') as FormControl;
  }

  async openGalleryForSingle() {
    const image = await this.imageService.openGallerySingle(
      this.semanticImage as any,
    );
    this.semanticImage = {
      ...this.semanticImage.vector,
      ...image,
      vector: this.semanticImage.vector ?? [],
    };
    console.log('-----------semanticImage', this.semanticImage);

    this.syncImagesToForm();
    this.updateFormErrors();

    console.log('-----------productForm', this.productForm.value);
  }

  async openCameraSingle() {
    const image = await this.imageService.openCameraSingle(
      this.semanticImage as any,
    );
    this.semanticImage = {
      ...this.semanticImage,
      ...image,
      vector: this.semanticImage.vector ?? [],
    };

    this.syncImagesToForm();
    this.updateFormErrors();
  }

  removeSemanticImage() {
    const publicId = this.semanticImage?.cloudinary?.public_id;
    // Push the publicId into the publicIdCloudinary array
    if (!_.isNil(publicId)) this.publicIdCloudinaryForRemoval.push(publicId);
    console.log(
      'this.publicIdCloudinaryForRemoval',
      this.publicIdCloudinaryForRemoval,
    );
    this.semanticImage = {
      original: { src: '', id: '' },
      copy: { src: '', id: '' },
      uploaded: { cloudinary: false, database: false },
      cloudinary: { public_id: '', url: '' },
      vector: [],
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
        const publicId = this.semanticImage?.cloudinary?.public_id;
        // Push the publicId into the publicIdCloudinary array
        if (!_.isNil(publicId))
          this.publicIdCloudinaryForRemoval.push(publicId);

        this.semanticImage.copy.src = result.src;

        this.semanticImage = {
          ...this.semanticImage,
          copy: { src: result.src, id: '' },
          uploaded: { cloudinary: false, database: false },
          cloudinary: { public_id: '', url: '' },
          vector: [],
        };

        this.syncImagesToForm();
        this.updateFormErrors();
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
