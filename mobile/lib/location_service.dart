// lib/location_service.dart
// Konum izni + anlık konum + periyodik gönderim (canlı takip).
import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'api.dart';

class LocationService {
  /// İzin ister ve anlık konumu döndürür. İzin yoksa null.
  static Future<Position?> current() async {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      return null;
    }
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
}
