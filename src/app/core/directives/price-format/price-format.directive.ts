import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[kuwebaPriceFormat]',
})
export class PriceFormatDirective {
  constructor(private ngControl: NgControl) {}

  /** Sanitize while typing */
  @HostListener('ionInput', ['$event'])
  onInput(ev: any) {
    let value = ev.detail?.value || '';

    value = value.replace(/[^0-9.,]/g, '');

    // Allow only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    this.ngControl.control?.setValue(value, {
      emitEvent: false,
    });
  }

  /** Format on blur */
  @HostListener('ionBlur')
  onBlur() {
    const control = this.ngControl.control;
    if (!control) return;

    let value = control.value;
    if (!value) return;

    value = value.toString().replace(/,/g, '');
    const num = parseFloat(value);

    if (isNaN(num) || num < 0) {
      control.setValue('0.00');
      return;
    }

    control.setValue(
      num.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
}
