// lib/theme.dart
// Archivr esinli tasarım sistemi: sıcak kırık-beyaz zemin, beyaz yuvarlak
// kartlar, neredeyse-siyah birincil aksiyonlar, renkli durum çipleri.
import 'package:flutter/material.dart';

class LT {
  // Zeminler
  static const bg = Color(0xFFF4F2EE); // sıcak kırık-beyaz scaffold
  static const surface = Color(0xFFFFFFFF); // kartlar
  static const field = Color(0xFFF1EFEA); // input dolgusu

  // Metin
  static const ink = Color(0xFF1C1C1E); // birincil / aktif (neredeyse siyah)
  static const inkSoft = Color(0xFF5F5F63);
  static const muted = Color(0xFF9B9BA0);
  static const line = Color(0xFFEAE6DE); // saç teli kenarlık

  // Vurgu
  static const featureGreen = Color(0xFF29352B); // koyu orman yeşili kart
  static const lime = Color(0xFFCBF24C); // parlak lime (aktif filtre / progress)

  // Durum / çip renkleri
  static const red = Color(0xFFEF6C5A);
  static const orange = Color(0xFFF0934A);
  static const blue = Color(0xFF5B7CFA);
  static const green = Color(0xFF36B37E);
  static const yellow = Color(0xFFE6B53C);
  static const gray = Color(0xFF9B9BA0);

  static const radius = 22.0;
  static const radiusSm = 14.0;

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: const Color(0xFF1C1C1E).withValues(alpha: 0.05),
          blurRadius: 18,
          offset: const Offset(0, 8),
        ),
      ];

  static ThemeData theme() {
    final base = ThemeData(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: bg,
      colorScheme: base.colorScheme.copyWith(
        primary: ink,
        surface: surface,
        secondary: featureGreen,
      ),
      textTheme: base.textTheme.apply(bodyColor: ink, displayColor: ink),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: ink,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSm)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          elevation: 0,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: field,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
          borderSide: const BorderSide(color: ink, width: 1.4),
        ),
        labelStyle: const TextStyle(color: muted),
        floatingLabelStyle: const TextStyle(color: ink),
      ),
    );
  }
}

/// Beyaz, yuvarlak, yumuşak gölgeli kart.
class LtCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  const LtCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: LT.surface,
      borderRadius: BorderRadius.circular(LT.radius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(LT.radius),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(LT.radius),
            boxShadow: LT.cardShadow,
            border: Border.all(color: LT.line),
          ),
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}

/// Renkli, noktalı durum/etiket çipi.
class LtChip extends StatelessWidget {
  final String label;
  final Color color;
  final bool dot;
  const LtChip(this.label, this.color, {super.key, this.dot = true});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (dot) ...[
          Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
        ],
        Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

/// Floating, beyaz, yuvarlak alt navigasyon. Aktif öğe ink pill.
class LtBottomNav extends StatelessWidget {
  final int index;
  final ValueChanged<int> onChanged;
  final List<({IconData icon, String label})> items;
  const LtBottomNav({super.key, required this.index, required this.onChanged, required this.items});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: LT.surface,
          borderRadius: BorderRadius.circular(26),
          boxShadow: LT.cardShadow,
          border: Border.all(color: LT.line),
        ),
        child: Row(
          children: List.generate(items.length, (i) {
            final active = i == index;
            return Expanded(
              child: GestureDetector(
                onTap: () => onChanged(i),
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: active ? LT.ink : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(items[i].icon, size: 20, color: active ? Colors.white : LT.muted),
                      if (active) ...[
                        const SizedBox(width: 8),
                        Text(items[i].label,
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
