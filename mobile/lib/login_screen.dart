// lib/login_screen.dart
import 'package:flutter/material.dart';
import 'api.dart';
import 'home_screen.dart';
import 'main.dart' show kPrimary;

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
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeScreen()));
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
            constraints: const BoxConstraints(maxWidth: 380),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(color: kPrimary, borderRadius: BorderRadius.circular(14)),
                  child: const Center(child: Text('L', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold))),
                ),
                const SizedBox(height: 12),
                const Text('Liftonom Saha', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const Text('Teknisyen Uygulaması', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 24),
                Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(side: const BorderSide(color: Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: _otpStep ? _otpForm() : _loginForm(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _loginForm() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Giriş Yap', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Telefon')),
          const SizedBox(height: 12),
          TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Şifre')),
          if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: Colors.red))),
          const SizedBox(height: 16),
          FilledButton(onPressed: _loading ? null : _login, child: Text(_loading ? 'Gönderiliyor…' : 'Devam Et')),
        ],
      );

  Widget _otpForm() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Doğrulama Kodu', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('$_phoneNormalized numarasına gönderilen kodu girin.', style: const TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 16),
          TextField(controller: _code, keyboardType: TextInputType.number, textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 20, letterSpacing: 6), decoration: const InputDecoration(labelText: 'Kod')),
          if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: Colors.red))),
          const SizedBox(height: 16),
          FilledButton(onPressed: _loading ? null : _verify, child: Text(_loading ? 'Doğrulanıyor…' : 'Giriş Yap')),
          TextButton(onPressed: () => setState(() => _otpStep = false), child: const Text('← Geri')),
        ],
      );
}
