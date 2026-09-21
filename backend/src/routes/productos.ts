import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const CAMPOS_PRODUCTO =
  "id, codigo, nombre, descripcion, precio, costo, tipo, creado_en, actualizado_en";

type TipoProducto =
  | "INDIVIDUAL"
  | "KIT_SALON"
  | "KIT_BARBERIA";

const TIPOS_PRODUCTO: TipoProducto[] = [
  "INDIVIDUAL",
  "KIT_SALON",
  "KIT_BARBERIA"
];

/*
 * Genera un código interno para el producto.
 *
 * El código ya no se solicita desde el formulario.
 * Se mantiene porque la tabla productos todavía
 * posee esta columna y puede ser útil para identificar
 * productos posteriormente.
 */
function generarCodigoProducto(): string {
  const tiempo = Date.now().toString(36).toUpperCase();

  const aleatorio = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  return `PROD-${tiempo}-${aleatorio}`;
}

function tipoProductoValido(
  tipo: unknown
): tipo is TipoProducto {
  return (
    typeof tipo === "string" &&
    TIPOS_PRODUCTO.includes(
      tipo as TipoProducto
    )
  );
}

/*
 * ============================================================
 * GET /api/productos
 * Lista todos los productos.
 * ============================================================
 */
router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (_req: RequestAutenticado, res) => {
    try {
      const {
        data: productos,
        error
      } = await supabaseAdmin
        .from("productos")
        .select(CAMPOS_PRODUCTO)
        .order("nombre", {
          ascending: true
        });

      if (error) {
        console.error(
          "ERROR CONSULTANDO PRODUCTOS:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudieron consultar los productos."
        });
      }

      return res.json({
        productos: productos || []
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO PRODUCTOS:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al consultar los productos."
      });
    }
  }
);

/*
 * ============================================================
 * POST /api/productos
 * Crea un producto.
 *
 * Ya NO recibe:
 * - disponible
 *
 * Recibe:
 * - nombre
 * - descripcion
 * - precio
 * - costo
 * - tipo
 *
 * El código se genera automáticamente.
 * ============================================================
 */
router.post(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (req: RequestAutenticado, res) => {
    try {
      const {
        nombre,
        descripcion,
        precio,
        costo,
        tipo
      } = req.body;

      if (
        !nombre ||
        precio === undefined ||
        precio === null ||
        costo === undefined ||
        costo === null ||
        !tipo
      ) {
        return res.status(400).json({
          mensaje:
            "Nombre, tipo, precio y costo son obligatorios."
        });
      }

      const nombreNormalizado =
        String(nombre).trim();

      if (!nombreNormalizado) {
        return res.status(400).json({
          mensaje:
            "El nombre del producto es obligatorio."
        });
      }

      if (!tipoProductoValido(tipo)) {
        return res.status(400).json({
          mensaje:
            "El tipo de producto no es válido."
        });
      }

      const precioNumerico =
        Number(precio);

      const costoNumerico =
        Number(costo);

      if (
        !Number.isFinite(precioNumerico) ||
        precioNumerico < 0
      ) {
        return res.status(400).json({
          mensaje:
            "El precio debe ser un número válido mayor o igual a 0."
        });
      }

      if (
        !Number.isFinite(costoNumerico) ||
        costoNumerico < 0
      ) {
        return res.status(400).json({
          mensaje:
            "El costo debe ser un número válido mayor o igual a 0."
        });
      }

      /*
       * Generamos el código internamente.
       */
      let codigoGenerado =
        generarCodigoProducto();

      /*
       * Comprobamos que no exista.
       * En la práctica la posibilidad de colisión
       * es muy baja, pero hacemos la comprobación
       * antes de insertar.
       */
      let intentos = 0;

      while (intentos < 5) {
        const {
          data: codigoExistente,
          error: codigoError
        } = await supabaseAdmin
          .from("productos")
          .select("id")
          .eq("codigo", codigoGenerado)
          .maybeSingle();

        if (codigoError) {
          console.error(
            "ERROR COMPROBANDO CÓDIGO DE PRODUCTO:"
          );
          console.error(codigoError);

          return res.status(500).json({
            mensaje:
              "No se pudo comprobar el código del producto."
          });
        }

        if (!codigoExistente) {
          break;
        }

        codigoGenerado =
          generarCodigoProducto();

        intentos++;
      }

      const {
        data: producto,
        error
      } = await supabaseAdmin
        .from("productos")
        .insert({
          codigo: codigoGenerado,
          nombre: nombreNormalizado,
          descripcion:
            descripcion
              ? String(descripcion).trim()
              : null,
          precio: precioNumerico,
          costo: costoNumerico,
          tipo
        })
        .select(CAMPOS_PRODUCTO)
        .single();

      if (error || !producto) {
        console.error(
          "ERROR CREANDO PRODUCTO:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudo crear el producto."
        });
      }

      return res.status(201).json({
        mensaje:
          "Producto creado correctamente.",
        producto
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CREANDO PRODUCTO:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al crear el producto."
      });
    }
  }
);

/*
 * ============================================================
 * PATCH /api/productos/:id
 * Actualiza un producto.
 *
 * Ya NO modifica:
 * - disponible
 *
 * Actualiza:
 * - nombre
 * - descripcion
 * - precio
 * - costo
 * - tipo
 * ============================================================
 */
router.patch(
  "/:id",
  autenticar,
  requireRole("ADMIN"),
  async (req: RequestAutenticado, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          mensaje:
            "El identificador del producto es obligatorio."
        });
      }

      const {
        nombre,
        descripcion,
        precio,
        costo,
        tipo
      } = req.body;

      if (
        !nombre ||
        precio === undefined ||
        precio === null ||
        costo === undefined ||
        costo === null ||
        !tipo
      ) {
        return res.status(400).json({
          mensaje:
            "Nombre, tipo, precio y costo son obligatorios."
        });
      }

      const nombreNormalizado =
        String(nombre).trim();

      if (!nombreNormalizado) {
        return res.status(400).json({
          mensaje:
            "El nombre del producto es obligatorio."
        });
      }

      if (!tipoProductoValido(tipo)) {
        return res.status(400).json({
          mensaje:
            "El tipo de producto no es válido."
        });
      }

      const precioNumerico =
        Number(precio);

      const costoNumerico =
        Number(costo);

      if (
        !Number.isFinite(precioNumerico) ||
        precioNumerico < 0
      ) {
        return res.status(400).json({
          mensaje:
            "El precio debe ser un número válido mayor o igual a 0."
        });
      }

      if (
        !Number.isFinite(costoNumerico) ||
        costoNumerico < 0
      ) {
        return res.status(400).json({
          mensaje:
            "El costo debe ser un número válido mayor o igual a 0."
        });
      }

      /*
       * Comprobamos que el producto exista.
       */
      const {
        data: productoExistente,
        error: consultaError
      } = await supabaseAdmin
        .from("productos")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (consultaError) {
        console.error(
          "ERROR CONSULTANDO PRODUCTO:"
        );
        console.error(consultaError);

        return res.status(500).json({
          mensaje:
            "No se pudo consultar el producto."
        });
      }

      if (!productoExistente) {
        return res.status(404).json({
          mensaje:
            "El producto no existe."
        });
      }

      /*
       * Actualizamos el producto.
       */
      const {
        data: productoActualizado,
        error: actualizacionError
      } = await supabaseAdmin
        .from("productos")
        .update({
          nombre: nombreNormalizado,
          descripcion:
            descripcion
              ? String(descripcion).trim()
              : null,
          precio: precioNumerico,
          costo: costoNumerico,
          tipo
        })
        .eq("id", id)
        .select(CAMPOS_PRODUCTO)
        .single();

      if (
        actualizacionError ||
        !productoActualizado
      ) {
        console.error(
          "ERROR ACTUALIZANDO PRODUCTO:"
        );
        console.error(actualizacionError);

        return res.status(500).json({
          mensaje:
            "No se pudo actualizar el producto."
        });
      }

      return res.json({
        mensaje:
          "Producto actualizado correctamente.",
        producto: productoActualizado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO ACTUALIZANDO PRODUCTO:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al actualizar el producto."
      });
    }
  }
);

export default router;