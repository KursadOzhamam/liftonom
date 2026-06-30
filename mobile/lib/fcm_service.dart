// lib/fcm_service.dart
// Firebase Cloud Messaging — gerçek push (uygulama kapalıyken de).
import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'api.dart';
import 'notification_service.dart';

/// Arka plan/terminated mesaj işleyicisi (top-level olmalı).
/// `notification` payload'lı mesajları sistem otomatik gösterir; burada ek iş yok.
@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {}

class FcmService {
  static bool _inited = false;

  /// Giriş sonrası çağrılır: izin ister, token'ı backend'e kaydeder, dinleyicileri kurar.
  static Future<void> init() async {
    if (_inited) return;
    _inited = true;
    await NotificationService.init();

    final fm = FirebaseMessaging.instance;
    await fm.requestPermission(alert: true, badge: true, sound: true);
    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);

    final token = await fm.getToken();
    if (token != null) await _register(token);
    fm.onTokenRefresh.listen(_register);

    // Ön planda gelen mesajı sistem bildirimi olarak göster
    FirebaseMessaging.onMessage.listen((m) {
      final n = m.notification;
      final title = n?.title ?? m.data['title'] ?? 'Yeni görev';
      final body = n?.body ?? m.data['body'] ?? '';
      final id = (DateTime.now().millisecondsSinceEpoch ~/ 1000) % 1000000;
      NotificationService.show(id, title, body);
    });
  }

  static Future<void> _register(String token) async {
    try {
      await Api.request('/auth/device-token', method: 'POST', body: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
    } catch (_) {/* sessizce geç */}
  }

  /// Çıkışta token'ı backend'den kaldır.
  static Future<void> unregister() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await Api.request('/auth/device-token', method: 'DELETE', body: {'token': token});
      }
    } catch (_) {/* sessizce geç */}
  }
}
