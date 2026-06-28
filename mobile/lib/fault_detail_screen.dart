// lib/fault_detail_screen.dart
// Arıza detay + 6 aşamalı yaşam döngüsü adım çubuğu + aşama aksiyonları.
import 'dart:async';
import 'package:flutter/material.dart';
import 'api.dart';
import 'theme.dart';
import 'fault_status.dart';
import 'location_service.dart';

class FaultDetailScreen extends StatefulWidget {
  final int faultId;
  const FaultDetailScreen({super.key, required this.faultId});
  @override
  State<FaultDetailScreen> createState() => _FaultDetailScreenState();
}

class _FaultDetailScreenState extends State<FaultDetailScreen> {
  Map<String, dynamic>? _f;
  bool _busy = false;
  Timer? _tracker; // "Servis yola çıktı" iken periyodik konum gönderimi

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tracker?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final res = await Api.request('/fault-reports/${widget.faultId}');
    if (!mounted) return;
    setState(() => _f = Map<String, dynamic>.from(res as Map));
    _manageTracking();
  }

  void _manageTracking() {
    if ((_f?['status']) == 'dispatched') {
      _tracker ??= LocationService.startTracking(widget.faultId);
    } else {
      _tracker?.cancel();
      _tracker = null;
    }
  }

  void _snack(String msg, Color c) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg), backgroundColor: c, behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  Future<void> _runAction(FaultAction action) async {
    Map<String, dynamic> body = {};

    if (action.needsInspectForm) {
      final form = await _inspectForm();
      if (form == null) return;
      body = form;
    }
    if (action.needsLocation) {
      final pos = await LocationService.current();
      if (pos != null) { body['lat'] = pos.latitude; body['lng'] = pos.longitude; }
    }

    setState(() => _busy = true);
    try {
      await Api.request('/fault-reports/${widget.faultId}/${action.endpoint}', method: 'POST', body: body);
      await _load();
      _snack('Durum güncellendi · müşteriye WhatsApp gönderildi', LT.green);
    } on ApiException catch (e) {
      _snack(e.message, LT.red);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<Map<String, dynamic>?> _inspectForm() {
    final diag = TextEditingController(text: _f?['fault_diagnosis']?.toString() ?? '');
    final part = TextEditingController(text: _f?['part_details']?.toString() ?? '');
    bool needsPart = _f?['needs_part'] == true;
    return showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: LT.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(left: 20, right: 20, top: 14, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: LT.line, borderRadius: BorderRadius.circular(2)))),
            const Text('Kontrol Bilgileri', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: LT.ink)),
            const SizedBox(height: 4),
            const Text('Arıza tespitini girin. Müşteriye WhatsApp ile bildirilecek.',
                style: TextStyle(color: LT.muted, fontSize: 13)),
            const SizedBox(height: 16),
            const Text('Arıza nedir?', style: TextStyle(color: LT.inkSoft, fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 6),
            TextField(controller: diag, maxLines: 2, decoration: const InputDecoration(hintText: 'örn. Kapı motoru arızalı')),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(color: LT.surface, borderRadius: BorderRadius.circular(LT.radiusSm), border: Border.all(color: LT.line)),
              child: Row(children: [
                const Expanded(child: Text('Parça değişimi gerekli mi?', style: TextStyle(fontWeight: FontWeight.w600, color: LT.ink))),
                Switch(value: needsPart, activeTrackColor: LT.ink, onChanged: (v) => setSheet(() => needsPart = v)),
              ]),
            ),
            if (needsPart) ...[
              const SizedBox(height: 12),
              const Text('Hangi parça?', style: TextStyle(color: LT.inkSoft, fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(controller: part, decoration: const InputDecoration(hintText: 'örn. Kapı motoru (1 adet)')),
            ],
            const SizedBox(height: 18),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, {
                'diagnosis': diag.text,
                'needsPart': needsPart,
                'partDetails': needsPart ? part.text : null,
              }),
              child: const Text('Kaydet & Gönder'),
            ),
          ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final f = _f;
    return Scaffold(
      body: SafeArea(
        child: f == null
            ? const Center(child: CircularProgressIndicator(color: LT.ink))
            : Column(children: [
                _topBar(f),
                Expanded(child: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 24), children: [
                  _infoCard(f),
                  const SizedBox(height: 18),
                  const Text('İŞ AKIŞI', style: TextStyle(color: LT.muted, fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.6)),
                  const SizedBox(height: 12),
                  _timeline(f),
                ])),
                _actionBar(f),
              ]),
      ),
    );
  }

  Widget _topBar(Map<String, dynamic> f) {
    final status = (f['status'] ?? 'reported') as String;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 16, 8),
      child: Row(children: [
        IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.arrow_back_rounded, color: LT.ink)),
        const SizedBox(width: 4),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(f['elevator']?['name'] ?? 'Arıza #${f['id']}',
                style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: LT.ink)),
            Text('Arıza #${f['id']}', style: const TextStyle(color: LT.muted, fontSize: 13)),
          ]),
        ),
        LtChip(faultStatusShort[status] ?? status, faultStatusColor[status] ?? LT.gray),
      ]),
    );
  }

  Widget _infoCard(Map<String, dynamic> f) {
    final priority = (f['priority'] ?? 'normal') as String;
    final needsPart = f['needs_part'] == true;
    return LtCard(
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          LtChip(prioLabels[priority] ?? priority, prioColors[priority] ?? LT.gray),
        ]),
        const SizedBox(height: 12),
        Text(f['description'] ?? '', style: const TextStyle(color: LT.ink, fontSize: 14, height: 1.4)),
        if ((f['fault_diagnosis'] ?? '').toString().isNotEmpty) ...[
          const Divider(height: 28, color: LT.line),
          _kv('Arıza Tespiti', f['fault_diagnosis']),
        ],
        if (needsPart) ...[
          const SizedBox(height: 10),
          _kv('Parça Değişimi', f['part_details'] ?? 'Gerekli', icon: Icons.build_circle_rounded, color: LT.orange),
        ],
        if ((f['estimated_repair'] ?? '').toString().isNotEmpty) ...[
          const SizedBox(height: 10),
          _kv('Tahmini Süre', f['estimated_repair']),
        ],
      ]),
    );
  }

  Widget _kv(String k, dynamic v, {IconData? icon, Color? color}) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon ?? Icons.info_outline_rounded, size: 16, color: color ?? LT.muted),
      const SizedBox(width: 8),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(color: LT.muted, fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 1),
        Text(v.toString(), style: const TextStyle(color: LT.ink, fontSize: 14, fontWeight: FontWeight.w600)),
      ])),
    ]);
  }

  Widget _timeline(Map<String, dynamic> f) {
    final current = faultStageIndex((f['status'] ?? 'reported') as String);
    const stampField = {
      'reported': 'created_at', 'acknowledged': 'acknowledged_at', 'dispatched': 'dispatched_at',
      'inspected': 'inspected_at', 'repairing': 'repair_started_at', 'completed': 'completed_at',
    };
    return Column(children: List.generate(faultStages.length, (i) {
      final stage = faultStages[i];
      final done = i < current;
      final isCurrent = i == current;
      final color = faultStatusColor[stage] ?? LT.gray;
      final reached = done || isCurrent;
      final ts = _fmt(f[stampField[stage]]);
      return IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Column(children: [
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color: reached ? color : LT.surface,
                shape: BoxShape.circle,
                border: Border.all(color: reached ? color : LT.line, width: 2),
              ),
              child: done
                  ? const Icon(Icons.check, size: 15, color: Colors.white)
                  : isCurrent
                      ? Center(child: Container(width: 9, height: 9, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)))
                      : null,
            ),
            if (i < faultStages.length - 1)
              Expanded(child: Container(width: 2, color: done ? color : LT.line)),
          ]),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(faultStageLabels[stage] ?? stage,
                    style: TextStyle(
                      color: reached ? LT.ink : LT.muted,
                      fontSize: 15,
                      fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
                    )),
                if (ts != null) Text(ts, style: const TextStyle(color: LT.muted, fontSize: 12)),
              ]),
            ),
          ),
        ]),
      );
    }));
  }

  String? _fmt(dynamic iso) {
    final d = DateTime.tryParse(iso?.toString() ?? '')?.toLocal();
    if (d == null) return null;
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.day)}.${two(d.month)}.${d.year}  ${two(d.hour)}:${two(d.minute)}';
  }

  Widget _actionBar(Map<String, dynamic> f) {
    final action = nextFaultAction((f['status'] ?? 'reported') as String);
    if (action == null) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
        child: Container(
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: LT.green.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(LT.radiusSm)),
          child: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.check_circle_rounded, color: LT.green, size: 20),
            SizedBox(width: 8),
            Text('İş Tamamlandı', style: TextStyle(color: LT.green, fontWeight: FontWeight.w800, fontSize: 15)),
          ]),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: FilledButton(
        onPressed: _busy ? null : () => _runAction(action),
        child: _busy
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
            : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(action.label),
                const SizedBox(width: 8),
                const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
              ]),
      ),
    );
  }
}
