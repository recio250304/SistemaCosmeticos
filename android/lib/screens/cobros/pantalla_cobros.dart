import 'package:flutter/material.dart';

import '../../services/cobros_service.dart';

class PantallaCobros extends StatefulWidget {
  final String accessToken;
  final Map<String, dynamic>? clienteInicial;

  const PantallaCobros({
    super.key,
    required this.accessToken,
    this.clienteInicial,
  });

  @override
  State<PantallaCobros> createState() =>
      _PantallaCobrosState();
}

class _PantallaCobrosState extends State<PantallaCobros> {
  final CobrosService cobrosService = CobrosService();

  bool cargando = true;
  String error = '';

  List<dynamic> cuentas = [];
  List<dynamic> cuentasBancarias = [];

  Map<String, dynamic>? clienteSeleccionado;

  @override
  void initState() {
    super.initState();

    clienteSeleccionado = widget.clienteInicial;

    cargarCuentas();
  }

  Future<void> cargarCuentas() async {
    if (!mounted) {
      return;
    }

    setState(() {
      cargando = true;
      error = '';
    });

    try {
      final resultados = await Future.wait([
        cobrosService.obtenerCuentasPendientes(
          widget.accessToken,
        ),
        cobrosService.obtenerCuentasBancariasParaCobro(
          widget.accessToken,
        ),
      ]);

      final datosCuentas = resultados[0];
      final datosBancos = resultados[1];

      final cuentasRespuesta = datosCuentas['cuentas'];
      final bancosRespuesta = datosBancos['cuentas'];

      final nuevasCuentas = <dynamic>[];

      if (cuentasRespuesta is List) {
        for (final item in cuentasRespuesta) {
          if (item is! Map) {
            continue;
          }

          final cuenta =
              Map<String, dynamic>.from(item);

          final saldo =
              _numero(cuenta['saldo_pendiente']);

          if (saldo > 0) {
            nuevasCuentas.add(cuenta);
          }
        }
      }

      final nuevasCuentasBancarias =
          bancosRespuesta is List
              ? bancosRespuesta
              : <dynamic>[];

      if (!mounted) {
        return;
      }

      setState(() {
        cuentas = nuevasCuentas;
        cuentasBancarias = nuevasCuentasBancarias;
      });
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        error = _mensajeError(e);
      });
    } finally {
      if (mounted) {
        setState(() {
          cargando = false;
        });
      }
    }
  }

  double _numero(dynamic valor) {
    if (valor is num) {
      return valor.toDouble();
    }

    return double.tryParse(
          valor?.toString().replaceAll(',', '.') ?? '',
        ) ??
        0;
  }

  Map<String, dynamic>? _convertirMapa(
    dynamic valor,
  ) {
    if (valor is Map<String, dynamic>) {
      return valor;
    }

    if (valor is Map) {
      return Map<String, dynamic>.from(valor);
    }

    if (valor is List && valor.isNotEmpty) {
      final primero = valor.first;

      if (primero is Map<String, dynamic>) {
        return primero;
      }

      if (primero is Map) {
        return Map<String, dynamic>.from(primero);
      }
    }

    return null;
  }

  Map<String, dynamic>? _obtenerCliente(
    dynamic cuenta,
  ) {
    if (cuenta is! Map) {
      return null;
    }

    final clienteDirecto =
        _convertirMapa(cuenta['clientes']);

    if (clienteDirecto != null) {
      return clienteDirecto;
    }

    final clienteSingular =
        _convertirMapa(cuenta['cliente']);

    if (clienteSingular != null) {
      return clienteSingular;
    }

    return null;
  }

  Map<String, dynamic>? _obtenerVenta(
    dynamic cuenta,
  ) {
    if (cuenta is! Map) {
      return null;
    }

    final ventaDirecta =
        _convertirMapa(cuenta['ventas']);

    if (ventaDirecta != null) {
      return ventaDirecta;
    }

    final ventaSingular =
        _convertirMapa(cuenta['venta']);

    if (ventaSingular != null) {
      return ventaSingular;
    }

    return null;
  }

  List<Map<String, dynamic>> get clientesConDeuda {
    final resultado =
        <String, Map<String, dynamic>>{};

    for (final item in cuentas) {
      if (item is! Map) {
        continue;
      }

      final cuenta =
          Map<String, dynamic>.from(item);

      final cliente =
          _obtenerCliente(cuenta);

      if (cliente == null) {
        continue;
      }

      final id =
          cliente['id']?.toString();

      if (id == null || id.isEmpty) {
        continue;
      }

      resultado[id] = cliente;
    }

    return resultado.values.toList();
  }

  List<dynamic> get cuentasDelCliente {
    if (clienteSeleccionado == null) {
      return [];
    }

    final clienteId =
        clienteSeleccionado!['id']
            ?.toString()
            .trim();

    if (clienteId == null || clienteId.isEmpty) {
      return [];
    }

    return cuentas.where((item) {
      if (item is! Map) {
        return false;
      }

      final cuenta =
          Map<String, dynamic>.from(item);

      final clienteRelacionado =
          _obtenerCliente(cuenta);

      final clienteRelacionadoId =
          clienteRelacionado?['id']
              ?.toString()
              .trim();

      if (clienteRelacionadoId == clienteId) {
        return true;
      }

      final clienteIdDirecto =
          cuenta['cliente_id']
              ?.toString()
              .trim();

      return clienteIdDirecto == clienteId;
    }).toList();
  }

  String _nombreCliente(
    Map<String, dynamic> cliente,
  ) {
    return cliente['nombre_negocio']?.toString() ??
        cliente['nombre']?.toString() ??
        'Cliente';
  }

  String _formatearMonto(double monto) {
    return '\$${monto.toStringAsFixed(2)}';
  }

  double _deudaCliente() {
    double total = 0;

    for (final item in cuentasDelCliente) {
      if (item is Map) {
        total += _numero(
          item['saldo_pendiente'],
        );
      }
    }

    return total;
  }

  Future<void> _registrarCobro(
    Map<String, dynamic> cuenta,
  ) async {
    final venta = _obtenerVenta(cuenta);

    String? ventaId;

    final ventaIdDirecto =
        cuenta['venta_id']?.toString().trim();

    if (ventaIdDirecto != null &&
        ventaIdDirecto.isNotEmpty) {
      ventaId = ventaIdDirecto;
    } else {
      final ventaIdRelacionado =
          venta?['id']?.toString().trim();

      if (ventaIdRelacionado != null &&
          ventaIdRelacionado.isNotEmpty) {
        ventaId = ventaIdRelacionado;
      }
    }

    if (ventaId == null || ventaId.isEmpty) {
      _mostrarMensaje(
        'No se pudo identificar el ID de la venta.',
        esError: true,
      );
      return;
    }

    final saldo =
        _numero(cuenta['saldo_pendiente']);

    if (saldo <= 0) {
      _mostrarMensaje(
        'Esta cuenta no tiene saldo pendiente.',
        esError: true,
      );
      return;
    }

    final resultado =
        await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return _FormularioCobro(
          accessToken: widget.accessToken,
          ventaId: ventaId!,
          saldoPendiente: saldo,
          cuentasBancarias: cuentasBancarias,
          cobrosService: cobrosService,
        );
      },
    );

    if (resultado == true) {
      await cargarCuentas();

      if (!mounted) {
        return;
      }

      _mostrarMensaje(
        'Cobro registrado correctamente.',
      );
    }
  }

  void _volverAClientes() {
    setState(() {
      clienteSeleccionado = null;
    });
  }

  String _mensajeError(Object error) {
    return error
        .toString()
        .replaceFirst('Exception: ', '');
  }

  void _mostrarMensaje(
    String mensaje, {
    bool esError = false,
  }) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(mensaje),
          backgroundColor:
              esError ? Colors.red : null,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          clienteSeleccionado == null
              ? 'Cobros'
              : _nombreCliente(
                  clienteSeleccionado!,
                ),
        ),
        leading: clienteSeleccionado != null
            ? IconButton(
                onPressed: _volverAClientes,
                icon: const Icon(
                  Icons.arrow_back,
                ),
              )
            : null,
        actions: [
          IconButton(
            onPressed:
                cargando ? null : cargarCuentas,
            icon: const Icon(
              Icons.refresh,
            ),
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _construirContenido(),
    );
  }

  Widget _construirContenido() {
    if (cargando && cuentas.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (error.isNotEmpty && cuentas.isEmpty) {
      return RefreshIndicator(
        onRefresh: cargarCuentas,
        child: ListView(
          physics:
              const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 100),
            const Icon(
              Icons.error_outline,
              size: 60,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 20),
            Center(
              child: ElevatedButton.icon(
                onPressed: cargarCuentas,
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

    if (clienteSeleccionado != null) {
      return _construirCuentasCliente();
    }

    return _construirListaClientes();
  }

  Widget _construirListaClientes() {
    final clientes = clientesConDeuda;

    if (clientes.isEmpty) {
      return RefreshIndicator(
        onRefresh: cargarCuentas,
        child: ListView(
          physics:
              const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 100),
            const Icon(
              Icons.account_balance_wallet_outlined,
              size: 70,
              color: Colors.grey,
            ),
            const SizedBox(height: 18),
            const Text(
              'No hay cuentas pendientes',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Actualmente no hay clientes con deuda pendiente.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: cargarCuentas,
      child: ListView.builder(
        physics:
            const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: clientes.length,
        itemBuilder: (context, index) {
          final cliente = clientes[index];

          final nombre =
              _nombreCliente(cliente);

          double deuda = 0;

          for (final item in cuentas) {
            if (item is! Map) {
              continue;
            }

            final cuenta =
                Map<String, dynamic>.from(item);

            final cuentaCliente =
                _obtenerCliente(cuenta);

            final pertenece =
                cuenta['cliente_id']?.toString() ==
                        cliente['id']?.toString() ||
                    cuentaCliente?['id']?.toString() ==
                        cliente['id']?.toString();

            if (pertenece) {
              deuda += _numero(
                cuenta['saldo_pendiente'],
              );
            }
          }

          final tipo =
              cliente['tipo']?.toString() ?? '';

          return Card(
            margin:
                const EdgeInsets.only(bottom: 12),
            child: InkWell(
              borderRadius:
                  BorderRadius.circular(12),
              onTap: () {
                setState(() {
                  clienteSeleccionado =
                      cliente;
                });
              },
              child: Padding(
                padding:
                    const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 27,
                      child: Icon(
                        tipo == 'BARBERIA'
                            ? Icons.content_cut
                            : Icons.storefront,
                      ),
                    ),
                    const SizedBox(width: 14),
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
                            style:
                                const TextStyle(
                              fontSize: 17,
                              fontWeight:
                                  FontWeight.bold,
                            ),
                          ),
                          if (tipo.isNotEmpty)
                            Padding(
                              padding:
                                  const EdgeInsets.only(
                                top: 4,
                              ),
                              child: Text(
                                tipo,
                                style: TextStyle(
                                  color:
                                      Theme.of(
                                    context,
                                  )
                                      .colorScheme
                                      .primary,
                                  fontSize: 12,
                                  fontWeight:
                                      FontWeight.bold,
                                ),
                              ),
                            ),
                          const SizedBox(height: 7),
                          Text(
                            'Saldo pendiente: ${_formatearMonto(deuda)}',
                            style:
                                const TextStyle(
                              fontWeight:
                                  FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _construirCuentasCliente() {
    final cliente =
        clienteSeleccionado!;

    final nombre =
        _nombreCliente(cliente);

    final cuentasCliente =
        cuentasDelCliente;

    final deuda =
        _deudaCliente();

    if (cuentasCliente.isEmpty) {
      return RefreshIndicator(
        onRefresh: cargarCuentas,
        child: ListView(
          physics:
              const AlwaysScrollableScrollPhysics(),
          padding:
              const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 80),
            const Icon(
              Icons.check_circle_outline,
              size: 70,
              color: Colors.green,
            ),
            const SizedBox(height: 18),
            Text(
              nombre,
              textAlign: TextAlign.center,
              style:
                  const TextStyle(
                fontSize: 20,
                fontWeight:
                    FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Este cliente no tiene cuentas pendientes.',
              textAlign: TextAlign.center,
              style:
                  TextStyle(
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: cargarCuentas,
      child: ListView(
        physics:
            const AlwaysScrollableScrollPhysics(),
        padding:
            const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding:
                  const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        radius: 27,
                        child: Icon(
                          Icons.person,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          nombre,
                          style:
                              const TextStyle(
                            fontSize: 19,
                            fontWeight:
                                FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Deuda total',
                    style:
                        TextStyle(
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatearMonto(deuda),
                    style:
                        const TextStyle(
                      fontSize: 28,
                      fontWeight:
                          FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Cuentas pendientes',
            style:
                TextStyle(
              fontSize: 18,
              fontWeight:
                  FontWeight.bold,
            ),
          ),
          const SizedBox(height: 10),
          ...cuentasCliente.map(
            (cuenta) =>
                _construirCuenta(cuenta),
          ),
        ],
      ),
    );
  }

  Widget _construirCuenta(
    dynamic valor,
  ) {
    if (valor is! Map) {
      return const SizedBox.shrink();
    }

    final cuenta =
        Map<String, dynamic>.from(valor);

    final venta =
        _obtenerVenta(cuenta);

    final numeroVenta =
        venta?['numero_venta']?.toString() ??
            cuenta['numero_venta']?.toString() ??
            'N/A';

    final totalCuenta =
        _numero(cuenta['monto_total']);

    final totalVenta =
        _numero(venta?['total']);

    final total =
        totalCuenta > 0
            ? totalCuenta
            : totalVenta;

    final pagado =
        _numero(cuenta['monto_pagado']);

    final saldo =
        _numero(cuenta['saldo_pendiente']);

    final fechaVencimiento =
        cuenta['fecha_vencimiento']
                ?.toString() ??
            venta?['fecha_proximo_pago']
                ?.toString();

    return Card(
      margin:
          const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding:
            const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.receipt_long_outlined,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Venta #$numeroVenta',
                    style:
                        const TextStyle(
                      fontSize: 17,
                      fontWeight:
                          FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _filaMonto(
              'Total',
              total,
            ),
            const SizedBox(height: 6),
            _filaMonto(
              'Pagado',
              pagado,
            ),
            const Divider(
              height: 20,
            ),
            _filaMonto(
              'Saldo pendiente',
              saldo,
              destacado: true,
            ),
            if (fechaVencimiento != null &&
                fechaVencimiento.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(
                    Icons.calendar_today_outlined,
                    size: 18,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Vencimiento: ${_formatearFecha(fechaVencimiento)}',
                      style:
                          const TextStyle(
                        color: Colors.grey,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: saldo > 0
                    ? () => _registrarCobro(
                          cuenta,
                        )
                    : null,
                icon: const Icon(
                  Icons.payments_outlined,
                ),
                label: const Text(
                  'Registrar cobro',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filaMonto(
    String titulo,
    double monto, {
    bool destacado = false,
  }) {
    return Row(
      mainAxisAlignment:
          MainAxisAlignment.spaceBetween,
      children: [
        Text(
          titulo,
          style: TextStyle(
            fontWeight: destacado
                ? FontWeight.bold
                : FontWeight.normal,
            fontSize:
                destacado ? 16 : 14,
          ),
        ),
        Text(
          _formatearMonto(monto),
          style: TextStyle(
            fontWeight:
                FontWeight.bold,
            fontSize:
                destacado ? 18 : 15,
          ),
        ),
      ],
    );
  }

  String _formatearFecha(
    String fecha,
  ) {
    try {
      final fechaDate =
          DateTime.parse(fecha).toLocal();

      return '${fechaDate.day.toString().padLeft(2, '0')}/'
          '${fechaDate.month.toString().padLeft(2, '0')}/'
          '${fechaDate.year}';
    } catch (_) {
      return fecha;
    }
  }
}

class _FormularioCobro extends StatefulWidget {
  final String accessToken;
  final String ventaId;
  final double saldoPendiente;
  final List<dynamic> cuentasBancarias;
  final CobrosService cobrosService;

  const _FormularioCobro({
    required this.accessToken,
    required this.ventaId,
    required this.saldoPendiente,
    required this.cuentasBancarias,
    required this.cobrosService,
  });

  @override
  State<_FormularioCobro> createState() =>
      _FormularioCobroState();
}

class _FormularioCobroState
    extends State<_FormularioCobro> {
  final TextEditingController montoController =
      TextEditingController();

  final TextEditingController referenciaController =
      TextEditingController();

  final TextEditingController observacionesController =
      TextEditingController();

  String medioPago = 'EFECTIVO';

  String? cuentaBancariaId;

  bool guardando = false;

  @override
  void initState() {
    super.initState();

    montoController.text =
        widget.saldoPendiente.toStringAsFixed(2);
  }

  @override
  void dispose() {
    montoController.dispose();
    referenciaController.dispose();
    observacionesController.dispose();

    super.dispose();
  }

  double _numero(dynamic valor) {
    if (valor is num) {
      return valor.toDouble();
    }

    return double.tryParse(
          valor?.toString().replaceAll(',', '.') ?? '',
        ) ??
        0;
  }

  Future<void> guardar() async {
    if (guardando) {
      return;
    }

    final monto =
        _numero(
      montoController.text.trim(),
    );

    if (monto <= 0) {
      _mostrarError(
        'El monto debe ser mayor que cero.',
      );
      return;
    }

    if (monto > widget.saldoPendiente) {
      _mostrarError(
        'El monto no puede superar el saldo pendiente.',
      );
      return;
    }

    if (medioPago != 'EFECTIVO' &&
        (cuentaBancariaId == null ||
            cuentaBancariaId!.isEmpty)) {
      _mostrarError(
        'Selecciona la cuenta bancaria.',
      );
      return;
    }

    setState(() {
      guardando = true;
    });

    try {
      await widget.cobrosService.registrarCobro(
        accessToken: widget.accessToken,
        ventaId: widget.ventaId,
        monto: monto,
        medioPago: medioPago,
        cuentaBancariaId:
            medioPago == 'EFECTIVO'
                ? null
                : cuentaBancariaId,
        referencia:
            referenciaController.text.trim(),
        observaciones:
            observacionesController.text.trim(),
      );

      if (!mounted) {
        return;
      }

      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        guardando = false;
      });

      _mostrarError(
        e.toString().replaceFirst(
              'Exception: ',
              '',
            ),
      );
    }
  }

  void _mostrarError(
    String mensaje,
  ) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(mensaje),
          backgroundColor: Colors.red,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final requiereBanco =
        medioPago != 'EFECTIVO';

    final itemsBancarios =
        widget.cuentasBancarias
            .map<DropdownMenuItem<String>?>(
      (cuenta) {
        if (cuenta is! Map) {
          return null;
        }

        final id =
            cuenta['id']?.toString();

        if (id == null || id.isEmpty) {
          return null;
        }

        final banco =
            cuenta['banco']?.toString() ?? '';

        final numero =
            cuenta['numero_cuenta']?.toString() ??
                '';

        final nombre =
            cuenta['nombre']?.toString() ??
                'Cuenta bancaria';

        final texto = [
          nombre,
          if (banco.isNotEmpty) banco,
          if (numero.isNotEmpty) numero,
        ].join(' - ');

        return DropdownMenuItem<String>(
          value: id,
          child: Text(
            texto,
            overflow:
                TextOverflow.ellipsis,
          ),
        );
      },
    ).whereType<DropdownMenuItem<String>>().toList();

    final bancoSeleccionadoValido =
        itemsBancarios.any(
      (item) =>
          item.value == cuentaBancariaId,
    );

    return SafeArea(
      child: Container(
        decoration: BoxDecoration(
          color:
              Theme.of(context)
                  .scaffoldBackgroundColor,
          borderRadius:
              const BorderRadius.vertical(
            top: Radius.circular(22),
          ),
        ),
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom:
              MediaQuery.of(context)
                      .viewInsets
                      .bottom +
                  20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize:
                MainAxisSize.min,
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 45,
                  height: 5,
                  decoration:
                      BoxDecoration(
                    color:
                        Colors.grey.shade400,
                    borderRadius:
                        BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Registrar cobro',
                style:
                    TextStyle(
                  fontSize: 22,
                  fontWeight:
                      FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Saldo pendiente: \$${widget.saldoPendiente.toStringAsFixed(2)}',
                style:
                    const TextStyle(
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller:
                    montoController,
                keyboardType:
                    const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration:
                    const InputDecoration(
                  labelText:
                      'Monto a cobrar',
                  prefixText: '\$ ',
                  border:
                      OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: medioPago,
                decoration:
                    const InputDecoration(
                  labelText:
                      'Medio de pago',
                  border:
                      OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'EFECTIVO',
                    child:
                        Text('Efectivo'),
                  ),
                  DropdownMenuItem(
                    value: 'TRANSFERENCIA',
                    child:
                        Text('Transferencia'),
                  ),
                  DropdownMenuItem(
                    value: 'TARJETA',
                    child:
                        Text('Tarjeta'),
                  ),
                ],
                onChanged: guardando
                    ? null
                    : (valor) {
                        if (valor == null) {
                          return;
                        }

                        setState(() {
                          medioPago = valor;

                          if (valor ==
                              'EFECTIVO') {
                            cuentaBancariaId =
                                null;
                          }
                        });
                      },
              ),
              if (requiereBanco) ...[
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue:
                      bancoSeleccionadoValido
                          ? cuentaBancariaId
                          : null,
                  decoration:
                      const InputDecoration(
                    labelText:
                        'Cuenta bancaria',
                    border:
                        OutlineInputBorder(),
                  ),
                  items:
                      itemsBancarios,
                  onChanged: guardando
                      ? null
                      : (valor) {
                          setState(() {
                            cuentaBancariaId =
                                valor;
                          });
                        },
                ),
              ],
              const SizedBox(height: 14),
              TextField(
                controller:
                    referenciaController,
                decoration:
                    const InputDecoration(
                  labelText:
                      'Referencia (opcional)',
                  border:
                      OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller:
                    observacionesController,
                maxLines: 3,
                decoration:
                    const InputDecoration(
                  labelText:
                      'Observaciones (opcional)',
                  border:
                      OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed:
                      guardando
                          ? null
                          : guardar,
                  icon: guardando
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child:
                              CircularProgressIndicator(
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(
                          Icons.check,
                        ),
                  label: Text(
                    guardando
                        ? 'Registrando...'
                        : 'Confirmar cobro',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}