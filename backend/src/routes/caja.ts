import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { autenticar } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/*
  GET /
  Obtiene el resumen de la Caja Principal.

  El saldo se calcula directamente desde
  movimientos_caja:

  ENTRADAS:
  COBRO_VENTA
  DEPOSITO

  SALIDAS:
  GASTO
  RETIRO
  PAGO_PROVEEDOR
  PAGO_NOMINA

  AJUSTE:
  Se interpreta según su monto:
  positivo = entrada
  negativo = salida
*/

router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const { data: caja, error: cajaError } =
        await supabaseAdmin
          .from("cajas")
          .select(
            "id, nombre, descripcion, activa, creado_en, actualizado_en"
          )
          .eq("nombre", "Caja Principal")
          .eq("activa", true)
          .maybeSingle();

      if (cajaError) {
        console.error(
          "ERROR CONSULTANDO CAJA:"
        );
        console.error(cajaError);

        return res.status(500).json({
          mensaje:
            "Error consultando la caja."
        });
      }

      if (!caja) {
        return res.status(404).json({
          mensaje:
            "No existe una Caja Principal activa."
        });
      }

      const { data: movimientos, error: movimientosError } =
        await supabaseAdmin
          .from("movimientos_caja")
          .select(
            "id, operador_id, ruta_id, pago_id, tipo, monto, descripcion, creado_en, caja_id"
          )
          .eq("caja_id", caja.id)
          .order("creado_en", {
            ascending: false
          });

      if (movimientosError) {
        console.error(
          "ERROR CONSULTANDO MOVIMIENTOS DE CAJA:"
        );
        console.error(movimientosError);

        return res.status(500).json({
          mensaje:
            "Error consultando los movimientos de caja."
        });
      }

      let totalEntradas = 0;
      let totalSalidas = 0;

      for (const movimiento of movimientos ?? []) {
        const monto = Number(movimiento.monto) || 0;

        if (
          movimiento.tipo ===
            "COBRO_VENTA" ||
          movimiento.tipo ===
            "DEPOSITO"
        ) {
          totalEntradas += monto;
        } else if (
          movimiento.tipo ===
            "GASTO" ||
          movimiento.tipo ===
            "RETIRO" ||
          movimiento.tipo ===
            "PAGO_PROVEEDOR" ||
          movimiento.tipo ===
            "PAGO_NOMINA"
        ) {
          totalSalidas += monto;
        } else if (
          movimiento.tipo ===
            "AJUSTE"
        ) {
          if (monto >= 0) {
            totalEntradas += monto;
          } else {
            totalSalidas += Math.abs(monto);
          }
        }
      }

      const saldo =
        totalEntradas - totalSalidas;

      return res.json({
        caja: {
          id: caja.id,
          nombre: caja.nombre,
          descripcion: caja.descripcion,
          activa: caja.activa
        },

        resumen: {
          total_entradas:
            Number(totalEntradas.toFixed(2)),

          total_salidas:
            Number(totalSalidas.toFixed(2)),

          saldo:
            Number(saldo.toFixed(2))
        },

        movimientos:
          movimientos ?? []
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO EN CAJA:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando la caja."
      });
    }
  }
);

export default router;