import { Router, Response } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/* =========================================================
   LISTAR CUENTAS POR COBRAR

   ADMIN:
   - Puede ver todas las cuentas pendientes.

   OPERADOR:
   - Solo puede ver las cuentas relacionadas
     con sus propias ventas.
========================================================= */

router.get(
  "/",
  autenticar,
  requireRole("ADMIN", "OPERADOR"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const usuario = req.usuario;

      if (!usuario) {
        return res.status(401).json({
          mensaje: "Usuario no autenticado."
        });
      }

      /* =====================================================
         1. OBTENER IDs DE VENTAS DEL OPERADOR

         Para ADMIN no necesitamos este paso.
      ===================================================== */

      let idsVentasOperador: string[] | null = null;

      if (usuario.rol === "OPERADOR") {
        const {
          data: ventasOperador,
          error: ventasError
        } = await supabaseAdmin
          .from("ventas")
          .select("id")
          .eq("operador_id", usuario.id);

        if (ventasError) {
          console.error(
            "ERROR OBTENIENDO VENTAS DEL OPERADOR:"
          );
          console.error(ventasError);

          return res.status(500).json({
            mensaje:
              "Error consultando las ventas del operador.",
            error: ventasError.message
          });
        }

        idsVentasOperador =
          (ventasOperador ?? []).map(
            (venta) => venta.id
          );

        /* =================================================
           Si el operador no tiene ventas todavía,
           devolvemos una lista vacía.
        ================================================= */

        if (idsVentasOperador.length === 0) {
          return res.json({
            cuentas: []
          });
        }
      }

      /* =====================================================
         2. CONSULTAR CUENTAS POR COBRAR

         Solamente mostramos cuentas con saldo pendiente
         mayor que cero.
      ===================================================== */

      let consulta = supabaseAdmin
        .from("cuentas_por_cobrar")
        .select(`
          id,
          venta_id,
          cliente_id,
          monto_original,
          monto_pagado,
          saldo_pendiente,
          fecha_emision,
          fecha_vencimiento,
          estado,
          observaciones,
          creado_en,
          actualizado_en,

          clientes (
            id,
            nombre_negocio,
            tipo,
            nombre_contacto,
            telefono
          ),

          ventas (
            id,
            numero_venta,
            total,
            total_pagado,
            saldo_pendiente,
            estado,
            fecha_venta,
            operador_id,
            ruta_id
          )
        `)
        .gt(
          "saldo_pendiente",
          0
        )
        .order(
          "fecha_emision",
          {
            ascending: false
          }
        );

      /* =====================================================
         3. FILTRO PARA OPERADOR

         El operador solamente puede consultar las cuentas
         correspondientes a sus propias ventas.
      ===================================================== */

      if (
        usuario.rol === "OPERADOR" &&
        idsVentasOperador !== null
      ) {
        consulta = consulta.in(
          "venta_id",
          idsVentasOperador
        );
      }

      /* =====================================================
         4. EJECUTAR CONSULTA
      ===================================================== */

      const {
        data,
        error
      } = await consulta;

      if (error) {
        console.error(
          "ERROR LISTANDO CUENTAS POR COBRAR:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "Error consultando las cuentas por cobrar.",
          error: error.message
        });
      }

      /* =====================================================
         5. NORMALIZAR DATOS

         Supabase puede devolver las relaciones como objetos
         o como arrays dependiendo de cómo estén definidas
         las relaciones en la base de datos.

         Android espera específicamente:

         clientes
         ventas
      ===================================================== */

      const resultado = (data ?? []).map(
        (cuenta: any) => {
          const cliente =
            Array.isArray(cuenta.clientes)
              ? cuenta.clientes[0] ?? null
              : cuenta.clientes ?? null;

          const venta =
            Array.isArray(cuenta.ventas)
              ? cuenta.ventas[0] ?? null
              : cuenta.ventas ?? null;

          return {
            id: cuenta.id,

            venta_id:
              cuenta.venta_id,

            cliente_id:
              cuenta.cliente_id,

            monto_original:
              Number(
                cuenta.monto_original ?? 0
              ),

            monto_pagado:
              Number(
                cuenta.monto_pagado ?? 0
              ),

            saldo_pendiente:
              Number(
                cuenta.saldo_pendiente ?? 0
              ),

            fecha_emision:
              cuenta.fecha_emision,

            fecha_vencimiento:
              cuenta.fecha_vencimiento,

            estado:
              cuenta.estado,

            observaciones:
              cuenta.observaciones,

            creado_en:
              cuenta.creado_en,

            actualizado_en:
              cuenta.actualizado_en,

            /* =================================================
               IMPORTANTE:

               Android/pantalla_cobros.dart utiliza:

               cuenta['clientes']
               cuenta['ventas']
            ================================================= */

            clientes:
              cliente,

            ventas:
              venta
          };
        }
      );

      /* =====================================================
         6. RESPUESTA
      ===================================================== */

      return res.json({
        cuentas: resultado
      });

    } catch (error) {
      console.error(
        "ERROR INESPERADO LISTANDO CUENTAS POR COBRAR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno del servidor."
      });
    }
  }
);

export default router;