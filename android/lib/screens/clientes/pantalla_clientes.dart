import 'package:flutter/material.dart';

import '../../services/clientes_service.dart';
import '../cobros/pantalla_cobros.dart';

class PantallaClientes extends StatefulWidget {
  final String accessToken;

  const PantallaClientes({
    super.key,
    required this.accessToken,
  });

  @override
  State<PantallaClientes> createState() =>
      _PantallaClientesState();
}

class _PantallaClientesState extends State<PantallaClientes> {
  final ClientesService clientesService = ClientesService();

  bool cargando = true;
  bool comprobandoDeuda = false;

  String error = '';

  List<dynamic> clientes = [];
  List<dynamic> rutas = [];

  @override
  void initState() {
    super.initState();
    cargarClientes();
  }

  Future<void> cargarClientes() async {
    if (!mounted) {
      return;
    }

    setState(() {
      cargando = true;
      error = '';
    });

    try {
      final datos = await clientesService.obtenerMisClientes(
        widget.accessToken,
      );

      final clientesRespuesta = datos['clientes'];
      final rutasRespuesta = datos['rutas'];

      final nuevosClientes = clientesRespuesta is List
          ? clientesRespuesta
          : <dynamic>[];

      final nuevasRutas = rutasRespuesta is List
          ? rutasRespuesta
          : <dynamic>[];

      if (!mounted) {
        return;
      }

      setState(() {
        clientes = nuevosClientes;
        rutas = nuevasRutas;
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

  Future<void> _seleccionarCliente(
    Map<String, dynamic> cliente,
  ) async {
    if (comprobandoDeuda) {
      return;
    }

    final clienteId = cliente['id']?.toString().trim() ?? '';

    if (clienteId.isEmpty) {
      _mostrarError('El cliente no tiene un ID válido.');
      return;
    }

    if (!mounted) {
      return;
    }

    setState(() {
      comprobandoDeuda = true;
    });

    try {
      final datos =
          await clientesService.obtenerCuentasPendientes(
        widget.accessToken,
      );

      final lista = datos['cuentas'];

      final cuentasCliente = <Map<String, dynamic>>[];

      if (lista is List) {
        for (final item in lista) {
          if (item is! Map) {
            continue;
          }

          final cuenta = Map<String, dynamic>.from(item);

          if (_cuentaPerteneceAlCliente(
            cuenta,
            clienteId,
          )) {
            final saldo = _numero(
              cuenta['saldo_pendiente'],
            );

            if (saldo > 0) {
              cuentasCliente.add(cuenta);
            }
          }
        }
      }

      if (!mounted) {
        return;
      }

      if (cuentasCliente.isNotEmpty) {
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) {
              return PantallaCobros(
                accessToken: widget.accessToken,
                clienteInicial: cliente,
              );
            },
          ),
        );

        return;
      }

      _mostrarMensaje(
        '${cliente['nombre_negocio']?.toString() ?? 'Este cliente'} no tiene cuentas pendientes.',
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      _mostrarError(_mensajeError(e));
    } finally {
      if (mounted) {
        setState(() {
          comprobandoDeuda = false;
        });
      }
    }
  }

  bool _cuentaPerteneceAlCliente(
    Map<String, dynamic> cuenta,
    String clienteId,
  ) {
    final clienteIdDirecto =
        cuenta['cliente_id']?.toString().trim() ?? '';

    if (clienteIdDirecto == clienteId) {
      return true;
    }

    final cliente =
        _convertirMapa(cuenta['clientes']);

    final clienteRelacionadoId =
        cliente?['id']?.toString().trim() ?? '';

    if (clienteRelacionadoId == clienteId) {
      return true;
    }

    return false;
  }

  Map<String, dynamic>? _convertirMapa(dynamic valor) {
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

  double _numero(dynamic valor) {
    if (valor is num) {
      return valor.toDouble();
    }

    return double.tryParse(
          valor?.toString().replaceAll(',', '.') ?? '',
        ) ??
        0;
  }

  String _mensajeError(Object error) {
    return error
        .toString()
        .replaceFirst('Exception: ', '');
  }

  void _mostrarMensaje(String mensaje) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(mensaje),
        ),
      );
  }

  void _mostrarError(String mensaje) {
    if (!mounted) {
      return;
    }

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
    if (cargando) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (error.isNotEmpty) {
      return RefreshIndicator(
        onRefresh: cargarClientes,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
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
                onPressed: cargarClientes,
                icon: const Icon(Icons.refresh),
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
        onRefresh: cargarClientes,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 100),
            const Icon(
              Icons.people_outline,
              size: 70,
              color: Colors.grey,
            ),
            const SizedBox(height: 18),
            const Text(
              'No hay clientes asignados',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Actualmente no tienes clientes asignados a una ruta abierta.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: cargarClientes,
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: clientes.length,
            itemBuilder: (context, index) {
              final cliente = clientes[index];

              if (cliente is! Map) {
                return const SizedBox.shrink();
              }

              final clienteMap =
                  Map<String, dynamic>.from(cliente);

              final nombreNegocio =
                  clienteMap['nombre_negocio']?.toString() ??
                      'Sin nombre';

              final tipo =
                  clienteMap['tipo']?.toString() ?? '';

              final contacto =
                  clienteMap['nombre_contacto']?.toString() ??
                      '';

              final telefono =
                  clienteMap['telefono']?.toString() ?? '';

              final direccion =
                  clienteMap['direccion']?.toString() ?? '';

              return Card(
                margin: const EdgeInsets.only(
                  bottom: 12,
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: comprobandoDeuda
                      ? null
                      : () => _seleccionarCliente(
                            clienteMap,
                          ),
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
                              child: Icon(
                                tipo == 'BARBERIA'
                                    ? Icons.content_cut
                                    : Icons.storefront,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    nombreNegocio,
                                    maxLines: 2,
                                    overflow:
                                        TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 18,
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
                                          color: Theme.of(
                                            context,
                                          )
                                              .colorScheme
                                              .primary,
                                          fontWeight:
                                              FontWeight.bold,
                                          fontSize: 12,
                                        ),
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
                        if (contacto.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          _datoCliente(
                            Icons.person_outline,
                            contacto,
                          ),
                        ],
                        if (telefono.isNotEmpty) ...[
                          const SizedBox(height: 7),
                          _datoCliente(
                            Icons.phone_outlined,
                            telefono,
                          ),
                        ],
                        if (direccion.isNotEmpty) ...[
                          const SizedBox(height: 7),
                          _datoCliente(
                            Icons.location_on_outlined,
                            direccion,
                          ),
                        ],
                        const SizedBox(height: 12),
                        const Row(
                          children: [
                            Icon(
                              Icons.account_balance_wallet_outlined,
                              size: 18,
                            ),
                            SizedBox(width: 7),
                            Text(
                              'Toca para consultar deuda',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        if (comprobandoDeuda)
          Container(
            color: Colors.black.withValues(
              alpha: 0.15,
            ),
            child: const Center(
              child: Card(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 14),
                      Text(
                        'Consultando cuenta...',
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _datoCliente(
    IconData icono,
    String texto,
  ) {
    return Row(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        Icon(
          icono,
          size: 19,
          color: Colors.grey,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            texto,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}