import {
  Request,
  Response,
  NextFunction
} from "express";

import { createClient } from "@supabase/supabase-js";

import {
  supabase
} from "../config/supabase.js";

export interface UsuarioAutenticado {
  id: string;
  nombre_completo: string;
  usuario: string;
  rol: string;
  estado: string;
  auth_user_id: string;
}

export interface RequestAutenticado
  extends Request {
  usuario?: UsuarioAutenticado;
}

/* =========================================================
   AUTENTICAR USUARIO
========================================================= */

export async function autenticar(
  req: RequestAutenticado,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization =
      req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        mensaje:
          "No se proporcionó el token de autenticación."
      });
    }

    if (
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        mensaje:
          "Formato de autorización inválido."
      });
    }

    const accessToken =
      authorization
        .substring(7)
        .trim();

    if (!accessToken) {
      return res.status(401).json({
        mensaje:
          "El token de autenticación está vacío."
      });
    }

    /*
     * Validamos el access_token directamente
     * contra Supabase Auth.
     */
    const {
      data: { user },
      error: authError
    } =
      await supabase.auth.getUser(
        accessToken
      );

    if (
      authError ||
      !user
    ) {
      console.error(
        "ERROR VALIDANDO ACCESS TOKEN:"
      );

      console.error(
        authError
      );

      return res.status(401).json({
        mensaje:
          "Sesión inválida o expirada."
      });
    }

    /*
     * Creamos un cliente asociado al access_token
     * del usuario actual.
     *
     * Las consultas realizadas mediante este cliente
     * respetan las políticas RLS.
     */
    const supabaseUsuario =
      createClient(
        process.env
          .SUPABASE_URL!,
        process.env
          .SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`
            }
          }
        }
      );

    /*
     * Buscamos el perfil correspondiente
     * al usuario autenticado.
     */
    const {
      data: usuario,
      error: usuarioError
    } =
      await supabaseUsuario
        .from("usuarios")
        .select(
          "id, nombre_completo, usuario, rol, estado, auth_user_id"
        )
        .eq(
          "auth_user_id",
          user.id
        )
        .maybeSingle();

    if (usuarioError) {
      console.error(
        "ERROR CONSULTANDO USUARIO AUTENTICADO:"
      );

      console.error(
        usuarioError
      );

      return res.status(500).json({
        mensaje:
          "Error consultando el usuario autenticado."
      });
    }

    if (!usuario) {
      return res.status(403).json({
        mensaje:
          "El usuario no tiene un perfil configurado."
      });
    }

    /*
     * Un usuario inactivo no puede utilizar
     * ninguna ruta protegida.
     */
    if (
      usuario.estado !==
      "ACTIVO"
    ) {
      return res.status(403).json({
        mensaje:
          "El usuario está inactivo."
      });
    }

    /*
     * Guardamos el usuario autenticado
     * dentro de req.usuario.
     */
    req.usuario =
      usuario;

    next();
  } catch (error) {
    console.error(
      "ERROR INESPERADO EN AUTENTICACIÓN:"
    );

    console.error(
      error
    );

    return res.status(500).json({
      mensaje:
        "Error interno de autenticación."
    });
  }
}

/* =========================================================
   VERIFICAR ROL
========================================================= */

export function requireRole(
  rolRequerido: string
) {
  return (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
  ) => {
    const usuario =
      req.usuario;

    if (!usuario) {
      return res.status(401).json({
        mensaje:
          "Usuario no autenticado."
      });
    }

    if (
      usuario.estado !==
      "ACTIVO"
    ) {
      return res.status(403).json({
        mensaje:
          "El usuario está inactivo."
      });
    }

    if (
      usuario.rol !==
      rolRequerido
    ) {
      return res.status(403).json({
        mensaje:
          "No tienes permisos para realizar esta operación."
      });
    }

    next();
  };
}