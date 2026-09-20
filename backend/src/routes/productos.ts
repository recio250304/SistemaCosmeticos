import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const CAMPOS_PRODUCTO =
  "id, codigo, nombre, descripcion, precio, costo, disponible, creado_en, actualizado_en";

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

router.post(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (req: RequestAutenticado, res) => {
    try {
      const {
        codigo,
        nombre,
        descripcion,
        precio,
        costo
      } = req.body;

      if (
        !codigo ||
        !nombre ||
        precio === undefined ||
        precio === null ||
        costo === undefined ||
        costo === null
      ) {
        return res.status(400).json({
          mensaje:
            "Código, nombre, precio y costo son obligatorios."
        });
      }

      const codigoNormalizado =
        String(codigo).trim();

      const nombreNormalizado =
        String(nombre).trim();

      if (!codigoNormalizado) {
        return res.status(400).json({
          mensaje:
            "El código del producto es obligatorio."
        });
      }

      if (!nombreNormalizado) {
        return res.status(400).json({
          mensaje:
            "El nombre del producto es obligatorio."
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

      const {
        data: productoExistente,
        error: codigoError
      } = await supabaseAdmin
        .from("productos")
        .select("id")
        .eq("codigo", codigoNormalizado)
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

      if (productoExistente) {
        return res.status(409).json({
          mensaje:
            "El código del producto ya está registrado."
        });
      }

      const {
        data: producto,
        error
      } = await supabaseAdmin
        .from("productos")
        .insert({
          codigo: codigoNormalizado,
          nombre: nombreNormalizado,
          descripcion:
            descripcion
              ? String(descripcion).trim()
              : null,
          precio: precioNumerico,
          costo: costoNumerico,
          disponible: true
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
        codigo,
        nombre,
        descripcion,
        precio,
        costo
      } = req.body;

      if (
        !codigo ||
        !nombre ||
        precio === undefined ||
        precio === null ||
        costo === undefined ||
        costo === null
      ) {
        return res.status(400).json({
          mensaje:
            "Código, nombre, precio y costo son obligatorios."
        });
      }

      const codigoNormalizado =
        String(codigo).trim();

      const nombreNormalizado =
        String(nombre).trim();

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

      const {
        data: codigoRepetido,
        error: codigoError
      } = await supabaseAdmin
        .from("productos")
        .select("id")
        .eq("codigo", codigoNormalizado)
        .neq("id", id)
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

      if (codigoRepetido) {
        return res.status(409).json({
          mensaje:
            "El código del producto ya está registrado por otro producto."
        });
      }

      const {
        data: productoActualizado,
        error: actualizacionError
      } = await supabaseAdmin
        .from("productos")
        .update({
          codigo: codigoNormalizado,
          nombre: nombreNormalizado,
          descripcion:
            descripcion
              ? String(descripcion).trim()
              : null,
          precio: precioNumerico,
          costo: costoNumerico
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

router.patch(
  "/:id/disponibilidad",
  autenticar,
  requireRole("ADMIN"),
  async (req: RequestAutenticado, res) => {
    try {
      const { id } = req.params;
      const { disponible } = req.body;

      if (!id) {
        return res.status(400).json({
          mensaje:
            "El identificador del producto es obligatorio."
        });
      }

      if (typeof disponible !== "boolean") {
        return res.status(400).json({
          mensaje:
            "El campo disponible debe ser verdadero o falso."
        });
      }

      const {
        data: productoExistente,
        error: consultaError
      } = await supabaseAdmin
        .from("productos")
        .select(CAMPOS_PRODUCTO)
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

      const {
        data: productoActualizado,
        error: actualizacionError
      } = await supabaseAdmin
        .from("productos")
        .update({
          disponible
        })
        .eq("id", id)
        .select(CAMPOS_PRODUCTO)
        .single();

      if (
        actualizacionError ||
        !productoActualizado
      ) {
        console.error(
          "ERROR CAMBIANDO DISPONIBILIDAD DEL PRODUCTO:"
        );
        console.error(actualizacionError);

        return res.status(500).json({
          mensaje:
            "No se pudo cambiar la disponibilidad del producto."
        });
      }

      return res.json({
        mensaje: disponible
          ? "Producto marcado como disponible."
          : "Producto marcado como no disponible.",
        producto: productoActualizado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CAMBIANDO DISPONIBILIDAD:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al cambiar la disponibilidad del producto."
      });
    }
  }
);

export default router;