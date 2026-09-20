import { Router, Response } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// ============================================================
// GET /api/inventario
// Lista TODOS los productos con su inventario actual.
//
// Los datos del producto se devuelven directamente en el objeto
// para que puedan ser utilizados por Inventario y Rutas.
//
// También se mantiene "productos" por compatibilidad.
// ============================================================
router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (_req: RequestAutenticado, res: Response) => {
    try {
      // --------------------------------------------------------
      // Obtener todos los productos.
      // --------------------------------------------------------
      const {
        data: productos,
        error: productosError
      } = await supabaseAdmin
        .from("productos")
        .select(
          `
          id,
          codigo,
          nombre,
          descripcion,
          precio,
          costo,
          disponible,
          creado_en,
          actualizado_en
          `
        )
        .order("nombre", {
          ascending: true
        });

      if (productosError) {
        console.error(
          "ERROR CONSULTANDO PRODUCTOS PARA INVENTARIO:"
        );
        console.error(productosError);

        return res.status(500).json({
          mensaje:
            "Error consultando los productos del inventario."
        });
      }

      // --------------------------------------------------------
      // Obtener todas las existencias actuales.
      // --------------------------------------------------------
      const {
        data: existencias,
        error: existenciasError
      } = await supabaseAdmin
        .from("inventario_almacen")
        .select(
          "producto_id, cantidad, actualizado_en"
        );

      if (existenciasError) {
        console.error(
          "ERROR CONSULTANDO EXISTENCIAS:"
        );
        console.error(existenciasError);

        return res.status(500).json({
          mensaje:
            "Error consultando las existencias del almacén."
        });
      }

      // --------------------------------------------------------
      // Crear mapa producto_id -> inventario.
      // --------------------------------------------------------
      const mapaExistencias = new Map<
        string,
        {
          cantidad: number;
          actualizado_en: string | null;
        }
      >();

      for (const existencia of existencias ?? []) {
        mapaExistencias.set(
          existencia.producto_id,
          {
            cantidad: existencia.cantidad,
            actualizado_en:
              existencia.actualizado_en
          }
        );
      }

      // --------------------------------------------------------
      // Combinar productos con inventario.
      //
      // Si un producto no tiene fila en inventario_almacen,
      // su existencia será 0.
      // --------------------------------------------------------
      const resultado = (productos ?? []).map(
        (producto) => {
          const existencia =
            mapaExistencias.get(producto.id);

          const cantidad =
            existencia?.cantidad ?? 0;

          const actualizado_en =
            existencia?.actualizado_en ??
            producto.actualizado_en;

          return {
            // --------------------------------------------------
            // Datos principales del producto
            // --------------------------------------------------
            id: producto.id,
            producto_id: producto.id,
            codigo: producto.codigo,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            precio: producto.precio,
            costo: producto.costo,
            disponible: producto.disponible,

            // --------------------------------------------------
            // Inventario
            // --------------------------------------------------
            cantidad,

            creado_en:
              producto.creado_en,

            actualizado_en,

            // --------------------------------------------------
            // Compatibilidad con la estructura anterior
            // --------------------------------------------------
            productos: {
              id: producto.id,
              codigo: producto.codigo,
              nombre: producto.nombre,
              descripcion: producto.descripcion,
              precio: producto.precio,
              costo: producto.costo,
              disponible: producto.disponible
            }
          };
        }
      );

      return res.json(resultado);
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO INVENTARIO:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando el inventario."
      });
    }
  }
);

// ============================================================
// POST /api/inventario/entrada
// Registra entrada de mercancía al almacén.
//
// Body:
// {
//   producto_id: "...",
//   cantidad: 20,
//   descripcion: "Compra de mercancía"
// }
// ============================================================
router.post(
  "/entrada",
  autenticar,
  requireRole("ADMIN"),
  async (req: RequestAutenticado, res: Response) => {
    try {
      const {
        producto_id,
        cantidad,
        descripcion
      } = req.body;

      if (!producto_id) {
        return res.status(400).json({
          mensaje:
            "El producto es obligatorio."
        });
      }

      const cantidadNumerica =
        Number(cantidad);

      if (
        !Number.isInteger(cantidadNumerica) ||
        cantidadNumerica <= 0
      ) {
        return res.status(400).json({
          mensaje:
            "La cantidad debe ser un número entero mayor que 0."
        });
      }

      // --------------------------------------------------------
      // Verificar que el producto exista.
      // --------------------------------------------------------
      const {
        data: producto,
        error: productoError
      } = await supabaseAdmin
        .from("productos")
        .select(
          "id, codigo, nombre, disponible"
        )
        .eq("id", producto_id)
        .maybeSingle();

      if (productoError) {
        console.error(
          "ERROR CONSULTANDO PRODUCTO PARA ENTRADA:"
        );
        console.error(productoError);

        return res.status(500).json({
          mensaje:
            "Error consultando el producto."
        });
      }

      if (!producto) {
        return res.status(404).json({
          mensaje:
            "El producto no existe."
        });
      }

      // --------------------------------------------------------
      // Obtener inventario actual.
      // --------------------------------------------------------
      const {
        data: inventarioActual,
        error: inventarioError
      } = await supabaseAdmin
        .from("inventario_almacen")
        .select(
          "producto_id, cantidad"
        )
        .eq("producto_id", producto_id)
        .maybeSingle();

      if (inventarioError) {
        console.error(
          "ERROR CONSULTANDO INVENTARIO ACTUAL:"
        );
        console.error(inventarioError);

        return res.status(500).json({
          mensaje:
            "Error consultando el inventario actual."
        });
      }

      const cantidadAnterior =
        inventarioActual?.cantidad ?? 0;

      const nuevaCantidad =
        cantidadAnterior +
        cantidadNumerica;

      // --------------------------------------------------------
      // Crear o actualizar inventario.
      // --------------------------------------------------------
      const {
        data: inventario,
        error: guardarInventarioError
      } = await supabaseAdmin
        .from("inventario_almacen")
        .upsert(
          {
            producto_id,
            cantidad: nuevaCantidad,
            actualizado_en:
              new Date().toISOString()
          },
          {
            onConflict: "producto_id"
          }
        )
        .select(
          "producto_id, cantidad, actualizado_en"
        )
        .single();

      if (guardarInventarioError) {
        console.error(
          "ERROR ACTUALIZANDO INVENTARIO:"
        );
        console.error(
          guardarInventarioError
        );

        return res.status(500).json({
          mensaje:
            "No se pudo actualizar el inventario."
        });
      }

      // --------------------------------------------------------
      // Registrar movimiento histórico.
      // --------------------------------------------------------
      const {
        data: movimiento,
        error: movimientoError
      } = await supabaseAdmin
        .from("movimientos_inventario")
        .insert({
          producto_id,

          usuario_id:
            req.usuario?.id ?? null,

          tipo:
            "ENTRADA_ALMACEN",

          cantidad:
            cantidadNumerica,

          descripcion:
            descripcion?.toString().trim() ||
            `Entrada de ${cantidadNumerica} unidad(es) de ${producto.nombre}.`
        })
        .select(
          `
          id,
          producto_id,
          usuario_id,
          tipo,
          cantidad,
          descripcion,
          creado_en
          `
        )
        .single();

      if (movimientoError) {
        console.error(
          "ERROR REGISTRANDO MOVIMIENTO DE INVENTARIO:"
        );
        console.error(movimientoError);

        return res.status(500).json({
          mensaje:
            "El inventario fue actualizado, pero no se pudo registrar el movimiento."
        });
      }

      return res.status(201).json({
        mensaje:
          "Entrada registrada correctamente.",

        producto: {
          id:
            producto.id,

          codigo:
            producto.codigo,

          nombre:
            producto.nombre
        },

        inventario: {
          cantidad_anterior:
            cantidadAnterior,

          cantidad_ingresada:
            cantidadNumerica,

          cantidad_nueva:
            nuevaCantidad
        },

        movimiento
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO REGISTRANDO ENTRADA:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno registrando la entrada."
      });
    }
  }
);

export default router;