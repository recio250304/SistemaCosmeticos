import express from "express";
import cors from "cors";

import { supabase } from "./config/supabase.js";
import { supabaseAdmin } from "./config/supabaseAdmin.js";

import protegidoRoutes from "./routes/protegido.js";
import operadoresRoutes from "./routes/operadores.js";
import clientesRoutes from "./routes/clientes.js";
import proveedoresRoutes from "./routes/proveedores.js";
import productosRoutes from "./routes/productos.js";
import inventarioRoutes from "./routes/inventario.js";
import rutasRoutes from "./routes/rutas.js";
import ventasRoutes from "./routes/ventas.js";
import cajaRoutes from "./routes/caja.js";
import bancosRoutes from "./routes/bancos.js";
import cuentasPorCobrarRoutes from "./routes/cuentasPorCobrar.js";
import cuentasPorPagarRoutes from "./routes/cuentasPorPagar.js";
import gastosOperacionalesRoutes from "./routes/gastosOperacionales.js";
import nominaRoutes from "./routes/nomina.js";

import {
  autenticar,
  RequestAutenticado
} from "./middleware/auth.js";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(cors());

app.use(express.json());

/*
 * =========================================================
 * RUTA PRINCIPAL
 * =========================================================
 */

app.get("/", (_req, res) => {
  res.json({
    mensaje:
      "Backend del Sistema de Cosméticos funcionando correctamente",
    estado: "OK"
  });
});

/*
 * =========================================================
 * PRUEBA DE CONFIGURACIÓN
 * =========================================================
 */

app.get("/api/config-test", (_req, res) => {
  res.json({
    backend: "OK",
    supabase: "CONFIGURADO"
  });
});

/*
 * =========================================================
 * AUTH
 * =========================================================
 */

/*
 * =========================================================
 * LOGIN
 *
 * Acepta:
 *
 * 1. email + password
 *    Para la aplicación web.
 *
 * 2. usuario + password
 *    Para la aplicación Android.
 *
 * El backend resuelve internamente el correo de
 * Supabase Auth cuando se utiliza "usuario".
 * =========================================================
 */

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const {
        email,
        usuario,
        password
      } = req.body;

      /*
       * La contraseña siempre es obligatoria.
       */
      if (!password) {
        return res.status(400).json({
          mensaje:
            "La contraseña es obligatoria."
        });
      }

      /*
       * =====================================================
       * DETERMINAR CREDENCIAL
       * =====================================================
       */

      let emailAutenticacion: string | null =
        null;

      /*
       * -----------------------------------------------------
       * OPCIÓN 1: LOGIN MEDIANTE EMAIL
       * -----------------------------------------------------
       */

      if (
        typeof email === "string" &&
        email.trim()
      ) {
        emailAutenticacion =
          email.trim();
      }

      /*
       * -----------------------------------------------------
       * OPCIÓN 2: LOGIN MEDIANTE USUARIO
       * -----------------------------------------------------
       */

      else if (
        typeof usuario === "string" &&
        usuario.trim()
      ) {
        const usuarioBuscado =
          usuario.trim();

        /*
         * Buscamos el perfil del usuario.
         *
         * Se utiliza supabaseAdmin porque esta operación
         * ocurre exclusivamente en el backend.
         */
        const {
          data: perfil,
          error: perfilError
        } = await supabaseAdmin
          .from("usuarios")
          .select(
            "id, nombre_completo, usuario, rol, estado, auth_user_id"
          )
          .eq(
            "usuario",
            usuarioBuscado
          )
          .maybeSingle();

        if (perfilError) {
          console.error(
            "ERROR BUSCANDO USUARIO PARA LOGIN:"
          );

          console.error(
            perfilError
          );

          return res.status(500).json({
            mensaje:
              "Error consultando el usuario."
          });
        }

        if (!perfil) {
          return res.status(401).json({
            mensaje:
              "Usuario o contraseña incorrectos."
          });
        }

        /*
         * Un usuario sin auth_user_id no puede
         * iniciar sesión mediante Supabase Auth.
         */
        if (!perfil.auth_user_id) {
          return res.status(403).json({
            mensaje:
              "El usuario no tiene configurada su autenticación."
          });
        }

        /*
         * Si el usuario está inactivo, rechazamos
         * el acceso antes de intentar autenticación.
         */
        if (
          perfil.estado !==
          "ACTIVO"
        ) {
          return res.status(403).json({
            mensaje:
              "El usuario está inactivo."
          });
        }

        /*
         * Obtenemos el usuario real de Supabase Auth
         * utilizando su auth_user_id.
         */
        const {
          data: authUserData,
          error: authUserError
        } =
          await supabaseAdmin.auth.admin.getUserById(
            perfil.auth_user_id
          );

        if (
          authUserError ||
          !authUserData.user
        ) {
          console.error(
            "ERROR OBTENIENDO USUARIO DE SUPABASE AUTH:"
          );

          console.error(
            authUserError
          );

          return res.status(401).json({
            mensaje:
              "No se pudo validar la cuenta del usuario."
          });
        }

        emailAutenticacion =
          authUserData.user.email ??
          null;

        if (!emailAutenticacion) {
          return res.status(401).json({
            mensaje:
              "La cuenta del usuario no tiene un correo de autenticación."
          });
        }
      }

      /*
       * Si no llegó ni email ni usuario.
       */
      else {
        return res.status(400).json({
          mensaje:
            "Debe proporcionar un usuario o correo electrónico."
        });
      }

      /*
       * =====================================================
       * AUTENTICACIÓN REAL CONTRA SUPABASE AUTH
       * =====================================================
       */

      const {
        data,
        error
      } =
        await supabase.auth.signInWithPassword({
          email:
            emailAutenticacion,
          password
        });

      if (error) {
        console.error(
          "ERROR REAL DE SUPABASE AUTH:"
        );

        console.error(
          "message:",
          error.message
        );

        console.error(
          "status:",
          error.status
        );

        console.error(
          "name:",
          error.name
        );

        return res.status(401).json({
          mensaje:
            "Usuario o contraseña incorrectos."
        });
      }

      /*
       * =====================================================
       * VALIDAR SESIÓN DEVUELTA
       * =====================================================
       */

      if (
        !data.user ||
        !data.session
      ) {
        return res.status(401).json({
          mensaje:
            "No se pudo iniciar sesión."
        });
      }

      /*
       * =====================================================
       * BUSCAR PERFIL DEL USUARIO AUTENTICADO
       * =====================================================
       *
       * Utilizamos supabaseAdmin aquí para que la consulta
       * no dependa de las políticas RLS.
       */

      const {
        data: usuarioPerfil,
        error: usuarioError
      } =
        await supabaseAdmin
          .from("usuarios")
          .select(
            "id, nombre_completo, usuario, rol, estado, auth_user_id"
          )
          .eq(
            "auth_user_id",
            data.user.id
          )
          .maybeSingle();

      if (usuarioError) {
        console.error(
          "ERROR CONSULTANDO PERFIL:"
        );

        console.error(
          usuarioError
        );

        return res.status(500).json({
          mensaje:
            "Error consultando el perfil del usuario."
        });
      }

      if (!usuarioPerfil) {
        return res.status(403).json({
          mensaje:
            "El usuario no tiene un perfil configurado."
        });
      }

      /*
       * =====================================================
       * VALIDAR ESTADO
       * =====================================================
       */

      if (
        usuarioPerfil.estado !==
        "ACTIVO"
      ) {
        return res.status(403).json({
          mensaje:
            "El usuario está inactivo."
        });
      }

      /*
       * =====================================================
       * RESPUESTA DEL LOGIN
       * =====================================================
       */

      return res.json({
        mensaje:
          "Inicio de sesión correcto.",

        usuario: {
          id:
            usuarioPerfil.id,

          nombre_completo:
            usuarioPerfil.nombre_completo,

          usuario:
            usuarioPerfil.usuario,

          rol:
            usuarioPerfil.rol,

          estado:
            usuarioPerfil.estado,

          auth_user_id:
            usuarioPerfil.auth_user_id
        },

        session: {
          access_token:
            data.session.access_token,

          refresh_token:
            data.session.refresh_token,

          expires_at:
            data.session.expires_at
        }
      });

    } catch (error) {
      console.error(
        "ERROR INESPERADO EN LOGIN:"
      );

      console.error(
        error
      );

      return res.status(500).json({
        mensaje:
          "Error interno del servidor."
      });
    }
  }
);

/*
 * =========================================================
 * USUARIO AUTENTICADO
 * =========================================================
 */

app.get(
  "/api/auth/me",
  autenticar,
  (
    req: RequestAutenticado,
    res
  ) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje:
          "Usuario no autenticado."
      });
    }

    return res.json({
      mensaje:
        "Acceso autorizado.",

      usuario: {
        id:
          req.usuario.id,

        nombre_completo:
          req.usuario.nombre_completo,

        usuario:
          req.usuario.usuario,

        rol:
          req.usuario.rol,

        estado:
          req.usuario.estado,

        auth_user_id:
          req.usuario.auth_user_id
      }
    });
  }
);

/*
 * =========================================================
 * RUTAS PROTEGIDAS
 * =========================================================
 */

app.use(
  "/api/protegido",
  protegidoRoutes
);

app.use(
  "/api/operadores",
  operadoresRoutes
);

app.use(
  "/api/clientes",
  clientesRoutes
);

app.use(
  "/api/proveedores",
  proveedoresRoutes
);

app.use(
  "/api/productos",
  productosRoutes
);

app.use(
  "/api/inventario",
  inventarioRoutes
);

app.use(
  "/api/rutas",
  rutasRoutes
);

app.use(
  "/api/ventas",
  ventasRoutes
);

app.use(
  "/api/caja",
  cajaRoutes
);

app.use(
  "/api/bancos",
  bancosRoutes
);

app.use(
  "/api/cuentas-por-cobrar",
  cuentasPorCobrarRoutes
);

app.use(
  "/api/cuentas-por-pagar",
  cuentasPorPagarRoutes
);

app.use(
  "/api/gastos-operacionales",
  gastosOperacionalesRoutes
);

app.use(
  "/api/nomina",
  nominaRoutes
);

/*
 * =========================================================
 * SERVER
 * =========================================================
 *
 * 0.0.0.0 permite conexiones desde otros dispositivos
 * de la misma red, incluyendo el teléfono Android.
 */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Servidor ejecutándose en http://localhost:${PORT}`
    );

    console.log(
      `Servidor disponible en todas las interfaces de red.`
    );

    console.log(
      `Puerto utilizado: ${PORT}`
    );
  }
);