export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  clientTimestamp: string;
}

export class GeolocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeolocationError';
  }
}

export async function getCurrentGeoFix(): Promise<GeoFix> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new GeolocationError('Perangkat tidak mendukung geolokasi.');
  }

  return new Promise<GeoFix>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          clientTimestamp: new Date(pos.timestamp).toISOString(),
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeolocationError('Izin lokasi ditolak. Aktifkan akses lokasi untuk presensi GPS.'));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new GeolocationError('Lokasi tidak tersedia. Pastikan GPS aktif.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new GeolocationError('Permintaan lokasi kehabisan waktu. Coba lagi.'));
        } else {
          reject(new GeolocationError('Gagal memperoleh lokasi.'));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
