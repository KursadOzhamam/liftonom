// lib/login_screen.dart
import 'package:flutter/material.dart';
import 'api.dart';
import 'main_scaffold.dart';
import 'theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController(text: '0543 123 45 67');
  final _password = TextEditingController(text: '123456');
  final _code = TextEditingController();
  bool _otpStep = false;
  bool _loading = false;
  String? _error;
  String _phoneNormalized = '';

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await Api.request('/auth/login', method: 'POST', auth: false,
          body: {'phone': _phone.text, 'password': _password.text});
      setState(() {
        _otpStep = true;
        _phoneNormalized = res['phone'] ?? _phone.text;
        if (res['dev_code'] != null) _code.text = res['dev_code'].toString();
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await Api.request('/auth/verify-otp', method: 'POST', auth: false,
          body: {'phone': _phoneNormalized, 'code': _code.text});
      await Api.setToken(res['token']);
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MainScaffold()));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(color: LT.ink, borderRadius: BorderRadius.circular(18)),
                  child: const Center(child: Text('L', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800))),
                ),
                const SizedBox(height: 16),
                const Text('Liftonom Saha', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: LT.ink)),
                const SizedBox(height: 2),
                const Text('Teknisyen Uygulaması', style: TextStyle(color: LT.muted, fontSize: 14)),
                const SizedBox(height: 28),
                LtCard(
                  padding: const EdgeInsets.all(22),
                  child: _otpStep ? _otpForm() : _loginForm(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _errorBox() => _error == null
      ? const SizedBox.shrink()
      : Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(color: LT.red.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
            child: Row(children: [
              const Icon(Icons.error_outline_rounded, color: LT.red, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(_error!, style: const TextStyle(color: LT.red, fontSize: 13))),
            ]),
          ),
        );

  Widget _loginForm() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Giriş Yap', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: LT.ink)),
          const SizedBox(height: 18),
          TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Telefon')),
          const SizedBox(height: 12),
          TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Şifre')),
          _errorBox(),
          const SizedBox(height: 18),
          FilledButton(onPressed: _loading ? null : _login, child: Text(_loading ? 'Gönderiliyor…' : 'Devam Et')),
        ],
      );

  Widget _otpForm() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Doğrulama Kodu', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: LT.ink)),
          const SizedBox(height: 6),
          Text('$_phoneNormalized numarasına gönderilen kodu girin.', style: const TextStyle(color: LT.muted, fontSize: 13)),
          const SizedBox(height: 18),
          TextField(controller: _code, keyboardType: TextInputType.number, textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 22, letterSpacing: 8, fontWeight: FontWeight.w700),
              decoration: const InputDecoration(hintText: '••••••')),
          _errorBox(),
          const SizedBox(height: 18),
          FilledButton(onPressed: _loading ? null : _verify, child: Text(_loading ? 'Doğrulanıyor…' : 'Giriş Yap')),
          const SizedBox(height: 4),
          TextButton(onPressed: () => setState(() => _otpStep = false),
              child: const Text('← Geri', style: TextStyle(color: LT.muted))),
        ],
      );
}
