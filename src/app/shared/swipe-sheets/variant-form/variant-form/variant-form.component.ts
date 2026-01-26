import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Optional,
  Output,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  IonInput,
  IonText,
  IonButton,
  IonContent,
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import * as _ from 'lodash';
import {
  FormErrorMap,
  FormService,
} from 'src/app/core/services/form/form.service';

@Component({
  imports: [IonContent, IonButton, IonInput, IonText, ReactiveFormsModule],
  selector: 'app-variant-form',
  templateUrl: './variant-form.component.html',
  styleUrls: ['./variant-form.component.scss'],
})
export class VariantFormComponent implements OnInit {
  // Public properties
  public variantForm: FormGroup;
  public formErrors: FormErrorMap = {};
  public errorFormName: Record<string, string> = {
    name: 'Variant Name',
    options: 'Options',
  };
  @Input() initialData?: { name: string; options: string[] };
  @Output() save = new EventEmitter<FormGroup>();

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private formService: FormService,
  ) {
    this.variantForm = this.createVariantForm();
    this.addOption();
  }

  ngOnInit() {
    if (this.initialData) {
      this.patchVariant(this.initialData);
    }
  }

  public createVariantForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      options: this.fb.array([], Validators.minLength(1)),
    });
  }

  // Methods
  public addOption() {
    this.options.push(this.fb.control('', Validators.required));
  }

  public removeOption(index: number) {
    this.options.removeAt(index);
  }

  public patchVariant(data: { name: string; options: string[] }) {
    this.variantForm.patchValue({
      name: data.name,
    });

    const optionsArray = this.options;
    optionsArray.clear();

    if (_.size(data.options) > 0) {
      data.options.forEach((opt) => {
        optionsArray.push(this.fb.control(opt, Validators.required));
      });
    }
  }

  saveVariant() {
    this.variantForm.markAllAsTouched();

    if (this.variantForm.invalid) {
      this.formErrors = this.formService.getFormErrorMessages(
        this.variantForm,
        this.errorFormName,
      );

      console.log('this.formErrors', this.formErrors);

      return;
    }

    this.modalCtrl.dismiss(this.variantForm, 'save');
  }

  // Getters
  get options(): FormArray {
    return this.variantForm.get('options') as FormArray;
  }
}
