// lib/main_scaffold.dart
import 'package:flutter/material.dart';
import 'api.dart';
import 'login_screen.dart';
import 'home_screen.dart';
import 'maintenance_tab.dart';
import 'qr_scan_screen.dart';
import 'theme.dart';

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});
  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _index = 0;

  static const _titles = ['Görev Listesi', 'Bakım Kayıtları', 'QR Tara'];
  static const _subtitles = ['Sahadaki akıllı iş panosu', 'Planlı ve biten bakımlar', 'Asansör QR kodunu okut'];

  Future<void> _logout() async {
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
                const HomeScreen(),
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
                  Text(_subtitles[_index], style: const TextStyle(color: LT.muted, fontSize: 12, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 1),
                  Text(_titles[_index],
                      style: const TextStyle(color: LT.ink, fontSize: 21, fontWeight: FontWeight.w800, height: 1.1)),
                ],
              ),
            ),
            _circleButton(Icons.logout_rounded, _logout, color: LT.red),
          ],
        ),
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
