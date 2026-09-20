import { Router } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { autenticar } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/*
 * ============================================================
 * LISTAR CUENTAS POR PAGAR
 * GET /api/cuentas-por-pagar
 * ============================================================
 */

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
        .from("cuentas_por_pagar")
        .select(`
          id,
          proveedor_id,
          descripcion,
          monto_original,
          monto_pagado,
          saldo_pendiente,
          fecha_emision,
          fecha_vencimiento,
          estado,
          observaciones,
          creado_en,
          actualizado_en,
          proveedores (
            id,
            nombre,
            nombre_contacto,
            telefono,
            correo,
            ciudad,
            rnc
          )
        `)
        .order("fecha_emision", {
          ascending: false
        });

      if (cuentasError) {
        console.error(
          "ERROR CONSULTANDO CUENTAS POR PAGAR:"
        );
        console.error(cuentasError);

        return res.status(500).json({
          mensaje:
            "Error consultando las cuentas por pagar."
        });
      }

      const resultado = (
        cuentas ?? []
      ).map((cuenta: any) => {
        const proveedor =
          Array.isArray(
            cuenta.proveedores
          )
            ? cuenta.proveedores[0] ??
              null
            : cuenta.proveedores ??
              null;

        return {
          id: cuenta.id,

          proveedor_id:
            cuenta.proveedor_id,

          descripcion:
            cuenta.descripcion,

          monto_original:
            Number(
              cuenta.monto_original
            ),

          monto_pagado:
            Number(
              cuenta.monto_pagado
            ),

          saldo_pendiente:
            Number(
              cuenta.saldo_pendiente
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

          proveedor
        };
      });

      return res.json({
        cuentas: resultado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO EN CUENTAS POR PAGAR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando las cuentas por pagar."
      });
    }
  }
);


/*
 * ============================================================
 * CREAR CUENTA POR PAGAR
 * POST /api/cuentas-por-pagar
 * ============================================================
 */

router.post(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const {
        proveedor_id,
        descripcion,
        monto_original,
        fecha_emision,
        fecha_vencimiento,
        observaciones
      } = req.body;

      if (!proveedor_id) {
        return res.status(400).json({
          mensaje:
            "Debes seleccionar un proveedor."
        });
      }

      if (
        !descripcion ||
        typeof descripcion !== "string" ||
        !descripcion.trim()
      ) {
        return res.status(400).json({
          mensaje:
            "La descripción es obligatoria."
        });
      }

      const monto =
        Number(monto_original);

      if (
        !Number.isFinite(monto) ||
        monto <= 0
      ) {
        return res.status(400).json({
          mensaje:
            "El monto debe ser mayor que cero."
        });
      }

      if (!fecha_emision) {
        return res.status(400).json({
          mensaje:
            "La fecha de emisión es obligatoria."
        });
      }

      /*
       * Verificar que el proveedor exista.
       */

      const {
        data: proveedor,
        error: proveedorError
      } = await supabaseAdmin
        .from("proveedores")
        .select(`
          id,
          nombre,
          activo
        `)
        .eq("id", proveedor_id)
        .maybeSingle();

      if (proveedorError) {
        console.error(
          "ERROR CONSULTANDO PROVEEDOR:"
        );
        console.error(proveedorError);

        return res.status(500).json({
          mensaje:
            "No se pudo verificar el proveedor."
        });
      }

      if (!proveedor) {
        return res.status(404).json({
          mensaje:
            "El proveedor seleccionado no existe."
        });
      }

      if (!proveedor.activo) {
        return res.status(400).json({
          mensaje:
            "El proveedor seleccionado está inactivo."
        });
      }

      /*
       * Crear la cuenta.
       */

      const {
        data: cuenta,
        error: cuentaError
      } = await supabaseAdmin
        .from("cuentas_por_pagar")
        .insert({
          proveedor_id,

          descripcion:
            descripcion.trim(),

          monto_original:
            monto,

          monto_pagado:
            0,

          saldo_pendiente:
            monto,

          fecha_emision,

          fecha_vencimiento:
            fecha_vencimiento ||
            null,

          estado:
            "PENDIENTE",

          observaciones:
            typeof observaciones ===
              "string" &&
            observaciones.trim()
              ? observaciones.trim()
              : null
        })
        .select(`
          id,
          proveedor_id,
          descripcion,
          monto_original,
          monto_pagado,
          saldo_pendiente,
          fecha_emision,
          fecha_vencimiento,
          estado,
          observaciones,
          creado_en,
          actualizado_en
        `)
        .single();

      if (cuentaError) {
        console.error(
          "ERROR CREANDO CUENTA POR PAGAR:"
        );
        console.error(cuentaError);

        return res.status(500).json({
          mensaje:
            "No se pudo crear la cuenta por pagar."
        });
      }

      return res.status(201).json({
        mensaje:
          "Cuenta por pagar creada correctamente.",

        cuenta
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CREANDO CUENTA POR PAGAR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno creando la cuenta por pagar."
      });
    }
  }
);


/*
 * ============================================================
 * HISTORIAL DE PAGOS DE UNA CUENTA
 *
 * GET /api/cuentas-por-pagar/:id/pagos
 *
 * Solo lectura.
 *
 * Devuelve:
 *
 * - información de la cuenta
 * - proveedor
 * - todos los pagos realizados
 * - medio de pago
 * - cuenta bancaria cuando corresponde
 * - referencia
 * - observaciones
 * - fecha del pago
 * ============================================================
 */

router.get(
  "/:id/pagos",
  autenticar,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      /*
       * Buscar la cuenta por pagar.
       */

      const {
        data: cuenta,
        error: cuentaError
      } = await supabaseAdmin
        .from("cuentas_por_pagar")
        .select(`
          id,
          proveedor_id,
          descripcion,
          monto_original,
          monto_pagado,
          saldo_pendiente,
          fecha_emision,
          fecha_vencimiento,
          estado,
          observaciones,
          proveedores (
            id,
            nombre
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (cuentaError) {
        console.error(
          "ERROR CONSULTANDO CUENTA PARA HISTORIAL:"
        );
        console.error(cuentaError);

        return res.status(500).json({
          mensaje:
            "No se pudo consultar la cuenta por pagar."
        });
      }

      if (!cuenta) {
        return res.status(404).json({
          mensaje:
            "La cuenta por pagar no existe."
        });
      }

      /*
       * Buscar los pagos realizados.
       */

      const {
        data: pagos,
        error: pagosError
      } = await supabaseAdmin
        .from("pagos_proveedores")
        .select(`
          id,
          cuenta_por_pagar_id,
          proveedor_id,
          monto,
          medio_pago,
          cuenta_bancaria_id,
          fecha_pago,
          referencia,
          observaciones,
          creado_en,
          cuentas_bancarias (
            id,
            nombre,
            banco,
            numero_cuenta,
            tipo_cuenta,
            moneda
          )
        `)
        .eq(
          "cuenta_por_pagar_id",
          id
        )
        .order(
          "fecha_pago",
          {
            ascending: false
          }
        );

      if (pagosError) {
        console.error(
          "ERROR CONSULTANDO HISTORIAL DE PAGOS:"
        );
        console.error(pagosError);

        return res.status(500).json({
          mensaje:
            "No se pudo consultar el historial de pagos."
        });
      }

      /*
       * Normalizar proveedor.
       */

      const proveedor =
        Array.isArray(
          cuenta.proveedores
        )
          ? cuenta.proveedores[0] ??
            null
          : cuenta.proveedores ??
            null;

      /*
       * Normalizar pagos.
       */

      const resultado = (
        pagos ?? []
      ).map((pago: any) => {
        const cuentaBancaria =
          Array.isArray(
            pago.cuentas_bancarias
          )
            ? pago.cuentas_bancarias[0] ??
              null
            : pago.cuentas_bancarias ??
              null;

        return {
          id:
            pago.id,

          cuenta_por_pagar_id:
            pago.cuenta_por_pagar_id,

          proveedor_id:
            pago.proveedor_id,

          monto:
            Number(
              pago.monto
            ),

          medio_pago:
            pago.medio_pago,

          cuenta_bancaria_id:
            pago.cuenta_bancaria_id,

          fecha_pago:
            pago.fecha_pago,

          referencia:
            pago.referencia,

          observaciones:
            pago.observaciones,

          creado_en:
            pago.creado_en,

          cuenta_bancaria:
            cuentaBancaria
        };
      });

      /*
       * Respuesta final.
       */

      return res.json({
        cuenta: {
          id:
            cuenta.id,

          proveedor_id:
            cuenta.proveedor_id,

          proveedor,

          descripcion:
            cuenta.descripcion,

          monto_original:
            Number(
              cuenta.monto_original
            ),

          monto_pagado:
            Number(
              cuenta.monto_pagado
            ),

          saldo_pendiente:
            Number(
              cuenta.saldo_pendiente
            ),

          fecha_emision:
            cuenta.fecha_emision,

          fecha_vencimiento:
            cuenta.fecha_vencimiento,

          estado:
            cuenta.estado,

          observaciones:
            cuenta.observaciones
        },

        pagos:
          resultado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO HISTORIAL:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando el historial de pagos."
      });
    }
  }
);


/*
 * ============================================================
 * REGISTRAR PAGO A PROVEEDOR
 *
 * POST /api/cuentas-por-pagar/:id/pago
 *
 * El trabajo real se realiza mediante la función PostgreSQL:
 *
 * registrar_pago_proveedor
 *
 * Esto permite que:
 *
 * - pago_proveedor
 * - cuenta por pagar
 * - caja
 * - banco
 *
 * se actualicen como una sola operación.
 * ============================================================
 */

router.post(
  "/:id/pago",
  autenticar,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      const {
        monto,
        medio_pago,
        cuenta_bancaria_id,
        referencia,
        observaciones
      } = req.body;

      const montoNumerico =
        Number(monto);

      if (
        !Number.isFinite(
          montoNumerico
        ) ||
        montoNumerico <= 0
      ) {
        return res.status(400).json({
          mensaje:
            "El monto del pago debe ser mayor que cero."
        });
      }

      if (
        medio_pago !== "EFECTIVO" &&
        medio_pago !== "TRANSFERENCIA"
      ) {
        return res.status(400).json({
          mensaje:
            "El medio de pago debe ser EFECTIVO o TRANSFERENCIA."
        });
      }

      if (
        medio_pago ===
          "TRANSFERENCIA" &&
        !cuenta_bancaria_id
      ) {
        return res.status(400).json({
          mensaje:
            "Debes seleccionar una cuenta bancaria."
        });
      }

      if (
        medio_pago ===
          "EFECTIVO" &&
        cuenta_bancaria_id
      ) {
        return res.status(400).json({
          mensaje:
            "Un pago en efectivo no debe tener cuenta bancaria."
        });
      }

      /*
       * Llamar a la función PostgreSQL.
       */

      const {
        data,
        error
      } = await supabaseAdmin.rpc(
        "registrar_pago_proveedor",
        {
          p_cuenta_por_pagar_id:
            id,

          p_monto:
            montoNumerico,

          p_medio_pago:
            medio_pago,

          p_cuenta_bancaria_id:
            cuenta_bancaria_id ||
            null,

          p_referencia:
            typeof referencia ===
              "string" &&
            referencia.trim()
              ? referencia.trim()
              : null,

          p_observaciones:
            typeof observaciones ===
              "string" &&
            observaciones.trim()
              ? observaciones.trim()
              : null
        }
      );

      if (error) {
        console.error(
          "ERROR REGISTRANDO PAGO A PROVEEDOR:"
        );
        console.error(error);

        return res.status(400).json({
          mensaje:
            error.message ||
            "No se pudo registrar el pago."
        });
      }

      return res.json(data);
    } catch (error) {
      console.error(
        "ERROR INESPERADO REGISTRANDO PAGO:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno registrando el pago al proveedor."
      });
    }
  }
);

export default router;