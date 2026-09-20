import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const CAMPOS_CLIENTE =
  "id, nombre_negocio, tipo, nombre_contacto, telefono, telefono_secundario, direccion, sector, ciudad, activo, creado_en, actualizado_en";

router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (_req: RequestAutenticado, res) => {
    try {
      const {
        data: clientes,
        error
      } = await supabaseAdmin
        .from("clientes")
        .select(CAMPOS_CLIENTE)
        .order("nombre_negocio", {
          ascending: true
        });

      if (error) {
        console.error(
          "ERROR CONSULTANDO CLIENTES:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudieron consultar los clientes."
        });
      }

      return res.json({
        clientes: clientes || []
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO CLIENTES:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al consultar los clientes."
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
        nombre_negocio,
        tipo,
        nombre_contacto,
        telefono,
        telefono_secundario,
        direccion,
        sector,
        ciudad
      } = req.body;

      if (
        !nombre_negocio ||
        !tipo ||
        !nombre_contacto ||
        !telefono ||
        !direccion ||
        !sector ||
        !ciudad
      ) {
        return res.status(400).json({
          mensaje:
            "Nombre del negocio, tipo, contacto, teléfono, dirección, sector y ciudad son obligatorios."
        });
      }

      const tipoNormalizado =
        String(tipo)
          .trim()
          .toUpperCase();

      if (
        tipoNormalizado !== "BARBERIA" &&
        tipoNormalizado !== "SALON"
      ) {
        return res.status(400).json({
          mensaje:
            "El tipo de cliente debe ser BARBERIA o SALON."
        });
      }

      const {
        data: cliente,
        error
      } = await supabaseAdmin
        .from("clientes")
        .insert({
          nombre_negocio:
            String(nombre_negocio).trim(),
          tipo: tipoNormalizado,
          nombre_contacto:
            String(nombre_contacto).trim(),
          telefono:
            String(telefono).trim(),
          telefono_secundario:
            telefono_secundario
              ? String(
                  telefono_secundario
                ).trim()
              : null,
          direccion:
            String(direccion).trim(),
          sector:
            String(sector).trim(),
          ciudad:
            String(ciudad).trim(),
          activo: true
        })
        .select(CAMPOS_CLIENTE)
        .single();

      if (error || !cliente) {
        console.error(
          "ERROR CREANDO CLIENTE:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudo crear el cliente."
        });
      }

      return res.status(201).json({
        mensaje:
          "Cliente creado correctamente.",
        cliente
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CREANDO CLIENTE:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al crear el cliente."
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
            "El identificador del cliente es obligatorio."
        });
      }

      const {
        nombre_negocio,
        tipo,
        nombre_contacto,
        telefono,
        telefono_secundario,
        direccion,
        sector,
        ciudad
      } = req.body;

      if (
        !nombre_negocio ||
        !tipo ||
        !nombre_contacto ||
        !telefono ||
        !direccion ||
        !sector ||
        !ciudad
      ) {
        return res.status(400).json({
          mensaje:
            "Nombre del negocio, tipo, contacto, teléfono, dirección, sector y ciudad son obligatorios."
        });
      }

      const tipoNormalizado =
        String(tipo)
          .trim()
          .toUpperCase();

      if (
        tipoNormalizado !== "BARBERIA" &&
        tipoNormalizado !== "SALON"
      ) {
        return res.status(400).json({
          mensaje:
            "El tipo de cliente debe ser BARBERIA o SALON."
        });
      }

      const {
        data: clienteExistente,
        error: consultaError
      } = await supabaseAdmin
        .from("clientes")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (consultaError) {
        console.error(
          "ERROR CONSULTANDO CLIENTE:"
        );
        console.error(consultaError);

        return res.status(500).json({
          mensaje:
            "No se pudo consultar el cliente."
        });
      }

      if (!clienteExistente) {
        return res.status(404).json({
          mensaje:
            "El cliente no existe."
        });
      }

      const {
        data: clienteActualizado,
        error: actualizacionError
      } = await supabaseAdmin
        .from("clientes")
        .update({
          nombre_negocio:
            String(nombre_negocio).trim(),
          tipo: tipoNormalizado,
          nombre_contacto:
            String(nombre_contacto).trim(),
          telefono:
            String(telefono).trim(),
          telefono_secundario:
            telefono_secundario
              ? String(
                  telefono_secundario
                ).trim()
              : null,
          direccion:
            String(direccion).trim(),
          sector:
            String(sector).trim(),
          ciudad:
            String(ciudad).trim()
        })
        .eq("id", id)
        .select(CAMPOS_CLIENTE)
        .single();

      if (
        actualizacionError ||
        !clienteActualizado
      ) {
        console.error(
          "ERROR ACTUALIZANDO CLIENTE:"
        );
        console.error(actualizacionError);

        return res.status(500).json({
          mensaje:
            "No se pudo actualizar el cliente."
        });
      }

      return res.json({
        mensaje:
          "Cliente actualizado correctamente.",
        cliente: clienteActualizado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO ACTUALIZANDO CLIENTE:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al actualizar el cliente."
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
            "El identificador del cliente es obligatorio."
        });
      }

      if (typeof activo !== "boolean") {
        return res.status(400).json({
          mensaje:
            "El campo activo debe ser verdadero o falso."
        });
      }

      const {
        data: clienteExistente,
        error: consultaError
      } = await supabaseAdmin
        .from("clientes")
        .select(CAMPOS_CLIENTE)
        .eq("id", id)
        .maybeSingle();

      if (consultaError) {
        console.error(
          "ERROR CONSULTANDO CLIENTE:"
        );
        console.error(consultaError);

        return res.status(500).json({
          mensaje:
            "No se pudo consultar el cliente."
        });
      }

      if (!clienteExistente) {
        return res.status(404).json({
          mensaje:
            "El cliente no existe."
        });
      }

      const {
        data: clienteActualizado,
        error: actualizacionError
      } = await supabaseAdmin
        .from("clientes")
        .update({
          activo
        })
        .eq("id", id)
        .select(CAMPOS_CLIENTE)
        .single();

      if (
        actualizacionError ||
        !clienteActualizado
      ) {
        console.error(
          "ERROR CAMBIANDO ESTADO DEL CLIENTE:"
        );
        console.error(actualizacionError);

        return res.status(500).json({
          mensaje:
            "No se pudo cambiar el estado del cliente."
        });
      }

      return res.json({
        mensaje: activo
          ? "Cliente activado correctamente."
          : "Cliente desactivado correctamente.",
        cliente: clienteActualizado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CAMBIANDO ESTADO DEL CLIENTE:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al cambiar el estado del cliente."
      });
    }
  }
);

export default router;