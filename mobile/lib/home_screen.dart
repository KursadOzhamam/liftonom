// lib/home_screen.dart
// Ana ekran (referans tasarım): filtre çipleri + Aktif/Tamamlanan kartları
// + "Bugün Görevler" rozetli kart listesi.
import 'package:flutter/material.dart';
import 'api.dart';
import 'theme.dart';
import 'fault_status.dart';
import 'fault_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => HomeScreenState();
}

class HomeScreenState extends State<HomeScreen> {
  List<dynamic> _faults = [];
  Map<String, dynamic> _summary = {};
  bool _loading = true;
  int _filter = 0; // 0 Bugün, 1 Tümü, 2 Yüksek
  bool _showAll = false; // 3'ten fazla görevde "Tümünü Gör"

  static const _previewCount = 3;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => _loading = true);
    try {
      final res = await Api.request('/fault-reports?per_page=100');
      final sum = await Api.request('/fault-reports/summary');
      setState(() {
        _faults = res['data'] ?? [];
        _summary = Map<String, dynamic>.from(sum as Map);
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered {
    final now = DateTime.now();
    bool isToday(dynamic f) {
      final c = DateTime.tryParse(f['created_at']?.toString() ?? '')?.toLocal();
      return c != null && c.year == now.year && c.month == now.month && c.day == now.day;
    }
    switch (_filter) {
      case 0:
        final t = _faults.where(isToday).toList();
        return t.isEmpty ? _faults : t; // bugün yoksa hepsini göster
      case 2:
        return _faults.where((f) => f['priority'] == 'high' || f['priority'] == 'urgent').toList();
      default:
        return _faults;
    }
  }

  Future<void> _open(dynamic f) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => FaultDetailScreen(faultId: f['id'] as int)));
    load(); // dönüşte tazele
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: load,
      color: LT.ink,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          _filters(),
          const SizedBox(height: 16),
          _statCards(),
          const SizedBox(height: 22),
          Row(children: [
            const Text('BUGÜN ', style: TextStyle(color: LT.muted, fontSize: 13, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
            const Text('GÖREVLER', style: TextStyle(color: LT.ink, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
            const Spacer(),
            if (_filtered.length > _previewCount)
              GestureDetector(
                onTap: () => setState(() => _showAll = !_showAll),
                behavior: HitTestBehavior.opaque,
                child: Row(children: [
                  Text(_showAll ? 'Daha az' : 'Tümünü Gör',
                      style: const TextStyle(color: LT.ink, fontSize: 13, fontWeight: FontWeight.w700, decoration: TextDecoration.underline)),
                  Icon(_showAll ? Icons.expand_less_rounded : Icons.chevron_right_rounded, size: 18, color: LT.ink),
                ]),
              ),
          ]),
          const SizedBox(height: 12),
          if (_loading)
            const Padding(padding: EdgeInsets.only(top: 40), child: Center(child: CircularProgressIndicator(color: LT.ink)))
          else if (_filtered.isEmpty)
            const Padding(padding: EdgeInsets.only(top: 40), child: Center(child: Text('Görev yok.', style: TextStyle(color: LT.muted))))
          else
            ...(_showAll ? _filtered : _filtered.take(_previewCount))
                .map((f) => Padding(padding: const EdgeInsets.only(bottom: 12), child: _taskCard(f))),
        ],
      ),
    );
  }

  Widget _filters() {
    const labels = ['Bugün Gelenler', 'Tüm Görevler', 'Yüksek Öncelikli'];
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: labels.length,
        separatorBuilder: (_, i) => const SizedBox(width: 10),
        itemBuilder: (_, i) {
          final active = i == _filter;
          return GestureDetector(
            onTap: () => setState(() { _filter = i; _showAll = false; }),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                color: active ? LT.lime : LT.surface,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: active ? LT.lime : LT.line),
              ),
              child: Text(labels[i],
                  style: TextStyle(color: LT.ink, fontWeight: active ? FontWeight.w800 : FontWeight.w600, fontSize: 14)),
            ),
          );
        },
      ),
    );
  }

  Widget _statCards() {
    final active = (_summary['active'] ?? 0).toString();
    final completed = (_summary['completed'] ?? 0).toString();
    return SizedBox(
      height: 168,
      child: Row(children: [
        // Aktif Görevler — koyu yeşil
        Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _filter = 1),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: LT.featureGreen, borderRadius: BorderRadius.circular(LT.radius)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.assignment_rounded, color: Colors.white, size: 20),
                ),
                const Spacer(),
                Text('$active+', style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800, height: 1)),
                const SizedBox(height: 4),
                const Text('Aktif Görevler', style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500)),
              ]),
            ),
          ),
        ),
        const SizedBox(width: 12),
        // Tamamlanan — beyaz
        Expanded(
          child: LtCard(
            padding: const EdgeInsets.all(18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: LT.ink.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.task_alt_rounded, color: LT.ink, size: 20),
                ),
              ]),
              const Spacer(),
              Text('$completed+', style: const TextStyle(color: LT.ink, fontSize: 34, fontWeight: FontWeight.w800, height: 1)),
              const SizedBox(height: 4),
              const Text('Tamamlanan İş', style: TextStyle(color: LT.muted, fontSize: 14, fontWeight: FontWeight.w500)),
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _taskCard(dynamic f) {
    final status = (f['status'] ?? 'reported') as String;
    final priority = (f['priority'] ?? 'normal') as String;
    final elevator = f['elevator']?['name'] ?? '—';
    final progress = faultProgress(status);
    final pct = (progress * 100).round();
    final highlight = priority == 'high' || priority == 'urgent';
    return LtCard(
      onTap: () => _open(f),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          if (highlight) ...[
            LtChip(prioLabels[priority] ?? priority, prioColors[priority] ?? LT.gray),
            const SizedBox(width: 8),
          ],
          LtChip(faultStatusShort[status] ?? status, faultStatusColor[status] ?? LT.gray),
          const Spacer(),
          Text('#${f['id']}', style: const TextStyle(color: LT.muted, fontWeight: FontWeight.w600, fontSize: 13)),
        ]),
        const SizedBox(height: 12),
        Text(elevator, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: LT.ink)),
        const SizedBox(height: 2),
        Text(f['description'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: LT.inkSoft, fontSize: 13)),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: LT.field,
                valueColor: AlwaysStoppedAnimation(status == 'completed' ? LT.green : LT.lime),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text('%$pct', style: const TextStyle(color: LT.ink, fontWeight: FontWeight.w700, fontSize: 13)),
        ]),
        const SizedBox(height: 8),
        Text(faultStageLabels[status] ?? status, style: const TextStyle(color: LT.muted, fontSize: 12, fontWeight: FontWeight.w600)),
      ]),
    );
  }
}
