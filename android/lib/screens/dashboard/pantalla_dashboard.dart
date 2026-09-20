import 'package:flutter/material.dart';

import '../../widgets/tarjeta_dashboard.dart';
import '../../widgets/tarjeta_resumen.dart';

class PantallaDashboard extends StatelessWidget {
  final Map<String, dynamic> usuario;
  final void Function(int indice) onNavegar;

  const PantallaDashboard({
    super.key,
    required this.usuario,
    required this.onNavegar,
  });

  @override
  Widget build(BuildContext context) {
    final nombre =
        usuario['nombre_completo']?.toString() ?? 'Operador';

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bienvenido, $nombre',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 25,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Gestiona tu ruta, clientes, inventario, ventas y cobros.',
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 22),
            LayoutBuilder(
              builder: (context, constraints) {
                final ancho = constraints.maxWidth;

                final columnas = ancho >= 800
                    ? 4
                    : ancho >= 520
                        ? 3
                        : 2;

                return GridView.count(
                  crossAxisCount: columnas,
                  childAspectRatio: 0.95,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  shrinkWrap: true,
                  physics:
                      const NeverScrollableScrollPhysics(),
                  children: [
                    TarjetaDashboard(
                      icono: Icons.people_outline,
                      titulo: 'Clientes',
                      descripcion:
                          'Consulta los clientes asignados a tu ruta.',
                      onTap: () => onNavegar(1),
                    ),
                    TarjetaDashboard(
                      icono: Icons.inventory_2_outlined,
                      titulo: 'Inventario',
                      descripcion:
                          'Consulta el inventario disponible para tu ruta.',
                      onTap: () => onNavegar(2),
                    ),
                    TarjetaDashboard(
                      icono: Icons.point_of_sale_outlined,
                      titulo: 'Ventas',
                      descripcion:
                          'Registra las ventas realizadas a tus clientes.',
                      onTap: () => onNavegar(3),
                    ),
                    TarjetaDashboard(
                      icono: Icons.payments_outlined,
                      titulo: 'Cobros',
                      descripcion:
                          'Registra los pagos recibidos de tus clientes.',
                      onTap: () => onNavegar(4),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            const TarjetaResumen(
              icono: Icons.route_outlined,
              titulo: 'Ruta de trabajo',
              descripcion:
                  'Consulta los clientes asignados a tu ruta y registra las operaciones realizadas durante el día.',
            ),
          ],
        ),
      ),
    );
  }
}