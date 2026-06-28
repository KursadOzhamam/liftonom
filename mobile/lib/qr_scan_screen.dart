// lib/qr_scan_screen.dart
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'api.dart';
import 'theme.dart';

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});
  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  bool _handled = false;

  String _extractToken(String raw) {
    final cleaned = raw.trim();
    if (cleaned.contains('/')) return cleaned.split('/').where((s) => s.isNotEmpty).last;
    return cleaned;
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handled || capture.barcodes.isEmpty) return;
    final value = capture.barcodes.first.rawValue;
    if (value == null) return;
    _handled = true;

    final token = _extractToken(value);
    try {
      final info = await Api.request('/public/qr/$token', auth: false);
      if (!mounted) return;
      await _showElevatorSheet(token, info);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: LT.red));
    } finally {
      _handled = false;
    }
  }

  Future<void> _showElevatorSheet(String token, dynamic info) async {
    final elevator = info['elevator']?['name'] ?? 'Asansör';
    final building = info['building']?['name'] ?? '';
    final desc = TextEditingController();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LT.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 12, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(
            child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(color: LT.line, borderRadius: BorderRadius.circular(2))),
          ),
          Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: LT.ink.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(13)),
              child: const Icon(Icons.elevator_rounded, color: LT.ink),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(elevator, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: LT.ink)),
                if (building.isNotEmpty) Text(building, style: const TextStyle(color: LT.muted, fontSize: 13)),
              ]),
            ),
          ]),
          const SizedBox(height: 18),
          TextField(controller: desc, maxLines: 3, decoration: const InputDecoration(hintText: 'Arıza açıklaması')),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: () async {
              if (desc.text.trim().isEmpty) return;
              await Api.request('/public/fault-reports/$token', method: 'POST', auth: false,
                  body: {'description': desc.text, 'reporter_name': 'Saha Personeli'});
              if (!ctx.mounted) return;
              Navigator.pop(ctx);
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: const Text('Arıza kaydı oluşturuldu'),
                backgroundColor: LT.green,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ));
            },
            child: const Text('Arıza Bildir'),
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(LT.radius),
        child: Stack(fit: StackFit.expand, children: [
          MobileScanner(onDetect: _onDetect),
          // Tarama çerçevesi rehberi
          Center(
            child: Container(
              width: 230, height: 230,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white.withValues(alpha: 0.9), width: 3),
                borderRadius: BorderRadius.circular(24),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(color: LT.ink.withValues(alpha: 0.85), borderRadius: BorderRadius.circular(30)),
              child: Row(mainAxisSize: MainAxisSize.min, children: const [
                Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Text('Asansör QR kodunu okutun', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}
