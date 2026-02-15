import { Injectable } from '@angular/core';
import { ImageService } from '../../image/image.service';

@Injectable({
  providedIn: 'root',
})
export class ImageEmbedService {
  private worker: Worker | null = null;
  private isLoading = false;
  private ready = false;

  constructor(private imageService: ImageService) {}

  initWorker() {
    if (this.worker) return;
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./clip.worker.ts', import.meta.url), {
        type: 'module',
      });
    } else {
      console.warn('Web Workers are not supported in this environment.');
    }
  }

  async embedImage(image: string): Promise<number[]> {
    this.initWorker();

    const blob =
      typeof image === 'string'
        ? await this.imageService.blobUrlToBlob(image)
        : image;

    const arrayBuffer = await blob.arrayBuffer();
    const mimeType = blob.type || 'image/jpeg';

    return new Promise((resolve, reject) => {
      if (!this.worker) return reject('Worker not initialized');

      const onMessage = (event: MessageEvent) => {
        const data = event.data;

        console.log('Received message from worker:', event);

        switch (data.type) {
          case 'downloading':
            console.log(
              `Downloading CLIP model: ${Math.round(data.progress)}%`,
            );
            break;

          case 'status':
            if (data.status === 'loaded') {
              this.ready = true;
            }
            break;

          case 'embedding':
            console.log(`Embedding .... `);
            this.worker?.removeEventListener('message', onMessage);
            resolve(data.embedding);
            break;

          case 'error':
            this.worker?.removeEventListener('message', onMessage);
            reject(new Error(data?.error || 'Unknown worker error'));
            break;
        }
      };

      this.worker.addEventListener('message', onMessage);
      this.worker.postMessage({ arrayBuffer, type: mimeType }, [arrayBuffer]);
    });
  }
}
