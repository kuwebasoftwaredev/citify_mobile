import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'variantLabel',
})
export class VariantLabelPipe implements PipeTransform {
  /**
   * Transforms a variant combination object into a readable label
   *
   * Example:
   * { color: 'red', size: 'medium', disabled: true }
   *
   * ➜ "Red + Medium"
   */
  transform(variant: Record<string, any>, separator: string = ' + '): string {
    // Return empty string if no variant is provided
    if (!variant) return '';

    return (
      Object.entries(variant)
        // Exclude non-display keys (e.g. "disabled")
        .filter(([key]) => key !== 'disabled')
        // Format each value (capitalize first letter if string)
        .map(([, value]) =>
          typeof value === 'string'
            ? value.charAt(0).toUpperCase() + value.slice(1)
            : value,
        )
        // Join formatted values into a single label
        .join(separator)
    );
  }
}
