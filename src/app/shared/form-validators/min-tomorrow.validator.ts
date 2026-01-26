import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function minTomorrowValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;

    const selected = new Date(control.value);
    const min = new Date();

    min.setDate(min.getDate() + 1);
    min.setHours(0, 0, 0, 0); // start of tomorrow

    return selected >= min ? null : { minDate: true };
  };
}
