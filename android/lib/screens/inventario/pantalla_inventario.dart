import 'package:flutter/material.dart';

import '../../services/inventario_service.dart';

class PantallaInventario extends StatefulWidget {
  final String accessToken;

  const PantallaInventario({
    super.key,
    required this.accessToken,
  });

  @override
  PantallaInventarioState createState() =>
      PantallaInventarioState();
}

class PantallaInventarioState
    extends State<PantallaInventario> {
  final InventarioService inventarioService =
      InventarioService();

  bool cargando = true;
  String error = '';

  List<dynamic> inventario = [];
  List<dynamic> rutas = [];

  @override
  void initState() {
    super.initState();
    cargarInventario();
  }

  Future<void> cargarInventario() async {
    if (!mounted) {
      return;
    }

    setState(() {
      cargando = true;
      error = '';
    });

    try {
      final datos =
          await inventarioService.obtenerMiInventario(
        widget.accessToken,
      );

      final inventarioRespuesta =
          datos['inventario'];

      final rutasRespuesta = datos['rutas'];

      final nuevoInventario = inventarioRespuesta is List
          ? inventarioRespuesta
          : <dynamic>[];

      final nuevasRutas = rutasRespuesta is List
          ? rutasRespuesta
          : <dynamic>[];

      if (!mounted) {
        return;
      }

      setState(() {
        inventario = nuevoInventario;
        rutas = nuevasRutas;
      });
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        error = e.toString().replaceFirst(
              'Exception: ',
              '',
            );
      });
    } finally {
      if (mounted) {
        setState(() {
          cargando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (cargando) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (error.isNotEmpty) {
      return RefreshIndicator(
        onRefresh: cargarInventario,
        child: ListView(
          physics:
              const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 90),
            const Icon(
              Icons.inventory_2_outlined,
              size: 70,
              color: Colors.red,
            ),
            const SizedBox(height: 18),
            const Text(
              'No se pudo cargar el inventario',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 22),
            Center(
              child: ElevatedButton.icon(
                onPressed: cargarInventario,
                icon: const Icon(Icons.refresh),
                label:
                    const Text('Intentar nuevamente'),
              ),
            ),
          ],
        ),
      );
    }

    if (inventario.isEmpty) {
      return RefreshIndicator(
        onRefresh: cargarInventario,
        child: ListView(
          physics:
              const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 90),
            const Icon(
              Icons.inventory_2_outlined,
              size: 75,
              color: Colors.grey,
            ),
            const SizedBox(height: 20),
            const Text(
              'No hay inventario asignado',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Actualmente no tienes productos asignados a tu ruta.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey,
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: cargarInventario,
      child: ListView(
        physics:
            const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _encabezadoInventario(context),
          const SizedBox(height: 16),
          ...inventario.map(
            (item) => _tarjetaProducto(
              context,
              item,
            ),
          ),
        ],
      ),
    );
  }

  Widget _encabezadoInventario(
    BuildContext context,
  ) {
    int totalDisponible = 0;

    for (final item in inventario) {
      if (item is Map) {
        totalDisponible +=
            _numero(item['cantidad_disponible']);
      }
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            CircleAvatar(
              radius: 27,
              backgroundColor:
                  Theme.of(context)
                      .colorScheme
                      .primaryContainer,
              child: Icon(
                Icons.inventory_2_outlined,
                color: Theme.of(context)
                    .colorScheme
                    .primary,
                size: 30,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Inventario de ruta',
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${inventario.length} producto${inventario.length == 1 ? '' : 's'}',
                    style: const TextStyle(
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment:
                  CrossAxisAlignment.end,
              children: [
                const Text(
                  'Disponible',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$totalDisponible',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context)
                        .colorScheme
                        .primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _tarjetaProducto(
    BuildContext context,
    dynamic item,
  ) {
    if (item is! Map) {
      return const SizedBox.shrink();
    }

    final producto = item['producto'];

    final nombre = producto is Map
        ? producto['nombre']?.toString() ??
            'Producto sin nombre'
        : 'Producto sin nombre';

    final codigo = producto is Map
        ? producto['codigo']?.toString() ??
            'Sin código'
        : 'Sin código';

    final precio = producto is Map
        ? _numeroDecimal(producto['precio'])
        : 0;

    final disponibleProducto = producto is Map
        ? producto['disponible'] == true
        : false;

    final cantidadSalida =
        _numero(item['cantidad_salida']);

    final cantidadVendida =
        _numero(item['cantidad_vendida']);

    final cantidadDevuelta =
        _numero(item['cantidad_devuelta']);

    final cantidadAjustada =
        _numero(item['cantidad_ajustada']);

    final cantidadDisponible =
        _numero(item['cantidad_disponible']);

    return Card(
      margin:
          const EdgeInsets.only(bottom: 14),
      elevation: 2,
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 25,
                  child: Icon(
                    Icons.inventory_2_outlined,
                    color: Theme.of(context)
                        .colorScheme
                        .primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      Text(
                        nombre,
                        maxLines: 2,
                        overflow:
                            TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight:
                              FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        'Código: $codigo',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        'Precio: \$${precio.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight:
                              FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _estadoProducto(
                  context,
                  disponibleProducto,
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Divider(),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _datoInventario(
                    context,
                    icono:
                        Icons.output_outlined,
                    titulo: 'Asignado',
                    valor: '$cantidadSalida',
                  ),
                ),
                Expanded(
                  child: _datoInventario(
                    context,
                    icono:
                        Icons.shopping_cart_outlined,
                    titulo: 'Vendido',
                    valor: '$cantidadVendida',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _datoInventario(
                    context,
                    icono: Icons
                        .keyboard_return_outlined,
                    titulo: 'Devuelto',
                    valor: '$cantidadDevuelta',
                  ),
                ),
                Expanded(
                  child: _datoInventario(
                    context,
                    icono: Icons.tune_outlined,
                    titulo: 'Ajustado',
                    valor: '$cantidadAjustada',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .primaryContainer,
                borderRadius:
                    BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.inventory_outlined,
                    color: Theme.of(context)
                        .colorScheme
                        .primary,
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Disponible en ruta',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight:
                            FontWeight.bold,
                      ),
                    ),
                  ),
                  Text(
                    '$cantidadDisponible',
                    style: TextStyle(
                      fontSize: 25,
                      fontWeight:
                          FontWeight.bold,
                      color: Theme.of(context)
                          .colorScheme
                          .primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _estadoProducto(
    BuildContext context,
    bool disponible,
  ) {
    return Container(
      padding:
          const EdgeInsets.symmetric(
        horizontal: 9,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: disponible
            ? Colors.green.shade50
            : Colors.red.shade50,
        borderRadius:
            BorderRadius.circular(20),
        border: Border.all(
          color: disponible
              ? Colors.green.shade200
              : Colors.red.shade200,
        ),
      ),
      child: Text(
        disponible
            ? 'Disponible'
            : 'No disponible',
        style: TextStyle(
          fontSize: 11,
          fontWeight:
              FontWeight.bold,
          color: disponible
              ? Colors.green.shade800
              : Colors.red.shade800,
        ),
      ),
    );
  }

  Widget _datoInventario(
    BuildContext context, {
    required IconData icono,
    required String titulo,
    required String valor,
  }) {
    return Row(
      children: [
        Icon(
          icono,
          size: 21,
          color: Colors.grey.shade600,
        ),
        const SizedBox(width: 7),
        Expanded(
          child: Column(
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              Text(
                titulo,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                valor,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight:
                      FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  int _numero(dynamic valor) {
    if (valor is int) {
      return valor;
    }

    if (valor is double) {
      return valor.toInt();
    }

    return int.tryParse(
          valor?.toString() ?? '',
        ) ??
        0;
  }

  double _numeroDecimal(dynamic valor) {
    if (valor is num) {
      return valor.toDouble();
    }

    return double.tryParse(
          valor?.toString() ?? '',
        ) ??
        0;
  }
}