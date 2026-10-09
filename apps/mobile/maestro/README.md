# Maestro E2E (smoke) — Flexy HRMS Mobile

Maestro flows untuk smoke test aplikasi mobile (Expo dev build / EAS build).

## Prasyarat

1. Install Maestro CLI: https://maestro.mobile.dev/getting-started/installing-maestro
   ```sh
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
2. Build & install app ke emulator/perangkat:
   ```sh
   # development build (expo-face-detector butuh native module -> tidak jalan di Expo Go)
   npx expo run:android
   # atau via EAS: eas build --profile development
   ```
3. Backend + web API berjalan dan reachable dari perangkat
   (`EXPO_PUBLIC_API_URL` menunjuk ke IP LAN, bukan `localhost`).
4. Seed user uji: `tester@flexy.id / password123`
   (untuk env lain, edit 2 baris `inputText` di `login.yaml`).

## Menjalankan

```sh
cd apps/mobile
npm run maestro            # semua flows
npm run maestro:login      # hanya login
```

```sh
maestro test maestro
LOGIN_EMAIL=hr@demo.id LOGIN_PASSWORD=secret maestro test maestro/login.yaml
```

## Flows

| File | Skenario |
|------|----------|
| `login.yaml` | Launch (clear state) → isi email/password → Masuk → tab Absensi tampil |
| `attendance.yaml` | Status hari ini + tombol Check In/Out + GPS + status wajah tampil |
| `leave-overtime.yaml` | Tab Cuti → modal Ajukan Cuti → tab Lembur |
| `profile.yaml` | Tab Profil → info pribadi, dokumen, tombol Keluar (tidak di-tap) |

## Catatan

- Flows memakai `runFlow: login.yaml` sehingga tiap file mandiri.
- Tap "Check In" sengaja TIDAK diuji (membuka face capture / alert
  tergantung status pendaftaran wajah di perangkat).
- Tambahkan `testID` pada komponen baru bila ingin dicakup Maestro
  (`id: "<testID>"` di YAML).
