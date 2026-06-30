// lib/main_scaffold.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'api.dart';
import 'login_screen.dart';
import 'home_screen.dart';
import 'maintenance_tab.dart';
import 'qr_scan_screen.dart';
import 'location_service.dart';
import 'notification_service.dart';
import 'fcm_service.dart';
import 'theme.dart';

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});
  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> with WidgetsBindingObserver {
  int _index = 0;
  StreamSubscription? _locSub;
  Timer? _syncTimer;
  bool _locActive = false;
  bool _hasActiveTask = false;
  String _techName = '';
  final _homeKey = GlobalKey<HomeScreenState>();

  static const _titles = ['Görev Listesi', 'Bakım Kayıtları', 'QR Tara'];
  static const _subtitles = ['Sahadaki akıllı iş panosu', 'Planlı ve biten bakımlar', 'Asansör QR kodunu okut'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _init();
  }

  Future<void> _init() async {
    // Teknisyen bilgisini al + rol güvenliği (yalnızca teknisyen).
    try {
      final me = await Api.request('/auth/me');
      if ((me?['role']?.toString()) != 'technician') {
        await _logout();
        return;
      }
      if (mounted) setState(() => _techName = [me?['name'], me?['surname']].where((e) => e != null && '$e'.isNotEmpty).join(' '));
    } catch (_) {/* çevrimdışı olabilir */}

    await NotificationService.init();
    await FcmService.init(); // gerçek push (FCM) — token'ı backend'e kaydeder
    await _tick(); // ilk senkron: aktif görev kapısı + bildirim yoklaması
    // Periyodik: yeni atama + aktif görev durumu (pil dostu — sadece görev varken takip)
    _syncTimer = Timer.periodic(const Duration(minutes: 2), (_) => _tick());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _tick();
  }

  /// Bildirimleri yoklar ve konum takibini aktif göreve göre aç/kapat.
  Future<void> _tick() async {
    final hadNew = await NotificationService.poll();
    final active = await _checkActiveTask();
    await _syncTracking(active);
    if (hadNew && mounted) {
      _homeKey.currentState?.load(); // yeni atama → görev listesini tazele
    }
  }

  /// Teknisyenin açık (tamamlanmamış) arızası veya bekleyen bakımı var mı?
  Future<bool> _checkActiveTask() async {
    try {
      final sum = await Api.request('/fault-reports/summary?mine=true');
      if (((sum?['active'] ?? 0) as int) > 0) return true;
      final maint = await Api.request('/maintenance?mine=true&status=pending&per_page=1');
      return ((maint?['meta']?['total'] ?? 0) as int) > 0;
    } catch (_) {
      return _hasActiveTask; // çevrimdışı: mevcut durumu koru
    }
  }

  /// Pil tasarrufu: yalnızca aktif görev varken konum akışını çalıştır.
  Future<void> _syncTracking(bool active) async {
    if (mounted) setState(() => _hasActiveTask = active);
    if (active && _locSub == null) {
      final ok = await LocationService.ensurePermission(background: true);
      if (!ok) { if (mounted) setState(() => _locActive = false); return; }
      _locSub = LocationService.startTechnicianTracking(
        onStatus: (a) { if (mounted) setState(() => _locActive = a); },
      );
    } else if (!active && _locSub != null) {
      await _locSub!.cancel();
      _locSub = null;
      if (mounted) setState(() => _locActive = false);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _syncTimer?.cancel();
    _locSub?.cancel();
    super.dispose();
  }

  Future<void> _logout() async {
    _syncTimer?.cancel();
    _locSub?.cancel();
    await FcmService.unregister();
    await NotificationService.reset();
    await Api.clearToken();
    if (!mounted) return;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          _header(),
          Expanded(
            child: IndexedStack(
              index: _index,
              children: [
                HomeScreen(key: _homeKey),
                const MaintenanceTab(),
                // QR yalnızca seçildiğinde inşa edilir; aksi halde mobile_scanner
                // kamerayı açılışta hemen başlatır ve gereksiz açık kalır.
                _index == 2 ? const QrScanScreen() : const SizedBox.shrink(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: LtBottomNav(
        index: _index,
        onChanged: (i) => setState(() => _index = i),
        items: const [
          (icon: Icons.dashboard_rounded, label: 'Görevler'),
          (icon: Icons.build_rounded, label: 'Bakım'),
          (icon: Icons.qr_code_scanner_rounded, label: 'QR'),
        ],
      ),
    );
  }

  Widget _header() {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 16, 8),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: LT.ink, borderRadius: BorderRadius.circular(13)),
              alignment: Alignment.center,
              child: const Text('L', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _index == 0 && _techName.isNotEmpty ? 'Merhaba, $_techName' : _subtitles[_index],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: LT.muted, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 1),
                  Text(_titles[_index],
                      style: const TextStyle(color: LT.ink, fontSize: 21, fontWeight: FontWeight.w800, height: 1.1)),
                ],
              ),
            ),
            _locPill(),
            const SizedBox(width: 10),
            _circleButton(Icons.logout_rounded, _logout, color: LT.red),
          ],
        ),
      ),
    );
  }

  /// Canlı konum takibi göstergesi — aktif görev varken yeşil, yokken gri (pil tasarrufu).
  Widget _locPill() {
    final color = _locActive ? LT.green : LT.muted;
    final msg = _locActive
        ? 'Konum takibi açık (aktif görev)'
        : _hasActiveTask
            ? 'Konum izni bekleniyor'
            : 'Aktif görev yok — takip duraklatıldı (pil tasarrufu)';
    return Tooltip(
      message: msg,
      child: Container(
        height: 44,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: LT.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: LT.line),
        ),
        child: Row(children: [
          Icon(_locActive ? Icons.my_location_rounded : Icons.location_disabled_rounded, size: 16, color: color),
          const SizedBox(width: 6),
          Container(width: 7, height: 7, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
        ]),
      ),
    );
  }

  Widget _circleButton(IconData icon, VoidCallback onTap, {Color? color}) {
    return Material(
      color: LT.surface,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: LT.line)),
          child: Icon(icon, size: 20, color: color ?? LT.ink),
        ),
      ),
    );
  }
}
