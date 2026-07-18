'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { extractFaceEmbedding } from '@/lib/utils/face-embedding';

interface FaceCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (result: { photo: string; embedding: number[] }) => void;
  title?: string;
}

export function FaceCapture({ open, onOpenChange, onCapture, title = 'Ambil Wajah' }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<{ photo: string; embedding: number[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    setCaptured(null);
    setError(null);

    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      })
      .catch(() => setError('Tidak dapat mengakses kamera. Izinkan akses kamera di browser.'));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photo = canvas.toDataURL('image/jpeg', 0.7);
    const result = await extractFaceEmbedding(canvas);
    if (!result.ok) {
      const msg =
        result.reason === 'no-face'
          ? 'Wajah tidak terdeteksi. Pastikan wajah terlihat jelas di kamera.'
          : 'Gagal memuat model wajah. Coba muat ulang halaman.';
      setError(msg);
      return;
    }
    setCaptured({ photo, embedding: result.embedding });
  };

  const handleRetake = () => {
    setCaptured(null);
  };

  const handleConfirm = () => {
    if (captured) onCapture(captured);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
          {!captured ? (
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          ) : (
            <img src={captured.photo} alt="captured" className="h-full w-full object-cover" />
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-xs text-white">
              {error}
            </div>
          )}
        </div>

        {!captured ? (
          <Button onClick={handleCapture} disabled={!!error} className="w-full">
            <Camera className="mr-2 h-4 w-4" /> Ambil Foto
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRetake} className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" /> Ulangi
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              <X className="mr-2 h-4 w-4" /> Gunakan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
