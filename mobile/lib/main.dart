// lib/main.dart
import 'package:flutter/material.dart';
import 'api.dart';
import 'login_screen.dart';
import 'main_scaffold.dart';

const kPrimary = Color(0xFF2563EB);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.loadToken();
  runApp(const LiftonomApp());
}

class LiftonomApp extends StatelessWidget {
  const LiftonomApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Liftonom Saha',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: kPrimary),
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
        useMaterial3: true,
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
          isDense: true,
        ),
      ),
      home: Api.hasToken ? const MainScaffold() : const LoginScreen(),
    );
  }
}
