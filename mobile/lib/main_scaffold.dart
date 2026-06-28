// lib/main_scaffold.dart
import 'package:flutter/material.dart';
import 'api.dart';
import 'login_screen.dart';
import 'faults_tab.dart';
import 'maintenance_tab.dart';
import 'qr_scan_screen.dart';

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});
  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _index = 0;

  static const _titles = ['Arıza Bildirimleri', 'Bakım Kayıtları', 'QR Tara'];

  final _tabs = const [FaultsTab(), MaintenanceTab(), QrScanScreen()];

  Future<void> _logout() async {
    await Api.clearToken();
    if (!mounted) return;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Text(_titles[_index], style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [IconButton(onPressed: _logout, icon: const Icon(Icons.logout, color: Colors.red))],
      ),
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.warning_amber), label: 'Arıza'),
          NavigationDestination(icon: Icon(Icons.build), label: 'Bakım'),
          NavigationDestination(icon: Icon(Icons.qr_code_scanner), label: 'QR Tara'),
        ],
      ),
    );
  }
}
