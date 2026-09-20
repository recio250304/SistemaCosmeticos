import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'http_extensions.dart';

class CobrosService {
  Future<Map<String, dynamic>> obtenerCuentasPendientes(
    String accessToken,
  ) async {
    final respuesta = await http.get(
      Uri.parse('$baseUrl/api/cuentas-por-cobrar'),
      headers: _headers(accessToken),
    );

    final datos = _decodificar(respuesta.body);

    if (!respuesta.ok()) {
      throw Exception(
        datos is Map && datos['mensaje'] != null
            ? datos['mensaje'].toString()
            : 'No se pudieron cargar las cuentas pendientes.',
      );
    }

    if (datos is! Map) {
      throw Exception(
        'La respuesta de cuentas por cobrar no es válida.',
      );
    }

    return Map<String, dynamic>.from(datos);
  }

  Future<Map<String, dynamic>> obtenerCuentasBancariasParaCobro(
    String accessToken,
  ) async {
    final respuesta = await http.get(
      Uri.parse('$baseUrl/api/bancos/para-cobro'),
      headers: _headers(accessToken),
    );

    final datos = _decodificar(respuesta.body);

    if (!respuesta.ok()) {
      throw Exception(
        datos is Map && datos['mensaje'] != null
            ? datos['mensaje'].toString()
            : 'No se pudieron cargar las cuentas bancarias.',
      );
    }

    if (datos is! Map) {
      throw Exception(
        'La respuesta de cuentas bancarias no es válida.',
      );
    }

    return Map<String, dynamic>.from(datos);
  }

  Future<Map<String, dynamic>> registrarCobro({
    required String accessToken,
    required String ventaId,
    required double monto,
    required String medioPago,
    String? cuentaBancariaId,
    String? referencia,
    String? observaciones,
  }) async {
    final respuesta = await http.post(
      Uri.parse('$baseUrl/api/ventas/$ventaId/pagos'),
      headers: _headers(accessToken),
      body: jsonEncode({
        'monto': monto,
        'medio_pago': medioPago,
        if (cuentaBancariaId != null &&
            cuentaBancariaId.isNotEmpty)
          'cuenta_bancaria_id': cuentaBancariaId,
        if (referencia != null && referencia.isNotEmpty)
          'referencia': referencia,
        if (observaciones != null &&
            observaciones.isNotEmpty)
          'observaciones': observaciones,
      }),
    );

    final datos = _decodificar(respuesta.body);

    if (!respuesta.ok()) {
      throw Exception(
        datos is Map && datos['mensaje'] != null
            ? datos['mensaje'].toString()
            : datos is Map && datos['error'] != null
                ? datos['error'].toString()
                : 'No se pudo registrar el cobro.',
      );
    }

    if (datos is! Map) {
      throw Exception(
        'La respuesta del cobro no es válida.',
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