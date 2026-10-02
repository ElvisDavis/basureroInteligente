import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';

import 'package:http_parser/http_parser.dart';

class ApiException implements Exception {
  const ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class ApiService {
  static const String _tokenKey = 'auth_token';

  /// Obtiene el token almacenado localmente.
  Future<String?> getToken() async {
    final preferences = await SharedPreferences.getInstance();

    return preferences.getString(_tokenKey);
  }

  /// Indica si existe una sesión local.
  Future<bool> hasSession() async {
    final token = await getToken();

    return token != null && token.isNotEmpty;
  }

  /// Registra un usuario y solicita el envío del código.
  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse(ApiConfig.registerUrl),
            headers: const {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'name': name.trim(),
              'email': email.trim().toLowerCase(),
              'password': password,
            }),
          )
          .timeout(const Duration(seconds: 20));

      final body = _decodeResponse(response);

      if (response.statusCode != 201) {
        throw ApiException(
          _extractErrorMessage(body, 'No fue posible registrar el usuario.'),
        );
      }

      return body;
    } on ApiException {
      rethrow;
    } on Object {
      throw const ApiException('No fue posible conectar con el servidor.');
    }
  }

  /// Verifica el correo mediante el código de seis dígitos.
  Future<Map<String, dynamic>> verifyEmail({
    required String email,
    required String code,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse(ApiConfig.verifyEmailUrl),
            headers: const {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'email': email.trim().toLowerCase(),
              'code': code.trim(),
            }),
          )
          .timeout(const Duration(seconds: 15));

      final body = _decodeResponse(response);

      if (response.statusCode != 200) {
        throw ApiException(
          _extractErrorMessage(body, 'No fue posible verificar el correo.'),
        );
      }

      return body;
    } on ApiException {
      rethrow;
    } on Object {
      throw const ApiException('No fue posible conectar con el servidor.');
    }
  }

  /// Solicita un código de verificación nuevo.
  Future<Map<String, dynamic>> resendVerification({
    required String email,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse(ApiConfig.resendVerificationUrl),
            headers: const {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({'email': email.trim().toLowerCase()}),
          )
          .timeout(const Duration(seconds: 20));

      final body = _decodeResponse(response);

      if (response.statusCode != 200) {
        throw ApiException(
          _extractErrorMessage(body, 'No fue posible reenviar el código.'),
        );
      }

      return body;
    } on ApiException {
      rethrow;
    } on Object {
      throw const ApiException('No fue posible conectar con el servidor.');
    }
  }

  /// Inicia sesión y guarda el token JWT.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse(ApiConfig.loginUrl),
            headers: const {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({'email': email.trim(), 'password': password}),
          )
          .timeout(const Duration(seconds: 15));

      final body = _decodeResponse(response);

      if (response.statusCode != 200) {
        throw ApiException(
          _extractErrorMessage(body, 'No fue posible iniciar sesión.'),
        );
      }

      final token = body['token'];

      if (token is! String || token.isEmpty) {
        throw const ApiException('El servidor no devolvió un token válido.');
      }

      final preferences = await SharedPreferences.getInstance();

      await preferences.setString(_tokenKey, token);

      return body;
    } on ApiException {
      rethrow;
    } on Object {
      throw const ApiException('No fue posible conectar con el servidor.');
    }
  }

  /// Consulta la información del usuario autenticado.
  Future<Map<String, dynamic>> getProfile() async {
    try {
      final response = await http
          .get(
            Uri.parse(ApiConfig.profileUrl),
            headers: await _authenticatedHeaders(),
          )
          .timeout(const Duration(seconds: 15));

      final body = _decodeResponse(response);

      if (response.statusCode != 200) {
        throw ApiException(
          _extractErrorMessage(body, 'No fue posible consultar el perfil.'),
        );
      }

      return body;
    } on ApiException {
      rethrow;
    } on Object {
      throw const ApiException('No fue posible conectar con el servidor.');
    }
  }

  /// Consulta el historial de depósitos.
  Future<Map<String, dynamic>> getDeposits() async {
    try {
      final response = await http
          .get(
            Uri.parse(ApiConfig.depositsUrl),
            headers: await _authenticatedHeaders(),
          )
          .timeout(const Duration(seconds: 15));

      final body = _decodeResponse(response);

      if (response.statusCode != 200) {
        throw ApiException(
          _extractErrorMessage(body, 'No fue posible consultar el historial.'),
        );
      }

      return body;
    } on ApiException {
      rethrow;
    } on Object {
      throw const ApiException('No fue posible conectar con el servidor.');
    }
  }

  /// Envía una imagen para clasificarla.
  ///
  /// XFile funciona tanto en Chrome como en Android.
  Future<Map<String, dynamic>> predictImage(XFile image) async {
    try {
      final token = await getToken();

      if (token == null || token.isEmpty) {
        throw const ApiException('La sesión ha expirado.');
      }

      final request = http.MultipartRequest(
        'POST',
        Uri.parse(ApiConfig.predictionUrl),
      );

      request.headers.addAll({
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      });

      final bytes = await image.readAsBytes();
      final contentType = _imageContentType(image);
      final uploadFileName = _normalizedImageName(image.name, contentType);

      request.files.add(
        http.MultipartFile.fromBytes(
          'image',
          bytes,
          filename: uploadFileName,
          contentType: contentType,
        ),
      );

      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 45),
      );

      final response = await http.Response.fromStream(streamedResponse);

      final body = _decodeResponse(response);

      if (response.statusCode != 201) {
        throw ApiException(
          _extractErrorMessage(body, 'No fue posible clasificar la imagen.'),
        );
      }

      return body;
    } on ApiException {
      rethrow;
    } on Object {
      throw const ApiException('No fue posible conectar con el servidor.');
    }
  }

  /// Elimina el token local.
  Future<void> logout() async {
    final preferences = await SharedPreferences.getInstance();

    await preferences.remove(_tokenKey);
  }

  /// Genera las cabeceras para rutas protegidas.
  Future<Map<String, String>> _authenticatedHeaders() async {
    final token = await getToken();

    if (token == null || token.isEmpty) {
      throw const ApiException('La sesión ha expirado.');
    }

    return {'Authorization': 'Bearer $token', 'Accept': 'application/json'};
  }

  /// Convierte el JSON del backend en un mapa.
  Map<String, dynamic> _decodeResponse(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);

      if (decoded is Map<String, dynamic>) {
        return decoded;
      }

      return <String, dynamic>{};
    } on FormatException {
      return <String, dynamic>{};
    }
  }

  /// Extrae el mensaje de error normalizado del backend.
  String _extractErrorMessage(Map<String, dynamic> body, String fallback) {
    final error = body['error'];

    if (error is Map<String, dynamic>) {
      final message = error['message'];

      if (message is String && message.isNotEmpty) {
        return message;
      }
    }

    final message = body['message'];

    if (message is String && message.isNotEmpty) {
      return message;
    }

    return fallback;
  }

  MediaType _imageContentType(XFile image) {
    final mimeType = image.mimeType?.toLowerCase();

    if (mimeType == 'image/png') {
      return MediaType('image', 'png');
    }

    if (mimeType == 'image/webp') {
      return MediaType('image', 'webp');
    }

    if (mimeType == 'image/jpeg' || mimeType == 'image/jpg') {
      return MediaType('image', 'jpeg');
    }

    final normalizedName = image.name.toLowerCase();

    if (normalizedName.endsWith('.png')) {
      return MediaType('image', 'png');
    }

    if (normalizedName.endsWith('.webp')) {
      return MediaType('image', 'webp');
    }

    if (normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg')) {
      return MediaType('image', 'jpeg');
    }

    /*
   * camera_web puede generar una captura sin extensión
   * y sin exponer mimeType. La cámara está configurada
   * para producir JPEG, por lo que usamos ese formato.
   */
    if (!normalizedName.contains('.')) {
      return MediaType('image', 'jpeg');
    }

    throw const ApiException(
      'Formato de imagen no permitido. '
      'Utiliza JPG, JPEG, PNG o WEBP.',
    );
  }

  String _normalizedImageName(String originalName, MediaType contentType) {
    final normalizedName = originalName.toLowerCase();

    final hasAllowedExtension =
        normalizedName.endsWith('.jpg') ||
        normalizedName.endsWith('.jpeg') ||
        normalizedName.endsWith('.png') ||
        normalizedName.endsWith('.webp');

    if (hasAllowedExtension) {
      return originalName;
    }

    final extension = switch (contentType.subtype) {
      'png' => 'png',
      'webp' => 'webp',
      _ => 'jpg',
    };

    return 'smartbin_${DateTime.now().millisecondsSinceEpoch}'
        '.$extension';
  }
}
