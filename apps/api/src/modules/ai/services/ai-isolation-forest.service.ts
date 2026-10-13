import { Injectable } from '@nestjs/common';

/**
 * Isolation Forest ringan (unsupervised anomaly detection) untuk sinyal disengagement.
 * Implementasi dataset-embarrassingly-parallel: build tree per batch, score per sample.
 * Deterministik (mulberry32 seeded) supaya spec test reproducible.
 */

export interface FeatureVector {
  values: number[];
  names: string[];
}

export interface IsolationForestParams {
  nEstimators?: number;
  maxSamples?: number;
  maxDepth?: number;
}

const DEFAULT_PARAMS: IsolationForestParams = {
  nEstimators: 8,
  maxSamples: 256,
  maxDepth: 8,
};

/** c(n) = 2*H(n-1) - 2(n-1)/n dengan H = harmonic number.
 * Normalizer untuk expected average path length dari random split tree.
 */
function harmonic(n: number): number {
  let s = 0;
  for (let i = 1; i <= n; i += 1) s += 1 / i;
  return s;
}

function calculateNormalizer(n: number): number {
  if (n <= 1) return 1;
  return 2 * harmonic(n - 1) - (2 * (n - 1)) / n;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Node: [featureIdx, threshold, leftChildIdx, rightChildIdx] (-1 = leaf). */
type Node = [number, number, number, number];

@Injectable()
export class AiIsolationForestService {
  private readonly params: IsolationForestParams;
  private nodes: Node[] = [];
  private rng: () => number;

  constructor(params: IsolationForestParams = {}) {
    this.rng = () => 0;
    this.params = { ...DEFAULT_PARAMS, ...params };
    this.reset(1, []);
  }

  /** Reset seed + rebuild forest baru. Deterministik untuk seed yang sama. */
  reset(seed: number, data: number[][]): void {
    this.nodes = [];
    this.rng = mulberry32(seed >>> 0);
    const rng = this.rng;
    if (data.length === 0) return;
    const maxSamples = this.params.maxSamples ?? 256;
    const n = Math.min(maxSamples, data.length);
    const seen = new Set<number>();
    const indices: number[] = [];
    while (indices.length < n) {
      const r = Math.floor((rng as () => number)() * data.length);
      if (!seen.has(r)) {
        seen.add(r);
        indices.push(r);
      }
    }
    this.buildTree(data, indices, 0, this.params.maxDepth ?? 8);
  }

  /** Skor anomali tiap sample: 0 = normal, 1 = sangat anomali. */
  score(data: number[][]): number[] {
    if (data.length === 0) return [];
    if (this.nodes.length === 0) return data.map(() => 0.5);
    const scores: number[] = new Array(data.length).fill(0);
    const normalizer = calculateNormalizer(data.length);
    for (let i = 0; i < data.length; i += 1) {
      let pathSum = 0;
      for (let t = 0; t < this.nodes.length; t += 1) {
        pathSum += this.avgPathLength(this.nodes, data[i], 0);
      }
      const avg = pathSum / this.nodes.length;
      scores[i] = Math.min(1, Math.pow(2, -avg / normalizer));
    }
    return scores;
  }

  private buildTree(
    data: number[][],
    indices: number[],
    depth: number,
    maxDepth: number,
  ): number {
    if (indices.length <= 1 || depth >= maxDepth) return -1;

    const rng = this.rng;
    const feature = Math.floor((rng as () => number)() * data[0].length);
    const values = indices.map((i) => data[i][feature]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return -1;

    const threshold = min + (max - min) * (rng as () => number)();
    const nodeIdx = this.nodes.length;
    this.nodes.push([feature, threshold, 0, 0]);

    const left = this.buildTree(
      data,
      indices.filter((i) => data[i][feature] < threshold),
      depth + 1,
      maxDepth,
    );
    const right = this.buildTree(
      data,
      indices.filter((i) => data[i][feature] >= threshold),
      depth + 1,
      maxDepth,
    );
    this.nodes[nodeIdx][2] = left;
    this.nodes[nodeIdx][3] = right;
    return nodeIdx;
  }

  private avgPathLength(tree: Node[], sample: number[], depth: number): number {
    let node = 0;
    let d = depth;
    while (node !== -1) {
      const n = tree[node];
      if (sample[n[0]] < n[1]) {
        node = n[2];
      } else {
        node = n[3];
      }
      d += 1;
    }
    return d;
  }
}
