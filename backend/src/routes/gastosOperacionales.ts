import {
  Request,
  Response
} from "express";

import { Router } from "express";

import { supabaseAdmin } from "../config/supabaseAdmin.js";

import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";

import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/*
 * GET /api/gastos-operacionales/categorias
 */
router.get(
  "/categorias",
  autenticar,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const {
        data: categorias,
        error
      } = await supabaseAdmin
        .from("categorias_gastos")
        .select(
          "id, nombre, descripcion, activa, creado_en"
        )
        .eq("activa", true)
        .order("nombre", {
          ascending: true
        });

      if (error) {
        console.error(
          "ERROR CONSULTANDO CATEGORÍAS DE GASTOS:"
        );

        console.error(error);

        return res.status(500).json({
          mensaje:
            "Error consultando las categorías de gastos."
        });
      }

      return res.json({
        categorias: categorias ?? []
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO CATEGORÍAS:"
      );

      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando las categorías."
      });
    }
  }
);

/*
 * POST /api/gastos-operacionales/categorias
 */
router.post(
  "/categorias",
  autenticar,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const {
        nombre,
        descripcion
      } = _req.body;

      if (
        !nombre ||
        typeof nombre !== "string" ||
        !nombre.trim()
      ) {
        return res.status(400).json({
          mensaje:
            "El nombre de la categoría es obligatorio."
        });
      }

      const nombreNormalizado =
        nombre.trim();

      const descripcionNormalizada =
        typeof descripcion === "string" &&
        descripcion.trim()
          ? descripcion.trim()
          : null;

      const {
        data: existente,
        error: existenteError
      } = await supabaseAdmin
        .from("categorias_gastos")
        .select("id, nombre")
        .ilike(
          "nombre",
          nombreNormalizado
        )
        .maybeSingle();

      if (existenteError) {
        console.error(
          "ERROR BUSCANDO CATEGORÍA EXISTENTE:"
        );

        console.error(
          existenteError
        );

        return res.status(500).json({
          mensaje:
            "Error verificando la categoría."
        });
      }

      if (existente) {
        return res.status(409).json({
          mensaje:
            "Ya existe una categoría con ese nombre."
        });
      }

      const {
        data: categoria,
        error
      } = await supabaseAdmin
        .from("categorias_gastos")
        .insert({
          nombre:
            nombreNormalizado,

          descripcion:
            descripcionNormalizada,

          activa: true
        })
        .select(
          "id, nombre, descripcion, activa, creado_en"
        )
        .single();

      if (error) {
        console.error(
          "ERROR CREANDO CATEGORÍA:"
        );

        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudo crear la categoría."
        });
      }

      return res.status(201).json({
        mensaje:
          "Categoría creada correctamente.",

        categoria
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CREANDO CATEGORÍA:"
      );

      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno creando la categoría."
      });
    }
  }
);

/*
 * PATCH /api/gastos-operacionales/categorias/:id
 */
router.patch(
  "/categorias/:id",
  autenticar,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      const {
        nombre,
        descripcion,
        activa
      } = req.body;

      const cambios: {
        nombre?: string;
        descripcion?: string | null;
        activa?: boolean;
      } = {};

      if (
        nombre !== undefined
      ) {
        if (
          typeof nombre !== "string" ||
          !nombre.trim()
        ) {
          return res.status(400).json({
            mensaje:
              "El nombre de la categoría no puede estar vacío."
          });
        }

        cambios.nombre =
          nombre.trim();
      }

      if (
        descripcion !== undefined
      ) {
        cambios.descripcion =
          typeof descripcion === "string" &&
          descripcion.trim()
            ? descripcion.trim()
            : null;
      }

      if (
        activa !== undefined
      ) {
        if (
          typeof activa !== "boolean"
        ) {
          return res.status(400).json({
            mensaje:
              "El campo activa debe ser booleano."
          });
        }

        cambios.activa =
          activa;
      }

      if (
        Object.keys(cambios).length === 0
      ) {
        return res.status(400).json({
          mensaje:
            "No se proporcionaron cambios."
        });
      }

      const {
        data: categoria,
        error
      } = await supabaseAdmin
        .from("categorias_gastos")
        .update(cambios)
        .eq("id", id)
        .select(
          "id, nombre, descripcion, activa, creado_en"
        )
        .maybeSingle();

      if (error) {
        console.error(
          "ERROR ACTUALIZANDO CATEGORÍA:"
        );

        console.error(error);

        return res.status(500).json({
          mensaje:
            "No se pudo actualizar la categoría."
        });
      }

      if (!categoria) {
        return res.status(404).json({
          mensaje:
            "La categoría no existe."
        });
      }

      return res.json({
        mensaje:
          "Categoría actualizada correctamente.",

        categoria
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO ACTUALIZANDO CATEGORÍA:"
      );

      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno actualizando la categoría."
      });
    }
  }
);

/*
 * POST /api/gastos-operacionales
 *
 * Registra un gasto operacional.
 *
 * EFECTIVO:
 *   gastos_operacionales
 *   +
 *   movimientos_caja -> GASTO
 *
 * TRANSFERENCIA/TARJETA:
 *   gastos_operacionales
 *   +
 *   movimientos_bancarios -> GASTO
 */
router.post(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const usuarioId =
        req.usuario?.id;

      if (!usuarioId) {
        return res.status(401).json({
          mensaje:
            "No se pudo identificar al usuario."
        });
      }

      const {
        categoria_id,
        descripcion,
        monto,
        medio_pago,
        cuenta_bancaria_id,
        proveedor_id,
        fecha_gasto,
        referencia,
        observaciones
      } = req.body;

      /*
       * VALIDAR CATEGORÍA
       */
      if (
        !categoria_id ||
        typeof categoria_id !== "string"
      ) {
        return res.status(400).json({
          mensaje:
            "La categoría es obligatoria."
        });
      }

      const {
        data: categoria,
        error: categoriaError
      } = await supabaseAdmin
        .from("categorias_gastos")
        .select(
          "id, nombre, activa"
        )
        .eq(
          "id",
          categoria_id
        )
        .maybeSingle();

      if (categoriaError) {
        console.error(
          "ERROR CONSULTANDO CATEGORÍA:"
        );

        console.error(
          categoriaError
        );

        return res.status(500).json({
          mensaje:
            "Error consultando la categoría."
        });
      }

      if (!categoria) {
        return res.status(404).json({
          mensaje:
            "La categoría seleccionada no existe."
        });
      }

      if (!categoria.activa) {
        return res.status(400).json({
          mensaje:
            "La categoría seleccionada está inactiva."
        });
      }

      /*
       * VALIDAR DESCRIPCIÓN
       */
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

      /*
       * VALIDAR MONTO
       */
      const montoNumerico =
        Number(monto);

      if (
        !Number.isFinite(montoNumerico) ||
        montoNumerico <= 0
      ) {
        return res.status(400).json({
          mensaje:
            "El monto debe ser mayor que cero."
        });
      }

      /*
       * VALIDAR MEDIO DE PAGO
       */
      const medioPago =
        typeof medio_pago === "string"
          ? medio_pago
              .trim()
              .toUpperCase()
          : "EFECTIVO";

      const mediosPermitidos = [
        "EFECTIVO",
        "TRANSFERENCIA",
        "TARJETA"
      ];

      if (
        !mediosPermitidos.includes(
          medioPago
        )
      ) {
        return res.status(400).json({
          mensaje:
            "Medio de pago inválido. Usa EFECTIVO, TRANSFERENCIA o TARJETA."
        });
      }

      /*
       * CAJA PRINCIPAL PARA EFECTIVO
       */
      let cajaId:
        string | null =
        null;

      if (
        medioPago === "EFECTIVO"
      ) {
        const {
          data: caja,
          error: cajaError
        } = await supabaseAdmin
          .from("cajas")
          .select(
            "id, nombre, activa"
          )
          .eq(
            "nombre",
            "Caja Principal"
          )
          .eq(
            "activa",
            true
          )
          .maybeSingle();

        if (cajaError) {
          console.error(
            "ERROR CONSULTANDO CAJA PRINCIPAL:"
          );

          console.error(
            cajaError
          );

          return res.status(500).json({
            mensaje:
              "Error consultando la Caja Principal."
          });
        }

        if (!caja) {
          return res.status(400).json({
            mensaje:
              "No existe una Caja Principal activa."
          });
        }

        cajaId =
          caja.id;
      }

      /*
       * CUENTA BANCARIA PARA TRANSFERENCIA/TARJETA
       */
      let cuentaBancariaIdNormalizada:
        string | null =
        null;

      if (
        medioPago === "TRANSFERENCIA" ||
        medioPago === "TARJETA"
      ) {
        if (
          !cuenta_bancaria_id ||
          typeof cuenta_bancaria_id !== "string"
        ) {
          return res.status(400).json({
            mensaje:
              "Debes seleccionar una cuenta bancaria para este medio de pago."
          });
        }

        const {
          data: cuenta,
          error: cuentaError
        } = await supabaseAdmin
          .from("cuentas_bancarias")
          .select(
            "id, nombre, banco, moneda, activa"
          )
          .eq(
            "id",
            cuenta_bancaria_id
          )
          .maybeSingle();

        if (cuentaError) {
          console.error(
            "ERROR CONSULTANDO CUENTA BANCARIA:"
          );

          console.error(
            cuentaError
          );

          return res.status(500).json({
            mensaje:
              "Error consultando la cuenta bancaria."
          });
        }

        if (!cuenta) {
          return res.status(404).json({
            mensaje:
              "La cuenta bancaria seleccionada no existe."
          });
        }

        if (!cuenta.activa) {
          return res.status(400).json({
            mensaje:
              "La cuenta bancaria seleccionada está inactiva."
          });
        }

        cuentaBancariaIdNormalizada =
          cuenta.id;
      }

      /*
       * FECHA
       */
      let fechaGastoNormalizada:
        string;

      if (
        typeof fecha_gasto === "string" &&
        fecha_gasto.trim()
      ) {
        fechaGastoNormalizada =
          fecha_gasto.trim();
      } else {
        fechaGastoNormalizada =
          new Date()
            .toISOString()
            .split("T")[0];
      }

      /*
       * PROVEEDOR OPCIONAL
       */
      let proveedorIdNormalizado:
        string | null =
        null;

      if (
        proveedor_id &&
        typeof proveedor_id === "string"
      ) {
        const {
          data: proveedor,
          error: proveedorError
        } = await supabaseAdmin
          .from("proveedores")
          .select(
            "id, nombre, activo"
          )
          .eq(
            "id",
            proveedor_id
          )
          .maybeSingle();

        if (proveedorError) {
          console.error(
            "ERROR CONSULTANDO PROVEEDOR:"
          );

          console.error(
            proveedorError
          );

          return res.status(500).json({
            mensaje:
              "Error consultando el proveedor."
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

        proveedorIdNormalizado =
          proveedor.id;
      }

      /*
       * CREAR GASTO
       */
      const {
        data: gasto,
        error: gastoError
      } = await supabaseAdmin
        .from("gastos_operacionales")
        .insert({
          categoria_id,

          descripcion:
            descripcion.trim(),

          monto:
            montoNumerico,

          medio_pago:
            medioPago,

          caja_id:
            cajaId,

          cuenta_bancaria_id:
            cuentaBancariaIdNormalizada,

          usuario_id:
            usuarioId,

          proveedor_id:
            proveedorIdNormalizado,

          fecha_gasto:
            fechaGastoNormalizada,

          referencia:
            typeof referencia === "string" &&
            referencia.trim()
              ? referencia.trim()
              : null,

          observaciones:
            typeof observaciones === "string" &&
            observaciones.trim()
              ? observaciones.trim()
              : null
        })
        .select(
          "id, categoria_id, descripcion, monto, medio_pago, caja_id, cuenta_bancaria_id, usuario_id, proveedor_id, fecha_gasto, referencia, observaciones, creado_en"
        )
        .single();

      if (gastoError) {
        console.error(
          "ERROR CREANDO GASTO OPERACIONAL:"
        );

        console.error(
          gastoError
        );

        return res.status(500).json({
          mensaje:
            "No se pudo registrar el gasto operacional."
        });
      }

      /*
       * MOVIMIENTO DE CAJA
       */
      if (
        medioPago === "EFECTIVO"
      ) {
        const {
          error:
            movimientoCajaError
        } = await supabaseAdmin
          .from("movimientos_caja")
          .insert({
            caja_id:
              cajaId,

            tipo:
              "GASTO",

            monto:
              montoNumerico,

            descripcion:
              descripcion.trim()
          });

        if (
          movimientoCajaError
        ) {
          console.error(
            "ERROR REGISTRANDO MOVIMIENTO DE CAJA:"
          );

          console.error(
            movimientoCajaError
          );

          await supabaseAdmin
            .from("gastos_operacionales")
            .delete()
            .eq(
              "id",
              gasto.id
            );

          return res.status(500).json({
            mensaje:
              "No se pudo registrar el movimiento de Caja. El gasto no fue guardado."
          });
        }
      }

      /*
       * MOVIMIENTO BANCARIO
       */
      if (
        medioPago === "TRANSFERENCIA" ||
        medioPago === "TARJETA"
      ) {
        const {
          error:
            movimientoBancoError
        } = await supabaseAdmin
          .from("movimientos_bancarios")
          .insert({
            cuenta_bancaria_id:
              cuentaBancariaIdNormalizada,

            tipo:
              "GASTO",

            monto:
              montoNumerico,

            referencia:
              typeof referencia === "string" &&
              referencia.trim()
                ? referencia.trim()
                : null,

            descripcion:
              descripcion.trim()
          });

        if (
          movimientoBancoError
        ) {
          console.error(
            "ERROR REGISTRANDO MOVIMIENTO BANCARIO:"
          );

          console.error(
            movimientoBancoError
          );

          await supabaseAdmin
            .from("gastos_operacionales")
            .delete()
            .eq(
              "id",
              gasto.id
            );

          return res.status(500).json({
            mensaje:
              "No se pudo registrar el movimiento bancario. El gasto no fue guardado."
          });
        }
      }

      return res.status(201).json({
        mensaje:
          "Gasto operacional registrado correctamente.",

        gasto
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CREANDO GASTO OPERACIONAL:"
      );

      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno registrando el gasto operacional."
      });
    }
  }
);

/*
 * GET /api/gastos-operacionales
 */
router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const {
        data: gastos,
        error: gastosError
      } = await supabaseAdmin
        .from("gastos_operacionales")
        .select(`
          id,
          categoria_id,
          descripcion,
          monto,
          medio_pago,
          caja_id,
          cuenta_bancaria_id,
          usuario_id,
          proveedor_id,
          fecha_gasto,
          referencia,
          observaciones,
          creado_en,
          actualizado_en,
          categorias_gastos (
            id,
            nombre,
            descripcion
          ),
          proveedores (
            id,
            nombre
          ),
          cuentas_bancarias (
            id,
            nombre,
            banco,
            moneda
          )
        `)
        .order("fecha_gasto", {
          ascending: false
        })
        .order("creado_en", {
          ascending: false
        });

      if (gastosError) {
        console.error(
          "ERROR CONSULTANDO GASTOS OPERACIONALES:"
        );

        console.error(
          gastosError
        );

        return res.status(500).json({
          mensaje:
            "Error consultando los gastos operacionales."
        });
      }

      const resultado =
        (
          gastos ?? []
        ).map((gasto) => {
          const categoria =
            Array.isArray(
              gasto.categorias_gastos
            )
              ? gasto
                  .categorias_gastos[0] ??
                null
              : gasto
                  .categorias_gastos ??
                null;

          const proveedor =
            Array.isArray(
              gasto.proveedores
            )
              ? gasto
                  .proveedores[0] ??
                null
              : gasto.proveedores ??
                null;

          const cuentaBancaria =
            Array.isArray(
              gasto.cuentas_bancarias
            )
              ? gasto
                  .cuentas_bancarias[0] ??
                null
              : gasto
                  .cuentas_bancarias ??
                null;

          return {
            id:
              gasto.id,

            categoria_id:
              gasto.categoria_id,

            descripcion:
              gasto.descripcion,

            monto:
              Number(
                gasto.monto
              ),

            medio_pago:
              gasto.medio_pago,

            caja_id:
              gasto.caja_id,

            cuenta_bancaria_id:
              gasto.cuenta_bancaria_id,

            usuario_id:
              gasto.usuario_id,

            proveedor_id:
              gasto.proveedor_id,

            fecha_gasto:
              gasto.fecha_gasto,

            referencia:
              gasto.referencia,

            observaciones:
              gasto.observaciones,

            creado_en:
              gasto.creado_en,

            actualizado_en:
              gasto.actualizado_en,

            categoria,

            proveedor,

            cuenta_bancaria:
              cuentaBancaria
          };
        });

      return res.json({
        gastos:
          resultado
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO EN GASTOS OPERACIONALES:"
      );

      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando los gastos operacionales."
      });
    }
  }
);

export default router;