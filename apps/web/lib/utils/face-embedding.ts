// Real on-prem face embedding via face-api.js (TensorFlow.js in the browser).
//
// Produces a 128-d face descriptor from a captured frame. The backend
// verification (cosine similarity + FACE_MATCH_THRESHOLD) is model-agnostic,
// so enroll -> verify stays self-consistent entirely client-side. No image
// ever leaves the browser except the optional audit snapshot (clockInPhoto).

import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';
let modelsLoaded: Promise<void> | null = null;

function loadModels(): Promise<void> {
  if (!modelsLoaded) {
    modelsLoaded = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsLoaded;
}

export type ExtractResult =
  | { ok: true; embedding: number[] }
  | { ok: false; reason: 'ssr' | 'no-face' | 'model-error' };

/**
 * Best-effort background prefetch of the face models (~7MB).
 * Safe to call repeatedly; the load promise is shared and cached.
 * Callers should gate on idle + unmetered connection themselves.
 */
export async function prefetchFaceModels(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    await loadModels();
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
): Promise<ExtractResult> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'ssr' };
  }

  try {
    await loadModels();
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
