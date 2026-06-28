// lib/home_screen.dart
import 'package:flutter/material.dart';
import 'api.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

const _statusLabels = {
  'new': 'Yeni', 'investigating': 'İnceleniyor', 'repairing': 'Onarımda',
  'resolved': 'Çözüldü', 'closed': 'Kapatıldı',
};
const _statusColors = {
  'new': Color(0xFFDC2626), 'investigating': Color(0xFFEA580C), 'repairing': Color(0xFF2563EB),
  'resolved': Color(0xFF16A34A), 'closed': Color(0xFF6B7280),
};

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _faults = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await Api.request('/fault-reports');
      setState(() => _faults = res['data'] ?? []);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _action(int id, String path, {Map<String, dynamic>? body}) async {
    try {
      await Api.request('/fault-reports/$id/$path', method: 'POST', body: body ?? {});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Güncellendi · müşteriye WhatsApp gönderildi'), backgroundColor: Color(0xFF16A34A)),
      );
      _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: Colors.red));
    }
  }

  Future<void> _diagnose(int id) async {
    final controller = TextEditingController();
    final estimate = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Arıza Tespiti'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Tahmini onarım süresini girin. Müşteriye WhatsApp ile bildirilecek.', style: TextStyle(fontSize: 13, color: Colors.grey)),
          const SizedBox(height: 12),
          TextField(controller: controller, decoration: const InputDecoration(labelText: 'örn. 2 saat, 1 gün')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('İptal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, controller.text), child: const Text('Kaydet & Gönder')),
        ],
      ),
    );
    if (estimate != null && estimate.isNotEmpty) {
      await _action(id, 'diagnose', body: {'estimated_repair': estimate});
    }
  }

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
        title: const Text('Arıza Bildirimleri', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [IconButton(onPressed: _logout, icon: const Icon(Icons.logout, color: Colors.red))],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!))
                : _faults.isEmpty
                    ? const Center(child: Text('Arıza kaydı yok.'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: _faults.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) => _faultCard(_faults[i]),
                      ),
      ),
    );
  }

  Widget _faultCard(dynamic f) {
    final status = f['status'] as String;
    final id = f['id'] as int;
    final elevator = f['elevator']?['name'] ?? '—';
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(side: const BorderSide(color: Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Text('#$id', style: const TextStyle(color: Colors.grey)),
              const SizedBox(width: 8),
              Expanded(child: Text(elevator, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
              _badge(status),
            ]),
            const SizedBox(height: 6),
            Text(f['description'] ?? '', style: const TextStyle(color: Color(0xFF374151))),
            const SizedBox(height: 12),
            _lifecycleButton(id, status),
          ],
        ),
      ),
    );
  }

  Widget _badge(String status) {
    final c = _statusColors[status] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(_statusLabels[status] ?? status, style: TextStyle(color: c, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }

  Widget _lifecycleButton(int id, String status) {
    switch (status) {
      case 'new':
        return SizedBox(width: double.infinity, child: FilledButton.icon(
          onPressed: () => _action(id, 'dispatch'),
          icon: const Text('🚗'), label: const Text('Yola Çıktım'),
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0891B2)),
        ));
      case 'investigating':
        return SizedBox(width: double.infinity, child: FilledButton.icon(
          onPressed: () => _diagnose(id),
          icon: const Text('🔍'), label: const Text('Arızayı Tespit Ettim'),
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
        ));
      case 'repairing':
        return SizedBox(width: double.infinity, child: FilledButton.icon(
          onPressed: () => _action(id, 'resolve'),
          icon: const Icon(Icons.check, size: 18), label: const Text('Arızayı Giderdim'),
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
        ));
      default:
        return const Text('✓ Tamamlandı', style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.w600));
    }
  }
}
