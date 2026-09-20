class DetalleVentaLocal {
  final String productoId;
  final String nombre;
  final double precio;
  final int cantidad;

  const DetalleVentaLocal({
    required this.productoId,
    required this.nombre,
    required this.precio,
    required this.cantidad,
  });

  double get subtotal {
    return precio * cantidad;
  }
}