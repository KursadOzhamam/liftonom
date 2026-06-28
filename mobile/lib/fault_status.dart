// lib/fault_status.dart
// Arıza yaşam döngüsü: 6 aşama + her aşamanın bir sonraki aksiyonu.
import 'package:flutter/material.dart';
import 'theme.dart';

const faultStages = ['reported', 'acknowledged', 'dispatched', 'inspected', 'repairing', 'completed'];

const faultStageLabels = {
  'reported': 'Arıza Bildirildi',
  'acknowledged': 'İşleme Alındı',
  'dispatched': 'Servis Yola Çıktı',
  'inspected': 'Kontrol Edildi',
  'repairing': 'Arıza Gideriliyor',
  'completed': 'İş Tamamlandı',
};

// Kısa rozet etiketi
const faultStatusShort = {
  'reported': 'Bildirildi', 'acknowledged': 'İşlemde', 'dispatched': 'Yolda',
  'inspected': 'Kontrol', 'repairing': 'Onarımda', 'completed': 'Tamamlandı',
};

const faultStatusColor = {
  'reported': LT.red, 'acknowledged': LT.orange, 'dispatched': LT.blue,
  'inspected': Color(0xFF7C5CFC), 'repairing': LT.yellow, 'completed': LT.green,
};

const prioLabels = {'urgent': 'Acil', 'high': 'Yüksek', 'normal': 'Normal', 'low': 'Düşük'};
const prioColors = {'urgent': LT.red, 'high': LT.orange, 'normal': LT.blue, 'low': LT.gray};

int faultStageIndex(String status) {
  final i = faultStages.indexOf(status);
  return i < 0 ? 0 : i;
}

/// 0.0–1.0 ilerleme (rozetli kart progress bar'ı için).
double faultProgress(String status) => (faultStageIndex(status) + 1) / faultStages.length;

/// Bir sonraki aksiyon. completed ise null.
class FaultAction {
  final String label;
  final String endpoint; // POST /fault-reports/{id}/{endpoint}
  final bool needsLocation;
  final bool needsInspectForm;
  const FaultAction(this.label, this.endpoint, {this.needsLocation = false, this.needsInspectForm = false});
}

FaultAction? nextFaultAction(String status) {
  switch (status) {
    case 'reported':
      return const FaultAction('İşleme Al', 'acknowledge');
    case 'acknowledged':
      return const FaultAction('Yola Çık', 'dispatch', needsLocation: true);
    case 'dispatched':
      return const FaultAction('Kontrol Et', 'inspect', needsInspectForm: true);
    case 'inspected':
      return const FaultAction('Arızayı Gidermeye Başla', 'start-repair');
    case 'repairing':
      return const FaultAction('İş Tamamlandı', 'complete');
    default:
      return null;
  }
}
