// lib/maintenance_tab.dart
import 'package:flutter/material.dart';
import 'api.dart';
import 'theme.dart';

const _typeNames = {'periodic': 'Periyodik', 'fault': 'Arıza', 'revision': 'Revizyon', 'annual': 'Yıllık'};
const _statusLabels = {'pending': 'Bekliyor', 'in_progress': 'Devam', 'completed': 'Tamamlandı', 'cancelled': 'İptal'};
const _statusColors = {
  'pending': LT.blue, 'in_progress': LT.orange, 'completed': LT.green, 'cancelled': LT.red,
};

class MaintenanceTab extends StatefulWidget {
  const MaintenanceTab({super.key});
  @override
  State<MaintenanceTab> createState() => _MaintenanceTabState();
}

class _MaintenanceTabState extends State<MaintenanceTab> {
  List<dynamic> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      // Yalnızca bu teknisyene atanmış bakımlar (mine=true).
      final res = await Api.request('/maintenance?mine=true');
      setState(() => _items = res['data'] ?? []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _complete(int id) async {
    await Api.request('/maintenance/$id/complete', method: 'POST', body: {});
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: const Text('Bakım tamamlandı'),
      backgroundColor: LT.green,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
    _load();
  }

  String _date(String? d) => d == null ? '—' : d.substring(0, 10).split('-').reversed.join('.');

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      color: LT.ink,
      child: _loading
          ? const Center(child: CircularProgressIndicator(color: LT.ink))
          : _items.isEmpty
              ? ListView(children: const [SizedBox(height: 220), Center(child: Text('Bakım kaydı yok.', style: TextStyle(color: LT.muted)))])
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: _items.length,
                  separatorBuilder: (_, i) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _card(_items[i]),
                ),
    );
  }

  Widget _card(dynamic m) {
    final status = m['status'] as String;
    final type = (m['type'] ?? '') as String;
    final open = status != 'completed' && status != 'cancelled';
    return LtCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            LtChip(_typeNames[type] ?? type, LT.yellow),
            const Spacer(),
            LtChip(_statusLabels[status] ?? status, _statusColors[status] ?? LT.gray),
          ]),
          const SizedBox(height: 12),
          Text(m['elevator']?['name'] ?? '—', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: LT.ink)),
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.event_rounded, size: 15, color: LT.muted),
            const SizedBox(width: 5),
            Text('Planlanan: ${_date(m['planned_date'])}', style: const TextStyle(color: LT.inkSoft, fontSize: 13)),
          ]),
          if (open) ...[
            const SizedBox(height: 14),
            FilledButton(
              onPressed: () => _complete(m['id'] as int),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: const [
                Icon(Icons.check_rounded, size: 18, color: Colors.white),
                SizedBox(width: 8),
                Text('Bakımı Tamamla'),
              ]),
            ),
          ],
        ],
      ),
    );
  }
}
