import { Router, Response } from "express";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import {
  autenticar,
  RequestAutenticado
} from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// ============================================================
// GET /api/rutas
// Lista las rutas.
// ============================================================
router.get(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (_req: RequestAutenticado, res: Response) => {
    try {
      const { data: rutas, error } =
        await supabaseAdmin
          .from("rutas")
          .select(
            `
            id,
            operador_id,
            fecha,
            estado,
            hora_salida,
            hora_cierre,
            observaciones,
            creado_en,
            usuarios:operador_id (
              id,
              nombre_completo,
              usuario,
              estado
            )
            `
          )
          .order("fecha", {
            ascending: false
          })
          .order("creado_en", {
            ascending: false
          });

      if (error) {
        console.error(
          "ERROR CONSULTANDO RUTAS:"
        );
        console.error(error);

        return res.status(500).json({
          mensaje:
            "Error consultando las rutas."
        });
      }

      return res.json(rutas ?? []);
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO RUTAS:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando las rutas."
      });
    }
  }
);

// ============================================================
// GET /api/rutas/mis-clientes
//
// Devuelve únicamente los clientes asignados a las rutas
// ABIERTAS del operador autenticado.
//
// El operador NO envía operador_id.
// El operador se identifica mediante el token.
// ============================================================
router.get(
  "/mis-clientes",
  autenticar,
  requireRole("OPERADOR"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const operadorId =
        req.usuario?.id;

      if (!operadorId) {
        return res.status(401).json({
          mensaje:
            "No se pudo identificar al operador."
        });
      }

      // --------------------------------------------------------
      // Buscar las rutas ABIERTAS del operador autenticado.
      // --------------------------------------------------------
      const {
        data: rutas,
        error: rutasError
      } = await supabaseAdmin
        .from("rutas")
        .select(
          `
          id,
          operador_id,
          fecha,
          estado
          `
        )
        .eq(
          "operador_id",
          operadorId
        )
        .eq(
          "estado",
          "ABIERTA"
        )
        .order("fecha", {
          ascending: false
        });

      if (rutasError) {
        console.error(
          "ERROR CONSULTANDO RUTAS DEL OPERADOR:"
        );
        console.error(rutasError);

        return res.status(500).json({
          mensaje:
            "Error consultando las rutas del operador."
        });
      }

      if (
        !rutas ||
        rutas.length === 0
      ) {
        return res.json({
          rutas: [],
          clientes: []
        });
      }

      const rutaIds =
        rutas.map(
          (ruta) => ruta.id
        );

      // --------------------------------------------------------
      // Buscar las relaciones ruta-cliente.
      // --------------------------------------------------------
      const {
        data: relaciones,
        error: relacionesError
      } = await supabaseAdmin
        .from("ruta_clientes")
        .select(
          `
          id,
          ruta_id,
          cliente_id,
          creado_en
          `
        )
        .in(
          "ruta_id",
          rutaIds
        );

      if (relacionesError) {
        console.error(
          "ERROR CONSULTANDO CLIENTES DE LAS RUTAS:"
        );
        console.error(relacionesError);

        return res.status(500).json({
          mensaje:
            "Error consultando los clientes asignados a las rutas."
        });
      }

      if (
        !relaciones ||
        relaciones.length === 0
      ) {
        return res.json({
          rutas,
          clientes: []
        });
      }

      const clienteIds = [
        ...new Set(
          relaciones.map(
            (relacion) =>
              relacion.cliente_id
          )
        )
      ];

      // --------------------------------------------------------
      // Consultar únicamente los clientes relacionados
      // con las rutas del operador.
      // --------------------------------------------------------
      const {
        data: clientes,
        error: clientesError
      } = await supabaseAdmin
        .from("clientes")
        .select(
          `
          id,
          nombre_negocio,
          tipo,
          nombre_contacto,
          telefono,
          telefono_secundario,
          direccion,
          sector,
          ciudad,
          activo,
          creado_en,
          actualizado_en
          `
        )
        .in(
          "id",
          clienteIds
        )
        .eq(
          "activo",
          true
        )
        .order(
          "nombre_negocio",
          {
            ascending: true
          }
        );

      if (clientesError) {
        console.error(
          "ERROR CONSULTANDO CLIENTES:"
        );
        console.error(clientesError);

        return res.status(500).json({
          mensaje:
            "Error consultando los clientes."
        });
      }

      // --------------------------------------------------------
      // Agregar información de las rutas a cada cliente.
      // --------------------------------------------------------
      const clientesConRutas =
        (clientes ?? []).map(
          (cliente) => {
            const rutasCliente =
              relaciones
                .filter(
                  (relacion) =>
                    relacion.cliente_id ===
                    cliente.id
                )
                .map(
                  (relacion) => {
                    const ruta =
                      rutas.find(
                        (r) =>
                          r.id ===
                          relacion.ruta_id
                      );

                    return {
                      ruta_id:
                        relacion.ruta_id,
                      fecha:
                        ruta?.fecha ??
                        null,
                      estado:
                        ruta?.estado ??
                        null
                    };
                  }
                );

            return {
              ...cliente,
              rutas:
                rutasCliente
            };
          }
        );

      return res.json({
        rutas,
        clientes:
          clientesConRutas
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO CLIENTES DEL OPERADOR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando los clientes del operador."
      });
    }
  }
);

// ============================================================
// GET /api/rutas/mi-inventario
//
// Devuelve únicamente el inventario de las rutas ABIERTAS
// pertenecientes al operador autenticado.
//
// El operador NO envía operador_id.
// El operador NO envía ruta_id.
// Ambos se determinan mediante el token autenticado.
// ============================================================
router.get(
  "/mi-inventario",
  autenticar,
  requireRole("OPERADOR"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const operadorId =
        req.usuario?.id;

      if (!operadorId) {
        return res.status(401).json({
          mensaje:
            "No se pudo identificar al operador."
        });
      }

      // --------------------------------------------------------
      // Buscar las rutas ABIERTAS del operador autenticado.
      // --------------------------------------------------------
      const {
        data: rutas,
        error: rutasError
      } = await supabaseAdmin
        .from("rutas")
        .select(
          `
          id,
          operador_id,
          fecha,
          estado
          `
        )
        .eq(
          "operador_id",
          operadorId
        )
        .eq(
          "estado",
          "ABIERTA"
        )
        .order("fecha", {
          ascending: false
        });

      if (rutasError) {
        console.error(
          "ERROR CONSULTANDO RUTAS PARA INVENTARIO DEL OPERADOR:"
        );
        console.error(rutasError);

        return res.status(500).json({
          mensaje:
            "Error consultando las rutas del operador."
        });
      }

      if (
        !rutas ||
        rutas.length === 0
      ) {
        return res.json({
          rutas: [],
          inventario: []
        });
      }

      const rutaIds =
        rutas.map(
          (ruta) => ruta.id
        );

      // --------------------------------------------------------
      // Consultar inventario únicamente de las rutas del
      // operador autenticado.
      // --------------------------------------------------------
      const {
        data: inventarioRuta,
        error: inventarioError
      } = await supabaseAdmin
        .from("ruta_inventario")
        .select(
          `
          id,
          ruta_id,
          producto_id,
          cantidad_salida,
          cantidad_vendida,
          cantidad_devuelta,
          cantidad_ajustada,
          productos:producto_id (
            id,
            codigo,
            nombre,
            descripcion,
            precio,
            costo,
            tipo
          )
          `
        )
        .in(
          "ruta_id",
          rutaIds
        )
        .order("id", {
          ascending: true
        });

      if (inventarioError) {
        console.error(
          "ERROR CONSULTANDO INVENTARIO DE RUTA DEL OPERADOR:"
        );
        console.error(inventarioError);

        return res.status(500).json({
          mensaje:
            "Error consultando el inventario de la ruta."
        });
      }

      // --------------------------------------------------------
      // Calcular cantidad disponible en la ruta.
      //
      // cantidad_disponible =
      // cantidad_salida
      // - cantidad_vendida
      // - cantidad_devuelta
      // + cantidad_ajustada
      //
      // IMPORTANTE:
      // Esto representa existencia física de la ruta.
      // No es el antiguo campo productos.disponible.
      // --------------------------------------------------------
      const inventario = (
        inventarioRuta ?? []
      ).map(
        (item) => {
          const cantidadSalida =
            Number(
              item.cantidad_salida ?? 0
            );

          const cantidadVendida =
            Number(
              item.cantidad_vendida ?? 0
            );

          const cantidadDevuelta =
            Number(
              item.cantidad_devuelta ?? 0
            );

          const cantidadAjustada =
            Number(
              item.cantidad_ajustada ?? 0
            );

          const cantidadDisponible =
            cantidadSalida -
            cantidadVendida -
            cantidadDevuelta +
            cantidadAjustada;

          const ruta =
            rutas.find(
              (r) =>
                r.id ===
                item.ruta_id
            );

          return {
            id: item.id,
            ruta_id:
              item.ruta_id,
            producto_id:
              item.producto_id,

            cantidad_salida:
              cantidadSalida,

            cantidad_vendida:
              cantidadVendida,

            cantidad_devuelta:
              cantidadDevuelta,

            cantidad_ajustada:
              cantidadAjustada,

            cantidad_disponible:
              cantidadDisponible,

            fecha:
              ruta?.fecha ??
              null,

            estado:
              ruta?.estado ??
              null,

            producto:
              item.productos ?? null
          };
        }
      );

      return res.json({
        rutas,
        inventario
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO INVENTARIO DEL OPERADOR:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando el inventario del operador."
      });
    }
  }
);

// ============================================================
// GET /api/rutas/:id
// Consulta una ruta específica con su inventario.
// ============================================================
router.get(
  "/:id",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      const { data: ruta, error: rutaError } =
        await supabaseAdmin
          .from("rutas")
          .select(
            `
            id,
            operador_id,
            fecha,
            estado,
            hora_salida,
            hora_cierre,
            observaciones,
            creado_en,
            usuarios:operador_id (
              id,
              nombre_completo,
              usuario,
              estado
            )
            `
          )
          .eq("id", id)
          .maybeSingle();

      if (rutaError) {
        console.error(
          "ERROR CONSULTANDO RUTA:"
        );
        console.error(rutaError);

        return res.status(500).json({
          mensaje:
            "Error consultando la ruta."
        });
      }

      if (!ruta) {
        return res.status(404).json({
          mensaje:
            "La ruta no existe."
        });
      }

      const {
        data: inventarioRuta,
        error: inventarioError
      } = await supabaseAdmin
        .from("ruta_inventario")
        .select(
          `
          id,
          ruta_id,
          producto_id,
          cantidad_salida,
          cantidad_vendida,
          cantidad_devuelta,
          cantidad_ajustada,
          productos:producto_id (
            id,
            codigo,
            nombre,
            precio,
            costo,
            tipo
          )
          `
        )
        .eq("ruta_id", id)
        .order("id", {
          ascending: true
        });

      if (inventarioError) {
        console.error(
          "ERROR CONSULTANDO INVENTARIO DE RUTA:"
        );
        console.error(inventarioError);

        return res.status(500).json({
          mensaje:
            "Error consultando el inventario de la ruta."
        });
      }

      return res.json({
        ...ruta,
        inventario:
          inventarioRuta ?? []
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CONSULTANDO RUTA:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno consultando la ruta."
      });
    }
  }
);

// ============================================================
// POST /api/rutas
// Crea una ruta diaria para un operador.
//
// Body:
// {
//   operador_id: "...",
//   fecha: "2026-09-14",
//   observaciones: "Ruta normal"
// }
// ============================================================
router.post(
  "/",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const {
        operador_id,
        fecha,
        observaciones
      } = req.body;

      if (!operador_id) {
        return res.status(400).json({
          mensaje:
            "El operador es obligatorio."
        });
      }

      if (!fecha) {
        return res.status(400).json({
          mensaje:
            "La fecha de la ruta es obligatoria."
        });
      }

      // --------------------------------------------------------
      // Verificar operador
      // --------------------------------------------------------
      const {
        data: operador,
        error: operadorError
      } = await supabaseAdmin
        .from("usuarios")
        .select(
          "id, nombre_completo, usuario, rol, estado"
        )
        .eq("id", operador_id)
        .maybeSingle();

      if (operadorError) {
        console.error(
          "ERROR CONSULTANDO OPERADOR:"
        );
        console.error(operadorError);

        return res.status(500).json({
          mensaje:
            "Error consultando el operador."
        });
      }

      if (!operador) {
        return res.status(404).json({
          mensaje:
            "El operador no existe."
        });
      }

      if (operador.rol !== "OPERADOR") {
        return res.status(400).json({
          mensaje:
            "El usuario seleccionado no es un operador."
        });
      }

      if (operador.estado !== "ACTIVO") {
        return res.status(400).json({
          mensaje:
            "No se puede crear una ruta para un operador inactivo."
        });
      }

      // --------------------------------------------------------
      // Verificar si ya existe una ruta para ese operador
      // en esa fecha.
      // --------------------------------------------------------
      const {
        data: rutaExistente,
        error: rutaExistenteError
      } = await supabaseAdmin
        .from("rutas")
        .select(
          "id, operador_id, fecha, estado"
        )
        .eq("operador_id", operador_id)
        .eq("fecha", fecha)
        .maybeSingle();

      if (rutaExistenteError) {
        console.error(
          "ERROR VERIFICANDO RUTA EXISTENTE:"
        );
        console.error(rutaExistenteError);

        return res.status(500).json({
          mensaje:
            "Error verificando si ya existe una ruta para ese operador."
        });
      }

      if (rutaExistente) {
        return res.status(409).json({
          mensaje:
            "Ese operador ya tiene una ruta registrada para esa fecha.",
          ruta: rutaExistente
        });
      }

      // --------------------------------------------------------
      // Crear ruta
      // --------------------------------------------------------
      const {
        data: ruta,
        error: crearRutaError
      } = await supabaseAdmin
        .from("rutas")
        .insert({
          operador_id,
          fecha,
          estado: "ABIERTA",
          hora_salida:
            new Date().toISOString(),
          observaciones:
            observaciones?.toString().trim() ||
            null
        })
        .select(
          `
          id,
          operador_id,
          fecha,
          estado,
          hora_salida,
          hora_cierre,
          observaciones,
          creado_en
          `
        )
        .single();

      if (crearRutaError) {
        console.error(
          "ERROR CREANDO RUTA:"
        );
        console.error(crearRutaError);

        return res.status(500).json({
          mensaje:
            "No se pudo crear la ruta."
        });
      }

      return res.status(201).json({
        mensaje:
          "Ruta creada correctamente.",
        ruta,
        operador: {
          id: operador.id,
          nombre_completo:
            operador.nombre_completo,
          usuario: operador.usuario
        }
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO CREANDO RUTA:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno creando la ruta."
      });
    }
  }
);

// ============================================================
// POST /api/rutas/:id/salida
// Saca mercancía del almacén y la asigna a la ruta.
//
// Body:
// {
//   producto_id: "...",
//   cantidad: 10
// }
// ============================================================
router.post(
  "/:id/salida",
  autenticar,
  requireRole("ADMIN"),
  async (
    req: RequestAutenticado,
    res: Response
  ) => {
    try {
      const rutaId = req.params.id;

      const {
        producto_id,
        cantidad
      } = req.body;

      if (!producto_id) {
        return res.status(400).json({
          mensaje:
            "El producto es obligatorio."
        });
      }

      const cantidadNumerica = Number(cantidad);

      if (
        !Number.isInteger(cantidadNumerica) ||
        cantidadNumerica <= 0
      ) {
        return res.status(400).json({
          mensaje:
            "La cantidad debe ser un número entero mayor que 0."
        });
      }

      // --------------------------------------------------------
      // Verificar ruta
      // --------------------------------------------------------
      const {
        data: ruta,
        error: rutaError
      } = await supabaseAdmin
        .from("rutas")
        .select(
          "id, operador_id, fecha, estado"
        )
        .eq("id", rutaId)
        .maybeSingle();

      if (rutaError) {
        console.error(
          "ERROR CONSULTANDO RUTA PARA SALIDA:"
        );
        console.error(rutaError);

        return res.status(500).json({
          mensaje:
            "Error consultando la ruta."
        });
      }

      if (!ruta) {
        return res.status(404).json({
          mensaje:
            "La ruta no existe."
        });
      }

      if (ruta.estado !== "ABIERTA") {
        return res.status(400).json({
          mensaje:
            "No se puede sacar mercancía de una ruta que no está abierta."
        });
      }

      // --------------------------------------------------------
      // Verificar producto
      // --------------------------------------------------------
      const {
        data: producto,
        error: productoError
      } = await supabaseAdmin
        .from("productos")
        .select(
          "id, codigo, nombre, precio, costo, tipo"
        )
        .eq("id", producto_id)
        .maybeSingle();

      if (productoError) {
        console.error(
          "ERROR CONSULTANDO PRODUCTO:"
        );
        console.error(productoError);

        return res.status(500).json({
          mensaje:
            "Error consultando el producto."
        });
      }

      if (!producto) {
        return res.status(404).json({
          mensaje:
            "El producto no existe."
        });
      }

      // --------------------------------------------------------
      // Consultar existencia actual del almacén
      // --------------------------------------------------------
      const {
        data: existencia,
        error: existenciaError
      } = await supabaseAdmin
        .from("inventario_almacen")
        .select(
          "producto_id, cantidad"
        )
        .eq("producto_id", producto_id)
        .maybeSingle();

      if (existenciaError) {
        console.error(
          "ERROR CONSULTANDO EXISTENCIA:"
        );
        console.error(existenciaError);

        return res.status(500).json({
          mensaje:
            "Error consultando la existencia."
        });
      }

      const cantidadDisponible =
        existencia?.cantidad ?? 0;

      if (
        cantidadNumerica >
        cantidadDisponible
      ) {
        return res.status(400).json({
          mensaje:
            "No hay suficiente existencia en el almacén.",
          existencia_disponible:
            cantidadDisponible,
          cantidad_solicitada:
            cantidadNumerica
        });
      }

      // --------------------------------------------------------
      // Verificar si el producto ya está en la ruta
      // --------------------------------------------------------
      const {
        data: itemRutaExistente,
        error: itemRutaError
      } = await supabaseAdmin
        .from("ruta_inventario")
        .select(
          `
          id,
          cantidad_salida,
          cantidad_vendida,
          cantidad_devuelta,
          cantidad_ajustada
          `
        )
        .eq("ruta_id", rutaId)
        .eq("producto_id", producto_id)
        .maybeSingle();

      if (itemRutaError) {
        console.error(
          "ERROR CONSULTANDO PRODUCTO EN RUTA:"
        );
        console.error(itemRutaError);

        return res.status(500).json({
          mensaje:
            "Error consultando el inventario de la ruta."
        });
      }

      const cantidadSalidaAnterior =
        itemRutaExistente?.cantidad_salida ?? 0;

      const nuevaCantidadSalida =
        cantidadSalidaAnterior +
        cantidadNumerica;

      // --------------------------------------------------------
      // Actualizar inventario del almacén
      // --------------------------------------------------------
      const nuevaExistencia =
        cantidadDisponible -
        cantidadNumerica;

      const {
        data: inventarioActualizado,
        error: actualizarInventarioError
      } = await supabaseAdmin
        .from("inventario_almacen")
        .upsert(
          {
            producto_id,
            cantidad: nuevaExistencia,
            actualizado_en:
              new Date().toISOString()
          },
          {
            onConflict:
              "producto_id"
          }
        )
        .select(
          "producto_id, cantidad, actualizado_en"
        )
        .single();

      if (actualizarInventarioError) {
        console.error(
          "ERROR ACTUALIZANDO EXISTENCIA DEL ALMACÉN:"
        );
        console.error(
          actualizarInventarioError
        );

        return res.status(500).json({
          mensaje:
            "No se pudo actualizar la existencia del almacén."
        });
      }

      // --------------------------------------------------------
      // Crear o actualizar inventario de la ruta
      // --------------------------------------------------------
      let inventarioRuta;

      if (itemRutaExistente) {
        const {
          data,
          error
        } = await supabaseAdmin
          .from("ruta_inventario")
          .update({
            cantidad_salida:
              nuevaCantidadSalida
          })
          .eq(
            "id",
            itemRutaExistente.id
          )
          .select(
            `
            id,
            ruta_id,
            producto_id,
            cantidad_salida,
            cantidad_vendida,
            cantidad_devuelta,
            cantidad_ajustada
            `
          )
          .single();

        if (error) {
          console.error(
            "ERROR ACTUALIZANDO INVENTARIO DE RUTA:"
          );
          console.error(error);

          return res.status(500).json({
            mensaje:
              "El almacén fue actualizado, pero no se pudo actualizar la ruta."
          });
        }

        inventarioRuta = data;
      } else {
        const {
          data,
          error
        } = await supabaseAdmin
          .from("ruta_inventario")
          .insert({
            ruta_id: rutaId,
            producto_id,
            cantidad_salida:
              cantidadNumerica,
            cantidad_vendida: 0,
            cantidad_devuelta: 0,
            cantidad_ajustada: 0
          })
          .select(
            `
            id,
            ruta_id,
            producto_id,
            cantidad_salida,
            cantidad_vendida,
            cantidad_devuelta,
            cantidad_ajustada
            `
          )
          .single();

        if (error) {
          console.error(
            "ERROR CREANDO INVENTARIO DE RUTA:"
          );
          console.error(error);

          return res.status(500).json({
            mensaje:
              "El almacén fue actualizado, pero no se pudo crear el inventario de la ruta."
          });
        }

        inventarioRuta = data;
      }

      // --------------------------------------------------------
      // Registrar movimiento de inventario
      // --------------------------------------------------------
      const {
        data: movimiento,
        error: movimientoError
      } = await supabaseAdmin
        .from("movimientos_inventario")
        .insert({
          producto_id,
          ruta_id: rutaId,
          usuario_id:
            req.usuario?.id ?? null,
          tipo: "SALIDA_OPERADOR",
          cantidad: cantidadNumerica,
          referencia_id:
            inventarioRuta.id,
          descripcion:
            `Salida de ${cantidadNumerica} unidad(es) de ${producto.nombre} hacia la ruta.`
        })
        .select(
          `
          id,
          producto_id,
          ruta_id,
          usuario_id,
          tipo,
          cantidad,
          referencia_id,
          descripcion,
          creado_en
          `
        )
        .single();

      if (movimientoError) {
        console.error(
          "ERROR REGISTRANDO MOVIMIENTO DE SALIDA:"
        );
        console.error(
          movimientoError
        );

        return res.status(500).json({
          mensaje:
            "La mercancía fue descontada del almacén, pero no se pudo registrar el movimiento."
        });
      }

      return res.status(201).json({
        mensaje:
          "Mercancía asignada a la ruta correctamente.",

        ruta: {
          id: ruta.id,
          operador_id:
            ruta.operador_id,
          fecha: ruta.fecha,
          estado: ruta.estado
        },

        producto: {
          id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          tipo: producto.tipo
        },

        inventario_almacen: {
          cantidad_anterior:
            cantidadDisponible,
          cantidad_salida:
            cantidadNumerica,
          cantidad_nueva:
            nuevaExistencia
        },

        inventario_ruta:
          inventarioRuta,

        movimiento
      });
    } catch (error) {
      console.error(
        "ERROR INESPERADO REGISTRANDO SALIDA:"
      );
      console.error(error);

      return res.status(500).json({
        mensaje:
          "Error interno registrando la salida."
      });
    }
  }
);

export default router;