'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Camera,
  CameraType,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import * as FaceDetector from 'expo-face-detector';
import { FaceFeature, Point } from 'expo-face-detector';
import { Ionicons } from '@expo/vector-icons';

interface FaceCaptureProps {
  onCapture: (embedding: number[], quality: number) => Promise<void>;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export default function FaceCapture({
  onCapture,
  onCancel,
  title = 'Verifikasi Wajah',
  subtitle = 'Arahkan wajah ke dalam frame',
}: FaceCaptureProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [detecting, setDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [quality, setQuality] = useState(0);
  const [captured, setCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraRef = useRef<Camera>(null);
  const faceDetectorRef = useRef<FaceDetector.FaceDetector | null>(null);
  const animationFrameRef = useRef<number>();
  const lastDetectTime = useRef(0);

  useEffect(() => {
    requestCameraPermission();
    initializeFaceDetector();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceDetectorRef.current) {
        faceDetectorRef.current.close();
      }
    };
  }, []);

  const requestCameraPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Izin Kamera',
            message: 'Aplikasi memerlukan akses kamera untuk verifikasi wajah',
            buttonNeutral: 'Tanya Nanti',
            buttonNegative: 'Tolak',
            buttonPositive: 'Izinkan',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      }
    } catch {
      setHasPermission(false);
      setError('Gagal meminta izin kamera');
    }
  };

  const initializeFaceDetector = async () => {
    try {
      faceDetectorRef.current = await FaceDetector.createFaceDetectorAsync({
        mode: FaceDetector.FaceDetectorMode.FAST,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.ALL,
        runClassifications: FaceDetector.FaceDetectorClassifications.ALL,
        minDetectionInterval: 100,
        tracking: true,
      });
    } catch (err) {
      console.error('Face detector init error:', err);
      setError('Gagal menginisialisasi deteksi wajah');
    }
  };

  const detectFaces = useCallback(async () => {
    if (!cameraRef.current || !faceDetectorRef.current || detecting || captured) return;

    const now = Date.now();
    if (now - lastDetectTime.current < 200) return; // Throttle
    lastDetectTime.current = now;

    setDetecting(true);

    try {
      const image = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: true,
      });

      if (!image?.base64) {
        setDetecting(false);
        return;
      }

      const faces = await faceDetectorRef.current.detectFacesAsync(
        `data:image/jpeg;base64,${image.base64}`
      );

      if (faces.length > 0) {
        const face = faces[0];
        const faceQuality = calculateFaceQuality(face);

        setFaceDetected(true);
        setQuality(faceQuality);

        // Auto-capture when quality is good
        if (faceQuality > 0.7 && !captured) {
          setCaptured(true);
          const embedding = generateEmbedding(face);
          await onCapture(embedding, faceQuality);
        }
      } else {
        setFaceDetected(false);
        setQuality(0);
      }
    } catch (err) {
      console.error('Face detection error:', err);
    } finally {
      setDetecting(false);
    }
  }, [detecting, captured, onCapture]);

  // Continuous detection loop
  useEffect(() => {
    if (!hasPermission || captured) return;

    const loop = async () => {
      await detectFaces();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasPermission, captured, detectFaces]);

  const calculateFaceQuality = (face: FaceFeature): number => {
    let score = 0;

    // Face size (should occupy good portion of frame)
    const faceArea = face.bounds.size.width * face.bounds.size.height;
    const frameArea = 1; // Normalized
    const sizeScore = Math.min(faceArea / (frameArea * 0.3), 1) * 0.3;
    score += sizeScore;

    // Face angle (should be frontal)
    const roll = Math.abs(face.rollAngle || 0);
    const yaw = Math.abs(face.yawAngle || 0);
    const pitch = 0; // Not directly available in expo-face-detector
    const angleScore = Math.max(0, 1 - (roll + yaw + pitch) / 90) * 0.3;
    score += angleScore;

    // Landmarks detected (check if eye positions exist)
    const landmarksScore = (face.leftEyePosition && face.rightEyePosition) ? 0.2 : 0;
    score += landmarksScore;

    // Classification confidence
    const smilingScore = face.smilingProbability || 0;
    const eyesOpenScore = Math.min(
      (face.leftEyeOpenProbability || 0) + (face.rightEyeOpenProbability || 0),
      1
    ) * 0.2;
    score += (smilingScore + eyesOpenScore) / 2 * 0.2;

    return Math.min(score, 1);
  };

  const generateEmbedding = (face: FaceFeature): number[] => {
    // In production, use a proper face recognition model like FaceNet
    // This is a simplified embedding based on face feature positions
    const embedding: number[] = new Array(128).fill(0);

    const positions: Point[] = [
      face.leftEarPosition,
      face.rightEarPosition,
      face.leftEyePosition,
      face.rightEyePosition,
      face.leftCheekPosition,
      face.rightCheekPosition,
      face.leftMouthPosition,
      face.mouthPosition,
      face.rightMouthPosition,
      face.bottomMouthPosition,
      face.noseBasePosition,
    ].filter((p): p is Point => p !== undefined);

    positions.forEach((pos, i) => {
      if (i < 128) {
        embedding[i] = (pos.x + pos.y) / 2;
      }
    });

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  };

  const flipCamera = () => {
    setCameraType(cameraType === 'front' ? 'back' : 'front');
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off" size={64} color="#dc2626" />
          <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
          <Text style={styles.permissionText}>
            Aplikasi memerlukan akses kamera untuk verifikasi wajah.
            Silakan izinkan akses kamera di pengaturan perangkat.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          ratio="4:3"
        >
          <View style={styles.overlay}>
            <View
              style={[
                styles.faceFrame,
                faceDetected && quality > 0.5 && styles.faceFrameDetected,
                quality > 0.7 && styles.faceFrameReady,
              ]}
            >
              {faceDetected && (
                <View style={styles.qualityIndicator}>
                  <Text style={styles.qualityText}>
                    Kualitas: {Math.round(quality * 100)}%
                  </Text>
                  <View style={styles.qualityBar}>
                    <View
                      style={[
                        styles.qualityBarFill,
                        { width: `${quality * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
            <View style={styles.guideLines}>
              <View style={styles.guideCorner} />
              <View style={styles.guideCorner} />
              <View style={styles.guideCorner} />
              <View style={styles.guideCorner} />
            </View>
          </View>
        </Camera>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>{subtitle}</Text>
          <View style={styles.instructionList}>
            <Text style={styles.instructionItem}>• Posisikan wajah di dalam kotak</Text>
            <Text style={styles.instructionItem}>• Pastikan pencahayaan cukup</Text>
            <Text style={styles.instructionItem}>• Lepaskan kacamata jika memungkinkan</Text>
            <Text style={styles.instructionItem}>• Tatap kamera dengan wajah lurus</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={flipCamera}
          disabled={detecting || captured}
        >
          <Ionicons name="swap-horizontal" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.captureButtonContainer}>
          {captured ? (
            <View style={styles.capturedIndicator}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.capturedText}>Memproses...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.captureButton,
                !faceDetected && styles.captureButtonDisabled,
                quality > 0.7 && styles.captureButtonReady,
              ]}
              onPress={async () => {
                if (!faceDetected) return;
                const image = await cameraRef.current?.takePictureAsync({
                  quality: 0.9,
                  base64: true,
                });
                if (image?.base64) {
                  const faces = await faceDetectorRef.current?.detectFacesAsync(
                    `data:image/jpeg;base64,${image.base64}`
                  );
                  if (faces && faces.length > 0) {
                    const embedding = generateEmbedding(faces[0]);
                    const q = calculateFaceQuality(faces[0]);
                    setCaptured(true);
                    await onCapture(embedding, q);
                  }
                }
              }}
              disabled={!faceDetected || detecting || captured}
            >
              <View style={styles.captureRing} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={captured}
        >
          <Text style={styles.cancelButtonText}>Batal</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 24,
  },
  permissionButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  faceFrameDetected: {
    borderColor: '#f59e0b',
  },
  faceFrameReady: {
    borderColor: '#10b981',
  },
  qualityIndicator: {
    position: 'absolute',
    bottom: -60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  qualityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  qualityBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  qualityBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  guideLines: {
    position: 'absolute',
    width: 280,
    height: 280,
  },
  guideCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  instructions: {
    position: 'absolute',
    bottom: 180,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    padding: 16,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  instructionList: {
    gap: 6,
  },
  instructionItem: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureButtonReady: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  captureRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
  },
  capturedIndicator: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  capturedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  errorBanner: {
    position: 'absolute',
    top: 100,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220,38,38,0.9)',
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#fff',
    flex: 1,
  },
});