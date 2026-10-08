// Real on-prem face embedding via face-api.js (TensorFlow.js in the browser).
//
// Produces a 128-d face descriptor from a captured frame. The backend
// verification (cosine similarity + FACE_MATCH_THRESHOLD) is model-agnostic,
// so enroll -> verify stays self-consistent entirely client-side. No image
// ever leaves the browser except the optional audit snapshot (clockInPhoto).

import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';
let modelsLoaded: Promise<void> | null = null;
let modelsReady = false;

export interface ModelLoadProgress {
  /** bytes downloaded so far across model files */
  loadedBytes: number;
  /** total bytes (0 when sizes unknown — show indeterminate) */
  totalBytes: number;
  /** 0-100, -1 when indeterminate */
  percent: number;
  /** file currently streaming */
  file: string;
}

type ProgressFn = (p: ModelLoadProgress) => void;

const MANIFEST_FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-weights_manifest.json',
];

async function headSize(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return Number(res.headers.get('content-length')) || 0;
  } catch {
    return 0;
  }
}

/**
 * Load the 3 nets while reporting download progress. face-api.js has no
 * progress hook (plain fetch + arrayBuffer internally), so we temporarily
 * wrap window.fetch and stream-count /models/* responses, then restore it.
 */
function loadModelsWithProgress(onProgress?: ProgressFn): Promise<void> {
  if (!modelsLoaded) {
    modelsLoaded = (async () => {
      // 1. Learn the shard list + sizes first (tiny manifests, then HEADs).
      let totalBytes = 0;
      const knownSizes = new Map<string, number>();
      try {
        const manifests = await Promise.all(
          MANIFEST_FILES.map(async (f) => {
            const res = await fetch(`${MODEL_URL}/${f}`);
            const json = await res.json();
            return { file: f, json, size: Number(res.headers.get('content-length')) || 0 };
          }),
        );
        const shardUrls: string[] = [];
        for (const m of manifests) {
          knownSizes.set(`${MODEL_URL}/${m.file}`, m.size);
          totalBytes += m.size;
          const paths: string[] = (m.json.weights_manifest ?? []).flatMap(
            (w: { paths?: string[] }) => w.paths ?? [],
          );
          for (const p of paths) shardUrls.push(`${MODEL_URL}/${p}`);
        }
        await Promise.all(
          [...new Set(shardUrls)].map(async (u) => {
            const s = await headSize(u);
            knownSizes.set(u, s);
            totalBytes += s;
          }),
        );
      } catch {
        totalBytes = 0; // fall back to indeterminate progress
      }

      // 2. Stream-count model downloads during the actual load.
      const loadedByUrl = new Map<string, number>();
      const origFetch = window.fetch.bind(window);
      const report = (file: string) => {
        if (!onProgress) return;
        let loaded = 0;
        for (const v of loadedByUrl.values()) loaded += v;
        onProgress({
          loadedBytes: loaded,
          totalBytes,
          percent: totalBytes > 0 ? Math.min(99, Math.round((loaded / totalBytes) * 100)) : -1,
          file,
        });
      };
      window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const res = await origFetch(input as never, init as never);
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (!url.includes('/models/') || !res.ok || !res.body) return res;
        const reader = res.body.getReader();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                loadedByUrl.set(url, (loadedByUrl.get(url) ?? 0) + value.byteLength);
                report(url.split('/').pop() ?? url);
                controller.enqueue(value);
              }
              controller.close();
            } catch (e) {
              controller.error(e);
            }
          },
          cancel() {
            reader.cancel().catch(() => undefined);
          },
        });
        return new Response(stream, { headers: res.headers, status: res.status, statusText: res.statusText });
      }) as typeof window.fetch;

      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        modelsReady = true;
        onProgress?.({ loadedBytes: totalBytes, totalBytes, percent: 100, file: 'done' });
      } finally {
        window.fetch = origFetch;
      }
    })();
    // Reset cache on failure so a later attempt retries cleanly.
    modelsLoaded.catch(() => {
      modelsLoaded = null;
      modelsReady = false;
    });
  }
  if (modelsReady) {
    onProgress?.({ loadedBytes: 1, totalBytes: 1, percent: 100, file: 'cached' });
  }
  return modelsLoaded;
}

function loadModels(): Promise<void> {
  return loadModelsWithProgress();
}

export type ExtractResult =
  | { ok: true; embedding: number[] }
  | { ok: false; reason: 'ssr' | 'no-face' | 'model-error' };

/**
 * Best-effort background prefetch of the face models (~7MB).
 * Safe to call repeatedly; the load promise is shared and cached.
 * Callers should gate on idle + unmetered connection themselves.
 */
export async function prefetchFaceModels(onProgress?: ProgressFn): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    await loadModelsWithProgress(onProgress);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract a 128-d face embedding from a canvas (or video/canvas element).
 * Returns a discriminated result so callers can surface a clear message
 * when no face is detected.
 */
export async function extractFaceEmbedding(
  input: HTMLCanvasElement | HTMLVideoElement,
  onProgress?: ProgressFn,
): Promise<ExtractResult> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'ssr' };
  }

  try {
    await loadModelsWithProgress(onProgress);
  } catch {
    return { ok: false, reason: 'model-error' };
  }

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return { ok: false, reason: 'no-face' };
  }

  return { ok: true, embedding: Array.from(detection.descriptor) };
}
