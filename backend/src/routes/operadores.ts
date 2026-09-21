import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/*
 * GET /api/operadores
 *
 * Obtiene todos los operadores registrados.
 *
 * Solo un usuario autenticado con rol ADMIN
 * puede utilizar esta ruta.
 */
router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (_req: RequestAutenticado, res) => {
    try {
      const {
        data: operadores,
        error
      } = await supabaseAdmin
        .from("usuarios")
        .select(
          "id, nombre_completo, usuario, rol, estado, telefono"
        )
        .eq("rol", "OPERADOR")
        .order("nombre_completo", {
          ascending: true
        });

      if (error) {
        console.error(
          "ERROR CONSULTANDO OPERADORES:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudieron consultar los operadores."
        });
      }

      return res.json({
        operadores: operadores || []
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO OPERADORES:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al consultar los operadores."
      });
    }
  }
);

/*
 * POST /api/operadores
 *
 * Crea un nuevo usuario OPERADOR.
 *
 * Solo un usuario autenticado con rol ADMIN
 * puede utilizar esta ruta.
 */
router.post(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (req: RequestAutenticado, res) => {
    try {
      const {
        nombre_completo,
        usuario,
        email,
        password,
        telefono
      } = req.body;

      if (
        !nombre_completo ||
        !usuario ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          mensaje:
            "nombre_completo, usuario, email y password son obligatorios."
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          mensaje:
            "La contraseña debe tener al menos 6 caracteres."
        });
      }

      const {
        data: usuarioExistente,
        error: usuarioError
      } = await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("usuario", usuario)
        .maybeSingle();

      if (usuarioError) {
        console.error(
          "ERROR COMPROBANDO USUARIO EXISTENTE:"
        );
        console.error(usuarioError);

        return res.status(500).json({
          mensaje:
            "No se pudo comprobar la disponibilidad del usuario."
        });
      }

      if (usuarioExistente) {
        return res.status(409).json({
          mensaje:
            "El nombre de usuario ya está registrado."
        });
      }

      const {
        data: authData,
        error: authError
      } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError || !authData.user) {
        console.error(
          "ERROR CREANDO USUARIO AUTH:"
        );
        console.error(authError);

        return res.status(400).json({
          mensaje:
            authError?.message ||
            "No se pudo crear el usuario de autenticación."
        });
      }

      const {
        data: nuevoUsuario,
        error: perfilError
      } = await supabaseAdmin
        .from("usuarios")
        .insert({
          nombre_completo,
          usuario,
          rol: "OPERADOR",
          estado: "ACTIVO",
          auth_user_id: authData.user.id,
          telefono: telefono || null
        })
        .select(
          "id, nombre_completo, usuario, rol, estado, telefono, auth_user_id"
        )
        .single();

      if (perfilError || !nuevoUsuario) {
        console.error(
          "ERROR CREANDO PERFIL DEL OPERADOR:"
        );
        console.error(perfilError);

        await supabaseAdmin.auth.admin.deleteUser(
          authData.user.id
        );

        return res.status(500).json({
          mensaje:
            "No se pudo crear el perfil del operador. La operación fue revertida."
        });
      }

      return res.status(201).json({
        mensaje:
          "Operador creado correctamente.",
        operador: nuevoUsuario
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CREANDO OPERADOR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al crear el operador."
      });
    }
  }
);

/*
 * PATCH /api/operadores/:id/estado
 *
 * Activa o desactiva un operador.
 *
 * Solo un usuario autenticado con rol ADMIN
 * puede utilizar esta ruta.
 *
 * Estados permitidos:
 * ACTIVO
 * INACTIVO
 */
router.patch(
  "/:id/estado",
  autenticar,
  requireRole("ADMIN"),
  async (req: RequestAutenticado, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      /*
       * Validar ID.
       */
      if (!id) {
        return res.status(400).json({
          mensaje:
            "El ID del operador es obligatorio."
        });
      }

      /*
       * Validar estado.
       */
      if (
        estado !== "ACTIVO" &&
        estado !== "INACTIVO"
      ) {
        return res.status(400).json({
          mensaje:
            "El estado debe ser ACTIVO o INACTIVO."
        });
      }

      /*
       * Buscar el operador antes de modificarlo.
       */
      const {
        data: operadorExistente,
        error: operadorError
      } = await supabaseAdmin
        .from("usuarios")
        .select(
          "id, nombre_completo, usuario, rol, estado, telefono, auth_user_id"
        )
        .eq("id", id)
        .eq("rol", "OPERADOR")
        .maybeSingle();

      if (operadorError) {
        console.error(
          "ERROR BUSCANDO OPERADOR PARA CAMBIAR ESTADO:"
        );
        console.error(operadorError);

        return res.status(500).json({
          mensaje:
            "No se pudo consultar el operador."
        });
      }

      if (!operadorExistente) {
        return res.status(404).json({
          mensaje:
            "El operador no existe."
        });
      }

      /*
       * Actualizar el estado del operador
       * en la tabla usuarios.
       */
      const {
        data: operadorActualizado,
        error: actualizarError
      } = await supabaseAdmin
        .from("usuarios")
        .update({
          estado
        })
        .eq("id", id)
        .eq("rol", "OPERADOR")
        .select(
          "id, nombre_completo, usuario, rol, estado, telefono, auth_user_id"
        )
        .single();

      if (actualizarError || !operadorActualizado) {
        console.error(
          "ERROR ACTUALIZANDO ESTADO DEL OPERADOR:"
        );
        console.error(actualizarError);

        return res.status(500).json({
          mensaje:
            "No se pudo actualizar el estado del operador."
        });
      }

      return res.json({
        mensaje:
          estado === "ACTIVO"
            ? "Operador activado correctamente."
            : "Operador desactivado correctamente.",
        operador: operadorActualizado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CAMBIANDO ESTADO DEL OPERADOR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno al cambiar el estado del operador."
      });
    }
  }
);

export default router;