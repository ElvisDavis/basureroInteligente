import 'package:flutter/foundation.dart';

abstract final class ApiConfig {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://127.0.0.1:3000/api/v1';
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      //Dirección especial para acceder al computador
      //desde el emulador Android
      return 'http://10.0.2.2:3000/api/v1';
    }
    return 'http://127.0.0.1:3000/api/v1';
  }

  static String get loginUrl => '$baseUrl/auth/login';

  static String get registerUrl => '$baseUrl/auth/register';

  static String get verifyEmailUrl => '$baseUrl/auth/verify-email';

  static String get resendVerificationUrl =>
      '$baseUrl/auth/resend-verification';

  static String get profileUrl => '$baseUrl/auth/me';

  static String get predictionUrl => '$baseUrl/deposits/predict';

  static String get depositsUrl => '$baseUrl/deposits';

  static String get healthUrl => '$baseUrl/health';
}
