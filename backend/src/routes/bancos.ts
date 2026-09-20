import { Router, Response } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// ============================================================
// GET /api/bancos/para-cobro
//
// Endpoint seguro para seleccionar una cuenta bancaria
// al registrar un cobro por TRANSFERENCIA o TARJETA.
//
// ADMIN y OPERADOR pueden utilizarlo.
//
// IMPORTANTE:
// Este endpoint NO devuelve:
// - saldo
// - movimientos bancarios
// - número de cuenta
// - información financiera
//
// Solamente devuelve los datos mínimos necesarios para
// identificar la cuenta que recibirá el cobro.
// ============================================================

router.get(
  "/para-cobro",
  autenticar,
  requireRole("ADMIN", "OPERADOR"),
  async (
    _req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const {
        data: cuentas,
        error
      } = await supabaseAdmin
        .from("cuentas_bancarias")
        .select("id, nombre, banco")
        .eq("activa", true)
        .order("nombre", {
          ascending: true
        });

      if (error) {
        console.error(
          "ERROR OBTENIENDO CUENTAS BANCARIAS PARA COBRO:"
        );

        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudieron cargar las cuentas bancarias para cobro."
        });
      }

      return res.json({
        cuentas: cuentas ?? []
      });

    } catch (error) {
      console.error(
        "ERROR INESPERADO OBTENIENDO CUENTAS PARA COBRO:"
      );

      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno del servidor."
      });
    }
  }
);

// ============================================================
// GET /api/bancos
//
// INFORMACIÓN COMPLETA DE LAS CUENTAS BANCARIAS.
//
// SOLO ADMIN.
//
// El OPERADOR no puede acceder a esta información.
// ============================================================

router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (
    _req: RequestAutenticado,
    res: Response
  ) => {
    try {

      // ========================================================
      // CUENTAS BANCARIAS
      // ========================================================

      const {
        data: cuentas,
        error: cuentasError
      } = await supabaseAdmin
        .from("cuentas_bancarias")
        .select(
          "id, nombre, banco, numero_cuenta, tipo_cuenta, moneda, activa"
        )
        .order("nombre", {
          ascending: true
        });

      if (cuentasError) {
        console.error(
          "ERROR OBTENIENDO CUENTAS BANCARIAS:"
        );

        console.error(
          cuentasError
        );

        return res.status(500).json({
          mensaje:
            "No se pudieron cargar las cuentas bancarias."
        });
      }

      // ========================================================
      // MOVIMIENTOS BANCARIOS
      // ========================================================

      const {
        data: movimientos,
        error: movimientosError
      } = await supabaseAdmin
        .from("movimientos_bancarios")
        .select(`
          id,
          cuenta_bancaria_id,
          tipo,
          monto,
          referencia,
          pago_id,
          pago_nomina_id,
          descripcion,
          creado_en
        `)
        .order("creado_en", {
          ascending: false
        });

      if (movimientosError) {
        console.error(
          "ERROR OBTENIENDO MOVIMIENTOS BANCARIOS:"
        );

        console.error(
          movimientosError
        );

        return res.status(500).json({
          mensaje:
            "No se pudieron cargar los movimientos bancarios."
        });
      }

      // ========================================================
      // CALCULAR SALDO DE CADA CUENTA
      // ========================================================

      const cuentasConSaldo =
        (cuentas ?? []).map(
          (cuenta) => {

            let saldo = 0;

            const movimientosCuenta =
              (movimientos ?? []).filter(
                (movimiento) =>
                  movimiento.cuenta_bancaria_id ===
                  cuenta.id
              );

            for (
              const movimiento
              of movimientosCuenta
            ) {

              const monto =
                Number(
                  movimiento.monto
                ) || 0;

              // ------------------------------------------------
              // ENTRADAS
              // ------------------------------------------------

              if (
                [
                  "INGRESO",
                  "COBRO_VENTA",
                  "DEPOSITO",
                  "TRANSFERENCIA_ENTRADA"
                ].includes(
                  movimiento.tipo
                )
              ) {
                saldo += monto;
                continue;
              }

              // ------------------------------------------------
              // SALIDAS
              // ------------------------------------------------

              if (
                [
                  "EGRESO",
                  "GASTO",
                  "PAGO_PROVEEDOR",
                  "PAGO_NOMINA",
                  "RETIRO",
                  "TRANSFERENCIA_SALIDA"
                ].includes(
                  movimiento.tipo
                )
              ) {
                saldo -= monto;
                continue;
              }

              // ------------------------------------------------
              // AJUSTE
              // ------------------------------------------------

              if (
                movimiento.tipo ===
                "AJUSTE"
              ) {
                saldo += monto;
              }
            }

            return {
              ...cuenta,
              saldo:
                Number(
                  saldo.toFixed(2)
                )
            };
          }
        );

      // ========================================================
      // RESPUESTA COMPLETA
      //
      // SOLO ADMIN
      // ========================================================

      return res.json({
        cuentas:
          cuentasConSaldo,

        movimientos:
          movimientos ?? []
      });

    } catch (error) {

      console.error(
        "ERROR INESPERADO OBTENIENDO INFORMACIÓN BANCARIA:"
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