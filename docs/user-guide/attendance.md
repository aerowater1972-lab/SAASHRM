# Attendance & Clock In

## Clock In/Out Methods

| Method | Verification | Use Case |
|--------|--------------|----------|
| **GPS** | Location ±50m radius | Office/field |
| **Selfie** | Face match (85%+) | High security |
| **WiFi** | Office SSID match | Office only |
| **Bluetooth Beacon** | Proximity <10m | Large campus |
| **Manual** | Manager approval | Exception only |

## Daily Workflow

### Clock In
1. Open **Attendance → Clock In**
2. Allow location/camera permission
3. Tap **Clock In** → Wait for verification ✅
4. Status: **Present** (before cutoff) / **Late** (after cutoff)

### Clock Out
1. Open **Attendance → Clock Out**
2. Verify location
3. Tap **Clock Out** → Done ✅

### Break Tracking (Optional)
- Auto-detect if enabled in settings
- Manual: **Break Start/End** buttons

## Rules & Cutoffs

| Rule | Default | Configurable |
|------|---------|--------------|
| Morning Cutoff | 09:00 | ✅ |
| Grace Period | 15 min | ✅ |
| Late Threshold | After grace | ✅ |
| Early Leave | Before 17:00 | ✅ |
| Min Work Hours | 8 hours | ✅ |

## Corrections

**Missed Clock?** Request correction:
1. **Attendance → Corrections → New Request**
2. Select date, actual time, reason
3. Attach proof (chat screenshot, email)
3. Routes to manager → HR

## Reports

| Report | Frequency | Audience |
|--------|-----------|----------|
| Daily Attendance | Daily 6 AM | Manager, HR |
| Late Report | Daily 9 AM | Manager |
| Monthly Summary | 1st of month | HR, Finance |
| Exception Report | Weekly | HR |

## Mobile App Features

- **Installable (PWA)**: Add to Home Screen for fullscreen experience
- **Auto Clock In**: Geofence trigger (opt-in)
- **Offline Clock Queue**: clock in/out tanpa internet tersimpan di perangkat
  dan terkirim otomatis saat online (maksimal 24 jam / 10x percobaan)
- **Face ID/Touch ID**: Device biometrics for quick unlock
- **Battery Saver**: GPS only sampled on clock action

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| GPS not found | Move outdoors, enable High Accuracy |
| Selfie failed | Better lighting, remove mask/glasses |
| Offline clock | Auto-sync when online (max 24h) |
| Wrong location | Contact admin to update geofence |

---

*All attendance data is encrypted at rest (AES-256-GCM).*