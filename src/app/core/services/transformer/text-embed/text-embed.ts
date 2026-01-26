import { Injectable } from '@angular/core';
import { pipeline } from '@xenova/transformers';

@Injectable({ providedIn: 'root' })
export class TextEmbedService {
  private model: any;

  async embed(text: string): Promise<Float32Array> {
    if (!this.model) {
      this.model = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
      );
    }

    const output = await this.model(text, {
      pooling: 'mean',
      normalize: true,
    });

    return new Float32Array(output.data); // ~768 floats (~3 KB)
  }
}
