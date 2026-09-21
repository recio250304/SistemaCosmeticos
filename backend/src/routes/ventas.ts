import { Router, Response } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/* =========================================================
   LISTAR VENTAS
   Solo ADMIN
========================================================= */

router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const { data, error } =
        await supabaseAdmin
          .from("ventas")
          .select(`
            id,
            numero_venta,
            cliente_id,
            operador_id,
            ruta_id,
            subtotal,
            descuento,
            total,
            total_pagado,
            saldo_pendiente,
            estado,
            fecha_venta,
            creado_en,
            actualizado_en,
            clientes (
              id,
              nombre_negocio,
              nombre_contacto,
              telefono
            ),
            usuarios (
              id,
              nombre_completo,
              usuario
            ),
            cuentas_por_cobrar (
              id,
              venta_id,
              monto_original,
              monto_pagado,
              saldo_pendiente,
              estado,
              fecha_vencimiento,
              actualizado_en
            )
          `)
          .order(
            "numero_venta",
            {
              ascending: false
            }
          );

      if (error) {
        console.error(
          "ERROR LISTANDO VENTAS:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "Error consultando las ventas.",
          error: error.message
        });
      }

      return res.json({
        ventas: data ?? []
      });

    } catch (error) {
      console.error(
        "ERROR INESPERADO LISTANDO VENTAS:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno del servidor."
      });
    }
  }
);

/* =========================================================
   OBTENER UNA VENTA
   Solo ADMIN
========================================================= */

router.get(
  "/:id",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const ventaId =
        req.params.id;

      if (!ventaId) {
        return res.status(400).json({
          mensaje:
            "El ID de la venta es obligatorio."
        });
      }

      const {
        data: venta,
        error: ventaError
      } =
        await supabaseAdmin
          .from("ventas")
          .select(`
            id,
            numero_venta,
            cliente_id,
            operador_id,
            ruta_id,
            subtotal,
            descuento,
            total,
            total_pagado,
            saldo_pendiente,
            estado,
            fecha_venta,
            creado_en,
            actualizado_en,
            clientes (
              id,
              nombre_negocio,
              nombre_contacto,
              telefono,
              direccion
            ),
            usuarios (
              id,
              nombre_completo,
              usuario,
              rol
            ),
            rutas (
              id,
              fecha,
              estado,
              hora_salida,
              hora_cierre
            ),
            cuentas_por_cobrar (
              id,
              venta_id,
              monto_original,
              monto_pagado,
              saldo_pendiente,
              estado,
              fecha_vencimiento,
              actualizado_en
            )
          `)
          .eq(
            "id",
            ventaId
          )
          .maybeSingle();

      if (ventaError) {
        console.error(
          "ERROR CONSULTANDO VENTA:"
        );
        console.error(ventaError);

        return res.status(500).json({
          mensaje:
            "Error consultando la venta.",
          error: ventaError.message
        });
      }

      if (!venta) {
        return res.status(404).json({
          mensaje:
            "La venta no existe."
        });
      }

      const {
        data: detalles,
        error: detallesError
      } =
        await supabaseAdmin
          .from("venta_detalles")
          .select(`
            id,
            venta_id,
            producto_id,
            kit_id,
            cantidad,
            precio_unitario,
            subtotal,
            productos (
              id,
              codigo,
              nombre,
              precio,
              costo,
              tipo
            ),
            kits (
              id,
              nombre,
              precio,
              tipo,
              activo
            )
          `)
          .eq(
            "venta_id",
            ventaId
          );

      if (detallesError) {
        console.error(
          "ERROR CONSULTANDO DETALLES:"
        );
        console.error(detallesError);

        return res.status(500).json({
          mensaje:
            "Error consultando los detalles de la venta.",
          error:
            detallesError.message
        });
      }

      const {
        data: pagos,
        error: pagosError
      } =
        await supabaseAdmin
          .from("pagos")
          .select(`
            id,
            venta_id,
            cliente_id,
            operador_id,
            ruta_id,
            monto,
            fecha_pago,
            observaciones,
            medio_pago,
            cuenta_bancaria_id,
            creado_en
          `)
          .eq(
            "venta_id",
            ventaId
          )
          .order(
            "fecha_pago",
            {
              ascending: true
            }
          );

      if (pagosError) {
        console.error(
          "ERROR CONSULTANDO PAGOS:"
        );
        console.error(pagosError);

        return res.status(500).json({
          mensaje:
            "Error consultando los pagos de la venta.",
          error:
            pagosError.message
        });
      }

      return res.json({
        venta,
        detalles:
          detalles ?? [],
        pagos:
          pagos ?? []
      });

    } catch (error) {
      console.error(
        "ERROR INESPERADO OBTENIENDO VENTA:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno del servidor."
      });
    }
  }
);

/* =========================================================
   CREAR VENTA
   SOLO OPERADOR
========================================================= */

router.post(
  "/",
  autenticar,
  requireRole("OPERADOR"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const {
        cliente_id,
        ruta_id,
        descuento = 0,
        detalles
      } = req.body;

      if (!cliente_id) {
        return res.status(400).json({
          mensaje:
            "El cliente_id es obligatorio."
        });
      }

      if (!ruta_id) {
        return res.status(400).json({
          mensaje:
            "El ruta_id es obligatorio."
        });
      }

      if (
        !Array.isArray(detalles) ||
        detalles.length === 0
      ) {
        return res.status(400).json({
          mensaje:
            "La venta debe contener al menos un detalle."
        });
      }

      if (
        typeof descuento !==
          "number" ||
        !Number.isFinite(
          descuento
        ) ||
        descuento < 0
      ) {
        return res.status(400).json({
          mensaje:
            "El descuento no es válido."
        });
      }

      for (
        const detalle of detalles
      ) {
        if (
          !detalle ||
          typeof detalle !==
            "object"
        ) {
          return res.status(400).json({
            mensaje:
              "Uno de los detalles de la venta no es válido."
          });
        }

        const tieneProducto =
          !!detalle.producto_id;

        const tieneKit =
          !!detalle.kit_id;

        if (
          tieneProducto ===
          tieneKit
        ) {
          return res.status(400).json({
            mensaje:
              "Cada detalle debe contener exactamente un producto_id o un kit_id."
          });
        }

        if (
          !Number.isInteger(
            detalle.cantidad
          ) ||
          detalle.cantidad <= 0
        ) {
          return res.status(400).json({
            mensaje:
              "La cantidad debe ser un número entero mayor que cero."
          });
        }
      }

      const operadorId =
        req.usuario?.id;

      if (!operadorId) {
        return res.status(401).json({
          mensaje:
            "No se pudo identificar al operador autenticado."
        });
      }

      const {
        data,
        error
      } =
        await supabaseAdmin.rpc(
          "registrar_venta",
          {
            p_cliente_id:
              cliente_id,

            p_operador_id:
              operadorId,

            p_ruta_id:
              ruta_id,

            p_descuento:
              descuento,

            p_detalles:
              detalles
          }
        );

      if (error) {
        console.error(
          "ERROR RPC registrar_venta:"
        );
        console.error(error);

        return res.status(400).json({
          mensaje:
            "No se pudo registrar la venta.",
          error:
            error.message
        });
      }

      return res.status(201).json({
        mensaje:
          "Venta registrada correctamente.",
        venta: data
      });

    } catch (error) {
      console.error(
        "ERROR INESPERADO REGISTRANDO VENTA:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno del servidor."
      });
    }
  }
);

/* =========================================================
   REGISTRAR PAGO
   ADMIN u OPERADOR
========================================================= */

router.post(
  "/:id/pagos",
  autenticar,
  requireRole(
    "ADMIN",
    "OPERADOR"
  ),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const ventaId =
        req.params.id;

      if (!ventaId) {
        return res.status(400).json({
          mensaje:
            "El ID de la venta es obligatorio."
        });
      }

      const {
        monto,
        medio_pago,
        cuenta_bancaria_id =
          null,
        referencia = null,
        observaciones = null
      } = req.body;

      if (
        typeof monto !==
          "number" ||
        !Number.isFinite(
          monto
        ) ||
        monto <= 0
      ) {
        return res.status(400).json({
          mensaje:
            "El monto debe ser un número mayor que cero."
        });
      }

      if (
        typeof medio_pago !==
          "string" ||
        !medio_pago.trim()
      ) {
        return res.status(400).json({
          mensaje:
            "El medio_pago es obligatorio."
        });
      }

      const medioPagoNormalizado =
        medio_pago
          .trim()
          .toUpperCase();

      const mediosPermitidos = [
        "EFECTIVO",
        "TRANSFERENCIA",
        "TARJETA"
      ];

      if (
        !mediosPermitidos.includes(
          medioPagoNormalizado
        )
      ) {
        return res.status(400).json({
          mensaje:
            "Medio de pago inválido. Usa EFECTIVO, TRANSFERENCIA o TARJETA."
        });
      }

      if (
        medioPagoNormalizado !==
          "EFECTIVO" &&
        !cuenta_bancaria_id
      ) {
        return res.status(400).json({
          mensaje:
            "Debes indicar una cuenta bancaria para pagos por transferencia o tarjeta."
        });
      }

      if (
        medioPagoNormalizado ===
          "EFECTIVO" &&
        cuenta_bancaria_id
      ) {
        return res.status(400).json({
          mensaje:
            "Un pago en efectivo no debe tener cuenta bancaria."
        });
      }

      const operadorId =
        req.usuario?.id;

      if (!operadorId) {
        return res.status(401).json({
          mensaje:
            "No se pudo identificar al usuario autenticado."
        });
      }

      const {
        data,
        error
      } =
        await supabaseAdmin.rpc(
          "registrar_pago",
          {
            p_venta_id:
              ventaId,

            p_operador_id:
              operadorId,

            p_monto:
              monto,

            p_medio_pago:
              medioPagoNormalizado,

            p_cuenta_bancaria_id:
              cuenta_bancaria_id,

            p_referencia:
              referencia,

            p_observaciones:
              observaciones
          }
        );

      if (error) {
        console.error(
          "ERROR RPC registrar_pago:"
        );
        console.error(error);

        return res.status(400).json({
          mensaje:
            "No se pudo registrar el pago.",
          error:
            error.message
        });
      }

      return res.status(201).json({
        mensaje:
          "Pago registrado correctamente.",
        pago: data
      });

    } catch (error) {
      console.error(
        "ERROR INESPERADO REGISTRANDO PAGO:"
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