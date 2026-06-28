// lib/maintenance_tab.dart
import 'package:flutter/material.dart';
import 'api.dart';

const _typeNames = {'periodic': 'Periyodik', 'fault': 'Arıza', 'revision': 'Revizyon', 'annual': 'Yıllık'};
const _statusLabels = {'pending': 'Bekliyor', 'in_progress': 'Devam', 'completed': 'Tamamlandı', 'cancelled': 'İptal'};
const _statusColors = {
  'pending': Color(0xFF2563EB), 'in_progress': Color(0xFFEA580C),
  'completed': Color(0xFF16A34A), 'cancelled': Color(0xFFDC2626),
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
      final res = await Api.request('/maintenance');
      setState(() => _items = res['data'] ?? []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _complete(int id) async {
    await Api.request('/maintenance/$id/complete', method: 'POST', body: {});
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Bakım tamamlandı'), backgroundColor: Color(0xFF16A34A)),
    );
    _load();
  }

  String _date(String? d) => d == null ? '—' : d.substring(0, 10).split('-').reversed.join('.');

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? ListView(children: const [SizedBox(height: 200), Center(child: Text('Bakım kaydı yok.'))])
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: _items.length,
                  separatorBuilder: (_, i) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _card(_items[i]),
                ),
    );
  }

  Widget _card(dynamic m) {
    final status = m['status'] as String;
    final c = _statusColors[status] ?? Colors.grey;
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(side: const BorderSide(color: Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(child: Text(m['elevator']?['name'] ?? '—', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                child: Text(_statusLabels[status] ?? status, style: TextStyle(color: c, fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ]),
            const SizedBox(height: 4),
            Text('${_typeNames[m['type']] ?? m['type']} · Planlanan: ${_date(m['planned_date'])}',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
            if (status != 'completed' && status != 'cancelled') ...[
              const SizedBox(height: 12),
              SizedBox(width: double.infinity, child: FilledButton.icon(
                onPressed: () => _complete(m['id'] as int),
                icon: const Icon(Icons.check, size: 18), label: const Text('Bakımı Tamamla'),
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
              )),
            ],
          ],
        ),
      ),
    );
  }
}
