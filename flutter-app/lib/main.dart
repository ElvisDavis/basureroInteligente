import 'package:flutter/material.dart';

import 'config/app_theme.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(const SmartBinApp());
}

class SmartBinApp extends StatefulWidget {
  const SmartBinApp({super.key});

  @override
  State<SmartBinApp> createState() => _SmartBinAppState();
}

class _SmartBinAppState extends State<SmartBinApp> {
  final _apiService = ApiService();

  late Future<bool> _sessionFuture;

  @override
  void initState() {
    super.initState();

    _sessionFuture = _apiService.hasSession();
  }

  void _onAuthenticated() {
    setState(() {
      _sessionFuture = Future<bool>.value(true);
    });
  }

  void _onLogout() {
    setState(() {
      _sessionFuture = Future<bool>.value(false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartBin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: FutureBuilder<bool>(
        future: _sessionFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const _SplashScreen();
          }

          final hasSession = snapshot.data ?? false;

          if (hasSession) {
            return HomeScreen(onLogout: _onLogout);
          }

          return LoginScreen(onAuthenticated: _onAuthenticated);
        },
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/branding/'
                'smartbin_logo.png',
                width: 160,
                height: 160,
                fit: BoxFit.contain,
                semanticLabel: 'Logotipo de SmartBin',
                errorBuilder: (context, error, stackTrace) {
                  return const Icon(
                    Icons.eco_rounded,
                    color: AppColors.emerald,
                    size: 100,
                  );
                },
              ),
              const SizedBox(height: 20),
              const Text(
                'SmartBin',
                style: TextStyle(
                  color: AppColors.forest,
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -1,
                ),
              ),
              const SizedBox(height: 20),
              const SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
