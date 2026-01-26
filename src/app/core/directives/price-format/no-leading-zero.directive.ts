import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[kuwebaNoLeadingZero]',
})
export class NoLeadingZeroDirective {
  constructor(private ngControl: NgControl) {}

  /** Sanitize input while typing */
  @HostListener('ionInput', ['$event'])
  onInput(ev: any) {
    let value = ev.detail?.value || '';

    // Remove leading zeros
    value = value.replace(/^0+/, '');

    // If empty, set 0
    if (value === '') value = '0';

    // Update form control without triggering event loops
    this.ngControl.control?.setValue(value, { emitEvent: false });
  }
}
