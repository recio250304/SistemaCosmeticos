import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import {
  autenticar,
  requireRole
} from "../middleware/auth.js";

const router = Router();

/* =========================================================
   TIPOS
========================================================= */

interface Empleado {
  id: string;
  nombre_completo: string;
  documento_identidad: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  puesto: string | null;
  salario_base: number;
  frecuencia_pago: string;
  fecha_ingreso: string | null;
  activo: boolean;
  observaciones: string | null;
}

interface EmpleadoRelacionado {
  id: string;
  nombre_completo: string;
  puesto: string | null;
  activo: boolean;
}

interface DetalleNomina {
  id: string;
  nomina_id: string;
  empleado_id: string;
  salario_base: number;
  bonos: number;
  deducciones: number;
  salario_neto: number;
  pagado: boolean;
  observaciones: string | null;
  empleados:
    | EmpleadoRelacionado
    | null;
}

interface Nomina {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_pago: string | null;
  total_bruto: number;
  total_deducciones: number;
  total_neto: number;
  estado: string;
  observaciones: string | null;
  usuario_id: string;
  creado_en: string;
  actualizado_en: string;
}

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

function numeroValido(
  valor: unknown
): boolean {
  const numero = Number(valor);

  return (
    Number.isFinite(numero) &&
    numero >= 0
  );
}

function normalizarMedioPago(
  valor: unknown
): string {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

function obtenerIdParametro(
  valor: string | string[] | undefined
): string | null {
  if (Array.isArray(valor)) {
    return valor[0] || null;
  }

  return valor || null;
}

/* =========================================================
   EMPLEADOS
========================================================= */

router.get(
  "/empleados",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        data,
        error
      } = await supabaseAdmin
        .from("empleados")
        .select("*")
        .order(
          "nombre_completo",
          {
            ascending: true
          }
        );

      if (error) {
        console.error(
          "ERROR CARGANDO EMPLEADOS:",
          error
        );

        return res.status(500).json({
          mensaje:
            "No se pudieron cargar los empleados."
        });
      }

      return res.json(
        data || []
      );
    } catch (error) {
      console.error(
        "ERROR CARGANDO EMPLEADOS:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error interno cargando empleados."
      });
    }
  }
);

/* =========================================================
   LISTAR NÓMINAS
========================================================= */

router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        data,
        error
      } = await supabaseAdmin
        .from("nominas")
        .select("*")
        .order(
          "fecha_inicio",
          {
            ascending: false
          }
        );

      if (error) {
        console.error(
          "ERROR CARGANDO NÓMINAS:",
          error
        );

        return res.status(500).json({
          mensaje:
            "No se pudieron cargar las nóminas."
        });
      }

      return res.json(
        data || []
      );
    } catch (error) {
      console.error(
        "ERROR CARGANDO NÓMINAS:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error interno cargando nóminas."
      });
    }
  }
);

/* =========================================================
   OBTENER NÓMINA POR ID
========================================================= */

router.get(
  "/:id",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const nominaId =
        obtenerIdParametro(
          req.params.id
        );

      if (!nominaId) {
        return res.status(400).json({
          mensaje:
            "ID de nómina inválido."
        });
      }

      const {
        data: nomina,
        error: errorNomina
      } = await supabaseAdmin
        .from("nominas")
        .select("*")
        .eq(
          "id",
          nominaId
        )
        .single();

      if (
        errorNomina ||
        !nomina
      ) {
        return res.status(404).json({
          mensaje:
            "Nómina no encontrada."
        });
      }

      const {
        data: detalles,
        error: errorDetalles
      } = await supabaseAdmin
        .from("nomina_detalles")
        .select(`
          *,
          empleados (
            id,
            nombre_completo,
            puesto,
            activo
          )
        `)
        .eq(
          "nomina_id",
          nominaId
        )
        .order(
          "creado_en",
          {
            ascending: true
          }
        );

      if (errorDetalles) {
        console.error(
          "ERROR CARGANDO DETALLES:",
          errorDetalles
        );

        return res.status(500).json({
          mensaje:
            "No se pudieron cargar los detalles de la nómina."
        });
      }

      return res.json({
        nomina,
        detalles:
          detalles || []
      });
    } catch (error) {
      console.error(
        "ERROR OBTENIENDO NÓMINA:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error interno obteniendo la nómina."
      });
    }
  }
);

/* =========================================================
   CREAR NÓMINA
========================================================= */

router.post(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        fecha_inicio,
        fecha_fin,
        observaciones
      } = req.body;

      if (
        !fecha_inicio ||
        !fecha_fin
      ) {
        return res.status(400).json({
          mensaje:
            "Debes indicar la fecha de inicio y la fecha de fin."
        });
      }

      if (
        fecha_fin < fecha_inicio
      ) {
        return res.status(400).json({
          mensaje:
            "La fecha de fin no puede ser anterior a la fecha de inicio."
        });
      }

      const usuarioId =
        (req as any).usuario?.id;

      const {
        data,
        error
      } = await supabaseAdmin
        .from("nominas")
        .insert({
          fecha_inicio,
          fecha_fin,
          fecha_pago: null,
          total_bruto: 0,
          total_deducciones: 0,
          total_neto: 0,
          estado: "ABIERTA",
          observaciones:
            observaciones ||
            null,
          usuario_id:
            usuarioId
        })
        .select()
        .single();

      if (error) {
        console.error(
          "ERROR CREANDO NÓMINA:",
          error
        );

        return res.status(500).json({
          mensaje:
            error.message ||
            "No se pudo crear la nómina."
        });
      }

      return res.status(201).json(
        data
      );
    } catch (error) {
      console.error(
        "ERROR CREANDO NÓMINA:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error interno creando la nómina."
      });
    }
  }
);

/* =========================================================
   AGREGAR DETALLE A NÓMINA
========================================================= */

router.post(
  "/:id/detalles",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const nominaId =
        obtenerIdParametro(
          req.params.id
        );

      if (!nominaId) {
        return res.status(400).json({
          mensaje:
            "ID de nómina inválido."
        });
      }

      const {
        empleado_id,
        salario_base,
        bonos = 0,
        deducciones = 0,
        observaciones
      } = req.body;

      if (!empleado_id) {
        return res.status(400).json({
          mensaje:
            "Debes seleccionar un empleado."
        });
      }

      const {
        data: nomina,
        error: errorNomina
      } = await supabaseAdmin
        .from("nominas")
        .select("*")
        .eq(
          "id",
          nominaId
        )
        .single();

      if (
        errorNomina ||
        !nomina
      ) {
        return res.status(404).json({
          mensaje:
            "Nómina no encontrada."
        });
      }

      if (
        nomina.estado !==
        "ABIERTA"
      ) {
        return res.status(400).json({
          mensaje:
            "Solo se pueden modificar nóminas ABIERTAS."
        });
      }

      const {
        data: empleado,
        error: errorEmpleado
      } = await supabaseAdmin
        .from("empleados")
        .select("*")
        .eq(
          "id",
          empleado_id
        )
        .single();

      if (
        errorEmpleado ||
        !empleado
      ) {
        return res.status(404).json({
          mensaje:
            "Empleado no encontrado."
        });
      }

      if (!empleado.activo) {
        return res.status(400).json({
          mensaje:
            "No se puede agregar un empleado inactivo a una nueva nómina."
        });
      }

      const salario =
        salario_base !== undefined
          ? Number(
              salario_base
            )
          : Number(
              empleado.salario_base
            );

      const bono =
        Number(bonos);

      const descuento =
        Number(deducciones);

      if (
        !numeroValido(
          salario
        ) ||
        !numeroValido(
          bono
        ) ||
        !numeroValido(
          descuento
        )
      ) {
        return res.status(400).json({
          mensaje:
            "Los valores de salario, bonos y deducciones deben ser números válidos."
        });
      }

      const salarioNeto =
        salario +
        bono -
        descuento;

      if (
        salarioNeto < 0
      ) {
        return res.status(400).json({
          mensaje:
            "El salario neto no puede ser negativo."
        });
      }

      const {
        data: detalleExistente
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .select("id")
        .eq(
          "nomina_id",
          nominaId
        )
        .eq(
          "empleado_id",
          empleado_id
        )
        .maybeSingle();

      if (
        detalleExistente
      ) {
        return res.status(409).json({
          mensaje:
            "El empleado ya está agregado a esta nómina."
        });
      }

      const {
        data: detalle,
        error
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .insert({
          nomina_id:
            nominaId,
          empleado_id,
          salario_base:
            salario,
          bonos:
            bono,
          deducciones:
            descuento,
          salario_neto:
            salarioNeto,
          pagado:
            false,
          observaciones:
            observaciones ||
            null
        })
        .select(`
          *,
          empleados (
            id,
            nombre_completo,
            puesto,
            activo
          )
        `)
        .single();

      if (error) {
        console.error(
          "ERROR AGREGANDO DETALLE:",
          error
        );

        return res.status(500).json({
          mensaje:
            error.message ||
            "No se pudo agregar el empleado a la nómina."
        });
      }

      const {
        data: detalles
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .select(
          "salario_base, bonos, deducciones, salario_neto"
        )
        .eq(
          "nomina_id",
          nominaId
        );

      const lista =
        (detalles ||
          []) as Array<{
          salario_base: number;
          bonos: number;
          deducciones: number;
          salario_neto: number;
        }>;

      const totalBruto =
        lista.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.salario_base
            ) +
            Number(
              item.bonos
            ),
          0
        );

      const totalDeducciones =
        lista.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.deducciones
            ),
          0
        );

      const totalNeto =
        lista.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.salario_neto
            ),
          0
        );

      const {
        error:
          errorActualizar
      } = await supabaseAdmin
        .from("nominas")
        .update({
          total_bruto:
            totalBruto,
          total_deducciones:
            totalDeducciones,
          total_neto:
            totalNeto,
          actualizado_en:
            new Date().toISOString()
        })
        .eq(
          "id",
          nominaId
        );

      if (errorActualizar) {
        console.error(
          "ERROR ACTUALIZANDO TOTALES DE NÓMINA:",
          errorActualizar
        );
      }

      return res.status(201).json(
        detalle
      );
    } catch (error) {
      console.error(
        "ERROR AGREGANDO DETALLE:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error interno agregando detalle."
      });
    }
  }
);

/* =========================================================
   EDITAR DETALLE
========================================================= */

router.patch(
  "/:id/detalles/:detalleId",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const nominaId =
        obtenerIdParametro(
          req.params.id
        );

      const detalleId =
        obtenerIdParametro(
          req.params.detalleId
        );

      if (
        !nominaId ||
        !detalleId
      ) {
        return res.status(400).json({
          mensaje:
            "ID de nómina o detalle inválido."
        });
      }

      const {
        salario_base,
        bonos,
        deducciones,
        observaciones
      } = req.body;

      const {
        data: nomina,
        error: errorNomina
      } = await supabaseAdmin
        .from("nominas")
        .select("*")
        .eq(
          "id",
          nominaId
        )
        .single();

      if (
        errorNomina ||
        !nomina
      ) {
        return res.status(404).json({
          mensaje:
            "Nómina no encontrada."
        });
      }

      if (
        nomina.estado !==
        "ABIERTA"
      ) {
        return res.status(400).json({
          mensaje:
            "Solo se pueden editar nóminas ABIERTAS."
        });
      }

      const {
        data: detalle,
        error: errorDetalle
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .select("*")
        .eq(
          "id",
          detalleId
        )
        .eq(
          "nomina_id",
          nominaId
        )
        .single();

      if (
        errorDetalle ||
        !detalle
      ) {
        return res.status(404).json({
          mensaje:
            "Detalle de nómina no encontrado."
        });
      }

      if (
        detalle.pagado
      ) {
        return res.status(400).json({
          mensaje:
            "No se puede editar un detalle que ya fue pagado."
        });
      }

      const salario =
        salario_base !== undefined
          ? Number(
              salario_base
            )
          : Number(
              detalle.salario_base
            );

      const bono =
        bonos !== undefined
          ? Number(bonos)
          : Number(
              detalle.bonos
            );

      const descuento =
        deducciones !==
        undefined
          ? Number(
              deducciones
            )
          : Number(
              detalle.deducciones
            );

      if (
        !numeroValido(
          salario
        ) ||
        !numeroValido(
          bono
        ) ||
        !numeroValido(
          descuento
        )
      ) {
        return res.status(400).json({
          mensaje:
            "Los valores deben ser números válidos."
        });
      }

      const salarioNeto =
        salario +
        bono -
        descuento;

      if (
        salarioNeto < 0
      ) {
        return res.status(400).json({
          mensaje:
            "El salario neto no puede ser negativo."
        });
      }

      const {
        data: detalleActualizado,
        error
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .update({
          salario_base:
            salario,
          bonos:
            bono,
          deducciones:
            descuento,
          salario_neto:
            salarioNeto,
          observaciones:
            observaciones !==
            undefined
              ? observaciones
              : detalle.observaciones,
          actualizado_en:
            new Date().toISOString()
        })
        .eq(
          "id",
          detalleId
        )
        .eq(
          "nomina_id",
          nominaId
        )
        .select(`
          *,
          empleados (
            id,
            nombre_completo,
            puesto,
            activo
          )
        `)
        .single();

      if (error) {
        console.error(
          "ERROR ACTUALIZANDO DETALLE:",
          error
        );

        return res.status(500).json({
          mensaje:
            error.message ||
            "No se pudo actualizar el detalle."
        });
      }

      const {
        data: detalles
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .select(
          "salario_base, bonos, deducciones, salario_neto"
        )
        .eq(
          "nomina_id",
          nominaId
        );

      const lista =
        (detalles ||
          []) as Array<{
          salario_base: number;
          bonos: number;
          deducciones: number;
          salario_neto: number;
        }>;

      const totalBruto =
        lista.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.salario_base
            ) +
            Number(
              item.bonos
            ),
          0
        );

      const totalDeducciones =
        lista.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.deducciones
            ),
          0
        );

      const totalNeto =
        lista.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.salario_neto
            ),
          0
        );

      const {
        error:
          errorActualizar
      } = await supabaseAdmin
        .from("nominas")
        .update({
          total_bruto:
            totalBruto,
          total_deducciones:
            totalDeducciones,
          total_neto:
            totalNeto,
          actualizado_en:
            new Date().toISOString()
        })
        .eq(
          "id",
          nominaId
        );

      if (errorActualizar) {
        console.error(
          "ERROR ACTUALIZANDO TOTALES:",
          errorActualizar
        );
      }

      return res.json(
        detalleActualizado
      );
    } catch (error) {
      console.error(
        "ERROR EDITANDO DETALLE:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error interno editando detalle."
      });
    }
  }
);

/* =========================================================
   PAGAR DETALLE INDIVIDUAL
========================================================= */

router.post(
  "/:id/detalles/:detalleId/pagar",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: Request,
    res: Response
  ) => {
    let pagoCreadoId:
      | string
      | null = null;

    let movimientoCajaId:
      | string
      | null = null;

    let movimientoBancoId:
      | string
      | null = null;

    try {
      const nominaId =
        obtenerIdParametro(
          req.params.id
        );

      const detalleId =
        obtenerIdParametro(
          req.params.detalleId
        );

      if (
        !nominaId ||
        !detalleId
      ) {
        return res.status(400).json({
          mensaje:
            "ID de nómina o detalle inválido."
        });
      }

      const {
        medio_pago,
        caja_id,
        cuenta_bancaria_id,
        referencia,
        observaciones
      } = req.body;

      const medio =
        normalizarMedioPago(
          medio_pago
        );

      if (
        medio !==
          "EFECTIVO" &&
        medio !==
          "TRANSFERENCIA"
      ) {
        return res.status(400).json({
          mensaje:
            "El medio de pago debe ser EFECTIVO o TRANSFERENCIA."
        });
      }

      const {
        data: nomina,
        error: errorNomina
      } = await supabaseAdmin
        .from("nominas")
        .select("*")
        .eq(
          "id",
          nominaId
        )
        .single();

      if (
        errorNomina ||
        !nomina
      ) {
        return res.status(404).json({
          mensaje:
            "Nómina no encontrada."
        });
      }

      if (
        nomina.estado !==
        "ABIERTA"
      ) {
        return res.status(400).json({
          mensaje:
            "La nómina no está ABIERTA."
        });
      }

      const {
        data: detalle,
        error: errorDetalle
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .select(`
          *,
          empleados (
            id,
            nombre_completo,
            puesto,
            activo
          )
        `)
        .eq(
          "id",
          detalleId
        )
        .eq(
          "nomina_id",
          nominaId
        )
        .single();

      if (
        errorDetalle ||
        !detalle
      ) {
        return res.status(404).json({
          mensaje:
            "Detalle de nómina no encontrado."
        });
      }

      const detalleTyped =
        detalle as unknown as DetalleNomina;

      if (
        detalleTyped.pagado
      ) {
        return res.status(409).json({
          mensaje:
            "Este empleado ya tiene el pago registrado."
        });
      }

      /*
       * SEGURIDAD CONTRA DUPLICADOS
       *
       * Aunque el detalle todavía aparezca como
       * pagado = false, comprobamos directamente
       * pagos_nomina antes de crear otro pago.
       */
      const {
        data: pagoExistente,
        error:
          errorPagoExistente
      } = await supabaseAdmin
        .from(
          "pagos_nomina"
        )
        .select(
          "id, monto, medio_pago, fecha_pago"
        )
        .eq(
          "nomina_detalle_id",
          detalleId
        )
        .limit(1)
        .maybeSingle();

      if (errorPagoExistente) {
        console.error(
          "ERROR VALIDANDO PAGO EXISTENTE:",
          errorPagoExistente
        );

        return res.status(500).json({
          mensaje:
            "No se pudo validar si el empleado ya tiene un pago registrado."
        });
      }

      if (
        pagoExistente
      ) {
        return res.status(409).json({
          mensaje:
            "Ya existe un pago registrado para este empleado. No se creó otro pago para evitar duplicados.",
          pago:
            pagoExistente
        });
      }

      const monto =
        Number(
          detalleTyped.salario_neto
        );

      if (
        !Number.isFinite(
          monto
        ) ||
        monto <= 0
      ) {
        return res.status(400).json({
          mensaje:
            "El salario neto del empleado no es válido para realizar el pago."
        });
      }

      const usuarioId =
        (req as any).usuario?.id;

      let cajaIdFinal:
        | string
        | null = null;

      let cuentaBancariaIdFinal:
        | string
        | null = null;

      if (
        medio ===
        "EFECTIVO"
      ) {
        if (
          caja_id
        ) {
          const {
            data: caja,
            error
          } = await supabaseAdmin
            .from("cajas")
            .select(
              "id, activa"
            )
            .eq(
              "id",
              caja_id
            )
            .single();

          if (
            error ||
            !caja ||
            !caja.activa
          ) {
            return res.status(400).json({
              mensaje:
                "La caja seleccionada no está disponible."
            });
          }

          cajaIdFinal =
            caja.id;
        } else {
          const {
            data: cajaPrincipal,
            error
          } = await supabaseAdmin
            .from("cajas")
            .select(
              "id, activa"
            )
            .eq(
              "nombre",
              "Caja Principal"
            )
            .eq(
              "activa",
              true
            )
            .limit(1)
            .maybeSingle();

          if (
            error ||
            !cajaPrincipal
          ) {
            return res.status(400).json({
              mensaje:
                "No se encontró una Caja Principal activa."
            });
          }

          cajaIdFinal =
            cajaPrincipal.id;
        }
      }

      if (
        medio ===
        "TRANSFERENCIA"
      ) {
        if (
          !cuenta_bancaria_id
        ) {
          return res.status(400).json({
            mensaje:
              "Debes seleccionar una cuenta bancaria."
          });
        }

        const {
          data: cuenta,
          error
        } = await supabaseAdmin
          .from(
            "cuentas_bancarias"
          )
          .select(
            "id, activa"
          )
          .eq(
            "id",
            cuenta_bancaria_id
          )
          .single();

        if (
          error ||
          !cuenta ||
          !cuenta.activa
        ) {
          return res.status(400).json({
            mensaje:
              "La cuenta bancaria seleccionada no está disponible."
          });
        }

        cuentaBancariaIdFinal =
          cuenta.id;
      }

      const {
        data: pago,
        error: errorPago
      } = await supabaseAdmin
        .from(
          "pagos_nomina"
        )
        .insert({
          nomina_detalle_id:
            detalleId,
          empleado_id:
            detalleTyped.empleado_id,
          monto,
          medio_pago:
            medio,
          caja_id:
            cajaIdFinal,
          cuenta_bancaria_id:
            cuentaBancariaIdFinal,
          fecha_pago:
            new Date().toISOString(),
          usuario_id:
            usuarioId,
          referencia:
            referencia ||
            null,
          observaciones:
            observaciones ||
            null
        })
        .select()
        .single();

      if (
        errorPago ||
        !pago
      ) {
        console.error(
          "ERROR CREANDO PAGO DE NÓMINA:",
          errorPago
        );

        throw new Error(
          errorPago?.message ||
            "No se pudo crear el pago de nómina."
        );
      }

      pagoCreadoId =
        pago.id;

      const nombreEmpleado =
        detalleTyped
          .empleados
          ?.nombre_completo ||
        "Empleado";

      if (
        medio ===
        "EFECTIVO"
      ) {
        const {
          data: movimiento,
          error
        } = await supabaseAdmin
          .from(
            "movimientos_caja"
          )
          .insert({
            caja_id:
              cajaIdFinal,
            pago_nomina_id:
              pago.id,
            tipo:
              "PAGO_NOMINA",
            monto,
            descripcion:
              `Pago de nómina - ${nombreEmpleado}`,
            creado_en:
              new Date().toISOString()
          })
          .select()
          .single();

        if (
          error ||
          !movimiento
        ) {
          console.error(
            "ERROR CREANDO MOVIMIENTO DE CAJA:",
            error
          );

          throw new Error(
            `No se pudo registrar el movimiento de Caja para ${nombreEmpleado}: ${
              error?.message ||
              "Error desconocido."
            }`
          );
        }

        movimientoCajaId =
          movimiento.id;
      }

      if (
        medio ===
        "TRANSFERENCIA"
      ) {
        const {
          data: movimiento,
          error
        } = await supabaseAdmin
          .from(
            "movimientos_bancarios"
          )
          .insert({
            cuenta_bancaria_id:
              cuentaBancariaIdFinal,
            pago_nomina_id:
              pago.id,
            tipo:
              "EGRESO",
            monto,
            descripcion:
              `Pago de nómina - ${nombreEmpleado}`,
            creado_en:
              new Date().toISOString(),
            referencia:
              referencia ||
              null
          })
          .select()
          .single();

        if (
          error ||
          !movimiento
        ) {
          console.error(
            "ERROR CREANDO MOVIMIENTO BANCARIO:",
            error
          );

          throw new Error(
            `No se pudo registrar el movimiento bancario para ${nombreEmpleado}: ${
              error?.message ||
              "Error desconocido."
            }`
          );
        }

        movimientoBancoId =
          movimiento.id;
      }

      const {
        error:
          errorDetallePagado
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .update({
          pagado:
            true,
          actualizado_en:
            new Date().toISOString()
        })
        .eq(
          "id",
          detalleId
        )
        .eq(
          "nomina_id",
          nominaId
        );

      if (
        errorDetallePagado
      ) {
        throw new Error(
          errorDetallePagado.message
        );
      }

      const {
        data: pendientes,
        error:
          errorPendientes
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .select("id")
        .eq(
          "nomina_id",
          nominaId
        )
        .eq(
          "pagado",
          false
        );

      if (errorPendientes) {
        throw new Error(
          `No se pudo verificar los empleados pendientes: ${errorPendientes.message}`
        );
      }

      if (
        pendientes &&
        pendientes.length ===
          0
      ) {
        const {
          error:
            errorMarcarNomina
        } = await supabaseAdmin
          .from("nominas")
          .update({
            estado:
              "PAGADA",
            fecha_pago:
              new Date().toISOString(),
            actualizado_en:
              new Date().toISOString()
          })
          .eq(
            "id",
            nominaId
          )
          .eq(
            "estado",
            "ABIERTA"
          );

        if (errorMarcarNomina) {
          throw new Error(
            `No se pudo actualizar el estado de la nómina: ${errorMarcarNomina.message}`
          );
        }
      }

      return res.json({
        mensaje:
          "Pago de nómina registrado correctamente.",
        pago
      });
    } catch (error) {
      console.error(
        "ERROR PAGANDO NÓMINA INDIVIDUAL:",
        error
      );

      if (
        movimientoBancoId
      ) {
        await supabaseAdmin
          .from(
            "movimientos_bancarios"
          )
          .delete()
          .eq(
            "id",
            movimientoBancoId
          );
      }

      if (
        movimientoCajaId
      ) {
        await supabaseAdmin
          .from(
            "movimientos_caja"
          )
          .delete()
          .eq(
            "id",
            movimientoCajaId
          );
      }

      if (
        pagoCreadoId
      ) {
        await supabaseAdmin
          .from(
            "pagos_nomina"
          )
          .delete()
          .eq(
            "id",
            pagoCreadoId
          );
      }

      return res.status(500).json({
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el pago de nómina."
      });
    }
  }
);

/* =========================================================
   PAGAR NÓMINA COMPLETA
========================================================= */

router.post(
  "/:id/pagar-completa",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: Request,
    res: Response
  ) => {
    const pagosCreados:
      string[] = [];

    const movimientosCajaCreados:
      string[] = [];

    const movimientosBancoCreados:
      string[] = [];

    const detallesModificados:
      string[] = [];

    let nominaId:
      string | null = null;

    try {
      nominaId =
        obtenerIdParametro(
          req.params.id
        );

      if (!nominaId) {
        return res.status(400).json({
          mensaje:
            "ID de nómina inválido."
        });
      }

      const {
        medio_pago,
        caja_id,
        cuenta_bancaria_id,
        referencia,
        observaciones
      } = req.body;

      const medio =
        normalizarMedioPago(
          medio_pago
        );

      if (
        medio !==
          "EFECTIVO" &&
        medio !==
          "TRANSFERENCIA"
      ) {
        return res.status(400).json({
          mensaje:
            "El medio de pago debe ser EFECTIVO o TRANSFERENCIA."
        });
      }

      const {
        data: nomina,
        error: errorNomina
      } = await supabaseAdmin
        .from("nominas")
        .select("*")
        .eq(
          "id",
          nominaId
        )
        .single();

      if (
        errorNomina ||
        !nomina
      ) {
        return res.status(404).json({
          mensaje:
            "Nómina no encontrada."
        });
      }

      if (
        nomina.estado !==
        "ABIERTA"
      ) {
        return res.status(400).json({
          mensaje:
            `La nómina no puede pagarse completa porque su estado actual es ${nomina.estado}.`
        });
      }

      const {
        data: detalles,
        error: errorDetalles
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .select(`
          *,
          empleados (
            id,
            nombre_completo,
            puesto,
            activo
          )
        `)
        .eq(
          "nomina_id",
          nominaId
        )
        .order(
          "creado_en",
          {
            ascending: true
          }
        );

      if (
        errorDetalles
      ) {
        console.error(
          "ERROR CARGANDO DETALLES PARA PAGO COMPLETO:",
          errorDetalles
        );

        return res.status(500).json({
          mensaje:
            "No se pudieron cargar los detalles de la nómina."
        });
      }

      const detallesNomina =
        (detalles ||
          []) as unknown as DetalleNomina[];

      if (
        detallesNomina.length ===
        0
      ) {
        return res.status(400).json({
          mensaje:
            "No se puede pagar una nómina que no tiene empleados."
        });
      }

      const detallesPagados =
        detallesNomina.filter(
          (
            detalle
          ) =>
            detalle.pagado ===
            true
        );

      if (
        detallesPagados.length >
        0
      ) {
        return res.status(409).json({
          mensaje:
            "La nómina ya tiene empleados pagados. Para evitar pagos duplicados, completa los pagos pendientes individualmente."
        });
      }

      const idsDetalles =
        detallesNomina.map(
          (
            detalle
          ) =>
            detalle.id
        );

      /*
       * Comprobación adicional:
       * aunque pagado=false, si existe un pago
       * asociado no permitimos pagar la nómina completa.
       */
      const {
        data: pagosExistentes,
        error:
          errorPagosExistentes
      } = await supabaseAdmin
        .from(
          "pagos_nomina"
        )
        .select(
          "id, nomina_detalle_id"
        )
        .in(
          "nomina_detalle_id",
          idsDetalles
        );

      if (
        errorPagosExistentes
      ) {
        console.error(
          "ERROR VALIDANDO PAGOS EXISTENTES:",
          errorPagosExistentes
        );

        return res.status(500).json({
          mensaje:
            "No se pudieron validar los pagos existentes."
        });
      }

      if (
        pagosExistentes &&
        pagosExistentes.length >
          0
      ) {
        return res.status(409).json({
          mensaje:
            "Existen registros de pago asociados a esta nómina. Se detuvo el pago completo para evitar duplicados."
        });
      }

      let totalPagar =
        0;

      for (
        const detalle of detallesNomina
      ) {
        const salarioNeto =
          Number(
            detalle.salario_neto
          );

        if (
          !Number.isFinite(
            salarioNeto
          ) ||
          salarioNeto <= 0
        ) {
          return res.status(400).json({
            mensaje:
              `El salario neto de ${
                detalle.empleados
                  ?.nombre_completo ||
                "un empleado"
              } no es válido.`
          });
        }

        totalPagar +=
          salarioNeto;
      }

      totalPagar =
        Number(
          totalPagar.toFixed(2)
        );

      const totalNomina =
        Number(
          nomina.total_neto
        );

      if (
        !Number.isFinite(
          totalNomina
        ) ||
        totalNomina < 0
      ) {
        return res.status(400).json({
          mensaje:
            "El total neto de la nómina no es válido."
        });
      }

      const diferencia =
        Math.abs(
          totalPagar -
            totalNomina
        );

      if (
        diferencia >
        0.01
      ) {
        return res.status(400).json({
          mensaje:
            `El total de los detalles (RD$${totalPagar.toFixed(
              2
            )}) no coincide con el total de la nómina (RD$${totalNomina.toFixed(
              2
            )}).`
        });
      }

      let cajaIdFinal:
        | string
        | null = null;

      if (
        medio ===
        "EFECTIVO"
      ) {
        if (
          caja_id
        ) {
          const {
            data: caja,
            error
          } = await supabaseAdmin
            .from("cajas")
            .select(
              "id, nombre, activa"
            )
            .eq(
              "id",
              caja_id
            )
            .single();

          if (
            error ||
            !caja ||
            !caja.activa
          ) {
            return res.status(400).json({
              mensaje:
                "La caja seleccionada no está disponible."
            });
          }

          cajaIdFinal =
            caja.id;
        } else {
          const {
            data: cajaPrincipal,
            error
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
            .limit(1)
            .maybeSingle();

          if (
            error ||
            !cajaPrincipal
          ) {
            return res.status(400).json({
              mensaje:
                "No se encontró una Caja Principal activa."
            });
          }

          cajaIdFinal =
            cajaPrincipal.id;
        }
      }

      let cuentaBancariaIdFinal:
        | string
        | null = null;

      if (
        medio ===
        "TRANSFERENCIA"
      ) {
        if (
          !cuenta_bancaria_id
        ) {
          return res.status(400).json({
            mensaje:
              "Debes seleccionar una cuenta bancaria para pagar la nómina por transferencia."
          });
        }

        const {
          data: cuenta,
          error
        } = await supabaseAdmin
          .from(
            "cuentas_bancarias"
          )
          .select(
            "id, nombre, activa"
          )
          .eq(
            "id",
            cuenta_bancaria_id
          )
          .single();

        if (
          error ||
          !cuenta ||
          !cuenta.activa
        ) {
          return res.status(400).json({
            mensaje:
              "La cuenta bancaria seleccionada no está disponible."
          });
        }

        cuentaBancariaIdFinal =
          cuenta.id;
      }

      const usuarioId =
        (req as any).usuario?.id;

      for (
        const detalle of detallesNomina
      ) {
        const monto =
          Number(
            detalle.salario_neto
          );

        const nombreEmpleado =
          detalle.empleados
            ?.nombre_completo ||
          "Empleado";

        const {
          data: pago,
          error: errorPago
        } = await supabaseAdmin
          .from(
            "pagos_nomina"
          )
          .insert({
            nomina_detalle_id:
              detalle.id,
            empleado_id:
              detalle.empleado_id,
            monto,
            medio_pago:
              medio,
            caja_id:
              cajaIdFinal,
            cuenta_bancaria_id:
              cuentaBancariaIdFinal,
            fecha_pago:
              new Date().toISOString(),
            usuario_id:
              usuarioId,
            referencia:
              referencia ||
              null,
            observaciones:
              observaciones ||
              null
          })
          .select()
          .single();

        if (
          errorPago ||
          !pago
        ) {
          throw new Error(
            `No se pudo crear el pago de nómina para ${nombreEmpleado}: ${
              errorPago?.message ||
              "Error desconocido."
            }`
          );
        }

        pagosCreados.push(
          pago.id
        );

        if (
          medio ===
          "EFECTIVO"
        ) {
          const {
            data: movimiento,
            error
          } = await supabaseAdmin
            .from(
              "movimientos_caja"
            )
            .insert({
              caja_id:
                cajaIdFinal,
              pago_nomina_id:
                pago.id,
              tipo:
                "PAGO_NOMINA",
              monto,
              descripcion:
                `Pago de nómina - ${nombreEmpleado}`,
              creado_en:
                new Date().toISOString()
            })
            .select()
            .single();

          if (
            error ||
            !movimiento
          ) {
            console.error(
              "ERROR CREANDO MOVIMIENTO DE CAJA:",
              error
            );

            throw new Error(
              `No se pudo registrar el movimiento de Caja para ${nombreEmpleado}: ${
                error?.message ||
                "Error desconocido."
              }`
            );
          }

          movimientosCajaCreados.push(
            movimiento.id
          );
        }

        if (
          medio ===
          "TRANSFERENCIA"
        ) {
          const {
            data: movimiento,
            error
          } = await supabaseAdmin
            .from(
              "movimientos_bancarios"
            )
            .insert({
              cuenta_bancaria_id:
                cuentaBancariaIdFinal,
              pago_nomina_id:
                pago.id,
              tipo:
                "EGRESO",
              monto,
              descripcion:
                `Pago de nómina - ${nombreEmpleado}`,
              creado_en:
                new Date().toISOString(),
              referencia:
                referencia ||
                null
            })
            .select()
            .single();

          if (
            error ||
            !movimiento
          ) {
            console.error(
              "ERROR CREANDO MOVIMIENTO BANCARIO:",
              error
            );

            throw new Error(
              `No se pudo registrar el movimiento bancario para ${nombreEmpleado}: ${
                error?.message ||
                "Error desconocido."
              }`
            );
          }

          movimientosBancoCreados.push(
            movimiento.id
          );
        }

        const {
          error:
            errorMarcarPagado
        } = await supabaseAdmin
          .from(
            "nomina_detalles"
          )
          .update({
            pagado:
              true,
            actualizado_en:
              new Date().toISOString()
          })
          .eq(
            "id",
            detalle.id
          )
          .eq(
            "nomina_id",
            nominaId
          );

        if (
          errorMarcarPagado
        ) {
          throw new Error(
            `No se pudo marcar como pagado a ${nombreEmpleado}: ${errorMarcarPagado.message}`
          );
        }

        detallesModificados.push(
          detalle.id
        );
      }

      const {
        data: detallesFinales,
        error: errorFinal
      } = await supabaseAdmin
        .from(
          "nomina_detalles"
        )
        .select(
          "id, pagado"
        )
        .eq(
          "nomina_id",
          nominaId
        );

      if (
        errorFinal
      ) {
        throw new Error(
          `No se pudo verificar el estado final de la nómina: ${errorFinal.message}`
        );
      }

      const detallesFinalesTyped =
        (detallesFinales ||
          []) as Array<{
          id: string;
          pagado: boolean;
        }>;

      const todosPagados =
        detallesFinalesTyped.length ===
          detallesNomina.length &&
        detallesFinalesTyped.every(
          (
            detalle
          ) =>
            detalle.pagado ===
            true
        );

      if (
        !todosPagados
      ) {
        throw new Error(
          "La nómina no pudo ser marcada como completamente pagada porque existen empleados pendientes."
        );
      }

      const {
        data:
          nominaActualizada,
        error:
          errorActualizarNomina
      } = await supabaseAdmin
        .from("nominas")
        .update({
          estado:
            "PAGADA",
          fecha_pago:
            new Date().toISOString(),
          actualizado_en:
            new Date().toISOString()
        })
        .eq(
          "id",
          nominaId
        )
        .eq(
          "estado",
          "ABIERTA"
        )
        .select()
        .single();

      if (
        errorActualizarNomina ||
        !nominaActualizada
      ) {
        throw new Error(
          errorActualizarNomina?.message ||
            "No se pudo marcar la nómina como PAGADA."
        );
      }

      return res.json({
        mensaje:
          "Nómina pagada completamente.",
        nomina:
          nominaActualizada,
        empleados_pagados:
          detallesNomina.length,
        total_pagado:
          totalPagar,
        medio_pago:
          medio
      });
    } catch (error) {
      console.error(
        "ERROR PAGANDO NÓMINA COMPLETA:",
        error
      );

      if (
        detallesModificados.length >
        0
      ) {
        await supabaseAdmin
          .from(
            "nomina_detalles"
          )
          .update({
            pagado:
              false,
            actualizado_en:
              new Date().toISOString()
          })
          .in(
            "id",
            detallesModificados
          );
      }

      if (
        movimientosBancoCreados.length >
        0
      ) {
        await supabaseAdmin
          .from(
            "movimientos_bancarios"
          )
          .delete()
          .in(
            "id",
            movimientosBancoCreados
          );
      }

      if (
        movimientosCajaCreados.length >
        0
      ) {
        await supabaseAdmin
          .from(
            "movimientos_caja"
          )
          .delete()
          .in(
            "id",
            movimientosCajaCreados
          );
      }

      if (
        pagosCreados.length >
        0
      ) {
        await supabaseAdmin
          .from(
            "pagos_nomina"
          )
          .delete()
          .in(
            "id",
            pagosCreados
          );
      }

      if (
        nominaId
      ) {
        await supabaseAdmin
          .from("nominas")
          .update({
            estado:
              "ABIERTA",
            fecha_pago:
              null,
            actualizado_en:
              new Date().toISOString()
          })
          .eq(
            "id",
            nominaId
          );
      }

      return res.status(500).json({
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudo pagar la nómina completa."
      });
    }
  }
);

export default router;