import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'http_extensions.dart';

class InventarioService {
  Future<Map<String, dynamic>> obtenerMiInventario(
    String accessToken,
  ) async {
    final respuesta = await http.get(
      Uri.parse('$baseUrl/api/rutas/mi-inventario'),
      headers: _headers(accessToken),
    );

    final datos = _decodificar(respuesta.body);

    if (!respuesta.ok()) {
      throw Exception(
        datos is Map && datos['mensaje'] != null
            ? datos['mensaje'].toString()
            : 'No se pudo cargar el inventario.',
      );
    }

    if (datos is! Map) {
      throw Exception(
        'La respuesta del inventario no es válida.',
      );
    }

    return Map<String, dynamic>.from(datos);
  }

  Map<String, String> _headers(String accessToken) {
    return {
      'Authorization': 'Bearer $accessToken',
      'Content-Type': 'application/json',
    };
  }

  dynamic _decodificar(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }
}