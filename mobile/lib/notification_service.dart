// lib/notification_service.dart
// Yeni atama bildirimleri: backend /notifications uçlarını yoklar ve
// yeni gelenler için sistem (local) bildirimi gösterir.
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';

class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static const _channelId = 'liftonom_assignments';
  static const _channelName = 'Görev Atamaları';
  static int _lastSeenId = 0;
  static bool _inited = false;

  /// Eklentiyi başlatır, izin ister, Android kanalını oluşturur.
  static Future<void> init() async {
    if (_inited) return;
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _plugin.initialize(const InitializationSettings(android: android, iOS: ios));

    final android13 = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android13?.requestNotificationsPermission();
    await android13?.createNotificationChannel(const AndroidNotificationChannel(
      _channelId, _channelName,
      description: 'Yeni arıza ve bakım atamaları',
      importance: Importance.high,
    ));

    final prefs = await SharedPreferences.getInstance();
    _lastSeenId = prefs.getInt('notif_last_seen') ?? 0;
    _inited = true;
  }

  /// Sıfırlanır (çıkışta) — sonraki kullanıcı için temiz başlangıç.
  static Future<void> reset() async {
    _lastSeenId = 0;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('notif_last_seen');
  }

  /// Yeni atama bildirimlerini çeker ve sistem bildirimi gösterir.
  /// En az bir yeni bildirim geldiyse true döner (çağıran ekranı tazeleyebilir).
  static Future<bool> poll() async {
    if (!_inited) await init();
    try {
      final res = await Api.request('/notifications?mine=true&per_page=10');
      final list = (res['data'] as List?) ?? [];
      final fresh = list.where((n) => (n['id'] as int) > _lastSeenId).toList()
        ..sort((a, b) => (a['id'] as int).compareTo(b['id'] as int));
      if (fresh.isEmpty) return false;

      final firstRun = _lastSeenId == 0; // ilk açılışta birikmiş bildirimlerle spam yapma
      var notified = false;
      for (final n in fresh) {
        _lastSeenId = (n['id'] as int) > _lastSeenId ? n['id'] as int : _lastSeenId;
        if (!firstRun && n['is_read'] != true) {
          await _show(n['id'] as int, n['title']?.toString() ?? 'Yeni görev', n['body']?.toString() ?? '');
          notified = true;
        }
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('notif_last_seen', _lastSeenId);
      return notified;
    } catch (_) {
      return false;
    }
  }

  /// Dışarıdan (örn. FCM ön plan mesajı) sistem bildirimi göstermek için.
  static Future<void> show(int id, String title, String body) async {
    if (!_inited) await init();
    await _show(id, title, body);
  }

  static Future<void> _show(int id, String title, String body) async {
    await _plugin.show(
      id, title, body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId, _channelName,
          importance: Importance.high, priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
    );
  }
}
