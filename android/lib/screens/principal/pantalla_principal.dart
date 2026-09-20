import 'package:flutter/material.dart';

import '../cobros/pantalla_cobros.dart';
import '../clientes/pantalla_clientes.dart';
import '../dashboard/pantalla_dashboard.dart';
import '../inventario/pantalla_inventario.dart';
import '../login/pantalla_login.dart';
import '../ventas/pantalla_ventas.dart';

class PantallaPrincipal extends StatefulWidget {
  final Map<String, dynamic> usuario;
  final String accessToken;

  const PantallaPrincipal({
    super.key,
    required this.usuario,
    required this.accessToken,
  });

  @override
  State<PantallaPrincipal> createState() =>
      _PantallaPrincipalState();
}

class _PantallaPrincipalState
    extends State<PantallaPrincipal> {
  int paginaActual = 0;

  late final GlobalKey<PantallaInventarioState>
      inventarioKey;

  @override
  void initState() {
    super.initState();

    inventarioKey =
        GlobalKey<PantallaInventarioState>();
  }

  String get nombreUsuario =>
      widget.usuario['nombre_completo']
          ?.toString() ??
      'Operador';

  String get usuario =>
      widget.usuario['usuario']
          ?.toString() ??
      '';

  Future<void>
      _refrescarInventario() async {
    await inventarioKey.currentState
        ?.cargarInventario();
  }

  @override
  Widget build(BuildContext context) {
    final paginas = [
      PantallaDashboard(
        usuario: widget.usuario,
        onNavegar: _navegarA,
      ),
      PantallaClientes(
        accessToken:
            widget.accessToken,
      ),
      PantallaInventario(
        key: inventarioKey,
        accessToken:
            widget.accessToken,
      ),
      PantallaVentas(
        accessToken:
            widget.accessToken,
        onVentaRegistrada:
            _refrescarInventario,
      ),
      PantallaCobros(
      accessToken: widget.accessToken,
    )
    ];

    return PopScope(
      canPop: paginaActual == 0,
      onPopInvokedWithResult: (
        didPop,
        result,
      ) {
        if (didPop) {
          return;
        }

        if (paginaActual != 0) {
          setState(() {
            paginaActual = 0;
          });
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            paginas[paginaActual]
                    is PantallaDashboard
                ? 'Inicio'
                : _tituloPagina(
                    paginaActual,
                  ),
          ),
        ),
        drawer: Drawer(
          child: SafeArea(
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.fromLTRB(
                    20,
                    24,
                    20,
                    22,
                  ),
                  decoration:
                      BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .primaryContainer,
                  ),
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      const CircleAvatar(
                        radius: 30,
                        child: Icon(
                          Icons.person,
                          size: 34,
                        ),
                      ),
                      const SizedBox(
                        height: 12,
                      ),
                      Text(
                        nombreUsuario,
                        maxLines: 1,
                        overflow:
                            TextOverflow.ellipsis,
                        style:
                            const TextStyle(
                          fontSize: 18,
                          fontWeight:
                              FontWeight.bold,
                        ),
                      ),
                      const SizedBox(
                        height: 4,
                      ),
                      Text(
                        usuario,
                        maxLines: 1,
                        overflow:
                            TextOverflow.ellipsis,
                        style:
                            const TextStyle(
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(
                        height: 3,
                      ),
                      const Text(
                        'OPERADOR',
                        style:
                            TextStyle(
                          fontSize: 12,
                          fontWeight:
                              FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding:
                        const EdgeInsets
                            .symmetric(
                      vertical: 8,
                    ),
                    children: [
                      _itemMenu(
                        indice: 0,
                        icono: Icons
                            .dashboard_outlined,
                        titulo: 'Inicio',
                      ),
                      _itemMenu(
                        indice: 1,
                        icono: Icons
                            .people_outline,
                        titulo: 'Clientes',
                      ),
                      _itemMenu(
                        indice: 2,
                        icono: Icons
                            .inventory_2_outlined,
                        titulo:
                            'Inventario',
                      ),
                      _itemMenu(
                        indice: 3,
                        icono: Icons
                            .point_of_sale_outlined,
                        titulo: 'Ventas',
                      ),
                      _itemMenu(
                        indice: 4,
                        icono: Icons
                            .payments_outlined,
                        titulo: 'Cobros',
                      ),
                    ],
                  ),
                ),
                const Divider(),
                Padding(
                  padding:
                      const EdgeInsets.only(
                    left: 8,
                    right: 8,
                    bottom: 8,
                  ),
                  child: ListTile(
                    leading: const Icon(
                      Icons.logout,
                    ),
                    title: const Text(
                      'Cerrar sesión',
                    ),
                    onTap: () {
                      Navigator.of(
                        context,
                      ).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (_) =>
                              const PantallaLogin(),
                        ),
                        (route) => false,
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
        body: IndexedStack(
          index: paginaActual,
          children: paginas,
        ),
      ),
    );
  }

  void _navegarA(int indice) {
    if (indice < 0 || indice > 4) {
      return;
    }

    setState(() {
      paginaActual = indice;
    });
  }

  String _tituloPagina(
    int indice,
  ) {
    switch (indice) {
      case 1:
        return 'Clientes';
      case 2:
        return 'Inventario';
      case 3:
        return 'Ventas';
      case 4:
        return 'Cobros';
      default:
        return 'Sistema de Cosméticos';
    }
  }

  Widget _itemMenu({
    required int indice,
    required IconData icono,
    required String titulo,
  }) {
    return ListTile(
      selected:
          paginaActual == indice,
      leading: Icon(icono),
      title: Text(titulo),
      onTap: () {
        setState(() {
          paginaActual = indice;
        });

        Navigator.of(context).pop();
      },
    );
  }
}