import { Injectable } from '@angular/core';
import { pipeline } from '@xenova/transformers';

export type AutoSelectNode = {
  code: number;
  name: string;
  labelPath?: string;
};

@Injectable({
  providedIn: 'root',
})
export class AutoSelectCategoryService {
  private embedderPromise: Promise<any> | null = null;
  private vectorCache = new Map<string, Float32Array>();

  constructor() {
    void this.ensureEmbedder();
  }

  buildQuery(productName: string, description: string): string {
    return `${productName || ''} ${description || ''}`.trim();
  }

  async pickBestMatch(
    query: string,
    nodes: AutoSelectNode[],
    minimumScore = 0.25,
  ): Promise<AutoSelectNode | null> {
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery || !nodes?.length) return null;

    try {
      const queryVector = await this.embed(normalizedQuery);
      let best: { node: AutoSelectNode; score: number } | null = null;

      for (const node of nodes) {
        const nodeText = this.buildNodeText(node);
        if (!nodeText) continue;

        const nodeVector = await this.embed(nodeText);
        const score = this.cosineSimilarity(queryVector, nodeVector);

        if (!best || score > best.score) {
          best = { node, score };
        }
      }

      if (!best || best.score < minimumScore) return null;
      return best.node;
    } catch (error) {
      console.error('Transformers.js category matching failed:', error);
      return null;
    }
  }

  private async ensureEmbedder(): Promise<any> {
    if (!this.embedderPromise) {
      this.embedderPromise = pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
      );
    }
    return this.embedderPromise;
  }

  private async embed(text: string): Promise<Float32Array> {
    const normalized = this.normalize(text);
    if (!normalized) return new Float32Array();

    const cached = this.vectorCache.get(normalized);
    if (cached) return cached;

    const embedder = await this.ensureEmbedder();
    const output = await embedder(normalized, {
      pooling: 'mean',
      normalize: true,
    });

    const vector = new Float32Array(output.data);
    this.vectorCache.set(normalized, vector);
    return vector;
  }

  private buildNodeText(node: AutoSelectNode): string {
    return this.normalize(
      `${node?.name || ''} ${node?.labelPath || ''}`.trim(),
    );
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (!a.length || !b.length || a.length !== b.length) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (!denominator) return 0;

    return dot / denominator;
  }

  private normalize(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
