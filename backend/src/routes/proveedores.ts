import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const CAMPOS_PROVEEDOR =
  "id, nombre, nombre_contacto, telefono, telefono_secundario, correo, direccion, ciudad, rnc, activo, creado_en, actualizado_en";

router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (_req: RequestAutenticado, res) => {
    try {
      const {
        data: proveedores,
        error
      } = await supabaseAdmin
        .from("proveedores")
        .select(CAMPOS_PROVEEDOR)
        .order("nombre", {
          ascending: true
        });

      if (error) {
        console.error(
          "ERROR CONSULTANDO PROVEEDORES:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudieron consultar los proveedores."
        });
      }

      return res.json({
        proveedores: proveedores || []
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO PROVEEDORES:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al consultar los proveedores."
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
        nombre,
        nombre_contacto,
        telefono,
        telefono_secundario,
        correo,
        direccion,
        ciudad,
        rnc
      } = req.body;

      if (
        !nombre ||
        !nombre_contacto ||
        !telefono ||
        !direccion ||
        !ciudad
      ) {
        return res.status(400).json({
          mensaje:
            "Nombre, contacto, teléfono, dirección y ciudad son obligatorios."
        });
      }

      const nombreNormalizado =
        String(nombre).trim();

      const contactoNormalizado =
        String(nombre_contacto).trim();

      const telefonoNormalizado =
        String(telefono).trim();

      const direccionNormalizada =
        String(direccion).trim();

      const ciudadNormalizada =
        String(ciudad).trim();

      if (
        !nombreNormalizado ||
        !contactoNormalizado ||
        !telefonoNormalizado ||
        !direccionNormalizada ||
        !ciudadNormalizada
      ) {
        return res.status(400).json({
          mensaje:
            "Los campos obligatorios no pueden estar vacíos."
        });
      }

      const {
        data: proveedor,
        error
      } = await supabaseAdmin
        .from("proveedores")
        .insert({
          nombre: nombreNormalizado,

          nombre_contacto:
            contactoNormalizado,

          telefono:
            telefonoNormalizado,

          telefono_secundario:
            telefono_secundario
              ? String(
                  telefono_secundario
                ).trim()
              : null,

          correo:
            correo
              ? String(correo).trim()
              : null,

          direccion:
            direccionNormalizada,

          ciudad:
            ciudadNormalizada,

          rnc:
            rnc
              ? String(rnc).trim()
              : null,

          activo: true
        })
        .select(CAMPOS_PROVEEDOR)
        .single();

      if (error || !proveedor) {
        console.error(
          "ERROR CREANDO PROVEEDOR:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudo crear el proveedor."
        });
      }

      return res.status(201).json({
        mensaje:
          "Proveedor creado correctamente.",
        proveedor
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CREANDO PROVEEDOR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al crear el proveedor."
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
            "El identificador del proveedor es obligatorio."
        });
      }

      const {
        nombre,
        nombre_contacto,
        telefono,
        telefono_secundario,
        correo,
        direccion,
        ciudad,
        rnc
      } = req.body;

      if (
        !nombre ||
        !nombre_contacto ||
        !telefono ||
        !direccion ||
        !ciudad
      ) {
        return res.status(400).json({
          mensaje:
            "Nombre, contacto, teléfono, dirección y ciudad son obligatorios."
        });
      }

      const nombreNormalizado =
        String(nombre).trim();

      const contactoNormalizado =
        String(nombre_contacto).trim();

      const telefonoNormalizado =
        String(telefono).trim();

      const direccionNormalizada =
        String(direccion).trim();

      const ciudadNormalizada =
        String(ciudad).trim();

      if (
        !nombreNormalizado ||
        !contactoNormalizado ||
        !telefonoNormalizado ||
        !direccionNormalizada ||
        !ciudadNormalizada
      ) {
        return res.status(400).json({
          mensaje:
            "Los campos obligatorios no pueden estar vacíos."
        });
      }

      const {
        data: proveedorExistente,
        error: consultaError
      } = await supabaseAdmin
        .from("proveedores")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (consultaError) {
        console.error(
          "ERROR CONSULTANDO PROVEEDOR:"
        );
        console.error(consultaError);

        return res.status(500).json({
          mensaje:
            "No se pudo consultar el proveedor."
        });
      }

      if (!proveedorExistente) {
        return res.status(404).json({
          mensaje:
            "El proveedor no existe."
        });
      }

      const {
        data: proveedorActualizado,
        error: actualizacionError
      } = await supabaseAdmin
        .from("proveedores")
        .update({
          nombre:
            nombreNormalizado,

          nombre_contacto:
            contactoNormalizado,

          telefono:
            telefonoNormalizado,

          telefono_secundario:
            telefono_secundario
              ? String(
                  telefono_secundario
                ).trim()
              : null,

          correo:
            correo
              ? String(correo).trim()
              : null,

          direccion:
            direccionNormalizada,

          ciudad:
            ciudadNormalizada,

          rnc:
            rnc
              ? String(rnc).trim()
              : null
        })
        .eq("id", id)
        .select(CAMPOS_PROVEEDOR)
        .single();

      if (
        actualizacionError ||
        !proveedorActualizado
      ) {
        console.error(
          "ERROR ACTUALIZANDO PROVEEDOR:"
        );
        console.error(actualizacionError);

        return res.status(500).json({
          mensaje:
            "No se pudo actualizar el proveedor."
        });
      }

      return res.json({
        mensaje:
          "Proveedor actualizado correctamente.",
        proveedor:
          proveedorActualizado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO ACTUALIZANDO PROVEEDOR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al actualizar el proveedor."
      });
    }
  }
);

router.patch(
  "/:id/estado",
  autenticar,
  requireRole("ADMIN"),
  async (req: RequestAutenticado, res) => {
    try {
      const { id } = req.params;
      const { activo } = req.body;

      if (!id) {
        return res.status(400).json({
          mensaje:
            "El identificador del proveedor es obligatorio."
        });
      }

      if (typeof activo !== "boolean") {
        return res.status(400).json({
          mensaje:
            "El campo activo debe ser verdadero o falso."
        });
      }

      const {
        data: proveedorExistente,
        error: consultaError
      } = await supabaseAdmin
        .from("proveedores")
        .select(CAMPOS_PROVEEDOR)
        .eq("id", id)
        .maybeSingle();

      if (consultaError) {
        console.error(
          "ERROR CONSULTANDO PROVEEDOR:"
        );
        console.error(consultaError);

        return res.status(500).json({
          mensaje:
            "No se pudo consultar el proveedor."
        });
      }

      if (!proveedorExistente) {
        return res.status(404).json({
          mensaje:
            "El proveedor no existe."
        });
      }

      const {
        data: proveedorActualizado,
        error: actualizacionError
      } = await supabaseAdmin
        .from("proveedores")
        .update({
          activo
        })
        .eq("id", id)
        .select(CAMPOS_PROVEEDOR)
        .single();

      if (
        actualizacionError ||
        !proveedorActualizado
      ) {
        console.error(
          "ERROR CAMBIANDO ESTADO DEL PROVEEDOR:"
        );
        console.error(actualizacionError);

        return res.status(500).json({
          mensaje:
            "No se pudo cambiar el estado del proveedor."
        });
      }

      return res.json({
        mensaje: activo
          ? "Proveedor activado correctamente."
          : "Proveedor desactivado correctamente.",

        proveedor:
          proveedorActualizado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CAMBIANDO ESTADO DEL PROVEEDOR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al cambiar el estado del proveedor."
      });
    }
  }
);

export default router;