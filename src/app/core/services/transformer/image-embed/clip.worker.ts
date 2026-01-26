/// <reference lib="webworker" />
import { RawImage, pipeline, env } from '@xenova/transformers';

// Configuration for local environments
env.allowLocalModels = false;

let modelPromise: any = null;

async function getModel(progress_callback: any) {
  if (!modelPromise) {
    modelPromise = pipeline(
      'feature-extraction',
      'Xenova/clip-vit-base-patch32',
      {
        progress_callback,
      },
    );
  }
  return modelPromise;
}

addEventListener('message', async ({ data }) => {
  const { bitmap } = data;

  try {
    await getModel((p: any) => {
      postMessage({ type: 'downloading', progress: p.progress });
    });

    // Process image
    const image = await RawImage.fromBlob(bitmap);

    // Convert tensor to regular array
    const embedding = Array.from(image.data);

    postMessage({ type: 'embedding', embedding });
  } catch (error: any) {
    postMessage({ type: 'error', error: error.message });
  }
});
