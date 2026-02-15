/// <reference lib="webworker" />
import { RawImage, pipeline, env } from '@xenova/transformers';

// Configuration for local environments
env.allowLocalModels = false;

let modelPromise: Promise<any> | null = null;

async function getModel(progress_callback: (p: any) => void) {
  if (!modelPromise) {
    modelPromise = pipeline(
      'image-feature-extraction',
      'Xenova/clip-vit-base-patch32',
      {
        progress_callback,
      },
    );
  }
  return modelPromise;
}

type EmbedRequest = {
  arrayBuffer: ArrayBuffer;
  type?: string;
};

type WorkerMessage =
  | { type: 'downloading'; progress: number }
  | { type: 'embedding'; embedding: number[] }
  | { type: 'error'; error: string };

addEventListener('message', async ({ data }) => {
  const { arrayBuffer, type } = data as EmbedRequest;

  try {
    const extractor = await getModel((p: any) => {
      postMessage({ type: 'downloading', progress: p.progress } as WorkerMessage);
    });

    // Process image
    if (!arrayBuffer) {
      throw new Error('Missing image data');
    }

    const blob = new Blob([arrayBuffer], { type: type || 'image/jpeg' });
    const image = await RawImage.fromBlob(blob);

    // Run CLIP to get a semantic embedding (float vector)
    const output = await extractor(image, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert tensor to regular array
    const embedding = Array.from(output.data);

    postMessage({ type: 'embedding', embedding } as WorkerMessage);
  } catch (error: any) {
    const message =
      typeof error?.message === 'string' ? error.message : String(error);
    postMessage({ type: 'error', error: message } as WorkerMessage);
  }
});
