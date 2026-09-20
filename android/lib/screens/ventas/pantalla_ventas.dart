import 'package:flutter/material.dart';

import '../../models/detalle_venta_local.dart';
import '../../services/clientes_service.dart';
import '../../services/inventario_service.dart';
import '../../services/ventas_service.dart';

class PantallaVentas extends StatefulWidget {
  final String accessToken;
  final Future<void> Function()? onVentaRegistrada;

  const PantallaVentas({
    super.key,
    required this.accessToken,
    this.onVentaRegistrada,
  });

  @override
  State<PantallaVentas> createState() =>
      _PantallaVentasState();
}

class _PantallaVentasState
    extends State<PantallaVentas> {
  final ClientesService clientesService =
      ClientesService();

  final InventarioService inventarioService =
      InventarioService();

  final VentasService ventasService =
      VentasService();

  bool cargando = true;
  bool registrandoVenta = false;

  String error = '';

  List<dynamic> clientes = [];
  List<dynamic> inventario = [];
  List<dynamic> rutas = [];

  String? clienteSeleccionadoId;
  String? rutaSeleccionadaId;

  final List<DetalleVentaLocal> carrito = [];

  @override
  void initState() {
    super.initState();
    cargarDatosVenta();
  }

  Future<void> cargarDatosVenta() async {
    if (!mounted) {
      return;
    }

    setState(() {
      cargando = true;
      error = '';
    });

    try {
      final resultados = await Future.wait([
        clientesService.obtenerMisClientes(
          widget.accessToken,
        ),
        inventarioService.obtenerMiInventario(
          widget.accessToken,
        ),
      ]);

      final datosClientes =
          resultados[0];

      final datosInventario =
          resultados[1];

      final clientesRespuesta =
          datosClientes['clientes'];

      final rutasClientesRespuesta =
          datosClientes['rutas'];

      final inventarioRespuesta =
          datosInventario['inventario'];

      final rutasInventarioRespuesta =
          datosInventario['rutas'];

      final nuevosClientes =
          clientesRespuesta is List
              ? clientesRespuesta
              : <dynamic>[];

      final nuevoInventario =
          inventarioRespuesta is List
              ? inventarioRespuesta
              : <dynamic>[];

      List<dynamic> nuevasRutas = [];

      if (rutasInventarioRespuesta is List &&
          rutasInventarioRespuesta.isNotEmpty) {
        nuevasRutas =
            rutasInventarioRespuesta;
      } else if (rutasClientesRespuesta
          is List) {
        nuevasRutas =
            rutasClientesRespuesta;
      }

      String? nuevaRutaId;

      if (nuevasRutas.isNotEmpty &&
          nuevasRutas.first is Map) {
        nuevaRutaId =
            nuevasRutas.first['id']
                ?.toString();
      }

      if (!mounted) {
        return;
      }

      setState(() {
        clientes = nuevosClientes;
        inventario = nuevoInventario;
        rutas = nuevasRutas;
        rutaSeleccionadaId =
            nuevaRutaId;

        if (clientes.isEmpty) {
          clienteSeleccionadoId =
              null;
        } else {
          final existeCliente =
              clientes.any(
            (cliente) =>
                cliente is Map &&
                cliente['id']?.toString() ==
                    clienteSeleccionadoId,
          );

          if (!existeCliente) {
            clienteSeleccionadoId =
                null;
          }
        }
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

  int _cantidadDisponible(
    dynamic item,
  ) {
    if (item is! Map) {
      return 0;
    }

    return _numero(
      item['cantidad_disponible'],
    );
  }

  Map<String, dynamic>?
      _productoDeInventario(
    dynamic item,
  ) {
    if (item is! Map) {
      return null;
    }

    final producto =
        item['producto'];

    if (producto is Map) {
      return Map<String, dynamic>.from(
        producto,
      );
    }

    return null;
  }

  String _nombreCliente(
    dynamic cliente,
  ) {
    if (cliente is! Map) {
      return 'Cliente sin nombre';
    }

    return cliente['nombre_negocio']
            ?.toString() ??
        'Cliente sin nombre';
  }

  double get subtotal {
    double total = 0;

    for (final detalle in carrito) {
      total += detalle.subtotal;
    }

    return total;
  }

  double get total {
    return subtotal;
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
        onRefresh: cargarDatosVenta,
        child: ListView(
          physics:
              const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 90),
            const Icon(
              Icons.point_of_sale_outlined,
              size: 70,
              color: Colors.red,
            ),
            const SizedBox(height: 18),
            const Text(
              'No se pudieron cargar las ventas',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 21,
                fontWeight:
                    FontWeight.bold,
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
                onPressed:
                    cargarDatosVenta,
                icon: const Icon(
                  Icons.refresh,
                ),
                label: const Text(
                  'Intentar nuevamente',
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (clientes.isEmpty) {
      return RefreshIndicator(
        onRefresh: cargarDatosVenta,
        child: ListView(
          physics:
              const AlwaysScrollableScrollPhysics(),
          padding:
              const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 90),
            const Icon(
              Icons.people_outline,
              size: 75,
              color: Colors.grey,
            ),
            const SizedBox(height: 20),
            const Text(
              'No hay clientes asignados',
              textAlign:
                  TextAlign.center,
              style: TextStyle(
                fontSize: 21,
                fontWeight:
                    FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Necesitas tener al menos un cliente asignado a tu ruta para registrar una venta.',
              textAlign:
                  TextAlign.center,
              style: TextStyle(
                color: Colors.grey,
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    }

    if (inventario.isEmpty) {
      return RefreshIndicator(
        onRefresh: cargarDatosVenta,
        child: ListView(
          physics:
              const AlwaysScrollableScrollPhysics(),
          padding:
              const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 90),
            const Icon(
              Icons.inventory_2_outlined,
              size: 75,
              color: Colors.grey,
            ),
            const SizedBox(height: 20),
            const Text(
              'No hay productos disponibles',
              textAlign:
                  TextAlign.center,
              style: TextStyle(
                fontSize: 21,
                fontWeight:
                    FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'No tienes productos asignados a tu inventario de ruta.',
              textAlign:
                  TextAlign.center,
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
      onRefresh: cargarDatosVenta,
      child: ListView(
        physics:
            const AlwaysScrollableScrollPhysics(),
        padding:
            const EdgeInsets.all(16),
        children: [
          _encabezadoVenta(context),
          const SizedBox(height: 14),
          _selectorCliente(context),
          const SizedBox(height: 14),
          _selectorProducto(context),
          const SizedBox(height: 18),
          _carrito(context),
          const SizedBox(height: 18),
          _resumenVenta(context),
          const SizedBox(height: 18),
          _botonRegistrarVenta(context),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _encabezadoVenta(
    BuildContext context,
  ) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor:
                  Theme.of(context)
                      .colorScheme
                      .primaryContainer,
              child: Icon(
                Icons.point_of_sale_outlined,
                size: 30,
                color: Theme.of(context)
                    .colorScheme
                    .primary,
              ),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    'Nueva venta',
                    style: TextStyle(
                      fontSize: 21,
                      fontWeight:
                          FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Registra productos vendidos a tus clientes.',
                    style: TextStyle(
                      color: Colors.grey,
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

  Widget _selectorCliente(
    BuildContext context,
  ) {
    return Card(
      elevation: 2,
      child: Padding(
        padding:
            const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            const Text(
              'Cliente',
              style: TextStyle(
                fontSize: 17,
                fontWeight:
                    FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue:
                  clienteSeleccionadoId,
              isExpanded: true,
              decoration:
                  const InputDecoration(
                labelText:
                    'Selecciona el cliente',
                prefixIcon: Icon(
                  Icons.person_outline,
                ),
                border:
                    OutlineInputBorder(),
              ),
              items: clientes
                  .map((cliente) {
                if (cliente is! Map) {
                  return null;
                }

                final id =
                    cliente['id']
                        ?.toString();

                if (id == null ||
                    id.isEmpty) {
                  return null;
                }

                return DropdownMenuItem<
                    String>(
                  value: id,
                  child: Text(
                    _nombreCliente(
                      cliente,
                    ),
                    overflow:
                        TextOverflow.ellipsis,
                  ),
                );
              })
                  .whereType<
                      DropdownMenuItem<
                          String>>()
                  .toList(),
              onChanged: (valor) {
                setState(() {
                  clienteSeleccionadoId =
                      valor;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _selectorProducto(
    BuildContext context,
  ) {
    final productosDisponibles =
        inventario.where((item) {
      if (item is! Map) {
        return false;
      }

      final producto =
          item['producto'];

      if (producto is! Map) {
        return false;
      }

      final disponibleProducto =
          producto['disponible'] ==
              true;

      final cantidad =
          _cantidadDisponible(
        item,
      );

      return disponibleProducto &&
          cantidad > 0;
    }).toList();

    return Card(
      elevation: 2,
      child: Padding(
        padding:
            const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            const Text(
              'Agregar producto',
              style: TextStyle(
                fontSize: 17,
                fontWeight:
                    FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            if (productosDisponibles
                .isEmpty)
              const Padding(
                padding:
                    EdgeInsets.symmetric(
                  vertical: 12,
                ),
                child: Text(
                  'No hay productos disponibles para vender.',
                  style: TextStyle(
                    color: Colors.grey,
                  ),
                ),
              )
            else
              SizedBox(
                width: double.infinity,
                child:
                    ElevatedButton.icon(
                  onPressed: () {
                    _mostrarSelectorProducto(
                      context,
                      productosDisponibles,
                    );
                  },
                  icon: const Icon(
                    Icons
                        .add_shopping_cart,
                  ),
                  label: const Text(
                    'Seleccionar producto',
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void>
      _mostrarSelectorProducto(
    BuildContext context,
    List<dynamic>
        productosDisponibles,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding:
                const EdgeInsets.fromLTRB(
              16,
              8,
              16,
              20,
            ),
            child: Column(
              mainAxisSize:
                  MainAxisSize.min,
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                const Text(
                  'Seleccionar producto',
                  style: TextStyle(
                    fontSize: 21,
                    fontWeight:
                        FontWeight.bold,
                  ),
                ),
                const SizedBox(
                  height: 14,
                ),
                Flexible(
                  child:
                      ListView.builder(
                    shrinkWrap: true,
                    itemCount:
                        productosDisponibles
                            .length,
                    itemBuilder:
                        (context, index) {
                      final item =
                          productosDisponibles[
                              index];

                      final producto =
                          _productoDeInventario(
                        item,
                      );

                      if (producto ==
                          null) {
                        return const SizedBox
                            .shrink();
                      }

                      final productoId =
                          producto['id']
                                  ?.toString() ??
                              '';

                      final nombre =
                          producto['nombre']
                                  ?.toString() ??
                              'Producto sin nombre';

                      final codigo =
                          producto['codigo']
                                  ?.toString() ??
                              'Sin código';

                      final precio =
                          _numeroDecimal(
                        producto[
                            'precio'],
                      );

                      final cantidad =
                          _cantidadDisponible(
                        item,
                      );

                      return Card(
                        margin:
                            const EdgeInsets
                                .only(
                          bottom: 10,
                        ),
                        child: ListTile(
                          leading:
                              CircleAvatar(
                            child: Icon(
                              Icons
                                  .inventory_2_outlined,
                              color: Theme.of(
                                context,
                              )
                                  .colorScheme
                                  .primary,
                            ),
                          ),
                          title: Text(
                            nombre,
                            maxLines: 2,
                            overflow:
                                TextOverflow
                                    .ellipsis,
                            style:
                                const TextStyle(
                              fontWeight:
                                  FontWeight
                                      .bold,
                            ),
                          ),
                          subtitle:
                              Text(
                            'Código: $codigo\n'
                            'Precio: \$${precio.toStringAsFixed(2)}\n'
                            'Disponible: $cantidad',
                          ),
                          isThreeLine:
                              true,
                          trailing:
                              const Icon(
                            Icons
                                .chevron_right,
                          ),
                          onTap: () {
                            Navigator.of(
                              context,
                            ).pop();

                            _mostrarCantidadProducto(
                              productoId:
                                  productoId,
                              nombre:
                                  nombre,
                              precio:
                                  precio,
                              cantidadDisponible:
                                  cantidad,
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void>
      _mostrarCantidadProducto({
    required String productoId,
    required String nombre,
    required double precio,
    required int
        cantidadDisponible,
  }) async {
    final controller =
        TextEditingController(
      text: '1',
    );

    String? errorCantidad;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder:
              (context, setDialogState) {
            return AlertDialog(
              title: Text(
                nombre,
                maxLines: 2,
                overflow:
                    TextOverflow.ellipsis,
              ),
              content: Column(
                mainAxisSize:
                    MainAxisSize.min,
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    'Precio: \$${precio.toStringAsFixed(2)}',
                  ),
                  const SizedBox(
                    height: 6,
                  ),
                  Text(
                    'Disponible: $cantidadDisponible',
                  ),
                  const SizedBox(
                    height: 18,
                  ),
                  TextField(
                    controller:
                        controller,
                    keyboardType:
                        TextInputType.number,
                    decoration:
                        InputDecoration(
                      labelText:
                          'Cantidad',
                      prefixIcon:
                          const Icon(
                        Icons.numbers,
                      ),
                      border:
                          const OutlineInputBorder(),
                      errorText:
                          errorCantidad,
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.of(
                      context,
                    ).pop();
                  },
                  child:
                      const Text(
                    'Cancelar',
                  ),
                ),
                FilledButton(
                  onPressed: () {
                    final cantidad =
                        int.tryParse(
                      controller.text
                          .trim(),
                    );

                    if (cantidad ==
                            null ||
                        cantidad <=
                            0) {
                      setDialogState(() {
                        errorCantidad =
                            'Ingresa una cantidad válida.';
                      });
                      return;
                    }

                    if (cantidad >
                        cantidadDisponible) {
                      setDialogState(() {
                        errorCantidad =
                            'Solo hay $cantidadDisponible unidades disponibles.';
                      });
                      return;
                    }

                    Navigator.of(
                      context,
                    ).pop();

                    _agregarAlCarrito(
                      productoId:
                          productoId,
                      nombre: nombre,
                      precio: precio,
                      cantidad: cantidad,
                      cantidadDisponible:
                          cantidadDisponible,
                    );
                  },
                  child:
                      const Text(
                    'Agregar',
                  ),
                ),
              ],
            );
          },
        );
      },
    );

    controller.dispose();
  }

  void _agregarAlCarrito({
    required String productoId,
    required String nombre,
    required double precio,
    required int cantidad,
    required int
        cantidadDisponible,
  }) {
    final indiceExistente =
        carrito.indexWhere(
      (detalle) =>
          detalle.productoId ==
          productoId,
    );

    if (indiceExistente >= 0) {
      final detalle =
          carrito[indiceExistente];

      final nuevaCantidad =
          detalle.cantidad +
              cantidad;

      if (nuevaCantidad >
          cantidadDisponible) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(
          SnackBar(
            content: Text(
              'No puedes agregar más de $cantidadDisponible unidades de $nombre.',
            ),
          ),
        );
        return;
      }

      setState(() {
        carrito[
                indiceExistente] =
            DetalleVentaLocal(
          productoId:
              detalle.productoId,
          nombre: detalle.nombre,
          precio: detalle.precio,
          cantidad:
              nuevaCantidad,
        );
      });
    } else {
      setState(() {
        carrito.add(
          DetalleVentaLocal(
            productoId:
                productoId,
            nombre: nombre,
            precio: precio,
            cantidad: cantidad,
          ),
        );
      });
    }
  }

  Widget _carrito(
    BuildContext context,
  ) {
    if (carrito.isEmpty) {
      return Card(
        elevation: 2,
        child: Padding(
          padding:
              const EdgeInsets.all(24),
          child: Column(
            children: [
              Icon(
                Icons
                    .shopping_cart_outlined,
                size: 60,
                color: Colors.grey
                    .shade400,
              ),
              const SizedBox(
                height: 12,
              ),
              const Text(
                'No hay productos en la venta',
                textAlign:
                    TextAlign.center,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight:
                      FontWeight.bold,
                ),
              ),
              const SizedBox(
                height: 6,
              ),
              const Text(
                'Agrega uno o más productos para continuar.',
                textAlign:
                    TextAlign.center,
                style: TextStyle(
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding:
            const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Productos de la venta',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight:
                          FontWeight.bold,
                    ),
                  ),
                ),
                Text(
                  '${carrito.length}',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight:
                        FontWeight.bold,
                    color: Theme.of(
                      context,
                    )
                        .colorScheme
                        .primary,
                  ),
                ),
              ],
            ),
            const SizedBox(
              height: 12,
            ),
            const Divider(),
            ...List.generate(
              carrito.length,
              (index) {
                final detalle =
                    carrito[index];

                return Padding(
                  padding:
                      const EdgeInsets
                          .symmetric(
                    vertical: 10,
                  ),
                  child: Row(
                    crossAxisAlignment:
                        CrossAxisAlignment
                            .start,
                    children: [
                      CircleAvatar(
                        radius: 22,
                        child: Text(
                          '${detalle.cantidad}',
                          style:
                              const TextStyle(
                            fontWeight:
                                FontWeight
                                    .bold,
                          ),
                        ),
                      ),
                      const SizedBox(
                        width: 12,
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment:
                              CrossAxisAlignment
                                  .start,
                          children: [
                            Text(
                              detalle
                                  .nombre,
                              maxLines: 2,
                              overflow:
                                  TextOverflow
                                      .ellipsis,
                              style:
                                  const TextStyle(
                                fontWeight:
                                    FontWeight
                                        .bold,
                              ),
                            ),
                            const SizedBox(
                              height: 4,
                            ),
                            Text(
                              '${detalle.cantidad} × \$${detalle.precio.toStringAsFixed(2)}',
                              style:
                                  const TextStyle(
                                color: Colors
                                    .grey,
                              ),
                            ),
                            const SizedBox(
                              height: 3,
                            ),
                            Text(
                              '\$${detalle.subtotal.toStringAsFixed(2)}',
                              style: TextStyle(
                                fontWeight:
                                    FontWeight
                                        .bold,
                                color: Theme.of(
                                  context,
                                )
                                    .colorScheme
                                    .primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip:
                            'Eliminar',
                        onPressed: () {
                          setState(() {
                            carrito
                                .removeAt(
                              index,
                            );
                          });
                        },
                        icon:
                            const Icon(
                          Icons
                              .delete_outline,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _resumenVenta(
    BuildContext context,
  ) {
    return Card(
      elevation: 2,
      child: Padding(
        padding:
            const EdgeInsets.all(18),
        child: Column(
          children: [
            _filaResumen(
              'Subtotal',
              subtotal,
            ),
            const SizedBox(
              height: 10,
            ),
            _filaResumen(
              'Descuento',
              0,
            ),
            const Divider(
              height: 26,
            ),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Total',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight:
                          FontWeight.bold,
                    ),
                  ),
                ),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 23,
                    fontWeight:
                        FontWeight.bold,
                    color: Theme.of(
                      context,
                    )
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

  Widget _filaResumen(
    String titulo,
    double valor,
  ) {
    return Row(
      children: [
        Expanded(
          child: Text(
            titulo,
            style:
                const TextStyle(
              color: Colors.grey,
            ),
          ),
        ),
        Text(
          '\$${valor.toStringAsFixed(2)}',
          style:
              const TextStyle(
            fontWeight:
                FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _botonRegistrarVenta(
    BuildContext context,
  ) {
    final puedeRegistrar =
        clienteSeleccionadoId != null &&
            rutaSeleccionadaId != null &&
            carrito.isNotEmpty &&
            !registrandoVenta;

    return SizedBox(
      width: double.infinity,
      height: 54,
      child: FilledButton.icon(
        onPressed:
            puedeRegistrar
                ? registrarVenta
                : null,
        icon: registrandoVenta
            ? const SizedBox(
                width: 22,
                height: 22,
                child:
                    CircularProgressIndicator(
                  strokeWidth: 2,
                ),
              )
            : const Icon(
                Icons
                    .check_circle_outline,
              ),
        label: Text(
          registrandoVenta
              ? 'Registrando venta...'
              : 'Registrar venta',
          style:
              const TextStyle(
            fontSize: 16,
            fontWeight:
                FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Future<void> registrarVenta() async {
    if (clienteSeleccionadoId ==
        null) {
      _mostrarMensaje(
        'Selecciona un cliente.',
        esError: true,
      );
      return;
    }

    if (rutaSeleccionadaId ==
        null) {
      _mostrarMensaje(
        'No se encontró una ruta abierta.',
        esError: true,
      );
      return;
    }

    if (carrito.isEmpty) {
      _mostrarMensaje(
        'Agrega al menos un producto.',
        esError: true,
      );
      return;
    }

    setState(() {
      registrandoVenta = true;
    });

    try {
      final datos =
          await ventasService.registrarVenta(
        accessToken:
            widget.accessToken,
        clienteId:
            clienteSeleccionadoId!,
        rutaId:
            rutaSeleccionadaId!,
        detalles:
            List<DetalleVentaLocal>.from(
          carrito,
        ),
      );

      final resultado =
          _extraerResultadoVenta(
        datos,
      );

      final numeroVenta =
          resultado['numero_venta']
                  ?.toString() ??
              'N/A';

      final totalVenta =
          _numeroDecimal(
        resultado['total'],
      );

      final saldoPendiente =
          _numeroDecimal(
        resultado[
            'saldo_pendiente'],
      );

      if (!mounted) {
        return;
      }

      setState(() {
        carrito.clear();
      });

      // Actualiza inmediatamente el inventario
      // que está en PantallaPrincipal.
      if (widget.onVentaRegistrada !=
          null) {
        await widget
            .onVentaRegistrada!();
      }

      await _mostrarVentaRegistrada(
        numeroVenta: numeroVenta,
        total: totalVenta,
        saldoPendiente:
            saldoPendiente,
      );

      // Actualiza también los datos de
      // esta pantalla para futuras ventas.
      await cargarDatosVenta();
    } catch (e) {
      if (!mounted) {
        return;
      }

      _mostrarMensaje(
        e.toString().replaceFirst(
              'Exception: ',
              '',
            ),
        esError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          registrandoVenta = false;
        });
      }
    }
  }

  Map<String, dynamic>
      _extraerResultadoVenta(
    dynamic datos,
  ) {
    if (datos is Map) {
      final venta = datos['venta'];

      if (venta is Map) {
        return Map<String, dynamic>.from(
          venta,
        );
      }

      return Map<String, dynamic>.from(
        datos,
      );
    }

    return <String, dynamic>{};
  }

  Future<void>
      _mostrarVentaRegistrada({
    required String numeroVenta,
    required double total,
    required double
        saldoPendiente,
  }) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          icon: Icon(
            Icons.check_circle,
            size: 55,
            color:
                Colors.green.shade600,
          ),
          title: const Text(
            'Venta registrada',
            textAlign:
                TextAlign.center,
          ),
          content: Column(
            mainAxisSize:
                MainAxisSize.min,
            children: [
              Text(
                'Venta #$numeroVenta',
                style:
                    const TextStyle(
                  fontSize: 20,
                  fontWeight:
                      FontWeight.bold,
                ),
              ),
              const SizedBox(
                height: 16,
              ),
              _filaDialogo(
                'Total',
                '\$${total.toStringAsFixed(2)}',
              ),
              const SizedBox(
                height: 8,
              ),
              _filaDialogo(
                'Pagado',
                '\$0.00',
              ),
              const SizedBox(
                height: 8,
              ),
              _filaDialogo(
                'Saldo pendiente',
                '\$${saldoPendiente.toStringAsFixed(2)}',
              ),
            ],
          ),
          actions: [
            FilledButton(
              onPressed: () {
                Navigator.of(
                  context,
                ).pop();
              },
              child:
                  const Text('Aceptar'),
            ),
          ],
        );
      },
    );
  }

  Widget _filaDialogo(
    String titulo,
    String valor,
  ) {
    return Row(
      children: [
        Expanded(
          child: Text(
            titulo,
            style:
                const TextStyle(
              color: Colors.grey,
            ),
          ),
        ),
        Text(
          valor,
          style:
              const TextStyle(
            fontWeight:
                FontWeight.bold,
          ),
        ),
      ],
    );
  }

  void _mostrarMensaje(
    String mensaje, {
    required bool esError,
  }) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(
      SnackBar(
        content: Text(mensaje),
        backgroundColor:
            esError
                ? Colors.red.shade700
                : null,
      ),
    );
  }
}