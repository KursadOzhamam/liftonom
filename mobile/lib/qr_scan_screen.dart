// lib/qr_scan_screen.dart
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'api.dart';

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});
  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  bool _handled = false;

  String _extractToken(String raw) {
    // URL ise son segmenti al, değilse ham değeri kullan
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
      // Asansör/bina bilgisini doğrula (girişsiz uç)
      final info = await Api.request('/public/qr/$token', auth: false);
      if (!mounted) return;
      await _showElevatorSheet(token, info);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: Colors.red));
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
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(elevator, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          if (building.isNotEmpty) Text(building, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
          TextField(controller: desc, maxLines: 3, decoration: const InputDecoration(labelText: 'Arıza açıklaması')),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: FilledButton(
            onPressed: () async {
              if (desc.text.trim().isEmpty) return;
              await Api.request('/public/fault-reports/$token', method: 'POST', auth: false,
                  body: {'description': desc.text, 'reporter_name': 'Saha Personeli'});
              if (!ctx.mounted) return;
              Navigator.pop(ctx);
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Arıza kaydı oluşturuldu'), backgroundColor: Color(0xFF16A34A)),
              );
            },
            child: const Text('Arıza Bildir'),
          )),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      MobileScanner(onDetect: _onDetect),
      Align(
        alignment: Alignment.bottomCenter,
        child: Container(
          margin: const EdgeInsets.all(24),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(20)),
          child: const Text('Asansör QR kodunu okutun', style: TextStyle(color: Colors.white)),
        ),
      ),
    ]);
  }
}
