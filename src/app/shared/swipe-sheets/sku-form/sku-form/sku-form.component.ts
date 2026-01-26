import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  IonInput,
  IonText,
  IonButton,
  IonContent,
  IonIcon,
  IonLabel,
  IonRippleEffect,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import {
  AbstractControl,
  Form,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ModalController } from '@ionic/angular';
import {
  Image,
  ImageService,
  OpenGalleryResultSKU,
} from 'src/app/core/services/image/image.service';
import { VariantLabelPipe } from 'src/app/shared/pipes/variant-label/variant-label.pipe';
import * as _ from 'lodash';
import { PriceFormatDirective } from 'src/app/core/directives/price-format/price-format.directive';
import { NoLeadingZeroDirective } from 'src/app/core/directives/price-format/no-leading-zero.directive';
import { FormService } from 'src/app/core/services/form/form.service';

type FormErrorMap = {
  [key: string]: string[] | FormErrorMap;
};

interface FormLevelErrorConfig {
  errorKey: string;
  mapTo: string;
  message: (labels: Record<string, string>) => string;
}

interface IVariantCombination {
  [key: string]: string | boolean | undefined;
  disabled?: boolean;
}

export interface SKUImage {
  original: { src: string; id: string };
  copy: { src: string; id: string };
}

@Component({
  imports: [
    //  Ionic
    IonRippleEffect,
    IonLabel,
    IonIcon,
    IonContent,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,

    // Pipes
    VariantLabelPipe,

    // Directives
    PriceFormatDirective,
    NoLeadingZeroDirective,

    //  Modules
    ReactiveFormsModule,
  ],
  selector: 'app-sku-form',
  templateUrl: './sku-form.component.html',
  styleUrls: ['./sku-form.component.scss'],
})
export class SkuFormComponent implements OnInit {
  public SKUForm!: FormGroup;
  public SKUformErrors: FormErrorMap = {};
  public SKULabelMap: Record<string, string> = {
    image: 'Image',
    combination: 'Combination',
    price: 'Price',
    stock: 'Stock',
  };
  public imageSKU!: SKUImage;
  public isSKUFormSubmitted: boolean = false;
  public variantCombinations: IVariantCombination[] = [];

  @Input() initialData?: any;
  @Input() variants!: FormArray;
  @Input() skus!: FormArray;
  @Output() save = new EventEmitter<FormGroup>();

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private formService: FormService,
    private imageService: ImageService,
  ) {
    this.SKUForm = this.createSKUForm();

    this.imageSKU = {
      original: { src: '', id: '' },
      copy: { src: '', id: '' },
    };
  }

  ngOnInit() {
    this.generateVariantCombinations();

    if (this.initialData) {
      this.patchSKU(this.initialData);

      this.imageSKU = this.initialData.image;
    }
  }

  createSKUForm() {
    return this.fb.group({
      combination: [[], [Validators.required]],
      image: [[], [Validators.required]],
      price: ['0.00', [Validators.required]],
      stock: [0, Validators.min(0)],
    });
  }

  private syncImagesToForm() {
    this.SKUForm.get('image')?.setValue([this.imageSKU]);
    this.SKUForm.get('image')?.markAsTouched();
    this.SKUForm.get('image')?.updateValueAndValidity();
  }

  saveSKU() {
    this.isSKUFormSubmitted = true;
    this.SKUForm.markAllAsTouched();

    if (this.SKUForm.invalid) {
      this.updateFormErrors();

      console.log('Form Errors', this.SKUformErrors);
      return;
    }

    const rawPrice = Number(this.SKUForm.value.price.replace(/,/g, ''));

    this.SKUForm.patchValue({
      image: this.imageSKU,
      price: rawPrice,
      combination: this.denormalizeCombination(this.SKUForm.value.combination),
    });

    if (this.SKUForm.valid) {
      this.modalCtrl.dismiss(this.SKUForm, 'save');
    }
  }

  public patchSKU(data: any) {
    this.SKUForm.patchValue({
      combination: this.normalizeCombination(data.combination),
      image: data.image,
      price: data.price.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      stock: data.stock,
    });
  }

  async openGalleryForSingle() {
    this.imageSKU = await this.imageService.openGallerySingle(this.imageSKU);

    this.syncImagesToForm();
    this.updateFormErrors();
  }

  async openCameraSingle() {
    this.imageSKU = await this.imageService.openCameraSingle(this.imageSKU);

    this.syncImagesToForm();
    this.updateFormErrors();
  }

  updateFormErrors() {
    this.SKUformErrors = this.formService.getFormErrorMessages(
      this.SKUForm,
      this.SKULabelMap,
    );
  }

  remove() {
    this.imageSKU = {
      original: { src: '', id: '' },
      copy: { src: '', id: '' },
    };

    this.syncImagesToForm();
    this.updateFormErrors();
  }

  openCropper() {
    console.log('this.imageSKU', this.imageSKU);
    if (!this.imageSKU.original.src) {
      return;
    }
    this.imageService
      .openCropper(this.imageSKU.original)
      .subscribe((result) => {
        this.imageSKU.copy.src = result.src;
      });
  }

  /**
   * Converts a SKU combination array into an object format
   *
   *Example:
   * [
   *   { variant: 'color', value: 'red' },
   *   { variant: 'size', value: 'small' }
   * ]
   *
   * ➜ { color: 'red', size: 'small' }
   */
  private normalizeCombination(
    combination: { variant: string; value: string }[],
  ): Record<string, string> {
    return combination.reduce(
      (acc, item) => {
        // Use the variant name as the key (e.g. "color", "size")
        // and assign its selected value (e.g. "red", "small")
        acc[item.variant] = item.value;

        // Return the accumulator for the next iteration
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  /**
   * Converts a SKU combination object back into array format,
   * excluding any keys named "disabled".
   *
   * Example:
   * { color: 'red', size: 'small', disabled: true }
   *
   * ➜
   * [
   *   { variant: 'color', value: 'red' },
   *   { variant: 'size', value: 'small' }
   * ]
   */
  private denormalizeCombination(
    combination: Record<string, string>,
  ): { variant: string; value: string }[] {
    return (
      Object.entries(combination)
        // Exclude the "disabled" key
        .filter(([key]) => key !== 'disabled')
        // Map remaining entries into { variant, value } format
        .map(([variant, value]) => ({
          variant,
          value,
        }))
    );
  }

  generateVariantCombinations() {
    if (_.size(this.variants) > 0) {
      this.variantCombinations = this.variants.value.reduce(
        (acc: any, variant: any) =>
          acc.flatMap((prev: any) =>
            variant.options.map((option: any) => ({
              ...prev,
              [variant.name.toLowerCase()]: option.toLowerCase(),
              disabled: false,
            })),
          ),
        [{} as IVariantCombination],
      );

      this.disableVariantCombination();
    }
  }

  /**
   * Disables variant combinations that already exist in the SKU list
   *
   * If a variant combination (e.g. color + size) matches any SKU,
   * it will be marked as disabled to prevent duplicates.
   */
  disableVariantCombination() {
    const skuList = this.skus.value;
    if (!skuList?.length) return;

    const normalizedSkus = skuList
      .map((sku: any) => this.normalizeCombination(sku.combination))
      .filter((sku: any) => Object.keys(sku).length > 0); // ✅ ignore empty

    this.variantCombinations = this.variantCombinations.map((combination) => {
      const isDisabled = normalizedSkus.some((sku: any) =>
        Object.keys(sku).every((key) => sku[key] === combination[key]),
      );

      return {
        ...combination,
        disabled: isDisabled,
      };
    });
  }

  /**
   * Custom comparison function for ion-select to determine if two variant objects are equal.
   *
   * Why we need this:
   * In JavaScript, objects are compared by **reference**, not by value.
   * This means:
   *   { color: 'red', size: 'small' } === { color: 'red', size: 'small' } // false
   * even though the contents are identical.
   *
   * ion-select uses strict equality (===) to match the form value with options by default.
   * Therefore, we must provide a custom compare function to compare **object contents**.
   *
   * @param o1 - first variant object (from form value)
   * @param o2 - second variant object (from variantCombinations array)
   * @returns boolean - true if objects are considered equal
   */
  compareVariants(o1: IVariantCombination, o2: IVariantCombination): boolean {
    // If either is null/undefined, they cannot match
    if (!o1 || !o2) return false;

    // Get the keys of each object, **excluding the 'disabled' key**,
    // because 'disabled' does not affect value comparison
    const keys1 = Object.keys(o1).filter((k) => k !== 'disabled');
    const keys2 = Object.keys(o2).filter((k) => k !== 'disabled');

    // If number of keys differs, objects cannot be equal
    if (keys1.length !== keys2.length) return false;

    // Check that all keys exist and values are equal in both objects
    return keys1.every((key) => o1[key] === o2[key]);
  }
}
