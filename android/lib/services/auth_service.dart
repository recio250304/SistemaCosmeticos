import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'http_extensions.dart';

class AuthService {
  Future<Map<String, dynamic>> iniciarSesion({
    required String usuario,
    required String password,
  }) async {
    final respuesta = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'usuario': usuario,
        'password': password,
      }),
    );

    dynamic datos;

    try {
      datos = jsonDecode(respuesta.body);
    } catch (_) {
      datos = null;
    }

    if (!respuesta.ok()) {
      throw Exception(
        datos is Map && datos['mensaje'] != null
            ? datos['mensaje'].toString()
            : 'No se pudo iniciar sesión.',
      );
    }

    if (datos is! Map) {
      throw Exception(
        'La respuesta del servidor no es válida.',
      );
    }

    return Map<String, dynamic>.from(datos);
  }
}