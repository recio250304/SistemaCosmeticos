import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'http_extensions.dart';

class ClientesService {
  Future<Map<String, dynamic>> obtenerMisClientes(
    String accessToken,
  ) async {
    final respuesta = await http.get(
      Uri.parse(
        '$baseUrl/api/rutas/mis-clientes',
      ),
      headers: _headers(accessToken),
    );

    final datos =
        _decodificar(respuesta.body);

    if (!respuesta.ok()) {
      throw Exception(
        datos is Map &&
                datos['mensaje'] != null
            ? datos['mensaje'].toString()
            : 'No se pudieron cargar los clientes.',
      );
    }

    if (datos is! Map) {
      throw Exception(
        'La respuesta de clientes no es válida.',
      );
    }

    return Map<String, dynamic>.from(
      datos,
    );
  }

  Future<Map<String, dynamic>>
      obtenerCuentasPendientes(
    String accessToken,
  ) async {
    final respuesta = await http.get(
      Uri.parse(
        '$baseUrl/api/cuentas-por-cobrar',
      ),
      headers: _headers(accessToken),
    );

    final datos =
        _decodificar(respuesta.body);

    if (!respuesta.ok()) {
      throw Exception(
        datos is Map &&
                datos['mensaje'] != null
            ? datos['mensaje'].toString()
            : datos is Map &&
                    datos['error'] != null
                ? datos['error'].toString()
                : 'No se pudieron consultar las cuentas pendientes.',
      );
    }

    if (datos is! Map) {
      throw Exception(
        'La respuesta de cuentas pendientes no es válida.',
      );
    }

    return Map<String, dynamic>.from(
      datos,
    );
  }

  Map<String, String> _headers(
    String accessToken,
  ) {
    return {
      'Authorization':
          'Bearer $accessToken',
      'Content-Type':
          'application/json',
    };
  }

  dynamic _decodificar(
    String body,
  ) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }
}