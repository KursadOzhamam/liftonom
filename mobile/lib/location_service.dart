// lib/location_service.dart
// Konum izni + anlık konum + arka plan canlı takip.
import 'dart:async';
import 'dart:io' show Platform;
import 'package:geolocator/geolocator.dart';
import 'api.dart';

class LocationService {
  /// Konum servisini ve iznini hazırlar. [background]=true ise (arka plan takibi)
  /// iOS'ta "Her Zaman" iznine yükseltmeye çalışır. İzin sağlanırsa true döner.
  static Future<bool> ensurePermission({bool background = false}) async {
    if (!await Geolocator.isLocationServiceEnabled()) return false;
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      return false;
    }
    // Arka plan için "always" iste (iOS ikinci sistem diyaloğu).
    if (background && perm == LocationPermission.whileInUse) {
      perm = await Geolocator.requestPermission();
    }
    return perm == LocationPermission.whileInUse || perm == LocationPermission.always;
  }

  /// İzin ister ve anlık konumu döndürür. İzin yoksa null.
  static Future<Position?> current() async {
    if (!await ensurePermission()) return null;
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
    } catch (_) {
      return null;
    }
  }

  /// Bir arıza için periyodik konum gönderimi başlatır.
  /// Dönen Timer'ı çağıran taraf dispose'da iptal etmeli.
  static Timer startTracking(int faultId, {Duration every = const Duration(seconds: 20)}) {
    Future<void> ping() async {
      final pos = await current();
      if (pos == null) return;
      try {
        await Api.request('/fault-reports/$faultId/location', method: 'POST',
            body: {'lat': pos.latitude, 'lng': pos.longitude});
      } catch (_) {/* sessizce geç */}
    }

    ping(); // hemen bir kez
    return Timer.periodic(every, (_) => ping());
  }

  /// Platforma göre arka plan destekli konum ayarları.
  /// Android: ön plan servisi + bildirim (uygulama kapalıyken de çalışır).
  /// iOS: arka plan konum güncellemeleri + mavi durum göstergesi.
  static LocationSettings _trackingSettings() {
    const distance = 15; // metre — hareket eşiği
    if (Platform.isAndroid) {
      return AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: distance,
        intervalDuration: const Duration(seconds: 30),
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'Liftonom Saha — Konum açık',
          notificationText: 'Görev sırasında konumunuz ofisle paylaşılıyor.',
          enableWakeLock: true,
          setOngoing: true,
        ),
      );
    }
    if (Platform.isIOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: distance,
        allowBackgroundLocationUpdates: true,
        showBackgroundLocationIndicator: true,
        pauseLocationUpdatesAutomatically: false,
        activityType: ActivityType.other,
      );
    }
    return const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: distance);
  }

  /// Teknisyenin genel konum takibi — oturum boyunca (arka planda dahil)
  /// `/auth/location`'a gönderilir; ofis panelinden haritada izlenir.
  /// İzin önceden [ensurePermission(background: true)] ile sağlanmalı.
  /// Dönen aboneliği çağıran taraf dispose'da iptal etmeli.
  static StreamSubscription<Position> startTechnicianTracking({
    void Function(bool active)? onStatus,
  }) {
    final stream = Geolocator.getPositionStream(locationSettings: _trackingSettings());
    return stream.listen(
      (pos) async {
        try {
          await Api.request('/auth/location', method: 'POST',
              body: {'lat': pos.latitude, 'lng': pos.longitude});
          onStatus?.call(true);
        } catch (_) {
          onStatus?.call(false);
        }
      },
      onError: (_) => onStatus?.call(false),
      cancelOnError: false,
    );
  }
}
