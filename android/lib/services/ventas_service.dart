import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/detalle_venta_local.dart';
import 'http_extensions.dart';

class VentasService {
  Future<Map<String, dynamic>> registrarVenta({
    required String accessToken,
    required String clienteId,
    required String rutaId,
    required List<DetalleVentaLocal> detalles,
  }) async {
    final respuesta = await http.post(
      Uri.parse('$baseUrl/api/ventas'),
      headers: _headers(accessToken),
      body: jsonEncode({
        'cliente_id': clienteId,
        'ruta_id': rutaId,
        'descuento': 0,
        'detalles': detalles.map((detalle) {
          return {
            'producto_id': detalle.productoId,
            'cantidad': detalle.cantidad,
          };
        }).toList(),
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
            : datos is Map && datos['error'] != null
                ? datos['error'].toString()
                : 'No se pudo registrar la venta.',
      );
    }

    if (datos is! Map) {
      throw Exception(
        'La respuesta de la venta no es válida.',
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
}