// lib/main.dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'api.dart';
import 'login_screen.dart';
import 'main_scaffold.dart';
import 'theme.dart';

const kPrimary = LT.ink;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.loadToken();
  try {
    await Firebase.initializeApp(); // yapılandırma native dosyalardan okunur
  } catch (_) {/* Firebase yoksa uygulama yine çalışır */}
  runApp(const LiftonomApp());
}

class LiftonomApp extends StatelessWidget {
  const LiftonomApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Liftonom Saha',
      debugShowCheckedModeBanner: false,
      theme: LT.theme(),
      home: Api.hasToken ? const MainScaffold() : const LoginScreen(),
    );
  }
}
