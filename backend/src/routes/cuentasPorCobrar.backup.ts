import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { autenticar } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const {
        data: cuentas,
        error: cuentasError
      } = await supabaseAdmin
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
        .order("fecha_emision", {
          ascending: false
        });

      if (cuentasError) {
        console.error(
          "ERROR CONSULTANDO CUENTAS POR COBRAR:"
        );
        console.error(cuentasError);

        return res.status(500).json({
          mensaje:
            "Error consultando las cuentas por cobrar."
        });
      }

      const resultado = (cuentas ?? []).map(
        (cuenta) => {
          const cliente = Array.isArray(
            cuenta.clientes
          )
            ? cuenta.clientes[0] ?? null
            : cuenta.clientes ?? null;

          const venta = Array.isArray(
            cuenta.ventas
          )
            ? cuenta.ventas[0] ?? null
            : cuenta.ventas ?? null;

          return {
            id: cuenta.id,
            venta_id: cuenta.venta_id,
            cliente_id: cuenta.cliente_id,

            monto_original: Number(
              cuenta.monto_original
            ),

            monto_pagado: Number(
              cuenta.monto_pagado
            ),

            saldo_pendiente: Number(
              cuenta.saldo_pendiente
            ),

            fecha_emision:
              cuenta.fecha_emision,

            fecha_vencimiento:
              cuenta.fecha_vencimiento,

            estado: cuenta.estado,

            observaciones:
              cuenta.observaciones,

            creado_en:
              cuenta.creado_en,

            actualizado_en:
              cuenta.actualizado_en,

            cliente,

            venta
          };
        }
      );

      return res.json({
        cuentas: resultado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO EN CUENTAS POR COBRAR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando las cuentas por cobrar."
      });
    }
  }
);

export default router;