import { Injectable } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
} from '@angular/forms';
export type FormErrorMap = {
  [key: string]: string[] | FormErrorMap;
};

interface FormLevelErrorConfig {
  errorKey: string;
  mapTo: string;
  message: (labels: Record<string, string>) => string;
}
type GroupedError = {
  control: string;
  label: string;
  messages: string[];
};
@Injectable({
  providedIn: 'root',
})
export class FormService {
  constructor() {}

  checkForm(
    control: AbstractControl,
    labelMap: Record<string, string> = {},
    controlKey: string = '',
  ): FormErrorMap {
    const errors: FormErrorMap = {};
    const label = labelMap[controlKey] || controlKey || 'Field';
    const FORMGROUP_LEVEL_ERROR_MAP: FormLevelErrorConfig[] = [
      {
        errorKey: 'variantsRequired',
        mapTo: 'variants',
        message: (labels) =>
          `Required when ${labels['variants'] ?? 'variants'} is enabled`,
      },
    ];

    // 🟡 HANDLE FORM CONTROL ERRORS ONLY
    if (control.errors) {
      errors[controlKey] = Object.keys(control.errors).map((errorKey) => {
        switch (errorKey) {
          case 'required':
            return 'This field is required.';
          case 'min':
            return 'The value is too small.';
          case 'max':
            return 'The value is too large.';
          case 'minlength':
            return 'The value is too short.';
          case 'maxlength':
            return 'The value is too long.';
          default:
            return 'This field is invalid.';
        }
      });
    }

    // 🔵 FORM-GROUP LEVEL ERRORS (ROOT ONLY)
    if (control instanceof FormGroup && controlKey === '') {
      FORMGROUP_LEVEL_ERROR_MAP.forEach((config) => {
        if (control.hasError(config.errorKey)) {
          const target = config.mapTo;

          if (!errors[target]) {
            errors[target] = [];
          }

          if (Array.isArray(errors[target])) {
            (errors[target] as string[]).push(config.message(labelMap));
          }
        }
      });
    }

    // 2️⃣ Handle FormGroup
    if (control instanceof FormGroup) {
      Object.keys(control.controls).forEach((key) => {
        const childErrors = this.checkForm(
          control.controls[key],
          labelMap,
          key,
        );

        if (Object.keys(childErrors).length) {
          errors[key] = childErrors[key] ?? childErrors;
        }
      });
    }

    // 3️⃣ Handle FormArray
    if (control instanceof FormArray) {
      control.controls.forEach((child, index) => {
        const childErrors = this.checkForm(child, labelMap, `${index}`);

        if (Object.keys(childErrors).length) {
          errors[index] = childErrors;
        }
      });
    }

    return errors;
  }

  getFormErrorMessages(
    form: FormGroup,
    labelMap: Record<string, string>,
    productFormErrors: FormErrorMap,
  ): GroupedError[] {
    let result: GroupedError[] = [];

    const walk = (control: any, path = '') => {
      if (!control) return;

      // FormGroup
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach((key) => {
          const child = control.controls[key];
          const childPath = path ? `${path}.${key}` : key;
          walk(child, childPath);
        });
        return;
      }

      // FormArray
      if (control instanceof FormArray) {
        control.controls.forEach((child, index) => {
          const childPath = `${path}[${index}]`;
          walk(child, childPath);
        });
        return;
      }

      // FormControl
      // ✅ FormControl (leaf)
      if (control instanceof FormControl) {
        const messages = this.getErrorByPath(productFormErrors, path);

        if (Array.isArray(messages) && messages.length) {
          result.push({
            control: path,
            label: labelMap?.[path] ?? path,
            messages,
          });
        }
      }
    };

    walk(form);

    return result;
  }
  getErrorByPath(errors: any, path: string): string[] | null {
    if (!errors || !path) return null;

    return (
      path
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .reduce((acc, key) => acc?.[key], errors) ?? null
    );
  }
}
