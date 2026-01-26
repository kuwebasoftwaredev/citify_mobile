import { AbstractControl, FormArray, ValidatorFn } from '@angular/forms';

export function variantsRequiredIfEnabled(): ValidatorFn {
  return (group: AbstractControl) => {
    const hasVariants = group.get('hasVariants')?.value;
    const variants = group.get('variants') as FormArray;
    console.log('variants', variants.length);
    console.log('hasVariants', hasVariants);
    if (hasVariants && (!variants || variants.length === 0)) {
      return { variantsRequired: true };
    }

    return null;
  };
}
