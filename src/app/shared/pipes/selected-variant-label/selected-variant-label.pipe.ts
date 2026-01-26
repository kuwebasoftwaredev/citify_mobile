import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'selectedVariantLabel',
  standalone: true, // remove if using modules
})
export class SelectedVariantLabelPipe implements PipeTransform {
  /**
   * Converts an array of variant objects into a readable string
   * Example: [{variant:'color', value:'red'}, {variant:'size', value:'small'}]
   * Output: "Red + Small"
   *
   * @param combination - array of {variant, value} objects
   * @param separator - string to separate each value, default: ' + '
   */
  transform(
    combination: { variant: string; value: string }[],
    separator: string = ' + ',
  ): string {
    if (!combination || !Array.isArray(combination)) return '';
    console.log(
      'combination',
      combination
        .map((item) =>
          item.value
            ? item.value.charAt(0).toUpperCase() + item.value.slice(1) // capitalize
            : '',
        )
        .filter((val) => val !== '') // remove empty strings
        .join(separator),
    );
    return combination
      .map((item) =>
        item.value
          ? item.value.charAt(0).toUpperCase() + item.value.slice(1) // capitalize
          : '',
      )
      .filter((val) => val !== '') // remove empty strings
      .join(separator);
  }
}
